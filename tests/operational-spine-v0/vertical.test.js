'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { FilesystemStateStore } = require('../../src/state-kernel-v0/store');
const { create, transition, inspect, render } = require('../../src/state-kernel-v0');
const { createExecutionCoordinator } = require('../../src/execution-coordinator');
const {
  RecipeRegistry,
  createRecipeExecutionSurface,
  createOperationalSpine,
  createStateKernelAdapter,
  FilesystemExecutionRecordStore,
  createRenderCurrentStateRecipe,
} = require('../../src/operational-spine-v0');
const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../../src/operational-spine-v0/contracts');

const authorityRef = {
  kind: 'AUTHORITY',
  id: 'DEV-W2',
  location: 'evidence/dev-w2.json',
  sha256: 'a'.repeat(64),
};

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-spine-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const store = new FilesystemStateStore(home);
  store.initialize();
  create(store, store.verify().revision, 'TaskCycle', 'TC-W2', {
    responsibility: 'TEST_OPERATIONAL_SPINE',
    obligations: [{ id: 'implementation' }],
  }, [authorityRef]);
  transition(store, store.verify().revision, 'TaskCycle', 'TC-W2', 'ACTIVE');
  return { home, store };
}

function operation(store, id, objective) {
  create(store, store.verify().revision, 'Operation', id, {
    taskcycle_id: 'TC-W2',
    objective,
  }, [authorityRef]);
}

function executionContext(home, operationId, overrides = {}) {
  return {
    schema_version: 'tecnotron-execution-context/v0',
    operation_id: operationId,
    taskcycle_id: 'TC-W2',
    repository: { identity: 'fixture/repository', location: home },
    runtime: {
      executor: 'deterministic-recipe',
      platform: process.platform,
      runtime_identity: `node:${process.version}`,
    },
    state_store: { reference: 'fixture-kernel', location: home },
    authority_refs: [authorityRef],
    evidence_refs: [],
    ...overrides,
  };
}

function harness() {
  return { disposition: 'CONFORMING', evidence_ref: 'evidence:harness' };
}

function authorization(effect = 'state.render', scope = 'none') {
  return {
    disposition: 'AUTHORIZED',
    authority_reference: 'DEV-W2',
    effect_constraints: [{ effect, scope }],
  };
}

function buildSpine(store, registry, home) {
  const surface = createRecipeExecutionSurface({ recipeRegistry: registry });
  const coordinator = createExecutionCoordinator({ executionSurface: surface });
  return createOperationalSpine({
    stateKernel: createStateKernelAdapter({ store }),
    recipeRegistry: registry,
    executionCoordinator: coordinator,
    executionRecordStore: new FilesystemExecutionRecordStore(home),
  });
}

test('durable Operation resolves deterministic recipe, records attempt, and reloads without chat history', async t => {
  const { home, store } = fixture(t);
  operation(store, 'OP-RENDER', 'render current durable state');

  const registry = new RecipeRegistry();
  registry.register(createRenderCurrentStateRecipe({ renderState: () => render(store) }));
  const spine = buildSpine(store, registry, home);

  const plan = spine.plan({
    operationId: 'OP-RENDER',
    executionContext: executionContext(home, 'OP-RENDER'),
    requiredCapabilities: ['state.render'],
    authorityRefs: [authorityRef],
  });
  assert.equal(plan.resolution, 'DETERMINISTIC_RECIPE');

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-RENDER-001',
    authorization: authorization(),
    harnessConformance: harness(),
    input: {},
  });

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.receipt.status, 'PASS');
  assert.equal(inspect(store, 'ExecutionAttempt', 'AT-RENDER-001').aggregate.outcome, 'PASS');
  assert.equal(inspect(store, 'Operation', 'OP-RENDER').aggregate.state, 'COMPLETED');

  const freshStore = new FilesystemStateStore(home);
  assert.equal(freshStore.verify().valid, true);
  assert.equal(inspect(freshStore, 'Operation', 'OP-RENDER').aggregate.state, 'COMPLETED');
  assert.equal(inspect(freshStore, 'ExecutionAttempt', 'AT-RENDER-001').aggregate.state, 'COMPLETED');

  const freshRecords = new FilesystemExecutionRecordStore(home);
  assert.equal(freshRecords.loadPlan('OP-RENDER').recipe.id, 'render_current_state');
  assert.equal(freshRecords.loadReceipt('AT-RENDER-001').status, 'PASS');
});

test('operation with no deterministic recipe yields explicit semantic escalation and no attempt', t => {
  const { home, store } = fixture(t);
    operation(store, 'OP-SEMANTIC', 'requires semantic reasoning');
    const registry = new RecipeRegistry();
    const spine = buildSpine(store, registry, home);
    const plan = spine.plan({
      operationId: 'OP-SEMANTIC',
      executionContext: executionContext(home, 'OP-SEMANTIC'),
      requiredCapabilities: ['semantic_reasoning.high'],
      authorityRefs: [authorityRef],
    });
    assert.equal(plan.resolution, 'SEMANTIC_ESCALATION_REQUIRED');
    assert.equal(plan.semantic_escalation.reason, 'NO_DETERMINISTIC_RECIPE');
    assert.equal(inspect(store, 'Operation', 'OP-SEMANTIC').aggregate.state, 'DEFINED');
  assert.equal(Object.keys(store.read().state.aggregates.ExecutionAttempt).length, 0);
});

test('UNKNOWN remains first-class and State Kernel forbids blind retry', async t => {
  const { home, store } = fixture(t);
  operation(store, 'OP-UNKNOWN', 'exercise unknown effect');

  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id: 'unknown-effect-probe',
      version: 'v0',
      provides: ['fixture.unknown_effect'],
      required_inputs: [],
      preconditions: [],
      effects: [{ effect: 'fixture.write', scope: 'fixture-only' }],
      postconditions: [],
    }),
    async preflight() { return { status: 'READY' }; },
    async execute(request) {
      return RecipeReceipt.parse({
        schema_version: 'tecnotron-recipe-receipt/v0',
        receipt_ref: `recipe-receipt:${request.execution_attempt_id}:unknown`,
        recipe_id: request.recipe_id,
        recipe_version: request.recipe_version,
        operation_id: request.operation_id,
        execution_attempt_id: request.execution_attempt_id,
        status: 'UNKNOWN',
        effect_state: 'UNKNOWN',
        reason: 'FIXTURE_EFFECT_AMBIGUOUS',
        result_refs: [],
        evidence_refs: [],
      });
    },
  });

  const spine = buildSpine(store, registry, home);
  const plan = spine.plan({
    operationId: 'OP-UNKNOWN',
    executionContext: executionContext(home, 'OP-UNKNOWN'),
    requiredCapabilities: ['fixture.unknown_effect'],
    authorityRefs: [authorityRef],
  });

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-UNKNOWN-001',
    authorization: authorization('fixture.write', 'fixture-only'),
    harnessConformance: harness(),
    input: {},
  });

  assert.equal(result.status, 'UNKNOWN');
  const attempt = inspect(store, 'ExecutionAttempt', 'AT-UNKNOWN-001').aggregate;
  assert.equal(attempt.state, 'UNKNOWN');
  assert.equal(attempt.outcome, 'UNKNOWN');
  assert.equal(attempt.reconciliation_required, true);
  assert.equal(inspect(store, 'Operation', 'OP-UNKNOWN').aggregate.state, 'RUNNING');

  await assert.rejects(
    spine.executePlan(plan, {
      executionAttemptId: 'AT-UNKNOWN-002',
      authorization: authorization('fixture.write', 'fixture-only'),
      harnessConformance: harness(),
      input: {},
    }),
    (error) => error.code === 'UNKNOWN_EFFECT_REQUIRES_RECONCILIATION',
  );
});

test('exception after dispatch becomes UNKNOWN instead of false pre-start failure', async t => {
  const { home, store } = fixture(t);
  operation(store, 'OP-THROW', 'simulate effect then transport exception');
  let effectOccurred = false;

  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id: 'throw-after-effect',
      version: 'v0',
      provides: ['fixture.throw_after_effect'],
      required_inputs: [],
      preconditions: [],
      effects: [{ effect: 'fixture.write', scope: 'fixture-only' }],
      postconditions: [],
    }),
    async execute() {
      effectOccurred = true;
      throw new Error('transport lost after effect');
    },
  });

  const spine = buildSpine(store, registry, home);
  const plan = spine.plan({
    operationId: 'OP-THROW',
    executionContext: executionContext(home, 'OP-THROW'),
    requiredCapabilities: ['fixture.throw_after_effect'],
    authorityRefs: [authorityRef],
  });

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-THROW-001',
    authorization: authorization('fixture.write', 'fixture-only'),
    harnessConformance: harness(),
    input: {},
  });

  assert.equal(effectOccurred, true);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.receipt.status, 'UNKNOWN');
  assert.equal(result.receipt.effect_state, 'UNKNOWN');
  assert.equal(inspect(store, 'ExecutionAttempt', 'AT-THROW-001').aggregate.reconciliation_required, true);
});

test('ExecutionPlan alone does not authorize recipe effects', async t => {
  const { home, store } = fixture(t);
  operation(store, 'OP-AUTH', 'require explicit effect authority');
  let calls = 0;

  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id: 'write-probe',
      version: 'v0',
      provides: ['fixture.write'],
      required_inputs: [],
      preconditions: [],
      effects: [{ effect: 'fixture.write', scope: 'exact-fixture' }],
      postconditions: [],
    }),
    async execute(request) {
      calls += 1;
      return RecipeReceipt.parse({
        schema_version: 'tecnotron-recipe-receipt/v0',
        receipt_ref: `receipt:${request.execution_attempt_id}`,
        recipe_id: request.recipe_id,
        recipe_version: request.recipe_version,
        operation_id: request.operation_id,
        execution_attempt_id: request.execution_attempt_id,
        status: 'PASS',
        effect_state: 'CONFIRMED',
        result_refs: [],
        evidence_refs: [],
      });
    },
  });

  const spine = buildSpine(store, registry, home);
  const plan = spine.plan({
    operationId: 'OP-AUTH',
    executionContext: executionContext(home, 'OP-AUTH'),
    requiredCapabilities: ['fixture.write'],
    authorityRefs: [authorityRef],
  });

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-AUTH-NOT-CREATED',
    authorization: authorization('fixture.write', 'broader-or-different-scope'),
    harnessConformance: harness(),
    input: {},
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'EFFECT_AUTHORIZATION_INCOMPLETE');
  assert.equal(calls, 0);
  assert.equal(inspect(store, 'Operation', 'OP-AUTH').aggregate.state, 'DEFINED');
});

test('post-dispatch coordinator no-start result is preserved as UNKNOWN', async t => {
  const { home, store } = fixture(t);
  operation(store, 'OP-COORDINATOR-NO-START', 'exercise post-dispatch coordinator ambiguity');

  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id: 'coordinator-no-start-probe',
      version: 'v0',
      provides: ['fixture.coordinator_no_start'],
      required_inputs: [],
      preconditions: [],
      effects: [{ effect: 'fixture.write', scope: 'fixture-only' }],
      postconditions: [],
    }),
    async preflight() { return { status: 'READY' }; },
    async execute() { throw new Error('custom coordinator must own execution in this test'); },
  });

  const spine = createOperationalSpine({
    stateKernel: createStateKernelAdapter({ store }),
    recipeRegistry: registry,
    executionCoordinator: {
      async runAttempt(request) {
        return {
          operation_id: request.operation_id,
          execution_attempt_id: request.execution_attempt_id,
          status: 'FAILED',
          started: false,
          reason: 'GENERIC_SURFACE_ERROR_BEFORE_CONFIRMED_START',
          evidence_refs: [],
        };
      },
    },
    executionRecordStore: new FilesystemExecutionRecordStore(home),
  });

  const plan = spine.plan({
    operationId: 'OP-COORDINATOR-NO-START',
    executionContext: executionContext(home, 'OP-COORDINATOR-NO-START'),
    requiredCapabilities: ['fixture.coordinator_no_start'],
    authorityRefs: [authorityRef],
  });

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-COORDINATOR-NO-START-001',
    authorization: authorization('fixture.write', 'fixture-only'),
    harnessConformance: harness(),
    input: {},
  });

  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.receipt.effect_state, 'UNKNOWN');
  assert.match(result.receipt.reason, /^POST_DISPATCH_COORDINATOR_FAILED:/);
  assert.equal(inspect(store, 'ExecutionAttempt', 'AT-COORDINATOR-NO-START-001').aggregate.reconciliation_required, true);
});

test('recipe receipt identity substitution becomes UNKNOWN after dispatch', async t => {
  const { home, store } = fixture(t);
  operation(store, 'OP-RECEIPT-IDENTITY', 'reject substituted receipt identity');

  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id: 'identity-substitution-probe',
      version: 'v0',
      provides: ['fixture.identity_substitution'],
      required_inputs: [],
      preconditions: [],
      effects: [{ effect: 'fixture.write', scope: 'fixture-only' }],
      postconditions: [],
    }),
    async preflight() { return { status: 'READY' }; },
    async execute(request) {
      return RecipeReceipt.parse({
        schema_version: 'tecnotron-recipe-receipt/v0',
        receipt_ref: `receipt:${request.execution_attempt_id}:substituted`,
        recipe_id: request.recipe_id,
        recipe_version: request.recipe_version,
        operation_id: 'OP-SUBSTITUTED',
        execution_attempt_id: request.execution_attempt_id,
        status: 'PASS',
        effect_state: 'CONFIRMED',
        result_refs: [],
        evidence_refs: [],
      });
    },
  });

  const spine = buildSpine(store, registry, home);
  const plan = spine.plan({
    operationId: 'OP-RECEIPT-IDENTITY',
    executionContext: executionContext(home, 'OP-RECEIPT-IDENTITY'),
    requiredCapabilities: ['fixture.identity_substitution'],
    authorityRefs: [authorityRef],
  });

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-RECEIPT-IDENTITY-001',
    authorization: authorization('fixture.write', 'fixture-only'),
    harnessConformance: harness(),
    input: {},
  });

  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.receipt.reason, 'RECIPE_EXECUTION_EXCEPTION_AFTER_DISPATCH');
  assert.equal(inspect(store, 'ExecutionAttempt', 'AT-RECEIPT-IDENTITY-001').aggregate.reconciliation_required, true);
});

test('receipt persistence failure after execution becomes UNKNOWN', async t => {
  const { home, store } = fixture(t);
  operation(store, 'OP-RECEIPT-PERSISTENCE', 'preserve ambiguity when receipt persistence fails');
  let effectOccurred = false;

  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id: 'receipt-persistence-probe',
      version: 'v0',
      provides: ['fixture.receipt_persistence'],
      required_inputs: [],
      preconditions: [],
      effects: [{ effect: 'fixture.write', scope: 'fixture-only' }],
      postconditions: [],
    }),
    async preflight() { return { status: 'READY' }; },
    async execute(request) {
      effectOccurred = true;
      return RecipeReceipt.parse({
        schema_version: 'tecnotron-recipe-receipt/v0',
        receipt_ref: `receipt:${request.execution_attempt_id}`,
        recipe_id: request.recipe_id,
        recipe_version: request.recipe_version,
        operation_id: request.operation_id,
        execution_attempt_id: request.execution_attempt_id,
        status: 'PASS',
        effect_state: 'CONFIRMED',
        result_refs: [],
        evidence_refs: [],
      });
    },
  });

  const records = new FilesystemExecutionRecordStore(home);
  const spine = createOperationalSpine({
    stateKernel: createStateKernelAdapter({ store }),
    recipeRegistry: registry,
    executionCoordinator: createExecutionCoordinator({
      executionSurface: createRecipeExecutionSurface({ recipeRegistry: registry }),
    }),
    executionRecordStore: {
      savePlan: records.savePlan.bind(records),
      saveReceipt() { throw new Error('simulated receipt store failure'); },
    },
  });

  const plan = spine.plan({
    operationId: 'OP-RECEIPT-PERSISTENCE',
    executionContext: executionContext(home, 'OP-RECEIPT-PERSISTENCE'),
    requiredCapabilities: ['fixture.receipt_persistence'],
    authorityRefs: [authorityRef],
  });

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-RECEIPT-PERSISTENCE-001',
    authorization: authorization('fixture.write', 'fixture-only'),
    harnessConformance: harness(),
    input: {},
  });

  assert.equal(effectOccurred, true);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.receipt.reason, 'RECEIPT_PERSISTENCE_FAILED_AFTER_DISPATCH');
  assert.equal(result.receipt_artifact_ref, null);
  assert.equal(inspect(store, 'ExecutionAttempt', 'AT-RECEIPT-PERSISTENCE-001').aggregate.reconciliation_required, true);
});

test('post-dispatch coordinator/receipt status mismatch becomes UNKNOWN', async t => {
  const { home, store } = fixture(t);
  operation(store, 'OP-STATUS-MISMATCH', 'reject coordinator and receipt disagreement');

  const registry = new RecipeRegistry();
  registry.register({
    definition: RecipeDefinition.parse({
      id: 'status-mismatch-probe',
      version: 'v0',
      provides: ['fixture.status_mismatch'],
      required_inputs: [],
      preconditions: [],
      effects: [{ effect: 'fixture.write', scope: 'fixture-only' }],
      postconditions: [],
    }),
    async preflight() { return { status: 'READY' }; },
    async execute() { throw new Error('custom coordinator must own execution in this test'); },
  });

  const spine = createOperationalSpine({
    stateKernel: createStateKernelAdapter({ store }),
    recipeRegistry: registry,
    executionCoordinator: {
      async runAttempt(request) {
        return {
          operation_id: request.operation_id,
          execution_attempt_id: request.execution_attempt_id,
          status: 'SUCCESS',
          started: true,
          reason: undefined,
          evidence_refs: [],
        };
      },
    },
    executionRecordStore: new FilesystemExecutionRecordStore(home),
  });

  const plan = spine.plan({
    operationId: 'OP-STATUS-MISMATCH',
    executionContext: executionContext(home, 'OP-STATUS-MISMATCH'),
    requiredCapabilities: ['fixture.status_mismatch'],
    authorityRefs: [authorityRef],
  });

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'AT-STATUS-MISMATCH-001',
    authorization: authorization('fixture.write', 'fixture-only'),
    harnessConformance: harness(),
    input: {},
  });

  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.receipt.status, 'UNKNOWN');
  assert.match(result.receipt.reason, /^COORDINATOR_RECEIPT_STATUS_MISMATCH:/);
  assert.equal(inspect(store, 'ExecutionAttempt', 'AT-STATUS-MISMATCH-001').aggregate.reconciliation_required, true);
});
