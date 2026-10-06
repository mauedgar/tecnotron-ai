'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  requireExecutionLifecycleCapability,
  requireTaskCycleLifecycleCapability,
} = require('../../src/operational-spine-v0/taskcycle-lifecycle-capability');
const { createOperationalSpine } = require('../../src/operational-spine-v0/core');
const { RecipeRegistry } = require('../../src/operational-spine-v0/recipe-registry');
const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../../src/operational-spine-v0/contracts');

test('portable lifecycle guards accept semantic capabilities without State Kernel shape', () => {
  const executionLifecycle = {
    observeOperation() {},
    observeAttemptPresence() {},
    prepareAttempt() {},
    confirmDispatchStart() {},
    recordPreflightTerminalOutcome() {},
    recordExecutionOutcome() {},
  };
  const taskcycleLifecycle = {
    snapshot() {},
    observeInvocationBookkeeping() {},
    hasUnreconciledExecution() {},
    satisfyObligation() {},
    closeTaskCycle() {},
  };

  assert.equal(requireExecutionLifecycleCapability(executionLifecycle), executionLifecycle);
  assert.equal(requireTaskCycleLifecycleCapability(taskcycleLifecycle), taskcycleLifecycle);
  assert.equal(Object.hasOwn(executionLifecycle, 'verify'), false);
  assert.equal(Object.hasOwn(taskcycleLifecycle, 'inspectTaskCycle'), false);
});

test('State-Kernel-shaped method bags are not portable lifecycle capabilities', () => {
  const kernelShaped = {
    verify() {},
    inspectTaskCycle() {},
    inspectOperation() {},
    inspectAttempt() {},
    obligations() {},
    satisfy() {},
    transition() {},
  };

  assert.throws(
    () => requireExecutionLifecycleCapability(kernelShaped),
    /executionLifecycle must provide/,
  );
  assert.throws(
    () => requireTaskCycleLifecycleCapability(kernelShaped),
    /taskcycleLifecycle must provide/,
  );
});


test('OperationalSpine executes through a deterministic non-State-Kernel lifecycle provider', async () => {
  const authority = { kind: 'AUTHORITY', id: 'DEV-PORTABLE-LIFECYCLE' };
  const operation = {
    kind: 'Operation',
    id: 'OP-PORTABLE-LIFECYCLE',
    taskcycle_id: 'TC-PORTABLE-LIFECYCLE',
    state: 'DEFINED',
  };
  const lifecycleCalls = [];
  const executionLifecycle = {
    observeOperation(operationId) {
      assert.equal(operationId, operation.id);
      lifecycleCalls.push('observeOperation');
      return { aggregate: operation, store_revision: 1, legal_next: [] };
    },
    observeAttemptPresence() {
      lifecycleCalls.push('observeAttemptPresence');
      return 'ABSENT';
    },
    prepareAttempt({ attemptId, operationId, authorityRefs }) {
      lifecycleCalls.push('prepareAttempt');
      assert.equal(attemptId, 'ATTEMPT-PORTABLE-LIFECYCLE');
      assert.equal(operationId, operation.id);
      assert.deepEqual(authorityRefs, [authority]);
      return {
        operation: { aggregate: { ...operation, state: 'RUNNING' }, store_revision: 2, legal_next: [] },
        attempt: {
          aggregate: {
            id: attemptId,
            revision: 1,
            state: 'STARTED',
            operation_id: operationId,
            reconciliation_required: false,
          },
          store_revision: 2,
          legal_next: [],
        },
      };
    },
    confirmDispatchStart(attemptId) {
      lifecycleCalls.push('confirmDispatchStart');
      return {
        aggregate: {
          id: attemptId,
          revision: 2,
          state: 'RUNNING',
          operation_id: operation.id,
          reconciliation_required: false,
        },
        store_revision: 3,
        legal_next: [],
      };
    },
    recordPreflightTerminalOutcome() {
      throw new Error('preflight terminal path must not execute');
    },
    recordExecutionOutcome({ attemptId, operationId, coordinatorOutcome, receipt }) {
      lifecycleCalls.push('recordExecutionOutcome');
      assert.equal(attemptId, 'ATTEMPT-PORTABLE-LIFECYCLE');
      assert.equal(operationId, operation.id);
      assert.equal(coordinatorOutcome.status, 'SUCCESS');
      assert.equal(receipt.status, 'PASS');
      return {
        attempt: {
          aggregate: {
            id: attemptId,
            revision: 3,
            state: 'COMPLETED',
            operation_id: operationId,
            reconciliation_required: false,
            outcome: 'PASS',
          },
          store_revision: 4,
          legal_next: [],
        },
        operation: {
          aggregate: { ...operation, state: 'COMPLETED' },
          store_revision: 4,
          legal_next: [],
        },
      };
    },
  };

  assert.equal(Object.hasOwn(executionLifecycle, 'verify'), false);
  assert.equal(Object.hasOwn(executionLifecycle, 'inspectOperation'), false);
  assert.equal(Object.hasOwn(executionLifecycle, 'transition'), false);

  const definition = RecipeDefinition.parse({
    id: 'portable_lifecycle_probe',
    version: 'v0',
    provides: ['portable.lifecycle.execute'],
    required_inputs: [],
    preconditions: [],
    effects: [{ effect: 'portable.lifecycle.effect', scope: 'probe' }],
    postconditions: [],
  });
  const registry = new RecipeRegistry();
  registry.register({
    definition,
    async preflight() { return { status: 'READY' }; },
    async execute() { throw new Error('coordinator owns execution in this probe'); },
  });

  const receipt = RecipeReceipt.parse({
    schema_version: 'tecnotron-recipe-receipt/v0',
    receipt_ref: 'recipe-receipt:ATTEMPT-PORTABLE-LIFECYCLE:probe',
    recipe_id: definition.id,
    recipe_version: definition.version,
    operation_id: operation.id,
    execution_attempt_id: 'ATTEMPT-PORTABLE-LIFECYCLE',
    status: 'PASS',
    effect_state: 'CONFIRMED',
    result_refs: [],
    evidence_refs: [],
  });

  const spine = createOperationalSpine({
    executionLifecycle,
    recipeRegistry: registry,
    executionCoordinator: {
      async runAttempt(request) {
        return {
          operation_id: request.operation_id,
          execution_attempt_id: request.execution_attempt_id,
          status: 'SUCCESS',
          started: true,
          result: receipt,
          evidence_refs: [],
        };
      },
    },
    executionRecordStore: {
      savePlan() {
        return { kind: 'ARTIFACT', id: 'portable-plan' };
      },
      saveReceipt() {
        return { kind: 'ARTIFACT', id: 'portable-receipt' };
      },
    },
  });

  const plan = spine.plan({
    operationId: operation.id,
    executionContext: {
      schema_version: 'tecnotron-execution-context/v0',
      operation_id: operation.id,
      taskcycle_id: operation.taskcycle_id,
      repository: { identity: 'portable/provider', location: process.cwd() },
      runtime: {
        executor: 'portable-test',
        platform: process.platform,
        runtime_identity: process.version,
      },
      state_store: { reference: 'portable:none' },
      authority_refs: [authority],
      evidence_refs: [],
    },
    requiredCapabilities: ['portable.lifecycle.execute'],
    authorityRefs: [authority],
    input: {},
  });

  assert.equal(plan.resolution, 'DETERMINISTIC_RECIPE');

  const result = await spine.executePlan(plan, {
    executionAttemptId: 'ATTEMPT-PORTABLE-LIFECYCLE',
    authorization: {
      disposition: 'AUTHORIZED',
      authority_reference: authority.id,
      effect_constraints: [{ effect: 'portable.lifecycle.effect', scope: 'probe' }],
    },
    harnessConformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:portable-provider' },
    input: {},
  });

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.receipt.status, 'PASS');
  assert.deepEqual(lifecycleCalls, [
    'observeOperation',
    'prepareAttempt',
    'confirmDispatchStart',
    'recordExecutionOutcome',
  ]);
});
