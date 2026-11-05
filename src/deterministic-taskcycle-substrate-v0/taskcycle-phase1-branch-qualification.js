'use strict';

// Bounded source-native Git provenance verifier for independently developed
// Phase 1 child branches. This is evidence qualification, never Product authority.
// A mismatched branch remains blocked unless Product Control supplies a trusted
// local checkout AND actual Git objects plus a current remote branch observation.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
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

// A one-time hash cannot prevent substitution between check and exec on a
// writable path. Fork qualification therefore runs only on a Linux filesystem
// where another UID cannot replace any directory entry or mutate Git bytes.
// Same-UID peers and root are OUTSIDE this operating profile's trust boundary;
// this is not authentication of a Product Control issuer.
function qualifiedGitExecutable(surface) {
  if (process.platform !== 'linux' || typeof process.getuid !== 'function')
    throw Error('GIT_BINARY_TRUSTED_FILESYSTEM_UNAVAILABLE');
  const binary = surface.gitExecutablePath;
  if (!path.isAbsolute(binary) || path.normalize(binary) !== binary)
    throw Error('GIT_BINARY_PATH_UNQUALIFIED');
  const uid = process.getuid();
  const root = path.parse(binary).root;
  let parent = fs.lstatSync(root);
  if (!parent.isDirectory() || parent.isSymbolicLink()
      || (parent.uid !== uid && parent.uid !== 0))
    throw Error('GIT_BINARY_ANCESTOR_UNTRUSTED');
  let at = root;
  for (const segment of binary.slice(root.length).split(path.sep)) {
    if (!segment || segment === '.' || segment === '..')
      throw Error('GIT_BINARY_PATH_UNQUALIFIED');
    at = path.join(at, segment);
    const child = fs.lstatSync(at);
    if (child.isSymbolicLink() || (child.uid !== uid && child.uid !== 0)
        || ((parent.mode & 0o022) !== 0
            && ((parent.mode & 0o1000) === 0 || child.uid !== uid)))
      throw Error('GIT_BINARY_PATH_UNTRUSTED');
    parent = child;
  }
  if (!parent.isFile() || parent.nlink !== 1 || (parent.mode & 0o022) !== 0
      || fs.realpathSync(binary) !== binary)
    throw Error('GIT_BINARY_PATH_UNQUALIFIED');
  const fd = fs.openSync(binary, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.dev !== parent.dev
        || before.ino !== parent.ino || (before.mode & 0o022) !== 0)
      throw Error('GIT_BINARY_CHANGED_BEFORE_HASH');
    const observed = 'sha256:' + createHash('sha256').update(fs.readFileSync(fd)).digest('hex');
    const after = fs.fstatSync(fd);
    if (after.dev !== before.dev || after.ino !== before.ino
        || after.size !== before.size || after.mtimeMs !== before.mtimeMs)
      throw Error('GIT_BINARY_CHANGED_DURING_HASH');
    if (observed !== surface.gitExecutableSha256)
      throw Error('GIT_BINARY_IDENTITY_MISMATCH');
  } finally { fs.closeSync(fd); }
  return binary;
}


/**
 * Caller assertions do not authenticate Control custody. The resolver must
 * originate from the competent Control composition root, independently of
 * the request or any untrusted worker. This routine verifies correspondence,
 * not the issuer's authority. Control must authenticate the resolver itself.
 */

function snapshotControlInput(request, originalInputs, qualifiedGitSurface) {
  try {
    return {
      status: 'PASS',
      request: structuredClone(request),
      originalInputs: structuredClone(originalInputs),
      qualifiedGitSurface: structuredClone(qualifiedGitSurface),
    };
  } catch {
    return fail('FORK_CONTROL_CUSTODY_UNAVAILABLE');
  }
}

function qualifyControlGitSource({ request, originalInputs, qualifiedGitSurface, resolveControlGitSource }) {
  if (typeof resolveControlGitSource !== 'function')
    return fail('FORK_CONTROL_CUSTODY_UNVERIFIED');
  const snapshot = snapshotControlInput(request, originalInputs, qualifiedGitSurface);
  if (snapshot.status !== 'PASS') return snapshot;
  const stableRequest = snapshot.request;
  const stableInputs = snapshot.originalInputs;
  const stableSurface = snapshot.qualifiedGitSurface;
  let proof;
  try {
    // Clone once at the boundary: a caller-held, accessor-backed or mutable
    // resolver object must not change underneath executable/checkout checks.
    // This only stabilizes the observation; it does NOT authenticate its issuer.
    proof = structuredClone(resolveControlGitSource({
      taskcycle_id: stableRequest.taskcycle.id,
      subject: structuredClone(stableRequest.subject),
      original_task_carrier: structuredClone(stableInputs.TASK_carrier),
    }));
  } catch {
    return fail('FORK_CONTROL_CUSTODY_UNAVAILABLE');
  }
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)
      || proof.status !== 'CONTROL_VERIFIED_SOURCE'
      || !nonempty(proof.execution_attempt_id)
      || !nonempty(proof.control_resolution_ref)
      || !sha(proof.source_code_commit)
      || proof.taskcycle_id !== stableRequest.taskcycle.id
      || proof.subject_commit !== stableRequest.subject.commit
      || proof.subject_tree !== stableRequest.subject.tree
      || proof.original_task_commit !== stableInputs.TASK_carrier.commit)
    return fail('FORK_CONTROL_CUSTODY_UNVERIFIED');
  for (const key of [
    'binding', 'taskcycle_id', 'subject_branch', 'original_task_branch',
    'repositoryPath', 'remoteUrl', 'qualification_receipt_ref',
    'gitExecutablePath', 'gitExecutableSha256',
  ]) {
    if (proof[key] !== stableSurface[key])
      return fail('FORK_CONTROL_CUSTODY_MISMATCH');
  }
  return { status: 'PASS', surface: proof };
}

// GitHub Actions/Sigstore signer is NOT yet deployed on the protected default
// branch. Only a reviewed, accepted Product change may pin its exact SHA. No
// caller-supplied policy, callback, GitHub comment or self-declared "verified"
// field is a substitute for an issuer rooted in GitHub's signed certificate.
const GITHUB_CONTROL_ISSUER = Object.freeze({
  repository: 'mauedgar/tecnotron-ai',
  repositoryId: '1339077141',
  signerWorkflow: 'mauedgar/tecnotron-ai/.github/workflows/tecnotron-control-custody-attest.yml',
  sourceRef: 'refs/heads/main',
  signerDigest: null, // unqualified; MUST stay fail-closed until protected signer is admitted
});

function exactObject(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const a = Object.keys(value).sort();
  const b = Object.keys(expected).sort();
  return a.length === b.length && a.every((key, i) => key === b[i]
    && value[key] === expected[key]);
}

function trustedGitHubCli() {
  if (process.platform !== 'linux' || typeof process.getuid !== 'function')
    throw Error('GITHUB_ATTESTATION_HOST_UNSUPPORTED');
  // Native gh is a root-owned platform binary. Never execute an executable
  // path/hash supplied by the candidate, a callback, PATH, or a worker.
  const binary = '/usr/bin/gh';
  for (const dir of ['/', '/usr', '/usr/bin']) {
    const v = fs.lstatSync(dir);
    if (!v.isDirectory() || v.isSymbolicLink() || v.uid !== 0
        || (v.mode & 0o022) !== 0) throw Error('GITHUB_ATTESTATION_EXEC_ROOT_UNTRUSTED');
  }
  const stat = fs.lstatSync(binary);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0
      || stat.nlink !== 1 || (stat.mode & 0o022) !== 0
      || fs.realpathSync(binary) !== binary)
    throw Error('GITHUB_ATTESTATION_EXEC_UNTRUSTED');
  return binary;
}

function authenticateGitHubControlIssuer({ request, originalInputs, proof }) {
  // GitHub's certificate authenticates WORKFLOW provenance, not Developer
  // acceptance/Phase2. A workflow on an unprotected ref or an arbitrary
  // caller-selected signer cannot issue Product Control authority.
  if (!sha(GITHUB_CONTROL_ISSUER.signerDigest))
    return fail('FORK_CONTROL_GITHUB_SIGNER_NOT_QUALIFIED');
  const manifestPath = proof?.githubAttestationManifestPath;
  const bundlePath = proof?.githubAttestationBundlePath;
  if (!nonempty(manifestPath) || !path.isAbsolute(manifestPath)
      || !nonempty(bundlePath) || !path.isAbsolute(bundlePath))
    return fail('FORK_CONTROL_ATTESTATION_INPUT_UNAVAILABLE');
  try {
    const expected = {
      schema: 'tecnotron-control-git-custody/v1',
      repository: GITHUB_CONTROL_ISSUER.repository,
      taskcycle_id: request.taskcycle.id,
      subject_commit: request.subject.commit,
      subject_tree: request.subject.tree,
      original_task_commit: originalInputs.TASK_carrier.commit,
      source_code_commit: proof.source_code_commit,
      execution_attempt_id: proof.execution_attempt_id,
      control_resolution_ref: proof.control_resolution_ref,
      qualification_receipt_ref: proof.qualification_receipt_ref,
    };
    const stat = fs.lstatSync(manifestPath);
    const bundle = fs.lstatSync(bundlePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536
        || !bundle.isFile() || bundle.isSymbolicLink() || bundle.size > 1048576)
      return fail('FORK_CONTROL_ATTESTATION_INPUT_UNSAFE');
    if (!exactObject(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), expected))
      return fail('FORK_CONTROL_ATTESTATION_SUBJECT_MISMATCH');
    const binary = trustedGitHubCli();
    const args = [
      'attestation', 'verify', manifestPath,
      '--repo', GITHUB_CONTROL_ISSUER.repository,
      '--bundle', bundlePath,
      '--signer-workflow', GITHUB_CONTROL_ISSUER.signerWorkflow,
      '--signer-digest', GITHUB_CONTROL_ISSUER.signerDigest,
      '--source-ref', GITHUB_CONTROL_ISSUER.sourceRef,
      '--cert-oidc-issuer', 'https://token.actions.githubusercontent.com',
      '--deny-self-hosted-runners',
      '--format', 'json',
    ];
    const output = execFileSync(binary, args, {
      encoding: 'utf8', timeout: 30000, maxBuffer: 1048576,
      windowsHide: true,
      env: { PATH: '/usr/bin:/bin', HOME: '/nonexistent',
        GH_NO_UPDATE_NOTIFIER: '1', LANG: 'C', LC_ALL: 'C' },
    });
    const verified = JSON.parse(output);
    if (!Array.isArray(verified) || !verified.some((entry) => {
      const cert = entry?.verificationResult?.signature?.certificate;
      const statement = entry?.verificationResult?.statement;
      return cert && String(cert.sourceRepositoryIdentifier) === GITHUB_CONTROL_ISSUER.repositoryId
        && statement?.subject?.some((subject) => subject?.digest?.sha256 ===
          createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'));
    })) return fail('FORK_CONTROL_GITHUB_CERTIFICATE_MISMATCH');
    return { status: 'PASS' };
  } catch {
    return fail('FORK_CONTROL_GITHUB_ATTESTATION_UNVERIFIED');
  }
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

// Product entrypoint: never accept an injected Git adapter as proof of a live
// source. The deterministic fake-adapter helper below is for unit evidence
// only and is NOT used by taskcycle-effect-reconciliation.
function qualifyForkedPhase1Branch(input) {
  if (input?.git != null) return fail('FORK_GIT_ADAPTER_INJECTION_FORBIDDEN');
  return qualifyForkedPhase1BranchWithTestAdapter({ ...input, requireNativeIssuer: true });
}
function qualifyForkedPhase1BranchWithTestAdapter({
  request, originalInputs, qualifiedGitSurface, resolveControlGitSource = null,
  git = null, requireNativeIssuer = false,
}) {
  const snapshot = snapshotControlInput(request, originalInputs, qualifiedGitSurface);
  if (snapshot.status !== 'PASS') return snapshot;
  const stableRequest = snapshot.request;
  const stableInputs = snapshot.originalInputs;
  const stableSurface = snapshot.qualifiedGitSurface;
  const bound = prepareForkedPhase1Branch({
    request: stableRequest, originalInputs: stableInputs, qualifiedGitSurface: stableSurface,
  });
  if (bound.status !== 'PASS') return bound;
  const custody = qualifyControlGitSource({
    request: stableRequest, originalInputs: stableInputs,
    qualifiedGitSurface: stableSurface, resolveControlGitSource,
  });
  if (custody.status !== 'PASS') return custody;
  if (requireNativeIssuer) {
    const issuer = authenticateGitHubControlIssuer({
      request: stableRequest, originalInputs: stableInputs, proof: custody.surface,
    });
    if (issuer.status !== 'PASS') return issuer;
  }
  const subject = stableRequest.subject;
  const original = stableInputs.TASK_carrier;
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

module.exports = {
  createReadOnlySourceGit, prepareForkedPhase1Branch, snapshotControlInput,
  qualifyControlGitSource, qualifyForkedPhase1Branch, authenticateGitHubControlIssuer,
  // Pure unit-test seam; callers must never substitute its observations for
  // Product's qualified native entrypoint.
  __testOnlyQualifyForkWithAdapter: qualifyForkedPhase1BranchWithTestAdapter,
};
