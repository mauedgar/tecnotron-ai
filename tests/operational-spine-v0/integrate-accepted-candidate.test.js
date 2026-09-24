'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  IntegrateAcceptedCandidateInput,
  createIntegrateAcceptedCandidateRecipe,
} = require('../../src/operational-spine-v0/recipes/integrate-accepted-candidate');

const authority = {
  disposition: 'AUTHORIZED',
  authority_reference: 'DEV-W2',
  effect_constraints: [
    { effect: 'git.integration', scope: 'exact target ref only' },
    { effect: 'git.remote.write', scope: 'exact remote target ref only' },
  ],
};

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}

function fixture(t, { divergent = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-git-recipe-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const remote = path.join(root, 'remote.git');
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);

  git(root, ['init', '--bare', remote]);
  git(repo, ['init']);
  git(repo, ['config', 'user.email', 'fixture@example.invalid']);
  git(repo, ['config', 'user.name', 'Fixture']);
  git(repo, ['checkout', '-b', 'tools']);
  fs.writeFileSync(path.join(repo, 'file.txt'), 'base\n');
  git(repo, ['add', 'file.txt']);
  git(repo, ['commit', '-m', 'base']);

  const base = git(repo, ['rev-parse', 'HEAD']);
  git(repo, ['remote', 'add', 'origin', remote]);
  git(repo, ['push', '-u', 'origin', 'tools']);

  git(repo, ['checkout', '-b', 'candidate']);
  fs.writeFileSync(path.join(repo, 'candidate.txt'), 'candidate\n');
  git(repo, ['add', 'candidate.txt']);
  git(repo, ['commit', '-m', 'candidate']);
  const candidate = git(repo, ['rev-parse', 'HEAD']);
  const candidateTree = git(repo, ['rev-parse', 'HEAD^{tree}']);

  git(repo, ['checkout', 'tools']);
  let target = base;

  if (divergent) {
    fs.writeFileSync(path.join(repo, 'divergent.txt'), 'divergent\n');
    git(repo, ['add', 'divergent.txt']);
    git(repo, ['commit', '-m', 'divergent target']);
    target = git(repo, ['rev-parse', 'HEAD']);
    git(repo, ['push', 'origin', 'tools']);
  }

  const candidateParent = git(repo, ['rev-parse', `${candidate}^1`]);
  return { root, remote, repo, base, target, candidate, candidateParent, candidateTree };
}

function request(f, overrides = {}) {
  return {
    recipe_id: 'integrate_accepted_candidate',
    recipe_version: 'v0',
    operation_id: 'OP-INTEGRATE',
    execution_attempt_id: 'AT-INTEGRATE',
    context: {
      schema_version: 'tecnotron-execution-context/v0',
      operation_id: 'OP-INTEGRATE',
      taskcycle_id: 'TC-W2',
      repository: { identity: 'fixture/repository', location: f.repo },
      worktree: { identity: 'fixture/worktree', location: f.repo },
      git: { expected_ref: 'refs/heads/tools', expected_commit: f.target },
      runtime: {
        executor: 'deterministic-recipe',
        platform: process.platform,
        runtime_identity: `node:${process.version}`,
      },
      state_store: { reference: 'fixture-state' },
      authority_refs: [],
      evidence_refs: [],
    },
    authorization: authority,
    evidence_refs: [],
    input: {
      target_ref: 'refs/heads/tools',
      expected_target_commit: f.target,
      candidate_commit: f.candidate,
      candidate_parent: f.candidateParent,
      candidate_tree: f.candidateTree,
      remote: {
        remote: 'origin',
        target_ref: 'refs/heads/tools',
        expected_commit: f.target,
      },
      ...overrides,
    },
  };
}

test('integrate_accepted_candidate only accepts exact branch refs', () => {
  const oid = 'a'.repeat(40);
  assert.throws(() => IntegrateAcceptedCandidateInput.parse({
    target_ref: 'refs/tags/tools',
    expected_target_commit: oid,
    candidate_commit: 'b'.repeat(40),
    candidate_parent: oid,
    remote: { remote: 'origin', target_ref: 'refs/heads/tools', expected_commit: oid },
  }));
  assert.throws(() => IntegrateAcceptedCandidateInput.parse({
    target_ref: 'refs/heads/tools',
    expected_target_commit: oid,
    candidate_commit: 'b'.repeat(40),
    candidate_parent: oid,
    remote: { remote: 'origin', target_ref: 'refs/tags/tools', expected_commit: oid },
  }));
  assert.throws(() => IntegrateAcceptedCandidateInput.parse({
    target_ref: 'refs/heads/tools',
    expected_target_commit: oid,
    candidate_commit: 'b'.repeat(40),
    candidate_parent: oid,
    remote: { remote: '--upload-pack=evil', target_ref: 'refs/heads/tools', expected_commit: oid },
  }));
});

test('fast-forwards exactly one local branch and exact remote branch', async t => {
  const f = fixture(t);
  const recipe = createIntegrateAcceptedCandidateRecipe();
  const req = request(f);

  assert.deepEqual(await recipe.preflight(req), { status: 'READY' });
  const receipt = await recipe.execute(req);

  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effect_state, 'CONFIRMED');
  assert.equal(receipt.result_refs.some((ref) => ref.id === 'published-target'), true);
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/tools']), f.candidate);
  assert.equal(git(f.repo, ['ls-remote', '--heads', 'origin', 'refs/heads/tools']).split(/\s+/)[0], f.candidate);
  assert.equal(git(f.repo, ['status', '--porcelain=v1']), '');
});

test('candidate identity, parent, target drift, dirty state and non-fast-forward fail closed', async t => {
  const f = fixture(t);
  const recipe = createIntegrateAcceptedCandidateRecipe();

  assert.deepEqual(await recipe.preflight(request(f, { candidate_tree: 'f'.repeat(40) })), {
    status: 'BLOCKED', reason: 'CANDIDATE_TREE_MISMATCH',
  });

  assert.deepEqual(await recipe.preflight(request(f, { candidate_parent: 'e'.repeat(40) })), {
    status: 'BLOCKED', reason: 'CANDIDATE_PARENT_NOT_TARGET_BASELINE',
  });

  const drift = request(f, {
    expected_target_commit: f.candidate,
    remote: { remote: 'origin', target_ref: 'refs/heads/tools', expected_commit: f.candidate },
  });
  drift.context.git.expected_commit = f.candidate;
  assert.deepEqual(await recipe.preflight(drift), { status: 'BLOCKED', reason: 'CANDIDATE_PARENT_NOT_TARGET_BASELINE' });

  fs.writeFileSync(path.join(f.repo, 'uncommitted.txt'), 'dirty\n');
  assert.deepEqual(await recipe.preflight(request(f)), { status: 'BLOCKED', reason: 'WORKTREE_NOT_CLEAN' });
  fs.unlinkSync(path.join(f.repo, 'uncommitted.txt'));

  const divergent = fixture(t, { divergent: true });
  const divergentReq = request(divergent);
  // The recipe intentionally requires a direct-child candidate. For a
  // divergent target this fails even before the merge-base guard.
  assert.deepEqual(await recipe.preflight(divergentReq), {
    status: 'BLOCKED', reason: 'CANDIDATE_PARENT_NOT_TARGET_BASELINE',
  });
});

test('Git URL rewrite configuration blocks effects', async t => {
  const f = fixture(t);
  git(f.repo, ['config', 'url.file:///tmp/rewrite/.insteadOf', 'https://example.invalid/']);
  const recipe = createIntegrateAcceptedCandidateRecipe();
  assert.deepEqual(await recipe.preflight(request(f)), {
    status: 'BLOCKED',
    reason: 'GIT_URL_REWRITE_CONFIG_PRESENT',
  });
});

test('ambiguous remote publication remains UNKNOWN and does not claim published-target evidence', async () => {
  const old = 'a'.repeat(40);
  const candidate = 'b'.repeat(40);
  const tree = 'c'.repeat(40);
  let localTarget = old;
  let remoteReads = 0;

  const ok = (stdout = '') => ({
    exit_code: 0, signal: null, error: null, stdout, stderr: '',
  });

  const fakeGit = {
    version: () => ok('git version fixture'),
    rewriteRules: () => ({ ...ok(''), exit_code: 1 }),
    status: () => ok(''),
    revParse: (_repo, spec) => {
      if (spec === `${candidate}^{commit}`) return ok(candidate);
      if (spec === `${candidate}^1`) return ok(old);
      if (spec === `${candidate}^{tree}`) return ok(tree);
      if (spec === 'refs/heads/tools^{commit}') return ok(localTarget);
      return { ...ok(''), exit_code: 1 };
    },
    symbolicRef: () => ok('refs/heads/tools'),
    isAncestor: () => ok(''),
    fastForwardLocal: () => { localTarget = candidate; return ok(''); },
    lsRemote: () => {
      remoteReads += 1;
      if (remoteReads <= 2) return ok(`${old}\trefs/heads/tools`);
      return { ...ok(''), exit_code: 1, stderr: 'remote unavailable' };
    },
    pushExactRef: () => ({
      exit_code: 1, signal: null, error: null, stdout: '', stderr: 'connection lost after dispatch',
    }),
  };

  const recipe = createIntegrateAcceptedCandidateRecipe({ git: fakeGit });
  const req = {
    recipe_id: 'integrate_accepted_candidate',
    recipe_version: 'v0',
    operation_id: 'OP-INTEGRATE',
    execution_attempt_id: 'AT-UNKNOWN',
    context: {
      schema_version: 'tecnotron-execution-context/v0',
      operation_id: 'OP-INTEGRATE',
      taskcycle_id: 'TC-W2',
      repository: { identity: 'fixture', location: process.cwd() },
      worktree: { identity: 'fixture-worktree', location: process.cwd() },
      git: { expected_ref: 'refs/heads/tools', expected_commit: old },
      runtime: { executor: 'deterministic-recipe', platform: 'fixture', runtime_identity: 'fixture' },
      state_store: { reference: 'fixture-state' },
      authority_refs: [],
      evidence_refs: [],
    },
    authorization: authority,
    evidence_refs: [],
    input: {
      target_ref: 'refs/heads/tools',
      expected_target_commit: old,
      candidate_commit: candidate,
      candidate_parent: old,
      candidate_tree: tree,
      remote: { remote: 'origin', target_ref: 'refs/heads/tools', expected_commit: old },
    },
  };

  assert.deepEqual(await recipe.preflight(req), { status: 'READY' });
  const receipt = await recipe.execute(req);
  assert.equal(receipt.status, 'UNKNOWN');
  assert.equal(receipt.effect_state, 'UNKNOWN');
  assert.equal(receipt.reason, 'REMOTE_PUBLICATION_EFFECT_AMBIGUOUS');
  assert.equal(receipt.result_refs.some((ref) => ref.id === 'published-target'), false);
});

test('non-fast-forward relation is rejected even when supplied identities otherwise match', async () => {
  const old = 'a'.repeat(40);
  const candidate = 'b'.repeat(40);
  const ok = (stdout = '') => ({ exit_code: 0, signal: null, error: null, stdout, stderr: '' });
  const fakeGit = {
    version: () => ok('git version fixture'),
    rewriteRules: () => ({ ...ok(''), exit_code: 1 }),
    status: () => ok(''),
    revParse: (_repo, spec) => {
      if (spec === `${candidate}^{commit}`) return ok(candidate);
      if (spec === `${candidate}^1`) return ok(old);
      if (spec === 'refs/heads/tools^{commit}') return ok(old);
      return { ...ok(''), exit_code: 1 };
    },
    symbolicRef: () => ok('refs/heads/tools'),
    isAncestor: () => ({ ...ok(''), exit_code: 1 }),
    lsRemote: () => ok(`${old}\trefs/heads/tools`),
    fastForwardLocal: () => { throw new Error('must not execute'); },
    pushExactRef: () => { throw new Error('must not execute'); },
  };

  const recipe = createIntegrateAcceptedCandidateRecipe({ git: fakeGit });
  const req = {
    recipe_id: 'integrate_accepted_candidate',
    recipe_version: 'v0',
    operation_id: 'OP-INTEGRATE',
    execution_attempt_id: 'AT-NFF',
    context: {
      schema_version: 'tecnotron-execution-context/v0',
      operation_id: 'OP-INTEGRATE',
      taskcycle_id: 'TC-W2',
      repository: { identity: 'fixture', location: process.cwd() },
      git: { expected_ref: 'refs/heads/tools', expected_commit: old },
      runtime: { executor: 'deterministic-recipe', platform: 'fixture', runtime_identity: 'fixture' },
      state_store: { reference: 'fixture-state' },
      authority_refs: [],
      evidence_refs: [],
    },
    authorization: authority,
    evidence_refs: [],
    input: {
      target_ref: 'refs/heads/tools',
      expected_target_commit: old,
      candidate_commit: candidate,
      candidate_parent: old,
      remote: { remote: 'origin', target_ref: 'refs/heads/tools', expected_commit: old },
    },
  };

  assert.deepEqual(await recipe.preflight(req), {
    status: 'BLOCKED',
    reason: 'NON_FAST_FORWARD_CANDIDATE',
  });
});
