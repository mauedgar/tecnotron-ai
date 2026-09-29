'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  FilesystemStateStore,
  create,
  transition,
  inspect,
} = require('../../src/state-kernel-v0');
const {
  createRecipeInvocationEntrypoint,
} = require('../../src/operational-spine-v0/recipe-invocation');

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
