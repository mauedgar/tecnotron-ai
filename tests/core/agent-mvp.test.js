'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { createAgentMvp } = require('../../src/agent-mvp');

function spy(fn) {
  const calls = [];
  const wrapped = (...args) => {
    calls.push(args);
    return fn(...args);
  };
  wrapped.calls = calls;
  return wrapped;
}

const ROUTED = {
  status: 'ROUTED',
  reason_code: 'ROLE_SELECTED',
  role: 'coder_b',
  requirements: {
    capabilities: ['coding'],
    criticality: 'low',
    minimum_trust: 'experimental',
    allowed_resource_classes: ['local'],
    allowed_access_modes: ['local'],
  },
};

const BLOCKED_ROUTE = {
  status: 'BLOCKED',
  reason_code: 'NO_MATCHING_RULE',
  role: null,
  requirements: null,
};

const SELECTED = {
  status: 'SELECTED',
  selected: {
    registry_id: 'local-simulator',
    provider: 'local',
    runtime_id: 'simulator-v1',
    pool_id: 'local',
    resource_class: 'local',
    access_mode: 'local',
  },
  policy_id: 'fitflow-model-selection/v1',
  fallback_used: false,
  reason_code: 'MODEL_SELECTED',
};

const BLOCKED_MODEL = {
  status: 'BLOCKED',
  selected: null,
  reason_code: 'NO_ELIGIBLE_MODEL',
};

const COMPLETE_CONTEXT = { status: 'COMPLETE', missing_evidence_ids: [] };
const PARTIAL_CONTEXT = { status: 'PARTIAL', missing_evidence_ids: ['x'] };
const EMPTY_CONTEXT = { status: 'EMPTY', missing_evidence_ids: ['x', 'y'] };

const PROCEED = { action: 'PROCEED', reason_code: 'CONTEXT_COMPLETE', missing_evidence_ids: [] };
const ESCALATE = { action: 'ESCALATE', reason_code: 'CONTEXT_PARTIAL', missing_evidence_ids: ['x'] };
const BLOCK = { action: 'BLOCK', reason_code: 'CONTEXT_EMPTY', missing_evidence_ids: ['x', 'y'] };

const RUNTIME_RESULT = {
  status: 'CONFIRMED',
  reason_code: 'SIMULATION_DECLARED',
  identity: {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'SIMULATION_DECLARED',
    simulated: true,
    proposal: SELECTED.selected,
    effective: { mode: 'simulated', provider: 'local', runtime_id: 'simulator-v1' },
    details: null,
  },
  event: {
    artifact: 'RUN_EVENT',
    schema_version: 'fitflow-run-event/v2',
    event_id: 'event-001',
    sequence: 0,
    task_id: 'FF-AI-VNEXT-009',
    run_id: 'FF-AI-VNEXT-009-001',
    created_at: '2026-08-24T00:00:00Z',
    actor: 'adapter',
    event_type: 'EXECUTION_COMPLETED',
    state_from: 'EXECUTING',
    state_to: 'VALIDATING',
    reason_code: 'SIMULATION_DECLARED',
    inputs: [],
    outputs: [],
    usage_record_id: null,
    idempotency_key: null,
  },
};

function fullDeps(overrides = {}) {
  return {
    router: spy(() => ROUTED),
    modelResolver: spy(() => SELECTED),
    contextPackager: { package: spy(() => COMPLETE_CONTEXT) },
    explorer: spy(() => PROCEED),
    agentRuntime: spy(() => RUNTIME_RESULT),
    adapter: { execute: () => ({ mode: 'simulated', provider: 'local', runtime_id: 'simulator-v1', outputs: [] }) },
    orchestrator: { transitions: { EXECUTING: ['VALIDATING'] } },
    identityArtifact: { path: 'runtime-identity.json', hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    eventMetadata: { event_id: 'event-001', sequence: 0, task_id: 'FF-AI-VNEXT-009', run_id: 'FF-AI-VNEXT-009-001', created_at: '2026-08-24T00:00:00Z' },
    ...overrides,
  };
}

const RUN_INPUT = {
  routingInput: { task_type: 'feature', area: 'ai_tooling', risk: 'low' },
  roleRegistry: { schema_version: 'fitflow-role-registry/v3' },
  modelRegistry: { schema_version: 'fitflow-model-registry/v3' },
  finops: { paid_api_enabled: false },
  requested_paths: [],
  requested_evidence: [],
  budget_tokens: 1024,
};

test('factory requires an adapter dependency', () => {
  assert.throws(
    () => createAgentMvp({ contextPackager: { package: () => COMPLETE_CONTEXT } }),
    /requires an adapter/,
  );
});

test('factory requires a contextPackager dependency', () => {
  assert.throws(
    () => createAgentMvp({ adapter: { execute: () => ({}) } }),
    /requires a contextPackager/,
  );
});

test('execute calls stages in deterministic order', () => {
  const order = [];
  const deps = fullDeps({
    router: spy(() => { order.push('router'); return ROUTED; }),
    modelResolver: spy(() => { order.push('modelResolver'); return SELECTED; }),
    contextPackager: { package: spy(() => { order.push('contextPackager'); return COMPLETE_CONTEXT; }) },
    explorer: spy(() => { order.push('explorer'); return PROCEED; }),
    agentRuntime: spy(() => { order.push('agentRuntime'); return RUNTIME_RESULT; }),
  });
  const agent = createAgentMvp(deps);
  agent.execute(RUN_INPUT);
  assert.deepStrictEqual(order, ['router', 'modelResolver', 'contextPackager', 'explorer', 'agentRuntime']);
});

test('route not ROUTED short-circuits before model, context, explorer and runtime', () => {
  const modelResolver = spy(() => SELECTED);
  const contextPackager = { package: spy(() => COMPLETE_CONTEXT) };
  const explorer = spy(() => PROCEED);
  const agentRuntime = spy(() => RUNTIME_RESULT);
  const agent = createAgentMvp(fullDeps({
    router: spy(() => BLOCKED_ROUTE),
    modelResolver,
    contextPackager,
    explorer,
    agentRuntime,
  }));
  const result = agent.execute(RUN_INPUT);
  assert.strictEqual(result.stopped_at, 'router');
  assert.strictEqual(result.reachedRuntime, false);
  assert.strictEqual(result.cause, 'NO_MATCHING_RULE');
  assert.strictEqual(modelResolver.calls.length, 0);
  assert.strictEqual(contextPackager.package.calls.length, 0);
  assert.strictEqual(explorer.calls.length, 0);
  assert.strictEqual(agentRuntime.calls.length, 0);
  assert.strictEqual(result.stages.model, null);
  assert.strictEqual(result.stages.runtime, null);
  assert.strictEqual(result.runEvent, null);
});

test('model not SELECTED short-circuits before context and runtime', () => {
  const contextPackager = { package: spy(() => COMPLETE_CONTEXT) };
  const explorer = spy(() => PROCEED);
  const agentRuntime = spy(() => RUNTIME_RESULT);
  const agent = createAgentMvp(fullDeps({
    modelResolver: spy(() => BLOCKED_MODEL),
    contextPackager,
    explorer,
    agentRuntime,
  }));
  const result = agent.execute(RUN_INPUT);
  assert.strictEqual(result.stopped_at, 'model-resolver');
  assert.strictEqual(result.reachedRuntime, false);
  assert.strictEqual(result.cause, 'NO_ELIGIBLE_MODEL');
  assert.strictEqual(contextPackager.package.calls.length, 0);
  assert.strictEqual(explorer.calls.length, 0);
  assert.strictEqual(agentRuntime.calls.length, 0);
  assert.strictEqual(result.stages.context, null);
  assert.strictEqual(result.stages.runtime, null);
});

test('explorer BLOCK (EMPTY context) short-circuits before runtime', () => {
  const agentRuntime = spy(() => RUNTIME_RESULT);
  const agent = createAgentMvp(fullDeps({
    contextPackager: { package: spy(() => EMPTY_CONTEXT) },
    explorer: spy(() => BLOCK),
    agentRuntime,
  }));
  const result = agent.execute(RUN_INPUT);
  assert.strictEqual(result.stopped_at, 'explorer');
  assert.strictEqual(result.reachedRuntime, false);
  assert.strictEqual(result.cause, 'CONTEXT_EMPTY');
  assert.strictEqual(agentRuntime.calls.length, 0);
  assert.strictEqual(result.stages.runtime, null);
});

test('explorer ESCALATE (PARTIAL context) short-circuits before runtime', () => {
  const agentRuntime = spy(() => RUNTIME_RESULT);
  const agent = createAgentMvp(fullDeps({
    contextPackager: { package: spy(() => PARTIAL_CONTEXT) },
    explorer: spy(() => ESCALATE),
    agentRuntime,
  }));
  const result = agent.execute(RUN_INPUT);
  assert.strictEqual(result.stopped_at, 'explorer');
  assert.strictEqual(result.cause, 'CONTEXT_PARTIAL');
  assert.strictEqual(agentRuntime.calls.length, 0);
});

test('COMPLETE context with PROCEED reaches executeRuntime and propagates identity and event', () => {
  const agentRuntime = spy(() => RUNTIME_RESULT);
  const agent = createAgentMvp(fullDeps({ agentRuntime }));
  const result = agent.execute(RUN_INPUT);
  assert.strictEqual(result.stopped_at, 'runtime');
  assert.strictEqual(result.reachedRuntime, true);
  assert.strictEqual(agentRuntime.calls.length, 1);
  assert.strictEqual(result.status, 'CONFIRMED');
  assert.strictEqual(result.reason_code, 'SIMULATION_DECLARED');
  assert.deepStrictEqual(result.identity, RUNTIME_RESULT.identity);
  assert.deepStrictEqual(result.runEvent, RUNTIME_RESULT.event);
  assert.strictEqual(result.cause, null);
  assert.strictEqual(result.stages.route, ROUTED);
  assert.strictEqual(result.stages.model, SELECTED);
  assert.strictEqual(result.stages.context, COMPLETE_CONTEXT);
  assert.strictEqual(result.stages.explorer, PROCEED);
  assert.strictEqual(result.stages.runtime, RUNTIME_RESULT);
});

const ACTUAL_RUNTIME_RESULT = {
  identity: {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'SIMULATION_DECLARED',
    simulated: true,
    proposal: SELECTED.selected,
    effective: { mode: 'simulated', provider: 'local', runtime_id: 'simulator-v1' },
    details: null,
  },
  event: {
    artifact: 'RUN_EVENT',
    schema_version: 'fitflow-run-event/v2',
    event_id: 'event-001',
    sequence: 0,
    task_id: 'FF-AI-VNEXT-009',
    run_id: 'FF-AI-VNEXT-009-001',
    created_at: '2026-08-24T00:00:00Z',
    actor: 'adapter',
    event_type: 'EXECUTION_COMPLETED',
    state_from: 'EXECUTING',
    state_to: 'VALIDATING',
    reason_code: 'SIMULATION_DECLARED',
    inputs: [],
    outputs: [],
    usage_record_id: null,
    idempotency_key: null,
  },
};

test('Agent MVP maps top-level status/reason_code from actual runtime result shape { identity, event }', () => {
  const agentRuntime = spy(() => ACTUAL_RUNTIME_RESULT);
  const agent = createAgentMvp(fullDeps({ agentRuntime }));
  const result = agent.execute(RUN_INPUT);
  assert.strictEqual(result.stopped_at, 'runtime');
  assert.strictEqual(result.reachedRuntime, true);
  assert.strictEqual(result.status, 'CONFIRMED');
  assert.strictEqual(result.reason_code, 'SIMULATION_DECLARED');
  assert.deepStrictEqual(result.identity, ACTUAL_RUNTIME_RESULT.identity);
  assert.deepStrictEqual(result.runEvent, ACTUAL_RUNTIME_RESULT.event);
  assert.strictEqual(result.cause, null);
});

test('runtime result propagation preserves owner outputs on failure', () => {
  const failedRuntime = {
    status: 'FAILED',
    reason_code: 'EXECUTION_FAILED',
    identity: {
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'FAILED',
      reason_code: 'EXECUTION_FAILED',
      simulated: false,
      proposal: SELECTED.selected,
      effective: null,
      details: 'provider process exited',
    },
    event: null,
  };
  const agent = createAgentMvp(fullDeps({ agentRuntime: spy(() => failedRuntime) }));
  const result = agent.execute(RUN_INPUT);
  assert.strictEqual(result.stopped_at, 'runtime');
  assert.strictEqual(result.status, 'FAILED');
  assert.strictEqual(result.reason_code, 'EXECUTION_FAILED');
  assert.deepStrictEqual(result.identity, failedRuntime.identity);
  assert.strictEqual(result.runEvent, null);
});

// --- Reviewer finding M1: boundary validation (fail-closed at input) ---

function cloneInput() {
  return JSON.parse(JSON.stringify(RUN_INPUT));
}

function runWith(input) {
  const deps = fullDeps();
  const agent = createAgentMvp(deps);
  const result = agent.execute(input);
  return { result, deps };
}

function assertFailClosed(bundle) {
  const { result, deps } = bundle;
  assert.strictEqual(result.stopped_at, 'input');
  assert.strictEqual(result.reachedRuntime, false);
  assert.strictEqual(result.status, 'BLOCKED');
  assert.strictEqual(result.reason_code, 'INVALID_AGENT_MVP_INPUT');
  assert.strictEqual(result.cause, 'INVALID_AGENT_MVP_INPUT');
  assert.strictEqual(result.identity, null);
  assert.strictEqual(result.runEvent, null);
  assert.ok(Array.isArray(result.validation_errors));
  assert.ok(result.validation_errors.length > 0);
  assert.deepStrictEqual(result.stages, {
    route: null, model: null, context: null, explorer: null, runtime: null,
  });
  assert.strictEqual(deps.router.calls.length, 0);
  assert.strictEqual(deps.modelResolver.calls.length, 0);
  assert.strictEqual(deps.contextPackager.package.calls.length, 0);
  assert.strictEqual(deps.explorer.calls.length, 0);
  assert.strictEqual(deps.agentRuntime.calls.length, 0);
}

test('M1: non-object routingInput fails closed at input without calling any dependency', () => {
  const input = cloneInput();
  input.routingInput = 'not-an-object';
  assertFailClosed(runWith(input));
});

test('M1: routingInput violating TaskRoutingInput schema fails closed at input', () => {
  const input = cloneInput();
  input.routingInput = { task_type: 'feature' }; // missing area, risk (strict schema)
  assertFailClosed(runWith(input));
});

test('M1: null roleRegistry fails closed at input', () => {
  const input = cloneInput();
  input.roleRegistry = null;
  assertFailClosed(runWith(input));
});

test('M1: null modelRegistry fails closed at input', () => {
  const input = cloneInput();
  input.modelRegistry = null;
  assertFailClosed(runWith(input));
});

test('M1: null finops fails closed at input', () => {
  const input = cloneInput();
  input.finops = null;
  assertFailClosed(runWith(input));
});

test('M1: budget_tokens as negative integer fails closed at input', () => {
  const input = cloneInput();
  input.budget_tokens = -5;
  assertFailClosed(runWith(input));
});

test('M1: budget_tokens as non-integer fails closed at input', () => {
  const input = cloneInput();
  input.budget_tokens = 1.5;
  assertFailClosed(runWith(input));
});

test('M1: requested_paths not an array of strings fails closed at input', () => {
  const input = cloneInput();
  input.requested_paths = ['src/x.js', 42];
  assertFailClosed(runWith(input));
});

test('M1: requested_evidence violating EvidenceRequirement contract fails closed at input', () => {
  const input = cloneInput();
  input.requested_evidence = [{ evidence_id: '' }]; // min(1) fails
  assertFailClosed(runWith(input));
});

test('M1: valid input without requested_paths/requested_evidence reaches runtime (absence allowed)', () => {
  const input = cloneInput();
  delete input.requested_paths;
  delete input.requested_evidence;
  const { result, deps } = runWith(input);
  assert.strictEqual(deps.router.calls.length, 1);
  assert.strictEqual(result.stopped_at, 'runtime');
});

test('M1: execute(null) fails closed at input without throwing (config resolution after validation)', () => {
  const deps = fullDeps();
  const agent = createAgentMvp(deps);
  const result = agent.execute(null);
  assertFailClosed({ result, deps });
});

test('M1: requested_paths null fails closed at input', () => {
  const input = cloneInput();
  input.requested_paths = null;
  assertFailClosed(runWith(input));
});

test('M1: requested_evidence null fails closed at input', () => {
  const input = cloneInput();
  input.requested_evidence = null;
  assertFailClosed(runWith(input));
});

test('M1: valid but unsupported registry reaches router owner (no full revalidation at boundary)', () => {
  const input = cloneInput();
  input.roleRegistry = { schema_version: 'fitflow-role-registry/v2' };
  const { result, deps } = runWith(input);
  assert.strictEqual(deps.router.calls.length, 1);
  assert.notStrictEqual(result.stopped_at, 'input');
});
