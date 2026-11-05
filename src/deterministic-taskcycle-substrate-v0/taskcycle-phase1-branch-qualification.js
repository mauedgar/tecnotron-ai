'use strict';

// Bounded source-native Git provenance verifier for independently developed
// Phase 1 child branches. This is evidence qualification, never Product authority.
// A mismatched branch remains blocked unless Product Control supplies a trusted
// local checkout AND actual Git objects plus a current remote branch observation.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const { createGitCliAdapter } = require('../operational-spine-v0/git-execution-qualification');

const GIT_PREFIX = [
  '-c', 'credential.helper=', '-c', 'core.fsmonitor=false',
  '-c', 'maintenance.auto=false', '--no-replace-objects',
];
const sha = v => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
const nonempty = v => typeof v === 'string' && v.trim() !== '';
const safeBranch = v => typeof v === 'string'
  && /^task\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(v)
  && !v.includes('//') && !v.includes('..') && !v.endsWith('/') && !v.includes('@{');
const safePath = v => typeof v === 'string' && !/[\\\r\n\0]/.test(v)
  && !v.startsWith('/') && v.split('/').every(x => x && x !== '.' && x !== '..');
const fail = reason => ({ status: 'BLOCKED', reason });

function createReadOnlySourceGit(executable) {
  // Strip inherited Git/credential/network control variables before spawning.
  // Only carry process variables necessary for a local Git subprocess.
  // Never inherit arbitrary library loaders, Git config, proxies or hooks.
  const env = {};
  for (const key of ['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'TMPDIR', 'TMP', 'TEMP']) {
    if (typeof process.env[key] === 'string') env[key] = process.env[key];
  }
  return createGitCliAdapter({ command: executable, env: {
    ...env,
    GIT_NO_LAZY_FETCH: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
    GIT_PROTOCOL_FROM_USER: '0',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  } });
}

function qualifiedGitExecutable(surface) {
  const binary = surface.gitExecutablePath;
  const stat = fs.lstatSync(binary);
  if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync(binary) !== binary)
    throw Error('GIT_BINARY_PATH_UNQUALIFIED');
  const observed = 'sha256:' + createHash('sha256').update(fs.readFileSync(binary)).digest('hex');
  if (observed !== surface.gitExecutableSha256) throw Error('GIT_BINARY_IDENTITY_MISMATCH');
  return binary;
}


/**
 * Caller assertions do not authenticate Control custody. The resolver must
 * originate from the competent Control composition root, independently of
 * the request or any untrusted worker. This routine verifies correspondence,
 * not the issuer's authority. Control must authenticate the resolver itself.
 */
function qualifyControlGitSource({ request, originalInputs, qualifiedGitSurface, resolveControlGitSource }) {
  if (typeof resolveControlGitSource !== 'function')
    return fail('FORK_CONTROL_CUSTODY_UNVERIFIED');
  let proof;
  try {
    // Clone once at the boundary: a caller-held, accessor-backed or mutable
    // resolver object must not change underneath executable/checkout checks.
    // This only stabilizes the observation; it does NOT authenticate its issuer.
    proof = structuredClone(resolveControlGitSource({
      taskcycle_id: request.taskcycle.id,
      subject: structuredClone(request.subject),
      original_task_carrier: structuredClone(originalInputs.TASK_carrier),
    }));
  } catch {
    return fail('FORK_CONTROL_CUSTODY_UNAVAILABLE');
  }
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)
      || proof.status !== 'CONTROL_VERIFIED_SOURCE'
      || !nonempty(proof.execution_attempt_id)
      || !nonempty(proof.control_resolution_ref)
      || !sha(proof.source_code_commit)
      || proof.taskcycle_id !== request.taskcycle.id
      || proof.subject_commit !== request.subject.commit
      || proof.subject_tree !== request.subject.tree
      || proof.original_task_commit !== originalInputs.TASK_carrier.commit)
    return fail('FORK_CONTROL_CUSTODY_UNVERIFIED');
  for (const key of [
    'binding', 'taskcycle_id', 'subject_branch', 'original_task_branch',
    'repositoryPath', 'remoteUrl', 'qualification_receipt_ref',
    'gitExecutablePath', 'gitExecutableSha256',
  ]) {
    if (proof[key] !== qualifiedGitSurface[key])
      return fail('FORK_CONTROL_CUSTODY_MISMATCH');
  }
  return { status: 'PASS', surface: proof };
}

function read(git, root, args, { nul = false, allowExitOne = false } = {}) {
  const v = git.run(root, [...GIT_PREFIX, ...args], { timeoutMs: 30000 });
  if (v.error_code || v.timed_out || v.signal
      || (v.exit_code !== 0 && !(allowExitOne && v.exit_code === 1))
      || typeof v.stdout !== 'string' || v.stdout.length > 4194304) {
    throw Error('READ_ONLY_GIT_UNAVAILABLE');
  }
  return {
    exit: v.exit_code,
    value: nul ? v.stdout : v.stdout.trim(),
    stderr: v.stderr || '',
  };
}

function oneCommit(git, root, oid) {
  if (!sha(oid)) throw Error('COMMIT_ID_INVALID');
  const identity = read(git, root, ['rev-parse', oid + '^{commit}']).value;
  if (identity !== oid) throw Error('COMMIT_OBJECT_UNAVAILABLE');
  const raw = read(git, root, ['cat-file', '-p', oid]).value;
  const headers = raw.split(/\r?\n\r?\n/, 1)[0].split(/\r?\n/);
  const trees = headers.filter(x => x.startsWith('tree ')).map(x => x.slice(5));
  const parents = headers.filter(x => x.startsWith('parent ')).map(x => x.slice(7));
  if (trees.length !== 1 || !sha(trees[0]) || !parents.every(sha))
    throw Error('COMMIT_OBJECT_MALFORMED');
  return { tree: trees[0], parents };
}

function exactPaths(raw) {
  if (raw === '') return [];
  if (!raw.endsWith('\0') || raw.includes('\uFFFD')) throw Error('GIT_PATHS_NOT_NUL_DELIMITED');
  const entries = raw.slice(0, -1).split('\0');
  if (entries.some(x => !safePath(x)) || new Set(entries).size !== entries.length)
    throw Error('GIT_PATHS_UNSAFE');
  return entries.sort();
}

function prepareForkedPhase1Branch({ request, originalInputs, qualifiedGitSurface }) {
  const subject = request?.subject;
  const original = originalInputs?.TASK_carrier;
  const surface = qualifiedGitSurface;
  if (!subject || !original || !surface
      || surface.binding !== 'CONTROL_QUALIFIED_GIT'
      || surface.taskcycle_id !== request?.taskcycle?.id
      || surface.subject_branch !== subject.branch
      || surface.original_task_branch !== original.branch
      || !nonempty(surface.qualification_receipt_ref)
      || !safeBranch(subject.branch) || !safeBranch(original.branch)
      || subject.branch === original.branch
      || !sha(subject.commit) || !sha(subject.tree) || !sha(subject.parent)
      || subject.parent !== original.commit || !sha(original.commit)
      || request?.subject?.repository !== originalInputs?.Product_baseline?.repository
      || !['https://github.com/' + subject.repository,
        'https://github.com/' + subject.repository + '.git'].includes(surface.remoteUrl)
      || !nonempty(surface.repositoryPath) || !path.isAbsolute(surface.repositoryPath)
      || !nonempty(surface.gitExecutablePath) || !path.isAbsolute(surface.gitExecutablePath)
      || !/^sha256:[a-f0-9]{64}$/.test(surface.gitExecutableSha256 || '')
      || !Array.isArray(subject.changed_paths) || subject.changed_paths.length < 1
      || subject.changed_paths.some(x => !safePath(x))
      || new Set(subject.changed_paths).size !== subject.changed_paths.length) {
    return fail('FORK_BRANCH_BINDING_UNQUALIFIED');
  }

  // Frozen, deterministic identity. A moving remote head is runtime evidence,
  // never part of the original effect manifest or exact duplicate identity.
  return {
    status: 'PASS',
    immutable: {
      method: 'CONTROL_BOUND_READ_ONLY_GIT_CURRENT_BRANCH_ANCESTRY',
      subject_branch: subject.branch,
      remote_ref: 'refs/heads/' + subject.branch,
      immutable_phase1_commit: subject.commit,
      immutable_phase1_tree: subject.tree,
      original_task_commit: original.commit,
      actual_changed_paths: [...subject.changed_paths].sort(),
      qualification_receipt_ref: surface.qualification_receipt_ref,
      Product_authority: 'NONE',
    },
  };
}

function qualifyForkedPhase1Branch({
  request, originalInputs, qualifiedGitSurface, resolveControlGitSource = null, git = null,
}) {
  const bound = prepareForkedPhase1Branch({ request, originalInputs, qualifiedGitSurface });
  if (bound.status !== 'PASS') return bound;
  const custody = qualifyControlGitSource({
    request, originalInputs, qualifiedGitSurface, resolveControlGitSource,
  });
  if (custody.status !== 'PASS') return custody;
  const subject = request.subject;
  const original = originalInputs.TASK_carrier;
  const surface = custody.surface;
  try {
    // An injected Git adapter (used by isolated tests) must never bypass
    // executable identity validation. The actual runtime still requires
    // independently authenticated Control custody before invocation.
    const executable = qualifiedGitExecutable(surface);
    if (!git) git = createReadOnlySourceGit(executable);
    const root = path.resolve(surface.repositoryPath);
    if (!fs.statSync(root).isDirectory() || fs.realpathSync(root) !== root
        || read(git, root, ['rev-parse', '--show-toplevel']).value !== root) {
      return fail('FORK_GIT_ROOT_UNQUALIFIED');
    }
    if (read(git, root, ['config', '--local', '--get', 'remote.origin.url']).value
        !== surface.remoteUrl) return fail('FORK_REMOTE_ORIGIN_MISMATCH');
    const rewrites = read(git, root, ['config', '--get-regexp',
      '^url\\..*\\.(insteadOf|pushInsteadOf)$'], { allowExitOne: true });
    if (rewrites.exit !== 1 || rewrites.value !== '' || rewrites.stderr !== '')
      return fail('FORK_GIT_URL_REWRITE_UNSAFE');
    const credentialOverrides = read(git, root, ['config', '--local', '--get-regexp',
      '^(http\\..*\\.extraheader|credential\\..*|remote\\.origin\\.uploadpack)$'],
      { allowExitOne: true });
    if (credentialOverrides.exit !== 1 || credentialOverrides.value !== ''
        || credentialOverrides.stderr !== '')
      return fail('FORK_GIT_LOCAL_CREDENTIAL_OR_TRANSPORT_OVERRIDE');
    // Local includes/HTTP/protocol overrides can redirect remote reads even
    // when global/system config and inherited environment were isolated.
    const unsafeLocalConfig = read(git, root, ['config', '--local', '--get-regexp',
      '^(include\\.|includeIf\\.|http\\.|core\\.(sshCommand|fsmonitor)$|remote\\.origin\\.proxy$|protocol\\.)'],
      { allowExitOne: true });
    if (unsafeLocalConfig.exit !== 1 || unsafeLocalConfig.value !== ''
        || unsafeLocalConfig.stderr !== '')
      return fail('FORK_GIT_LOCAL_TRANSPORT_CONFIGURATION_UNSAFE');

    const tip = oneCommit(git, root, subject.commit);
    if (tip.tree !== subject.tree || tip.parents.length !== 1
        || tip.parents[0] !== original.commit) return fail('FORK_PHASE1_GIT_EDGE_MISMATCH');
    oneCommit(git, root, original.commit);
    const observedPaths = exactPaths(read(git, root, ['diff', '--name-only',
      '--no-renames', '-z', original.commit, subject.commit, '--'], { nul: true }).value);
    const declaredPaths = [...subject.changed_paths].sort();
    if (observedPaths.length !== declaredPaths.length
        || observedPaths.some((v, i) => v !== declaredPaths[i]))
      return fail('FORK_GIT_DIFF_MISMATCH');

    const remoteRef = 'refs/heads/' + subject.branch;
    const remote = read(git, root, ['ls-remote', '--heads', surface.remoteUrl, remoteRef]).value;
    const lines = remote.split(/\r?\n/).filter(Boolean);
    if (lines.length !== 1) return fail('FORK_REMOTE_BRANCH_UNVERIFIED');
    const pair = lines[0].split('\t');
    if (pair.length !== 2 || !sha(pair[0]) || pair[1] !== remoteRef)
      return fail('FORK_REMOTE_BRANCH_MALFORMED');

    // A remote ref cannot itself prove who created a branch historically.
    // It does prove that the immutable original Phase 1 commit belongs to the
    // verified remote child branch's present ancestry at observation time.
    const ancestry = read(git, root,
      ['merge-base', '--is-ancestor', subject.commit, pair[0]], { allowExitOne: true });
    if (ancestry.exit !== 0 || ancestry.value !== '' || ancestry.stderr !== '')
      return fail('FORK_PHASE1_NOT_IN_REMOTE_BRANCH_ANCESTRY');
    oneCommit(git, root, pair[0]);
    return {
      status: 'PASS',
      verified: { ...bound.immutable, remote_head: pair[0] },
    };
  } catch {
    return fail('FORK_GIT_EVIDENCE_UNAVAILABLE');
  }
}

module.exports = { createReadOnlySourceGit, prepareForkedPhase1Branch, qualifyControlGitSource, qualifyForkedPhase1Branch };
