'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RecipeInvocationRequest,
  RecipeInvocationResult,
} = require('../../src/operational-spine-v0/invocation-contracts');
const {
  createRecipeInvocationEntrypoint,
} = require('../../src/operational-spine-v0/recipe-invocation');
const {
  executionRequirementsForRecipe,
  resolveExecutionSurface,
} = require('../../src/operational-spine-v0/surface-resolution');

const authority = { kind: 'AUTHORITY', id: 'DEV-TC2' };

function surface(id, adapter, capabilities, disposition = 'CONFORMING') {
  return {
    id,
    adapter,
    capabilities,
    conformance: { disposition, evidence_ref: `evidence:${id}` },
    ...(adapter === 'DOCKER_LINUX_NODE' ? { image: 'node:22-bookworm' } : {}),
  };
}

function environment(surfaces) {
  return {
    schema_version: 'tecnotron-recipe-invocation-environment/v0',
    repository: { identity: 'mauedgar/tecnotron-ai', location: process.cwd() },
    state_store: { reference: 'state:test', location: process.cwd() },
    surfaces,
  };
}

function request(overrides = {}) {
  return {
    schema_version: 'tecnotron-recipe-invocation-request/v0',
    recipe: { id: 'render_current_state', version: 'v0' },
    operation_ref: 'OP-TEST',
    responsibility_ref: 'TEST_STABLE_INVOCATION',
    authority_ref: authority.id,
    expected_effects: [{ effect: 'state.render', scope: 'none' }],
    evidence_refs: [],
    execution_constraints: { require: [] },
    ...overrides,
  };
}

function artifactStore() {
  return {
    saveText(kind, id, data) {
      return { kind: 'ARTIFACT', id: `${kind}:${id}`, location: `artifacts/${kind}/${id}`, sha256: 'a'.repeat(64) };
    },
    saveResult(id) {
      return { kind: 'ARTIFACT', id: `result:${id}`, location: `artifacts/results/${id}`, sha256: 'b'.repeat(64) };
    },
  };
}

function workerPass(surfaceId, attemptId, exitIndependent = true) {
  return RecipeInvocationResult.parse({
    schema_version: 'tecnotron-recipe-invocation-result/v0',
    operation_ref: 'OP-TEST',
    attempt_ref: attemptId,
    recipe: { id: 'render_current_state', version: 'v0' },
    selected_surface: surfaceId,
    started: true,
    terminal_status: 'PASS',
    effect_state: 'CONFIRMED',
    receipt_ref: 'recipe-receipt:test',
    result_ref: null,
    execution_plan_ref: { kind: 'ARTIFACT', id: 'plan:OP-TEST', location: 'plan.json', sha256: 'c'.repeat(64) },
    observed_identity: { surface_id: surfaceId, platform: 'linux', runtime_identity: 'node:v22.0.0' },
    exit_code: exitIndependent ? null : 0,
    stdout_ref: null,
    stderr_ref: null,
    terminal_artifact_ref: null,
    validation_issues: [],
  });
}

test('outer request rejects shell/runtime mechanics and keeps semantic fields explicit', () => {
  const parsed = RecipeInvocationRequest.parse(request());
  assert.equal(parsed.recipe.id, 'render_current_state');
  assert.equal(parsed.operation_ref, 'OP-TEST');
  assert.equal(Object.hasOwn(parsed, 'shell'), false);
  assert.equal(Object.hasOwn(parsed, 'docker'), false);
  assert.equal(Object.hasOwn(parsed, 'state_store_path'), false);
});

test('surface resolver selects one exact conforming capability match', () => {
  const native = surface('native', 'NATIVE_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC']);
  const resolution = resolveExecutionSurface([native], ['NODE_RUNTIME', 'DURABLE_DIRECTORY_FSYNC']);
  assert.equal(resolution.status, 'SELECTED');
  assert.equal(resolution.selected_surface.id, 'native');
});

test('surface resolver distinguishes unavailable, blocked and ambiguous without fallback', () => {
  const native = surface('native', 'NATIVE_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE']);
  assert.equal(resolveExecutionSurface([native], ['DURABLE_DIRECTORY_FSYNC']).status, 'UNAVAILABLE');

  const blocked = surface('blocked', 'NATIVE_NODE', ['NODE_RUNTIME', 'DURABLE_DIRECTORY_FSYNC'], 'UNKNOWN');
  assert.equal(resolveExecutionSurface([blocked], ['NODE_RUNTIME', 'DURABLE_DIRECTORY_FSYNC']).status, 'BLOCKED');

  const one = surface('one', 'NATIVE_NODE', ['NODE_RUNTIME', 'DURABLE_DIRECTORY_FSYNC']);
  const two = surface('two', 'DOCKER_LINUX_NODE', ['NODE_RUNTIME', 'DURABLE_DIRECTORY_FSYNC']);
  assert.equal(resolveExecutionSurface([one, two], ['NODE_RUNTIME', 'DURABLE_DIRECTORY_FSYNC']).status, 'AMBIGUOUS');
});

test('recipe requirements add Linux only when the caller explicitly requires it', () => {
  const base = executionRequirementsForRecipe({ id: 'render_current_state', version: 'v0' }, undefined, []);
  assert.deepEqual(base, ['DURABLE_DIRECTORY_FSYNC', 'FILESYSTEM_WRITE', 'NODE_RUNTIME']);
  const linux = executionRequirementsForRecipe(
    { id: 'render_current_state', version: 'v0' },
    undefined,
    ['LINUX_SEMANTICS'],
  );
  assert.equal(linux.includes('LINUX_SEMANTICS'), true);
});

test('stable entrypoint invokes selected surface exactly once and receipt status remains effect authority', async () => {
  const native = surface('native', 'NATIVE_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC']);
  let calls = 0;
  const launcher = {
    surface_id: 'native',
    invoke(envelope) {
      calls += 1;
      return {
        started: true,
        exit_code: 7,
        stdout: `${JSON.stringify(workerPass('native', envelope.attempt_ref))}\n`,
        stderr: 'diagnostic only',
      };
    },
  };
  const entrypoint = createRecipeInvocationEntrypoint(environment([native]), {
    launchers: new Map([['native', launcher]]),
    artifactStore: artifactStore(),
    attemptIdFactory: () => 'ATTEMPT-ONE',
    attemptObserver: () => true,
  });
  const result = await entrypoint.invoke(request());
  assert.equal(calls, 1);
  assert.equal(result.terminal_status, 'PASS');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.equal(result.exit_code, 7);
  assert.equal(result.receipt_ref, 'recipe-receipt:test');
});

test('Linux-required request selects the explicit Linux surface without caller shell syntax', async () => {
  const native = surface('native', 'NATIVE_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC']);
  const linux = surface('linux', 'DOCKER_LINUX_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC', 'LINUX_SEMANTICS']);
  let selected = null;
  const launchers = new Map([
    ['native', { surface_id: 'native', invoke() { throw new Error('native must not be invoked'); } }],
    ['linux', {
      surface_id: 'linux',
      invoke(envelope) {
        selected = 'linux';
        return { started: true, exit_code: 0, stdout: JSON.stringify(workerPass('linux', envelope.attempt_ref)), stderr: '' };
      },
    }],
  ]);
  const entrypoint = createRecipeInvocationEntrypoint(environment([native, linux]), {
    launchers,
    artifactStore: artifactStore(),
    attemptIdFactory: () => 'ATTEMPT-LINUX',
    attemptObserver: () => true,
  });
  const result = await entrypoint.invoke(request({ execution_constraints: { require: ['LINUX_SEMANTICS'] } }));
  assert.equal(selected, 'linux');
  assert.equal(result.selected_surface, 'linux');
  assert.equal(result.terminal_status, 'PASS');
});

test('ambiguous resolution starts no process', async () => {
  const one = surface('one', 'NATIVE_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC']);
  const two = surface('two', 'DOCKER_LINUX_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC']);
  let calls = 0;
  const entrypoint = createRecipeInvocationEntrypoint(environment([one, two]), {
    launchers: new Map([
      ['one', { surface_id: 'one', invoke() { calls += 1; throw new Error('must not run'); } }],
      ['two', { surface_id: 'two', invoke() { calls += 1; throw new Error('must not run'); } }],
    ]),
    artifactStore: artifactStore(),
  });
  const result = await entrypoint.invoke(request());
  assert.equal(calls, 0);
  assert.equal(result.terminal_status, 'AMBIGUOUS');
  assert.equal(result.started, false);
  assert.equal(result.effect_state, 'NONE');
});

test('malformed worker result after possible attempt becomes UNKNOWN and is never retried', async () => {
  const selected = surface('selected', 'NATIVE_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC']);
  const alternate = surface('alternate', 'DOCKER_LINUX_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC'], 'NONCONFORMING');
  let selectedCalls = 0;
  let alternateCalls = 0;
  const entrypoint = createRecipeInvocationEntrypoint(environment([selected, alternate]), {
    launchers: new Map([
      ['selected', { surface_id: 'selected', invoke() { selectedCalls += 1; return { started: true, exit_code: 0, stdout: '{bad', stderr: '' }; } }],
      ['alternate', { surface_id: 'alternate', invoke() { alternateCalls += 1; throw new Error('hidden fallback'); } }],
    ]),
    artifactStore: artifactStore(),
    attemptIdFactory: () => 'ATTEMPT-UNKNOWN',
    attemptObserver: () => true,
  });
  const result = await entrypoint.invoke(request());
  assert.equal(selectedCalls, 1);
  assert.equal(alternateCalls, 0);
  assert.equal(result.terminal_status, 'UNKNOWN');
  assert.equal(result.effect_state, 'UNKNOWN');
  assert.equal(result.started, true);
});

test('malformed request is blocked before any surface launch', async () => {
  const native = surface('native', 'NATIVE_NODE', ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC']);
  let calls = 0;
  const entrypoint = createRecipeInvocationEntrypoint(environment([native]), {
    launchers: new Map([['native', { surface_id: 'native', invoke() { calls += 1; throw new Error('must not run'); } }]]),
    artifactStore: artifactStore(),
  });
  const result = await entrypoint.invoke({ schema_version: 'wrong' });
  assert.equal(calls, 0);
  assert.equal(result.terminal_status, 'BLOCKED');
  assert.equal(result.started, false);
  assert.equal(result.validation_issues.length > 0, true);
});
