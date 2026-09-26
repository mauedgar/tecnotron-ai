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

const integrationAuthority = {
  disposition: 'AUTHORIZED',
  authority_reference: 'DEV-W2',
  effect_constraints: [
    { effect: 'git.integration', scope: 'exact target ref only' },
  ],
};
const publishAuthority = {
  ...integrationAuthority,
  effect_constraints: [
    ...integrationAuthority.effect_constraints,
    { effect: 'git.remote.write', scope: 'exact remote target ref only' },
  ],
};

function git(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  if (!allowFailure) assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-integrate-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const remote = path.join(root, 'remote.git');
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  git(root, ['init', '--bare', remote]);
  git(repo, ['init']);
  git(repo, ['config', 'user.email', 'fixture@example.invalid']);
  git(repo, ['config', 'user.name', 'Fixture']);
  git(repo, ['checkout', '-b', 'tools']);
  fs.writeFileSync(path.join(repo, 'base.txt'), 'base\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', 'base']);
  const base = git(repo, ['rev-parse', 'HEAD']);
  git(repo, ['remote', 'add', 'origin', remote]);
  git(repo, ['push', '-u', 'origin', 'tools']);

  git(repo, ['branch', 'unrelated']);
  git(repo, ['push', 'origin', 'unrelated']);
  const unrelatedLocal = git(repo, ['rev-parse', 'refs/heads/unrelated']);
  const unrelatedRemote = git(repo, ['ls-remote', '--heads', 'origin', 'refs/heads/unrelated']).split(/\s+/)[0];

  git(repo, ['checkout', '-b', 'candidate']);
  fs.writeFileSync(path.join(repo, 'candidate.txt'), 'candidate\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', 'candidate']);
  const candidate = git(repo, ['rev-parse', 'HEAD']);
  const tree = git(repo, ['rev-parse', 'HEAD^{tree}']);
  const parent = git(repo, ['rev-parse', 'HEAD^1']);
  git(repo, ['checkout', 'tools']);
  return { root, remote, repo, base, candidate, tree, parent, unrelatedLocal, unrelatedRemote };
}

function request(f, { publish = false, authorization = integrationAuthority, input = {} } = {}) {
  return {
    recipe_id: 'integrate_accepted_candidate',
    recipe_version: 'v0',
    operation_id: 'OP-INTEGRATE',
    execution_attempt_id: 'AT-INTEGRATE',
    context: {
      schema_version: 'tecnotron-execution-context/v0',
      operation_id: 'OP-INTEGRATE',
      taskcycle_id: 'TC-001',
      repository: { identity: 'fixture', location: f.repo },
      worktree: { identity: 'fixture-worktree', location: f.repo },
      git: { expected_ref: 'refs/heads/tools', expected_commit: f.base },
      runtime: { executor: 'test', platform: process.platform, runtime_identity: process.version },
      state_store: { reference: 'fixture-state' },
      authority_refs: [],
      evidence_refs: [],
    },
    authorization,
    evidence_refs: [{ kind: 'EVIDENCE', id: 'candidate-accepted' }],
    input: {
      target_ref: 'refs/heads/tools',
      expected_target_commit: f.base,
      candidate_commit: f.candidate,
      candidate_parent: f.parent,
      candidate_tree: f.tree,
      ...(publish ? { remote: { remote: 'origin', target_ref: 'refs/heads/tools', expected_commit: f.base } } : {}),
      ...input,
    },
  };
}

test('input accepts local-only and rejects non-branch refs', () => {
  const oid = 'a'.repeat(40);
  assert.doesNotThrow(() => IntegrateAcceptedCandidateInput.parse({
    target_ref: 'refs/heads/tools', expected_target_commit: oid,
    candidate_commit: 'b'.repeat(40), candidate_parent: oid,
  }));
  assert.throws(() => IntegrateAcceptedCandidateInput.parse({
    target_ref: 'refs/tags/tools', expected_target_commit: oid,
    candidate_commit: 'b'.repeat(40), candidate_parent: oid,
  }));
});

test('local-only integration PASS requires no remote authority and performs no remote mutation', async t => {
  const f = fixture(t);
  const recipe = createIntegrateAcceptedCandidateRecipe();
  const req = request(f);
  assert.deepEqual(recipe.definition.effects, [{ effect: 'git.integration', scope: 'exact target ref only' }]);
  assert.deepEqual(await recipe.preflight(req), { status: 'READY' });
  const receipt = await recipe.execute(req);
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effect_state, 'CONFIRMED');
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/tools']), f.candidate);
  assert.equal(git(f.repo, ['ls-remote', '--heads', 'origin', 'refs/heads/tools']).split(/\s+/)[0], f.base);
  assert.deepEqual(receipt.output.remote, {
    publication_requested: false,
    publication_authorized: false,
    publication_performed: false,
    target_ref: null,
    before: null,
    after: null,
    exact_correspondence: null,
  });
  assert.equal(receipt.output.local.before, f.base);
  assert.equal(receipt.output.local.after, f.candidate);
  assert.equal(receipt.output.candidate.tree, f.tree);
  assert.deepEqual(receipt.evidence_refs, req.evidence_refs);
});

test('local plus explicitly authorized publication preserves PASS and structured correspondence', async t => {
  const f = fixture(t);
  const recipe = createIntegrateAcceptedCandidateRecipe();
  const receipt = await recipe.execute(request(f, { publish: true, authorization: publishAuthority }));
  assert.equal(receipt.status, 'PASS');
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/tools']), f.candidate);
  assert.equal(git(f.repo, ['ls-remote', '--heads', 'origin', 'refs/heads/tools']).split(/\s+/)[0], f.candidate);
  assert.equal(receipt.output.remote.publication_requested, true);
  assert.equal(receipt.output.remote.publication_authorized, true);
  assert.equal(receipt.output.remote.publication_performed, true);
  assert.equal(receipt.output.remote.exact_correspondence, true);
});

test('publication requested without remote authority blocks before any local or remote effect', async t => {
  const f = fixture(t);
  const recipe = createIntegrateAcceptedCandidateRecipe();
  const req = request(f, { publish: true, authorization: integrationAuthority });
  assert.deepEqual(await recipe.preflight(req), { status: 'BLOCKED', reason: 'REMOTE_PUBLICATION_AUTHORIZATION_REQUIRED' });
  const receipt = await recipe.execute(req);
  assert.equal(receipt.status, 'FAIL');
  assert.equal(receipt.effect_state, 'NONE');
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/tools']), f.base);
  assert.equal(git(f.repo, ['ls-remote', '--heads', 'origin', 'refs/heads/tools']).split(/\s+/)[0], f.base);
});

test('unrelated local and remote refs remain unchanged for publication path', async t => {
  const f = fixture(t);
  const recipe = createIntegrateAcceptedCandidateRecipe();
  const receipt = await recipe.execute(request(f, { publish: true, authorization: publishAuthority }));
  assert.equal(receipt.status, 'PASS');
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/unrelated']), f.unrelatedLocal);
  assert.equal(git(f.repo, ['ls-remote', '--heads', 'origin', 'refs/heads/unrelated']).split(/\s+/)[0], f.unrelatedRemote);
});

test('candidate identity drift fails closed', async t => {
  const f = fixture(t);
  const recipe = createIntegrateAcceptedCandidateRecipe();
  assert.deepEqual(await recipe.preflight(request(f, { input: { candidate_tree: 'f'.repeat(40) } })), {
    status: 'BLOCKED', reason: 'CANDIDATE_TREE_MISMATCH',
  });
});

test('non-fast-forward relation fails closed', async () => {
  const old='a'.repeat(40), candidate='b'.repeat(40);
  const ok=(stdout='')=>({exit_code:0,signal:null,error:null,stdout,stderr:''});
  const fakeGit={
    version:()=>ok('git version'), rewriteRules:()=>({...ok(''),exit_code:1}), status:()=>ok(''),
    revParse:(_repo,spec)=>spec===`${candidate}^{commit}`?ok(candidate):spec===`${candidate}^1`?ok(old):spec==='refs/heads/tools^{commit}'?ok(old):({...ok(''),exit_code:1}),
    isAncestor:()=>({...ok(''),exit_code:1}), lsRemote:()=>{throw new Error('remote must not be used');},
    fastForwardLocal:()=>{throw new Error('must not execute');}, symbolicRef:()=>ok('refs/heads/tools'), pushExactRef:()=>{throw new Error('must not execute');},
  };
  const recipe=createIntegrateAcceptedCandidateRecipe({git:fakeGit});
  const req={recipe_id:'integrate_accepted_candidate',recipe_version:'v0',operation_id:'OP',execution_attempt_id:'AT',context:{schema_version:'tecnotron-execution-context/v0',operation_id:'OP',taskcycle_id:'TC',repository:{identity:'x',location:process.cwd()},git:{expected_ref:'refs/heads/tools',expected_commit:old},runtime:{executor:'x',platform:'x',runtime_identity:'x'},state_store:{reference:'x'},authority_refs:[],evidence_refs:[]},authorization:integrationAuthority,evidence_refs:[],input:{target_ref:'refs/heads/tools',expected_target_commit:old,candidate_commit:candidate,candidate_parent:old}};
  assert.deepEqual(await recipe.preflight(req), {status:'BLOCKED',reason:'NON_FAST_FORWARD_CANDIDATE'});
});

test('remote drift fails closed only when publication applies', async t => {
  const f = fixture(t);
  git(f.repo, ['checkout', '-b', 'remote-drift']);
  fs.writeFileSync(path.join(f.repo, 'drift.txt'), 'drift\n');
  git(f.repo, ['add', '.']); git(f.repo, ['commit', '-m', 'drift']); git(f.repo, ['push', 'origin', 'HEAD:tools']);
  git(f.repo, ['checkout', 'tools']);
  const recipe = createIntegrateAcceptedCandidateRecipe();
  assert.deepEqual(await recipe.preflight(request(f, { publish: true, authorization: publishAuthority })), {
    status: 'BLOCKED', reason: 'REMOTE_TARGET_DRIFT',
  });
  assert.deepEqual(await recipe.preflight(request(f)), { status: 'READY' });
});

test('ambiguous remote effect remains UNKNOWN and never claims published correspondence', async () => {
  const old='a'.repeat(40), candidate='b'.repeat(40), tree='c'.repeat(40); let local=old; let remoteReads=0;
  const ok=(stdout='')=>({exit_code:0,signal:null,error:null,stdout,stderr:''});
  const fakeGit={
    version:()=>ok('git version'), rewriteRules:()=>({...ok(''),exit_code:1}), status:()=>ok(''), symbolicRef:()=>ok('refs/heads/tools'), isAncestor:()=>ok(''),
    revParse:(_repo,spec)=>spec===`${candidate}^{commit}`?ok(candidate):spec===`${candidate}^1`?ok(old):spec===`${candidate}^{tree}`?ok(tree):spec==='refs/heads/tools^{commit}'?ok(local):({...ok(''),exit_code:1}),
    fastForwardLocal:()=>{local=candidate;return ok('');},
    lsRemote:()=>{remoteReads++; if(remoteReads<=1)return ok(`${old}\trefs/heads/tools`); return {...ok(''),exit_code:1,stderr:'lost'};},
    pushExactRef:()=>({exit_code:1,signal:null,error:null,stdout:'',stderr:'connection lost after dispatch'}),
  };
  const recipe=createIntegrateAcceptedCandidateRecipe({git:fakeGit});
  const req={recipe_id:'integrate_accepted_candidate',recipe_version:'v0',operation_id:'OP',execution_attempt_id:'AT',context:{schema_version:'tecnotron-execution-context/v0',operation_id:'OP',taskcycle_id:'TC',repository:{identity:'x',location:process.cwd()},git:{expected_ref:'refs/heads/tools',expected_commit:old},runtime:{executor:'x',platform:'x',runtime_identity:'x'},state_store:{reference:'x'},authority_refs:[],evidence_refs:[]},authorization:publishAuthority,evidence_refs:[],input:{target_ref:'refs/heads/tools',expected_target_commit:old,candidate_commit:candidate,candidate_parent:old,candidate_tree:tree,remote:{remote:'origin',target_ref:'refs/heads/tools',expected_commit:old}}};
  const receipt=await recipe.execute(req);
  assert.equal(receipt.status,'UNKNOWN');
  assert.equal(receipt.effect_state,'UNKNOWN');
  assert.equal(receipt.reason,'REMOTE_PUBLICATION_EFFECT_AMBIGUOUS');
  assert.equal(receipt.result_refs.some(ref=>ref.id==='published-target'),false);
  assert.equal(receipt.output.remote.exact_correspondence,false);
});

const {
  RecipeRegistry,
} = require('../../src/operational-spine-v0/recipe-registry');
const {
  createOperationalSpine,
} = require('../../src/operational-spine-v0');
const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../../src/operational-spine-v0/contracts');

const planAuthorityRef = {
  kind: 'AUTHORITY',
  id: 'DEV-W2',
  location: 'evidence/dev-w2.json',
};

function spineContext(f, operationId = 'OP-INTEGRATE') {
  return {
    schema_version: 'tecnotron-execution-context/v0',
    operation_id: operationId,
    taskcycle_id: 'TC-001',
    repository: { identity: 'fixture', location: f.repo },
    worktree: { identity: 'fixture-worktree', location: f.repo },
    git: { expected_ref: 'refs/heads/tools', expected_commit: f.base },
    runtime: { executor: 'test', platform: process.platform, runtime_identity: process.version },
    state_store: { reference: 'fixture-state' },
    authority_refs: [planAuthorityRef],
    evidence_refs: [],
  };
}

function operationalHarness(f) {
  const registry = new RecipeRegistry();
  registry.register(createIntegrateAcceptedCandidateRecipe());
  const counters = { ensure: 0, attempts: 0, dispatched: 0, running: 0, outcomes: 0 };
  const stateKernel = {
    inspectOperation(id) {
      return { aggregate: { kind: 'Operation', id, taskcycle_id: 'TC-001', state: 'DEFINED' } };
    },
    ensureOperationRunning() { counters.ensure += 1; },
    startAttempt() { counters.attempts += 1; },
    markAttemptDispatched() { counters.dispatched += 1; },
    markAttemptRunning() { counters.running += 1; },
    recordPreflightTerminal() { counters.outcomes += 1; return { attempt: {}, operation: {} }; },
    recordExecutionOutcome() { counters.outcomes += 1; return { attempt: {}, operation: {} }; },
  };
  const records = {
    savePlan() { return { kind: 'ARTIFACT', id: 'plan' }; },
    saveReceipt() { return { kind: 'ARTIFACT', id: 'receipt' }; },
  };
  const coordinator = {
    async runAttempt(coordinatorRequest) {
      const receipt = await registry.execute(coordinatorRequest.input.recipe_request);
      return {
        operation_id: coordinatorRequest.operation_id,
        execution_attempt_id: coordinatorRequest.execution_attempt_id,
        status: receipt.status === 'PASS' ? 'SUCCESS' : receipt.status === 'UNKNOWN' ? 'UNKNOWN' : 'FAILED',
        started: true,
        ...(receipt.status === 'PASS' ? {} : { reason: receipt.reason }),
        result: receipt,
        evidence_refs: [],
      };
    },
  };
  return {
    registry,
    counters,
    spine: createOperationalSpine({ stateKernel, recipeRegistry: registry, executionCoordinator: coordinator, executionRecordStore: records }),
  };
}

function conformingHarness() {
  return { disposition: 'CONFORMING', evidence_ref: 'fixture:harness' };
}

test('dynamic effect planning binds local-only to git.integration and executes without remote authority', async t => {
  const f = fixture(t);
  const { spine, counters } = operationalHarness(f);
  const input = request(f).input;
  const plan = spine.plan({
    operationId: 'OP-INTEGRATE',
    executionContext: spineContext(f),
    requiredCapabilities: ['git.integration'],
    authorityRefs: [planAuthorityRef],
    evidenceRefs: [],
    input,
  });
  assert.deepEqual(plan.expected_effects, [
    { effect: 'git.integration', scope: 'exact target ref only' },
  ]);
  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-SPINE-LOCAL',
    authorization: integrationAuthority,
    harnessConformance: conformingHarness(),
    input,
  });
  assert.equal(result.status, 'SUCCESS');
  assert.equal(counters.dispatched, 1);
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/tools']), f.candidate);
  assert.equal(git(f.repo, ['ls-remote', '--heads', 'origin', 'refs/heads/tools']).split(/\s+/)[0], f.base);
});

test('dynamic effect planning binds publication to both effects and rejects missing remote authority before dispatch', async t => {
  const f = fixture(t);
  const { spine, counters } = operationalHarness(f);
  const input = request(f, { publish: true, authorization: publishAuthority }).input;
  const plan = spine.plan({
    operationId: 'OP-INTEGRATE', executionContext: spineContext(f),
    requiredCapabilities: ['git.integration', 'git.remote.write'], authorityRefs: [planAuthorityRef], evidenceRefs: [], input,
  });
  assert.deepEqual(plan.expected_effects, [
    { effect: 'git.integration', scope: 'exact target ref only' },
    { effect: 'git.remote.write', scope: 'exact remote target ref only' },
  ]);
  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-SPINE-PUBLISH-NOAUTH', authorization: integrationAuthority,
    harnessConformance: conformingHarness(), input,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'EFFECT_AUTHORIZATION_INCOMPLETE');
  assert.equal(counters.attempts, 0);
  assert.equal(counters.dispatched, 0);
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/tools']), f.base);
  assert.equal(git(f.repo, ['ls-remote', '--heads', 'origin', 'refs/heads/tools']).split(/\s+/)[0], f.base);
});

test('local-only plan cannot be executed with publication input and produces no attempt or Git effect', async t => {
  const f = fixture(t);
  const { spine, counters } = operationalHarness(f);
  const localInput = request(f).input;
  const publicationInput = request(f, { publish: true, authorization: publishAuthority }).input;
  const plan = spine.plan({
    operationId: 'OP-INTEGRATE', executionContext: spineContext(f), requiredCapabilities: ['git.integration'],
    authorityRefs: [planAuthorityRef], evidenceRefs: [], input: localInput,
  });
  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-MISMATCH-LOCAL-TO-PUBLISH', authorization: publishAuthority,
    harnessConformance: conformingHarness(), input: publicationInput,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'EXECUTION_INPUT_EFFECT_PROFILE_MISMATCH');
  assert.equal(counters.ensure, 0); assert.equal(counters.attempts, 0); assert.equal(counters.dispatched, 0);
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/tools']), f.base);
  assert.equal(git(f.repo, ['ls-remote', '--heads', 'origin', 'refs/heads/tools']).split(/\s+/)[0], f.base);
});

test('publication plan cannot be executed with local-only input and produces no attempt or Git effect', async t => {
  const f = fixture(t);
  const { spine, counters } = operationalHarness(f);
  const publicationInput = request(f, { publish: true, authorization: publishAuthority }).input;
  const localInput = request(f).input;
  const plan = spine.plan({
    operationId: 'OP-INTEGRATE', executionContext: spineContext(f), requiredCapabilities: ['git.integration', 'git.remote.write'],
    authorityRefs: [planAuthorityRef], evidenceRefs: [], input: publicationInput,
  });
  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-MISMATCH-PUBLISH-TO-LOCAL', authorization: publishAuthority,
    harnessConformance: conformingHarness(), input: localInput,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'EXECUTION_INPUT_EFFECT_PROFILE_MISMATCH');
  assert.equal(counters.attempts, 0); assert.equal(counters.dispatched, 0);
  assert.equal(git(f.repo, ['rev-parse', 'refs/heads/tools']), f.base);
});

test('Recipe without effectsForInput retains static definition.effects behavior', () => {
  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id: 'static-recipe', version: 'v0', provides: ['fixture.static'],
      effects: [{ effect: 'fixture.write', scope: 'fixed' }],
    }),
    async execute(req) {
      return RecipeReceipt.parse({ schema_version:'tecnotron-recipe-receipt/v0', receipt_ref:'r', recipe_id:req.recipe_id, recipe_version:req.recipe_version, operation_id:req.operation_id, execution_attempt_id:req.execution_attempt_id, status:'PASS', effect_state:'CONFIRMED', result_refs:[], evidence_refs:[] });
    },
  });
  assert.deepEqual(registry.resolveEffects('static-recipe', 'v0', { ignored: true }), [
    { effect: 'fixture.write', scope: 'fixed' },
  ]);
});

test('malformed dynamic effect profile fails closed instead of falling back to static effects', () => {
  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id:'bad-effects', version:'v0', provides:['fixture.bad'],
      effects:[{ effect:'fixture.static', scope:'fixed' }],
    }),
    effectsForInput() { return [{ effect: '', scope: 'invalid' }]; },
    async execute() { throw new Error('must not execute'); },
  });
  assert.throws(() => registry.resolveEffects('bad-effects', 'v0', {}));
});
