'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  FilesystemStateStore,
  create,
  transition,
  inspect,
} = require('../../src/state-kernel-v0');
const {
  createRecipeInvocationEntrypoint,
} = require('../../src/operational-spine-v0/recipe-invocation');
const {
  runWorkerInvocation,
  workerExceptionResult,
} = require('../../src/operational-spine-v0/recipe-invocation-worker');

function workerEnvelope() {
  const selectedSurface = {
    id: 'native-test',
    adapter: 'NATIVE_NODE',
    capabilities: ['NODE_RUNTIME'],
    conformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:native-test' },
  };
  return {
    schema_version: 'tecnotron-recipe-invocation-worker-envelope/v0',
    request: {
      schema_version: 'tecnotron-recipe-invocation-request/v0',
      recipe: { id: 'render_current_state', version: 'v0' },
      operation_ref: 'OP-WORKER-OBSERVATION',
      responsibility_ref: 'TEST_WORKER_OBSERVATION',
      authority_ref: 'DEV-WORKER-OBSERVATION',
      expected_effects: [{ effect: 'state.render', scope: 'none' }],
      evidence_refs: [],
      execution_constraints: { require: [] },
    },
    attempt_ref: 'ATTEMPT-WORKER-OBSERVATION',
    environment: {
      schema_version: 'tecnotron-recipe-invocation-environment/v0',
      repository: { identity: 'fixture/tecnotron-ai', location: process.cwd() },
      state_store: { reference: 'state:fixture', location: process.cwd() },
      surfaces: [selectedSurface],
    },
    selected_surface: selectedSurface,
  };
}

test('worker exception distinguishes explicit missing attempt from inspection failure', () => {
  const envelope = workerEnvelope();
  const missing = workerExceptionResult(envelope, 'execution failed', () => false);
  assert.equal(missing.terminal_status, 'BLOCKED');
  assert.equal(missing.effect_state, 'NONE');

  const failedObservation = workerExceptionResult(envelope, 'execution failed', () => {
    throw new Error('state inspection failed');
  });
  assert.equal(failedObservation.terminal_status, 'UNKNOWN');
  assert.equal(failedObservation.effect_state, 'UNKNOWN');
  assert.equal(failedObservation.started, true);
});

test('worker invokes an exact Recipe through an injected non-State-Kernel lifecycle binding', async t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-portable-worker-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const envelope = workerEnvelope();
  envelope.request.operation_ref = 'OP-PORTABLE-WORKER';
  envelope.request.responsibility_ref = 'TEST_PORTABLE_WORKER';
  envelope.request.authority_ref = 'DEV-PORTABLE-WORKER';
  envelope.attempt_ref = 'ATTEMPT-PORTABLE-WORKER';
  envelope.environment.state_store = { reference: 'state:portable-test', location: home };

  const operation = {
    kind: 'Operation',
    id: envelope.request.operation_ref,
    taskcycle_id: 'TC-PORTABLE-WORKER',
    state: 'DEFINED',
  };
  const calls = [];
  let recordedOutcome = null;
  const binding = {
    executionLifecycle: {
      observeOperation(operationId) {
        assert.equal(operationId, operation.id);
        calls.push(['observeOperation', operationId]);
        return { aggregate: operation, store_revision: 1, legal_next: [] };
      },
      observeAttemptPresence(attemptId) {
        calls.push(['observeAttemptPresence', attemptId]);
        return 'ABSENT';
      },
      prepareAttempt(input) {
        calls.push(['prepareAttempt', input]);
        assert.equal(input.attemptId, envelope.attempt_ref);
        assert.equal(input.operationId, operation.id);
        assert.deepEqual(input.authorityRefs, [{ kind: 'AUTHORITY', id: envelope.request.authority_ref }]);
        return {
          operation: { aggregate: { ...operation, state: 'RUNNING' }, store_revision: 2, legal_next: [] },
          attempt: {
            aggregate: {
              id: input.attemptId,
              revision: 1,
              state: 'STARTED',
              operation_id: input.operationId,
              reconciliation_required: false,
            },
            store_revision: 2,
            legal_next: [],
          },
        };
      },
      confirmDispatchStart(attemptId) {
        calls.push(['confirmDispatchStart', attemptId]);
        assert.equal(attemptId, envelope.attempt_ref);
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
        assert.fail('READY preflight must dispatch instead of recording a preflight terminal outcome');
      },
      recordExecutionOutcome(input) {
        calls.push(['recordExecutionOutcome', input]);
        recordedOutcome = input;
        return {
          operation: { aggregate: { ...operation, state: 'COMPLETED' }, store_revision: 4, legal_next: [] },
          attempt: {
            aggregate: {
              id: input.attemptId,
              revision: 3,
              state: 'COMPLETED',
              operation_id: input.operationId,
              reconciliation_required: false,
              outcome: 'PASS',
            },
            store_revision: 4,
            legal_next: [],
          },
        };
      },
    },
    taskcycleLifecycle: new Proxy({}, {
      get() {
        assert.fail('render_current_state must not use TaskCycle lifecycle capability');
      },
    }),
    renderState() {
      calls.push(['renderState']);
      return 'portable in-memory projection';
    },
  };

  const result = await runWorkerInvocation(envelope, { binding });

  assert.equal(result.terminal_status, 'PASS');
  assert.equal(result.effect_state, 'NONE');
  assert.equal(result.started, true);
  assert.deepEqual(result.recipe, { id: 'render_current_state', version: 'v0' });
  assert.equal(result.operation_ref, operation.id);
  assert.equal(result.attempt_ref, envelope.attempt_ref);
  assert.equal(result.receipt_ref, `recipe-receipt:${envelope.attempt_ref}:render-current-state`);
  assert.equal(result.receipt.operation_id, operation.id);
  assert.equal(result.receipt.execution_attempt_id, envelope.attempt_ref);
  assert.equal(result.receipt.recipe_id, envelope.request.recipe.id);
  assert.equal(result.receipt.recipe_version, envelope.request.recipe.version);
  assert.equal(result.receipt.status, result.terminal_status);
  assert.equal(result.receipt.output.projection, 'portable in-memory projection');
  assert.equal(recordedOutcome.attemptId, envelope.attempt_ref);
  assert.equal(recordedOutcome.operationId, operation.id);
  assert.equal(recordedOutcome.coordinatorOutcome.status, 'SUCCESS');
  assert.deepEqual(recordedOutcome.receipt, result.receipt);
  assert.deepEqual(recordedOutcome.resultRefs.map(ref => ref.id), [
    `plan:${operation.id}`,
    `receipt:${envelope.attempt_ref}`,
  ]);
  assert.deepEqual(calls.map(([name]) => name), [
    'observeOperation',
    'observeOperation',
    'prepareAttempt',
    'confirmDispatchStart',
    'renderState',
    'recordExecutionOutcome',
  ]);
  assert.equal(fs.existsSync(path.join(home, 'state', 'kernel-v0')), false);
});

test('stable native entrypoint invokes a real shipped Recipe through the current Spine', { skip: process.platform === 'win32' }, async t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-invocation-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const store = new FilesystemStateStore(home);
  store.initialize();
  create(store, store.verify().revision, 'TaskCycle', 'TC-INVOKE', {
    responsibility: 'TEST_STABLE_RECIPE_INVOCATION',
    obligations: [{ id: 'IMPLEMENTATION', authority_ref: null }],
  }, [{ kind: 'AUTHORITY', id: 'DEV-INVOKE' }]);
  transition(store, store.verify().revision, 'TaskCycle', 'TC-INVOKE', 'ACTIVE');
  create(store, store.verify().revision, 'Operation', 'OP-INVOKE', {
    taskcycle_id: 'TC-INVOKE',
    objective: 'render current durable state through stable invocation',
  }, [{ kind: 'AUTHORITY', id: 'DEV-INVOKE' }]);

  const surface = {
    id: 'native-linux-node',
    adapter: 'NATIVE_NODE',
    capabilities: ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC'],
    conformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:native-linux-node' },
  };
  const entrypoint = createRecipeInvocationEntrypoint({
    schema_version: 'tecnotron-recipe-invocation-environment/v0',
    repository: { identity: 'fixture/tecnotron-ai', location: path.resolve(__dirname, '../..') },
    state_store: { reference: 'state:fixture', location: home },
    surfaces: [surface],
  }, {
    attemptIdFactory: () => 'ATTEMPT-INVOKE',
  });

  const result = await entrypoint.invoke({
    schema_version: 'tecnotron-recipe-invocation-request/v0',
    recipe: { id: 'render_current_state', version: 'v0' },
    operation_ref: 'OP-INVOKE',
    responsibility_ref: 'TEST_STABLE_RECIPE_INVOCATION',
    authority_ref: 'DEV-INVOKE',
    expected_effects: [{ effect: 'state.render', scope: 'none' }],
    evidence_refs: [],
    execution_constraints: { require: [] },
  });

  assert.equal(result.terminal_status, 'PASS');
  assert.equal(result.started, true);
  assert.equal(result.selected_surface, 'native-linux-node');
  assert.equal(result.receipt_ref, 'recipe-receipt:ATTEMPT-INVOKE:render-current-state');
  assert.equal(result.effect_state, 'NONE');
  assert.equal(result.execution_plan_ref.kind, 'ARTIFACT');
  assert.equal(result.terminal_artifact_ref.kind, 'ARTIFACT');

  const attempt = inspect(store, 'ExecutionAttempt', 'ATTEMPT-INVOKE').aggregate;
  assert.equal(attempt.state, 'COMPLETED');
  assert.equal(attempt.outcome, 'PASS');
  assert.equal(attempt.reconciliation_required, false);
});

test('stable native entrypoint ships both matured FitFlow Recipes', { skip: process.platform === 'win32' }, async t => {
  const recipes = [
    {
      id: 'prepare_fitflow_test_runtime',
      input: {
        repository_identity: 'fixture/tecnotron-ai',
        required_alembic_head: 'fixture_head',
        validation_surface: 'LOCAL_PROJECT_VENV',
        local_database_url: 'postgresql://fitflow_test_user:fixture@localhost/fitflow_test',
        authority: {
          may_start_services: false,
          may_build_services: false,
          may_recreate_services: false,
          may_reset_test_database: false,
          may_reset_redis: false,
          may_upgrade_test_database: false,
        },
        actions: {
          start_services: false,
          build_services: false,
          recreate_services: false,
          reset_test_database: false,
          reset_redis: false,
          upgrade_test_database: false,
        },
      },
    },
    {
      id: 'validate_fitflow_http_contract_candidate',
      input: {},
    },
  ];

  for (const [index, recipe] of recipes.entries()) {
    await t.test(recipe.id, async t => {
      const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-fitflow-invocation-'));
      t.after(() => fs.rmSync(home, { recursive: true, force: true }));
      const store = new FilesystemStateStore(home);
      store.initialize();
      const taskcycleId = `TC-FITFLOW-${index}`;
      const operationId = `OP-FITFLOW-${index}`;
      const attemptId = `ATTEMPT-FITFLOW-${index}`;
      create(store, store.verify().revision, 'TaskCycle', taskcycleId, {
        responsibility: 'TEST_MATURED_FITFLOW_RECIPE_SHIPPING',
        obligations: [{ id: 'IMPLEMENTATION', authority_ref: null }],
      }, [{ kind: 'AUTHORITY', id: 'DEV-FITFLOW' }]);
      transition(store, store.verify().revision, 'TaskCycle', taskcycleId, 'ACTIVE');
      create(store, store.verify().revision, 'Operation', operationId, {
        taskcycle_id: taskcycleId,
        objective: `invoke ${recipe.id} through stable entrypoint`,
      }, [{ kind: 'AUTHORITY', id: 'DEV-FITFLOW' }]);

      const surface = {
        id: 'native-linux-node',
        adapter: 'NATIVE_NODE',
        capabilities: [
          'NODE_RUNTIME',
          'CHILD_PROCESS',
          'FILESYSTEM_WRITE',
          'REPOSITORY_ACCESS',
          'DURABLE_DIRECTORY_FSYNC',
        ],
        conformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:native-linux-node' },
      };
      const entrypoint = createRecipeInvocationEntrypoint({
        schema_version: 'tecnotron-recipe-invocation-environment/v0',
        repository: { identity: 'fixture/tecnotron-ai', location: path.resolve(__dirname, '../..') },
        state_store: { reference: 'state:fixture', location: home },
        surfaces: [surface],
      }, {
        attemptIdFactory: () => attemptId,
      });

      const result = await entrypoint.invoke({
        schema_version: 'tecnotron-recipe-invocation-request/v0',
        recipe: { id: recipe.id, version: 'v0' },
        operation_ref: operationId,
        responsibility_ref: 'TEST_MATURED_FITFLOW_RECIPE_SHIPPING',
        authority_ref: 'DEV-FITFLOW',
        expected_effects: [{ effect: 'test.observe', scope: 'fixture' }],
        evidence_refs: [],
        inputs: recipe.input,
        execution_constraints: { require: [] },
      });

      assert.equal(result.recipe.id, recipe.id);
      assert.equal(result.receipt.recipe_id, recipe.id);
      assert.equal(result.receipt.recipe_version, 'v0');
      assert.equal(result.receipt.operation_id, operationId);
      assert.equal(result.receipt.execution_attempt_id, attemptId);
      assert.equal(result.terminal_status, result.receipt.status);
      assert.equal(result.effect_state, result.receipt.effect_state);
      assert.notEqual(result.reason, 'RECIPE_NOT_SHIPPED_BY_STABLE_ENTRYPOINT');
    });
  }
});

test('stable CLI preserves request-file transport', { skip: process.platform === 'win32' }, t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-request-file-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const store = new FilesystemStateStore(home);
  store.initialize();
  create(store, store.verify().revision, 'TaskCycle', 'TC-REQUEST-FILE', {
    responsibility: 'TEST_REQUEST_FILE_TRANSPORT',
    obligations: [{ id: 'IMPLEMENTATION', authority_ref: null }],
  }, [{ kind: 'AUTHORITY', id: 'DEV-REQUEST-FILE' }]);
  transition(store, store.verify().revision, 'TaskCycle', 'TC-REQUEST-FILE', 'ACTIVE');
  create(store, store.verify().revision, 'Operation', 'OP-REQUEST-FILE', {
    taskcycle_id: 'TC-REQUEST-FILE',
    objective: 'invoke a shipped Recipe through request-file transport',
  }, [{ kind: 'AUTHORITY', id: 'DEV-REQUEST-FILE' }]);

  const configPath = path.join(home, 'environment.json');
  const requestPath = path.join(home, 'request.json');
  fs.writeFileSync(configPath, JSON.stringify({
    schema_version: 'tecnotron-recipe-invocation-environment/v0',
    repository: { identity: 'fixture/tecnotron-ai', location: path.resolve(__dirname, '../..') },
    state_store: { reference: 'state:fixture', location: home },
    surfaces: [{
      id: 'native-linux-node',
      adapter: 'NATIVE_NODE',
      capabilities: ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC'],
      conformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:native-linux-node' },
    }],
  }));
  fs.writeFileSync(requestPath, JSON.stringify({
    schema_version: 'tecnotron-recipe-invocation-request/v0',
    recipe: { id: 'render_current_state', version: 'v0' },
    operation_ref: 'OP-REQUEST-FILE',
    responsibility_ref: 'TEST_REQUEST_FILE_TRANSPORT',
    authority_ref: 'DEV-REQUEST-FILE',
    expected_effects: [{ effect: 'state.render', scope: 'none' }],
    evidence_refs: [],
    execution_constraints: { require: [] },
  }));

  const result = spawnSync(process.execPath, [
    path.resolve(__dirname, '../../src/operational-spine-v0/recipe-invocation-cli.js'),
    '--config', configPath,
    '--request-file', requestPath,
  ], { encoding: 'utf8', shell: false });

  assert.equal(result.status, 0, result.stderr);
  const invocation = JSON.parse(result.stdout);
  assert.equal(invocation.terminal_status, 'PASS');
  assert.equal(invocation.recipe.id, 'render_current_state');
  assert.equal(invocation.receipt.status, 'PASS');
});
