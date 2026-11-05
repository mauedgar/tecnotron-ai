'use strict';

// Bounded source-native Git provenance verifier for independently developed
// Phase 1 child branches. This is evidence qualification, never Product authority.
// A mismatched branch remains blocked unless Product Control supplies a trusted
// local checkout AND actual Git objects plus a current remote branch observation.
const fs = require('node:fs');
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

function createReadOnlySourceGit() {
  return createGitCliAdapter({ env: {
    ...process.env,
    GIT_NO_LAZY_FETCH: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
    GIT_PROTOCOL_FROM_USER: '0',
  } });
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

function qualifyForkedPhase1Branch({
  request, originalInputs, qualifiedGitSurface, git = createReadOnlySourceGit(),
}) {
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
      || !Array.isArray(subject.changed_paths) || subject.changed_paths.length < 1
      || subject.changed_paths.some(x => !safePath(x))
      || new Set(subject.changed_paths).size !== subject.changed_paths.length) {
    return fail('FORK_BRANCH_BINDING_UNQUALIFIED');
  }

  try {
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
      verified: {
        method: 'CONTROL_BOUND_READ_ONLY_GIT_CURRENT_BRANCH_ANCESTRY',
        subject_branch: subject.branch,
        remote_ref: remoteRef,
        remote_head: pair[0],
        immutable_phase1_commit: subject.commit,
        immutable_phase1_tree: subject.tree,
        original_task_commit: original.commit,
        actual_changed_paths: observedPaths,
        qualification_receipt_ref: surface.qualification_receipt_ref,
        Product_authority: 'NONE',
      },
    };
  } catch {
    return fail('FORK_GIT_EVIDENCE_UNAVAILABLE');
  }
}

module.exports = { createReadOnlySourceGit, qualifyForkedPhase1Branch };
