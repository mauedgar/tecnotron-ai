'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
  qualifyControlGitSource, authenticateGitHubControlIssuer,
  qualifyForkedPhase1Branch: qualifyProductFork,
  __testOnlyQualifyForkWithAdapter: qualifyForkedPhase1Branch,
} = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-phase1-branch-qualification');

const TASK = 'add3f2525b3b711ce4e396a2e5ce2864f3ceef10';
const TIP = 'c3a493a7d6f90af2a26640b5e966e950755b79c8';
const TREE = '83fafc8df00454a9cd44774864f07d4ffedece72';
const BRANCH_HEAD = 'c6d001d296da77ae7748db2f946a8ec949387e21';
const BRANCH_TREE = '68b5e5f0fcf642063800be65ebdbf3c805ade7e9';
const REMOTE = 'https://github.com/mauedgar/tecnotron-ai.git';
const BRANCH = 'task/tecnotron-h6-operator-20261104-001';
const ORIGINAL = 'task/tecnotron-h6-attendance-parent-children-20261102-001';
const TASKCYCLE = 'TASKCYCLE-TECNOTRON-ULC-OP05-H6-ATTENDANCE-OPERATOR-001';
const FILE = 'attendance/operator/cli.py';

function context() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'h6-branch-qualification-'));
  const binary = path.join(root, 'trusted-git');
  fs.writeFileSync(binary, 'test-only-no-execution\n', {flag:'wx'});
  const binaryHash = 'sha256:'+createHash('sha256').update(fs.readFileSync(binary)).digest('hex');
  return {
    root,
    request: {
      taskcycle: { id: TASKCYCLE },
      subject: {
        repository: 'mauedgar/tecnotron-ai',
        branch: BRANCH, commit: TIP, tree: TREE, parent: TASK,
        changed_paths: [FILE],
      },
    },
    originalInputs: {
      Product_baseline: { repository: 'mauedgar/tecnotron-ai' },
      TASK_carrier: { branch: ORIGINAL, commit: TASK },
    },
    qualifiedGitSurface: {
      binding: 'CONTROL_QUALIFIED_GIT',
      taskcycle_id: TASKCYCLE,
      subject_branch: BRANCH,
      original_task_branch: ORIGINAL,
      repositoryPath: root,
      remoteUrl: REMOTE,
      qualification_receipt_ref: 'https://github.com/mauedgar/tecnotron-ai/issues/35#issuecomment-6641648462',
      gitExecutablePath: binary,
      gitExecutableSha256: binaryHash,
    },
    controlVerifiedGitSource: {
      status: 'CONTROL_VERIFIED_SOURCE',
      binding: 'CONTROL_QUALIFIED_GIT',
      taskcycle_id: TASKCYCLE,
      subject_branch: BRANCH,
      original_task_branch: ORIGINAL,
      repositoryPath: root,
      remoteUrl: REMOTE,
      qualification_receipt_ref: 'https://github.com/mauedgar/tecnotron-ai/issues/35#issuecomment-6641648462',
      gitExecutablePath: binary,
      gitExecutableSha256: binaryHash,
      subject_commit: TIP,
      subject_tree: TREE,
      original_task_commit: TASK,
      source_code_commit: '92f890ad57dac67d16a90235c6ec7deadc119daf',
      execution_attempt_id: 'TEST-CONTROL-BOUND-ATTEMPT-1',
      control_resolution_ref: 'TEST:EXTERNAL_CONTROL_RESOLUTION',
    },
    cleanup: () => fs.rmSync(root, {recursive:true,force:true}),
  };
}

// Simulates the exact read-only Git queries the verifier may make. It cannot
// qualify real Product source on its own; that requires native provider tests
// against actual immutable Git objects and the remote branch.
function fakeGit(c, overrides = {}) {
  const records = [];
  const result = (stdout = '', exit_code = 0, stderr = '') => ({
    stdout, exit_code, stderr, error_code: null, timed_out: false, signal: null,
  });
  return {
    records,
    run(root, args) {
      assert.equal(root, c.root);
      assert.deepEqual(args.slice(0,7), [
        '-c', 'credential.helper=', '-c', 'core.fsmonitor=false',
        '-c', 'maintenance.auto=false', '--no-replace-objects',
      ]);
      const cmd = args.slice(7);
      const key = cmd.join(' ');
      records.push(key);
      if (Object.hasOwn(overrides,key)) return overrides[key];
      if (key === 'rev-parse --show-toplevel') return result(c.root + '\n');
      if (key === 'config --local --get remote.origin.url') return result(REMOTE + '\n');
      if (key === 'config --get-regexp ^url\\..*\\.(insteadOf|pushInsteadOf)$')
        return result('', 1);
      if (cmd[0] === 'config' && cmd[1] === '--local' && cmd[2] === '--get-regexp')
        return result('', 1);
      if (cmd[0] === 'rev-parse' && cmd[1]?.endsWith('^{commit}')) {
        return result(cmd[1].slice(0, -9) + '\n');
      }
      if (cmd[0] === 'cat-file' && cmd[1] === '-p') {
        const oid = cmd[2];
        if (oid === TIP) return result('tree ' + TREE + '\nparent ' + TASK + '\n\nmessage');
        if (oid === TASK) return result('tree ' + '1'.repeat(40) + '\nparent ' + '2'.repeat(40) + '\n\nTASK');
        if (oid === BRANCH_HEAD)
          return result('tree ' + BRANCH_TREE + '\nparent ' + TIP + '\n\ncorrective');
      }
      if (cmd[0] === 'diff') return result(FILE + '\0');
      if (cmd[0] === 'ls-remote')
        return result(BRANCH_HEAD + '\trefs/heads/' + BRANCH + '\n');
      if (cmd[0] === 'merge-base') return result();
      return result('', 128, 'UNEXPECTED_GIT_COMMAND:' + key);
    },
  };
}
function qualify(c, overrides = {}) {
  return qualifyForkedPhase1Branch({
    request: c.request,
    originalInputs: c.originalInputs,
    qualifiedGitSurface: c.qualifiedGitSurface,
    resolveControlGitSource: () => structuredClone(c.controlVerifiedGitSource),
    git: fakeGit(c, overrides),
  });
}

test('qualifies truthful child branch with real-object shaped read-only Git observations', () => {
  const c = context();
  try {
    const result = qualify(c);
    assert.equal(result.status, 'PASS', result.reason);
    assert.equal(result.verified.subject_branch, BRANCH);
    assert.equal(result.verified.immutable_phase1_commit, TIP);
    assert.equal(result.verified.original_task_commit, TASK);
    assert.equal(result.verified.remote_head, BRANCH_HEAD);
    assert.deepEqual(result.verified.actual_changed_paths, [FILE]);
    assert.equal(result.verified.Product_authority, 'NONE');
  } finally { c.cleanup(); }
});

test('accepts only the other exact official GitHub HTTPS origin form', () => {
  const c = context();
  try {
    const withoutGitSuffix = REMOTE.slice(0, -4);
    c.qualifiedGitSurface.remoteUrl = withoutGitSuffix;
    c.controlVerifiedGitSource.remoteUrl = withoutGitSuffix;
    const r = (stdout) => ({
      stdout, exit_code: 0, stderr: '', error_code: null, timed_out: false, signal: null,
    });
    const alternate = qualify(c, {
      'config --local --get remote.origin.url': r(withoutGitSuffix + '\n'),
    });
    assert.equal(alternate.status, 'PASS', alternate.reason);
    c.qualifiedGitSurface.remoteUrl = 'http://github.com/mauedgar/tecnotron-ai';
    assert.equal(qualify(c).reason, 'FORK_BRANCH_BINDING_UNQUALIFIED');
  } finally { c.cleanup(); }
});

test('requires Control-bound source; refuses caller-only asserted branch provenance', () => {
  const c = context();
  try {
    c.qualifiedGitSurface = null;
    assert.equal(qualify(c).reason, 'FORK_BRANCH_BINDING_UNQUALIFIED');
    c.qualifiedGitSurface = { binding: 'CONTROL_QUALIFIED_GIT' };
    assert.equal(qualify(c).reason, 'FORK_BRANCH_BINDING_UNQUALIFIED');
  } finally { c.cleanup(); }
});

test('rejects divergent, malformed or unrelated branch identities', () => {
  const c = context();
  try {
    for (const branch of ['task/../unsafe', 'task/not-the-original', 'feature/unknown']) {
      c.request.subject.branch = branch;
      assert.equal(qualify(c).reason,'FORK_BRANCH_BINDING_UNQUALIFIED');
    }
    c.request.subject.branch = BRANCH;
    c.request.subject.parent = 'a'.repeat(40);
    assert.equal(qualify(c).reason,'FORK_BRANCH_BINDING_UNQUALIFIED');
  } finally { c.cleanup(); }
});

test('rejects untrusted repository path, wrong URL or frozen TASK branch substitution', () => {
  const c = context();
  try {
    c.qualifiedGitSurface.repositoryPath = '../relative';
    assert.equal(qualify(c).reason,'FORK_BRANCH_BINDING_UNQUALIFIED');
    c.qualifiedGitSurface.repositoryPath = c.root;
    c.qualifiedGitSurface.remoteUrl = 'https://github.com/other/project.git';
    assert.equal(qualify(c).reason,'FORK_BRANCH_BINDING_UNQUALIFIED');
    c.qualifiedGitSurface.remoteUrl = REMOTE;
    c.qualifiedGitSurface.original_task_branch = BRANCH;
    assert.equal(qualify(c).reason,'FORK_BRANCH_BINDING_UNQUALIFIED');
  } finally { c.cleanup(); }
});

test('rejects local remote origin mismatch, unsafe URL rewrites and incomplete evidence', () => {
  const c = context();
  try {
    assert.equal(qualify(c,{'config --local --get remote.origin.url':{
      stdout:'https://github.com/wrong.git\n',exit_code:0,stderr:'',error_code:null,timed_out:false,signal:null,
    }}).reason,'FORK_REMOTE_ORIGIN_MISMATCH');
    assert.equal(qualify(c,{'config --get-regexp ^url\\..*\\.(insteadOf|pushInsteadOf)$':{
      stdout:'url.evil.insteadOf https://github.com/\n',exit_code:0,stderr:'',error_code:null,timed_out:false,signal:null,
    }}).reason,'FORK_GIT_URL_REWRITE_UNSAFE');
    assert.equal(qualify(c,{'rev-parse --show-toplevel':{
      stdout:'',exit_code:128,stderr:'not a repo',error_code:null,timed_out:false,signal:null,
    }}).reason,'FORK_GIT_EVIDENCE_UNAVAILABLE');
  } finally { c.cleanup(); }
});

test('checks actual commit tree, parent and full NUL path diff, not requester assertions', () => {
  const c = context();
  try {
    const r=(stdout)=>({stdout,exit_code:0,stderr:'',error_code:null,timed_out:false,signal:null});
    assert.equal(qualify(c,{['cat-file -p '+TIP]:r('tree '+TREE+'\nparent '+'a'.repeat(40)+'\n\nwrong')})
      .reason,'FORK_PHASE1_GIT_EDGE_MISMATCH');
    assert.equal(qualify(c,{['cat-file -p '+TIP]:r('tree '+'a'.repeat(40)+'\nparent '+TASK+'\n\nwrong')})
      .reason,'FORK_PHASE1_GIT_EDGE_MISMATCH');
    c.request.subject.changed_paths = [FILE,'src/hidden.js'];
    assert.equal(qualify(c).reason,'FORK_GIT_DIFF_MISMATCH');
    c.request.subject.changed_paths = [FILE];
    assert.equal(qualify(c,{['diff --name-only --no-renames -z '+TASK+' '+TIP+' --']:r('src/other.js\0')})
      .reason,'FORK_GIT_DIFF_MISMATCH');
  } finally { c.cleanup(); }
});

test('rejects missing, forged or non-descendant remote child branch evidence', () => {
  const c = context();
  try {
    const r=(stdout,exit_code=0)=>({stdout,exit_code,stderr:'',error_code:null,timed_out:false,signal:null});
    const key='ls-remote --heads '+REMOTE+' refs/heads/'+BRANCH;
    assert.equal(qualify(c,{[key]:r('')}).reason,'FORK_REMOTE_BRANCH_UNVERIFIED');
    assert.equal(qualify(c,{[key]:r(BRANCH_HEAD+'\trefs/heads/task/another\n')})
      .reason,'FORK_REMOTE_BRANCH_MALFORMED');
    assert.equal(qualify(c,{['merge-base --is-ancestor '+TIP+' '+BRANCH_HEAD]:r('',1)})
      .reason,'FORK_PHASE1_NOT_IN_REMOTE_BRANCH_ANCESTRY');
  } finally { c.cleanup(); }
});

test('immutable proof does not absorb mutable remote head or branch deletion', () => {
  const c=context();
  try {
    const {prepareForkedPhase1Branch}=require(
      '../../src/deterministic-taskcycle-substrate-v0/taskcycle-phase1-branch-qualification');
    const bound={request:c.request,originalInputs:c.originalInputs,
      qualifiedGitSurface:c.qualifiedGitSurface};
    const staticProof=prepareForkedPhase1Branch(bound);
    assert.equal(staticProof.status,'PASS');
    assert.equal(Object.hasOwn(staticProof.immutable,'remote_head'),false);
    const first=qualify(c);
    assert.equal(first.status,'PASS',first.reason);
    const {remote_head:headA,...identityA}=first.verified;
    assert.equal(headA,BRANCH_HEAD);
    assert.deepEqual(identityA,staticProof.immutable);
    const remoteHead='d'.repeat(40);
    const remoteKey='ls-remote --heads '+REMOTE+' refs/heads/'+BRANCH;
    const newRemote={
      stdout:remoteHead+'\trefs/heads/'+BRANCH+'\n',
      exit_code:0,stderr:'',error_code:null,timed_out:false,signal:null,
    };
    const newCommit={
      stdout:'tree '+BRANCH_TREE+'\nparent '+BRANCH_HEAD+'\n\nadvanced',
      exit_code:0,stderr:'',error_code:null,timed_out:false,signal:null,
    };
    const later=qualify(c,{[remoteKey]:newRemote,['cat-file -p '+remoteHead]:newCommit});
    assert.equal(later.status,'PASS',later.reason);
    const {remote_head:headB,...identityB}=later.verified;
    assert.equal(headB,remoteHead);
    assert.deepEqual(identityB,staticProof.immutable);
    const missing=qualify(c,{[remoteKey]:{...newRemote,stdout:''}});
    assert.equal(missing.reason,'FORK_REMOTE_BRANCH_UNVERIFIED');
    assert.deepEqual(prepareForkedPhase1Branch(bound).immutable,staticProof.immutable);
  }finally{c.cleanup();}
});

test('pinning Git executable is required and hostile local credential config is blocked', () => {
  const c=context();
  try{
    const {prepareForkedPhase1Branch}=require(
      '../../src/deterministic-taskcycle-substrate-v0/taskcycle-phase1-branch-qualification');
    const bound={request:c.request,originalInputs:c.originalInputs,
      qualifiedGitSurface:c.qualifiedGitSurface};
    const validHash=c.qualifiedGitSurface.gitExecutableSha256;
    c.qualifiedGitSurface.gitExecutableSha256='invalid';
    assert.equal(prepareForkedPhase1Branch(bound).reason,'FORK_BRANCH_BINDING_UNQUALIFIED');
    c.qualifiedGitSurface.gitExecutableSha256='sha256:'+'a'.repeat(64);
    assert.equal(prepareForkedPhase1Branch(bound).status,'PASS');
    assert.equal(qualify(c).reason,'FORK_CONTROL_CUSTODY_MISMATCH');
    c.controlVerifiedGitSource.gitExecutableSha256='sha256:'+'a'.repeat(64);
    assert.equal(qualifyForkedPhase1Branch({
      ...bound, resolveControlGitSource: () => structuredClone(c.controlVerifiedGitSource),
    }).reason,'FORK_GIT_EVIDENCE_UNAVAILABLE');
    c.controlVerifiedGitSource.gitExecutableSha256=validHash;
    c.qualifiedGitSurface.gitExecutableSha256=validHash;
    const key='config --local --get-regexp ^(http\\..*\\.extraheader|credential\\..*|remote\\.origin\\.uploadpack)$';
    const injected={stdout:'http.https://github.com/.extraheader SENSITIVE\n',
      exit_code:0,stderr:'',error_code:null,timed_out:false,signal:null};
    assert.equal(qualify(c,{[key]:injected}).reason,
      'FORK_GIT_LOCAL_CREDENTIAL_OR_TRANSPORT_OVERRIDE');
  }finally{c.cleanup();}
});


test('Git source rejects local includes, transport proxy and protocol overrides', () => {
  const c = context();
  try {
    const key = 'config --local --get-regexp ^(include\\.|includeIf\\.|http\\.|core\\.(sshCommand|fsmonitor)$|remote\\.origin\\.proxy$|protocol\\.)';
    for (const value of [
      'include.path /tmp/untrusted-config',
      'http.proxy http://untrusted-proxy',
      'protocol.ext.allow always',
    ]) {
      const result = qualify(c, { [key]: {
        stdout: value + '\n', exit_code: 0, stderr: '', error_code: null,
        timed_out: false, signal: null,
      } });
      assert.equal(result.reason, 'FORK_GIT_LOCAL_TRANSPORT_CONFIGURATION_UNSAFE', value);
    }
  } finally { c.cleanup(); }
});

test('untrusted caller label alone never qualifies fork provenance', () => {
  const c = context();
  try {
    const input = { request: c.request, originalInputs: c.originalInputs,
      qualifiedGitSurface: c.qualifiedGitSurface, git: fakeGit(c) };
    assert.equal(qualifyForkedPhase1Branch(input).reason, 'FORK_CONTROL_CUSTODY_UNVERIFIED');
    assert.equal(qualifyForkedPhase1Branch({
      ...input, resolveControlGitSource: () => { throw Error('unavailable'); },
    }).reason, 'FORK_CONTROL_CUSTODY_UNAVAILABLE');
    assert.equal(qualify(c).status, 'PASS');
    assert.deepEqual(qualify(c), qualify(c), 'same Control-bound evidence is deterministic');
  } finally { c.cleanup(); }
});

test('binary, checkout and receipt substitutions cannot override Control source', () => {
  const c = context();
  try {
    const attackerRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'h6-fake-checkout-'));
    try {
      const binary = path.join(attackerRoot, 'substituted-git');
      fs.writeFileSync(binary, 'attacker-selected-bytes\n');
      c.qualifiedGitSurface.gitExecutablePath = binary;
      c.qualifiedGitSurface.gitExecutableSha256 = 'sha256:' +
        createHash('sha256').update(fs.readFileSync(binary)).digest('hex');
      assert.equal(qualify(c).reason, 'FORK_CONTROL_CUSTODY_MISMATCH');
      c.qualifiedGitSurface.gitExecutablePath = c.controlVerifiedGitSource.gitExecutablePath;
      c.qualifiedGitSurface.gitExecutableSha256 = c.controlVerifiedGitSource.gitExecutableSha256;
      c.qualifiedGitSurface.repositoryPath = attackerRoot;
      assert.equal(qualify(c).reason, 'FORK_CONTROL_CUSTODY_MISMATCH');
      c.qualifiedGitSurface.repositoryPath = c.root;
      c.qualifiedGitSurface.qualification_receipt_ref = 'CONTROL:COUNTERFEIT';
      assert.equal(qualify(c).reason, 'FORK_CONTROL_CUSTODY_MISMATCH');
    } finally { fs.rmSync(attackerRoot, { recursive: true, force: true }); }
  } finally { c.cleanup(); }
});

test('Control proof must bind the actual frozen subject, TASK and execution attempt', () => {
  const c = context();
  try {
    c.request.subject.commit = 'f'.repeat(40);
    assert.equal(qualify(c).reason, 'FORK_CONTROL_CUSTODY_UNVERIFIED');
    c.request.subject.commit = TIP;
    c.controlVerifiedGitSource.original_task_commit = 'f'.repeat(40);
    assert.equal(qualify(c).reason, 'FORK_CONTROL_CUSTODY_UNVERIFIED');
    c.controlVerifiedGitSource.original_task_commit = TASK;
    c.controlVerifiedGitSource.execution_attempt_id = '';
    assert.equal(qualify(c).reason, 'FORK_CONTROL_CUSTODY_UNVERIFIED');
    c.controlVerifiedGitSource.execution_attempt_id = 'TEST-CONTROL-BOUND-ATTEMPT-1';
    assert.equal(qualify(c).status, 'PASS');
  } finally { c.cleanup(); }
});

test('even an injected Git adapter cannot bypass a modified executable', () => {
  const c = context();
  try {
    fs.writeFileSync(c.qualifiedGitSurface.gitExecutablePath, 'tampered-after-Control-pin\n');
    const result = qualify(c);
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'FORK_GIT_EVIDENCE_UNAVAILABLE');
  } finally { c.cleanup(); }
});

test('Control custody resolver is snapshotted once and cannot mutate proof after qualification', () => {
  const c = context();
  try {
    const supplied = structuredClone(c.controlVerifiedGitSource);
    let calls = 0;
    const qualified = qualifyControlGitSource({
      request: c.request,
      originalInputs: c.originalInputs,
      qualifiedGitSurface: c.qualifiedGitSurface,
      resolveControlGitSource: () => { calls += 1; return supplied; },
    });
    assert.equal(qualified.status, 'PASS');
    assert.equal(calls, 1);
    supplied.gitExecutablePath = path.join(c.root, 'attacker-executable');
    supplied.gitExecutableSha256 = 'sha256:'+'f'.repeat(64);
    supplied.repositoryPath = path.join(c.root, 'different-repository');
    assert.equal(qualified.surface.gitExecutablePath, c.qualifiedGitSurface.gitExecutablePath);
    assert.equal(qualified.surface.gitExecutableSha256, c.qualifiedGitSurface.gitExecutableSha256);
    assert.equal(qualified.surface.repositoryPath, c.root);
  } finally { c.cleanup(); }
});

test('accessor-backed or unserializable custody proof fails closed', () => {
  const c = context();
  try {
    const input = {
      request: c.request,
      originalInputs: c.originalInputs,
      qualifiedGitSurface: c.qualifiedGitSurface,
    };
    const accessor = structuredClone(c.controlVerifiedGitSource);
    Object.defineProperty(accessor, 'gitExecutablePath', {
      enumerable: true,
      get() { throw new Error('untrusted getter'); },
    });
    assert.equal(qualifyControlGitSource({
      ...input, resolveControlGitSource: () => accessor,
    }).reason, 'FORK_CONTROL_CUSTODY_UNAVAILABLE');
    assert.equal(qualifyControlGitSource({
      ...input, resolveControlGitSource: () => ({
        ...c.controlVerifiedGitSource, unsuspected_function: () => 1,
      }),
    }).reason, 'FORK_CONTROL_CUSTODY_UNAVAILABLE');
    assert.equal(qualifyControlGitSource({
      ...input, resolveControlGitSource: () => 'CONTROL_VERIFIED_SOURCE',
    }).reason, 'FORK_CONTROL_CUSTODY_UNVERIFIED');
  } finally { c.cleanup(); }
});

test('reentrant Control resolver cannot mutate the prevalidated Git surface', () => {
  const c = context();
  try {
    const result = qualifyForkedPhase1Branch({
      request: c.request,
      originalInputs: c.originalInputs,
      qualifiedGitSurface: c.qualifiedGitSurface,
      resolveControlGitSource: () => {
        // A mutable closure still holds the original caller-controlled object.
        c.qualifiedGitSurface.remoteUrl = 'https://attacker.example/repository.git';
        c.qualifiedGitSurface.qualification_receipt_ref = 'CONTROL:FORGED';
        return {
          ...c.controlVerifiedGitSource,
          remoteUrl: c.qualifiedGitSurface.remoteUrl,
          qualification_receipt_ref: c.qualifiedGitSurface.qualification_receipt_ref,
        };
      },
      git: fakeGit(c),
    });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'FORK_CONTROL_CUSTODY_MISMATCH');
  } finally { c.cleanup(); }
});

test('reentrant Control resolver cannot mutate the already-frozen candidate and TASK', () => {
  const c = context();
  try {
    const result = qualifyForkedPhase1Branch({
      request: c.request,
      originalInputs: c.originalInputs,
      qualifiedGitSurface: c.qualifiedGitSurface,
      resolveControlGitSource: () => {
        c.request.subject.changed_paths = ['attendance/operator/attacker.py'];
        c.originalInputs.TASK_carrier.commit = 'f'.repeat(40);
        return structuredClone(c.controlVerifiedGitSource);
      },
      git: fakeGit(c),
    });
    assert.equal(result.status, 'PASS', result.reason);
    assert.deepEqual(result.verified.actual_changed_paths, [FILE]);
    assert.equal(result.verified.original_task_commit, TASK);
  } finally { c.cleanup(); }
});

test('Product qualifier cannot accept any caller-supplied simulated Git adapter', () => {
  const c = context();
  try {
    const input = {
      request: c.request, originalInputs: c.originalInputs,
      qualifiedGitSurface: c.qualifiedGitSurface,
      resolveControlGitSource: () => structuredClone(c.controlVerifiedGitSource),
    };
    assert.equal(qualifyProductFork({ ...input, git: fakeGit(c) }).reason,
      'FORK_GIT_ADAPTER_INJECTION_FORBIDDEN');
    assert.equal(qualifyProductFork({
      ...input, git: { run: () => { throw Error('must never run'); } },
    }).reason, 'FORK_GIT_ADAPTER_INJECTION_FORBIDDEN');
  } finally { c.cleanup(); }
});

test('pinned native Git binary rejects another-UID-writable bytes and replacement directory', { skip: process.platform !== 'linux' }, () => {
  const c = context();
  try {
    const nativeArgs = {
      request: c.request, originalInputs: c.originalInputs,
      qualifiedGitSurface: c.qualifiedGitSurface,
      resolveControlGitSource: () => structuredClone(c.controlVerifiedGitSource),
    };
    // Test seam reads fake Git only after the same native binary gate.
    const observe = () => qualifyForkedPhase1Branch({ ...nativeArgs, git: fakeGit(c) });
    assert.equal(observe().status, 'PASS');
    fs.chmodSync(c.qualifiedGitSurface.gitExecutablePath, 0o666);
    assert.equal(observe().reason, 'FORK_GIT_EVIDENCE_UNAVAILABLE');
    fs.chmodSync(c.qualifiedGitSurface.gitExecutablePath, 0o600);
    assert.equal(observe().status, 'PASS');
    fs.chmodSync(c.root, 0o777);
    assert.equal(observe().reason, 'FORK_GIT_EVIDENCE_UNAVAILABLE');
    fs.chmodSync(c.root, 0o700);
    assert.equal(observe().status, 'PASS');
  } finally { c.cleanup(); }
});

test('Product fork qualifier fails closed before native Git when Github signer is unqualified', () => {
  const c = context();
  try {
    const result = qualifyProductFork({
      request: c.request, originalInputs: c.originalInputs,
      qualifiedGitSurface: c.qualifiedGitSurface,
      resolveControlGitSource: () => structuredClone(c.controlVerifiedGitSource),
    });
    // The fixture is explicitly not an executable Git implementation. No
    // Product native qualifier can ever PASS based on its mocked observations.
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'FORK_CONTROL_GITHUB_SIGNER_NOT_QUALIFIED');
  } finally { c.cleanup(); }
});

test('GitHub signer is mandatory: forged Control source and caller policy cannot authenticate issuer', () => {
  const c = context();
  try {
    const supplied = {
      request: c.request,
      originalInputs: c.originalInputs,
      qualifiedGitSurface: {
        ...c.qualifiedGitSurface,
        // A worker cannot choose a different signer or pretend certification.
        githubControlIssuer: {
          status: 'VERIFIED', signerDigest: 'f'.repeat(40),
          signerWorkflow: 'attacker/forged/.github/workflows/sign.yml',
        },
      },
      resolveControlGitSource: () => structuredClone({
        ...c.controlVerifiedGitSource,
        githubAttestationManifestPath: path.join(c.root, 'fake-manifest.json'),
        githubAttestationBundlePath: path.join(c.root, 'fake-bundle.json'),
      }),
    };
    const native = qualifyProductFork(supplied);
    assert.deepEqual(native, {
      status: 'BLOCKED', reason: 'FORK_CONTROL_GITHUB_SIGNER_NOT_QUALIFIED',
    });
    const independentIssuer = authenticateGitHubControlIssuer({
      request: c.request, originalInputs: c.originalInputs,
      proof: c.controlVerifiedGitSource,
    });
    assert.deepEqual(independentIssuer, native);
  } finally { c.cleanup(); }
});
