'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  qualifyForkedPhase1Branch,
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
    assert.equal(qualify(c,{'cat-file -p '+TIP:r('tree '+TREE+'\nparent '+'a'.repeat(40)+'\n\nwrong')})
      .reason,'FORK_PHASE1_GIT_EDGE_MISMATCH');
    assert.equal(qualify(c,{'cat-file -p '+TIP:r('tree '+'a'.repeat(40)+'\nparent '+TASK+'\n\nwrong')})
      .reason,'FORK_PHASE1_GIT_EDGE_MISMATCH');
    c.request.subject.changed_paths = [FILE,'src/hidden.js'];
    assert.equal(qualify(c).reason,'FORK_GIT_DIFF_MISMATCH');
    c.request.subject.changed_paths = [FILE];
    assert.equal(qualify(c,{'diff --name-only --no-renames -z '+TASK+' '+TIP+' --':r('src/other.js\0')})
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
