'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { executeRuntime: executeRuntimePort } = require('../../src/agent-runtime');
const { RuntimeIdentity } = require('../../src/contracts/runtime-identity');
const { RunEvent } = require('../../src/contracts/run-event');

const proposal = {
  registry_id: 'local-simulator',
  provider: 'local',
  runtime_id: 'simulator-v1',
  pool_id: 'local',
  resource_class: 'local',
  access_mode: 'local',
};

const routeDecision = {
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

const modelResolution = {
  status: 'SELECTED',
  selected: proposal,
  policy_id: 'fitflow-model-selection/v1',
  fallback_used: false,
  reason_code: 'MODEL_SELECTED',
};

const identityArtifact = {
  path: 'runs/FF-AI-VNEXT-008-001/runtime-identity.json',
  hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  schema_version: 'fitflow-runtime-identity/v1',
};

const eventMetadata = {
  event_id: 'event-001',
  sequence: 4,
  task_id: 'FF-AI-VNEXT-008',
  run_id: 'FF-AI-VNEXT-008-001',
  created_at: '2026-08-22T20:00:00-03:00',
};

function orchestratorFixture() {
  return {
    schema_version: 'fitflow-orchestrator/v2',
    baseline: 'test',
    runtime: {
      port: 'AgentRuntimePort',
      preferred_adapter: 'test-adapter',
      adapter_status: 'available',
    },
    control: {
      planner: 'developer',
      terminal_agent_state: 'PENDING_ACCEPTANCE',
      final_state: 'DONE',
      final_actor: 'developer',
      commits_by_agents: false,
      dependency_changes_by_agents: false,
    },
    states: [
      'PLANNING',
      'ROUTING',
      'EXPLORING',
      'EXECUTING',
      'VALIDATING',
      'PENDING_ACCEPTANCE',
      'DONE',
    ],
    transitions: {
      PLANNING: ['ROUTING'],
      ROUTING: ['EXPLORING', 'EXECUTING'],
      EXPLORING: ['EXECUTING'],
      EXECUTING: ['VALIDATING'],
      VALIDATING: ['PENDING_ACCEPTANCE'],
      PENDING_ACCEPTANCE: ['DONE'],
      DONE: [],
    },
    limits: {
      context_expansions: 1,
      implementation_attempts: 1,
      review_attempts: 1,
    },
    parallelism: {
      enabled: false,
      require_disjoint_ownership_keys: true,
      single_writer_per_key: true,
    },
    artifacts: {
      task_root: '.ai/tasks',
      run_root: '.ai/runs',
      local_root: '.ai/local',
      schema_root: '.ai/contracts/v2',
    },
  };
}

function executeRuntime(input) {
  return executeRuntimePort({ orchestrator: orchestratorFixture(), ...input });
}

function failedResult(details) {
  return {
    status: 'FAILED',
    reason_code: 'EXECUTION_FAILED',
    identity: {
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'FAILED',
      reason_code: 'EXECUTION_FAILED',
      simulated: false,
      proposal,
      effective: null,
      details,
    },
    event: null,
  };
}

test('agent-runtime: declared simulation emits valid effective identity and execution event', () => {
  const adapter = {
    execute: () => ({
      mode: 'simulated',
      provider: 'local',
      runtime_id: 'simulator-v1',
      outputs: [],
    }),
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result.identity, {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'SIMULATION_DECLARED',
    simulated: true,
    proposal,
    effective: {
      mode: 'simulated',
      provider: 'local',
      runtime_id: 'simulator-v1',
    },
    details: null,
  });
  assert.strictEqual(RuntimeIdentity.safeParse(result.identity).success, true);
  assert.strictEqual(RunEvent.safeParse(result.event).success, true);
  assert.strictEqual(result.event.event_type, 'EXECUTION_COMPLETED');
  assert.deepStrictEqual(result.event.outputs, [identityArtifact]);
});

test('agent-runtime: controlled real execution confirms the observed runtime identity', () => {
  const adapter = {
    execute: () => ({
      mode: 'real',
      provider: 'local',
      runtime_id: 'simulator-v1',
      outputs: [],
    }),
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.strictEqual(result.identity.reason_code, 'IDENTITY_CONFIRMED');
  assert.strictEqual(result.identity.simulated, false);
  assert.deepStrictEqual(result.identity.effective, {
    mode: 'real',
    provider: 'local',
    runtime_id: 'simulator-v1',
  });
  assert.strictEqual(result.event.reason_code, 'IDENTITY_CONFIRMED');
});

test('agent-runtime: execution event preserves artifacts produced by the adapter', () => {
  const executionArtifact = {
    path: 'runs/FF-AI-VNEXT-008-001/output.txt',
    hash: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    schema_version: null,
  };
  const adapter = {
    execute: () => ({
      mode: 'simulated',
      provider: 'local',
      runtime_id: 'simulator-v1',
      outputs: [executionArtifact],
    }),
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result.event.outputs, [identityArtifact, executionArtifact]);
  assert.strictEqual(RunEvent.safeParse(result.event).success, true);
});

test('agent-runtime: blocked route does not execute or emit effective identity', () => {
  const adapter = {
    execute: () => {
      throw new Error('adapter must not execute');
    },
  };

  const result = executeRuntime({
    routeDecision: {
      status: 'BLOCKED',
      reason_code: 'NO_MATCHING_RULE',
      role: null,
      requirements: null,
    },
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, {
    status: 'BLOCKED',
    reason_code: 'ROUTE_NOT_ROUTED',
    identity: null,
    event: null,
  });
});

test('agent-runtime: unselected model does not execute or emit effective identity', () => {
  const adapter = {
    execute: () => {
      throw new Error('adapter must not execute');
    },
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution: {
      status: 'BLOCKED',
      selected: null,
      reason_code: 'NO_ELIGIBLE_MODEL',
    },
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, {
    status: 'BLOCKED',
    reason_code: 'MODEL_NOT_SELECTED',
    identity: null,
    event: null,
  });
});

test('agent-runtime: effective runtime mismatch preserves proposal and observation', () => {
  const adapter = {
    execute: () => ({
      mode: 'simulated',
      provider: 'fallback-local',
      runtime_id: 'simulator-v2',
      outputs: [],
    }),
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result.identity, {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'MISMATCH',
    reason_code: 'PROPOSAL_MISMATCH',
    simulated: true,
    proposal,
    effective: {
      mode: 'simulated',
      provider: 'fallback-local',
      runtime_id: 'simulator-v2',
    },
    details: 'Effective runtime differs from proposal',
  });
  assert.strictEqual(result.event.reason_code, 'PROPOSAL_MISMATCH');
});

test('agent-runtime: real runtime mismatch preserves proposal and real observation', () => {
  const adapter = {
    execute: () => ({
      mode: 'real',
      provider: 'fallback-local',
      runtime_id: 'simulator-v2',
      outputs: [],
    }),
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result.identity, {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'MISMATCH',
    reason_code: 'PROPOSAL_MISMATCH',
    simulated: false,
    proposal,
    effective: {
      mode: 'real',
      provider: 'fallback-local',
      runtime_id: 'simulator-v2',
    },
    details: 'Effective runtime differs from proposal',
  });
  assert.strictEqual(result.event.reason_code, 'PROPOSAL_MISMATCH');
});

test('agent-runtime: unavailable adapter records unavailable identity without execution event', () => {
  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter: null,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, {
    status: 'UNAVAILABLE',
    reason_code: 'ADAPTER_UNAVAILABLE',
    identity: {
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'UNAVAILABLE',
      reason_code: 'ADAPTER_UNAVAILABLE',
      simulated: false,
      proposal,
      effective: null,
      details: 'Adapter is unavailable',
    },
    event: null,
  });
});

test('agent-runtime: unavailable proposed runtime records stable unavailable identity', () => {
  const adapter = {
    execute: () => ({
      status: 'UNAVAILABLE',
      reason_code: 'RUNTIME_UNAVAILABLE',
      details: 'Selected runtime is not loaded',
    }),
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, {
    status: 'UNAVAILABLE',
    reason_code: 'RUNTIME_UNAVAILABLE',
    identity: {
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'UNAVAILABLE',
      reason_code: 'RUNTIME_UNAVAILABLE',
      simulated: false,
      proposal,
      effective: null,
      details: 'Selected runtime is not loaded',
    },
    event: null,
  });
});

test('agent-runtime: unavailable runtime without details records a stable fallback cause', () => {
  const adapter = {
    execute: () => ({
      status: 'UNAVAILABLE',
    }),
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, {
    status: 'UNAVAILABLE',
    reason_code: 'RUNTIME_UNAVAILABLE',
    identity: {
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'UNAVAILABLE',
      reason_code: 'RUNTIME_UNAVAILABLE',
      simulated: false,
      proposal,
      effective: null,
      details: 'Runtime reported unavailable without details',
    },
    event: null,
  });
});

test('agent-runtime: adapter failure records failed identity without execution event', () => {
  const adapter = {
    execute: () => {
      throw new Error('provider process exited');
    },
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, {
    status: 'FAILED',
    reason_code: 'EXECUTION_FAILED',
    identity: {
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'FAILED',
      reason_code: 'EXECUTION_FAILED',
      simulated: false,
      proposal,
      effective: null,
      details: 'provider process exited',
    },
    event: null,
  });
});

test('agent-runtime: non-Error adapter throw is normalized without leaking undefined', () => {
  const adapter = {
    execute: () => {
      throw 'boom'; // eslint-disable-line no-throw-literal
    },
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, failedResult('Adapter threw a non-Error value'));
});

test('agent-runtime: malformed adapter response is normalized without leaking ZodError', () => {
  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter: { execute: () => ({}) },
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, failedResult('Adapter returned a malformed execution result'));
});

test('agent-runtime: invalid output artifact is normalized without emitting an event', () => {
  const adapter = {
    execute: () => ({
      mode: 'simulated',
      provider: 'local',
      runtime_id: 'simulator-v1',
      outputs: [{ path: 'artifact.json', hash: null }],
    }),
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
  });

  assert.deepStrictEqual(result, failedResult('Adapter produced an invalid output artifact'));
});

test('agent-runtime: unauthorized execution transition fails before invoking adapter', () => {
  const orchestrator = orchestratorFixture();
  orchestrator.transitions.EXECUTING = [];
  const adapter = {
    execute: () => {
      throw new Error('adapter must not execute');
    },
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
    orchestrator,
  });

  assert.deepStrictEqual(
    result,
    failedResult('Orchestrator does not allow transition EXECUTING -> VALIDATING'),
  );
});

test('agent-runtime: malformed orchestrator fails before invoking adapter', () => {
  const orchestrator = orchestratorFixture();
  delete orchestrator.baseline;
  const adapter = {
    execute: () => {
      throw new Error('adapter must not execute');
    },
  };

  const result = executeRuntime({
    routeDecision,
    modelResolution,
    adapter,
    identityArtifact,
    eventMetadata,
    orchestrator,
  });

  assert.deepStrictEqual(result, failedResult('Invalid orchestrator configuration'));
});
