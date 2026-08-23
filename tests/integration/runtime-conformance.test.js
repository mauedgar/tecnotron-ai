'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { resolveProject } = require('../../src/project-profile');
const { loadRegistries } = require('../../src/registries');
const { routeTask } = require('../../src/router');
const { resolveModel } = require('../../src/model-resolver');
const { executeRuntime } = require('../../src/agent-runtime');
const { decideContext } = require('../../src/explorer');
const { RuntimeIdentity } = require('../../src/contracts/runtime-identity');
const { RunEvent } = require('../../src/contracts/run-event');

const hasExternalProjectResolution = Boolean(
  process.env.FF_PROJECT_ROOT
  || process.env.FF_PROJECT_PROFILE
  || process.env.FF_AI_CORE_ROOT,
);

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

test('local conformance proceeds from complete context through a declared simulation', () => {
  const contextDecision = decideContext({ status: 'COMPLETE', missing_evidence_ids: [] });
  assert.strictEqual(contextDecision.action, 'PROCEED');

  const selected = {
    registry_id: 'local-simulator',
    provider: 'local',
    runtime_id: 'simulator-v1',
    pool_id: 'local',
    resource_class: 'local',
    access_mode: 'local',
  };
  const result = executeRuntime({
    orchestrator: orchestratorFixture(),
    routeDecision: {
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
    },
    modelResolution: {
      status: 'SELECTED',
      selected,
      policy_id: 'fitflow-model-selection/v1',
      fallback_used: false,
      reason_code: 'MODEL_SELECTED',
    },
    adapter: {
      execute: () => ({
        mode: 'simulated',
        provider: 'local',
        runtime_id: 'simulator-v1',
        outputs: [],
      }),
    },
    identityArtifact: {
      path: 'runs/FF-AI-VNEXT-008-local/runtime-identity.json',
      hash: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      schema_version: 'fitflow-runtime-identity/v1',
    },
    eventMetadata: {
      event_id: 'local-integration-event-001',
      sequence: 4,
      task_id: 'FF-AI-VNEXT-008',
      run_id: 'FF-AI-VNEXT-008-local',
      created_at: '2026-08-22T20:00:00-03:00',
    },
  });

  assert.strictEqual(result.identity.reason_code, 'SIMULATION_DECLARED');
  assert.strictEqual(RuntimeIdentity.safeParse(result.identity).success, true);
  assert.strictEqual(RunEvent.safeParse(result.event).success, true);
});

test('active v3 registries complete a declared simulation with paid API disabled', { skip: !hasExternalProjectResolution }, () => {
  const resolution = resolveProject();
  if (process.env.FF_PROJECT_ROOT) {
    assert.strictEqual(resolution.projectRoot, path.resolve(process.env.FF_PROJECT_ROOT));
  }

  const registries = loadRegistries(resolution.configDir, [
    'project-profile.yaml',
    'roles.yaml',
    'models.yaml',
    'finops.yaml',
    'orchestrator.yaml',
  ]);
  assert.strictEqual(registries['roles.yaml'].schema_version, 'fitflow-role-registry/v3');
  assert.strictEqual(registries['models.yaml'].schema_version, 'fitflow-model-registry/v3');
  assert.strictEqual(registries['finops.yaml'].paid_api_enabled, false);

  const routeDecision = routeTask(
    { task_type: 'tooling', area: 'ai_tooling', risk: 'low' },
    registries['roles.yaml'],
  );
  const modelResolution = resolveModel({
    role: routeDecision.role,
    requirements: routeDecision.requirements,
    modelRegistry: registries['models.yaml'],
    roleRegistry: registries['roles.yaml'],
    finops: registries['finops.yaml'],
  });
  assert.strictEqual(routeDecision.status, 'ROUTED');
  assert.strictEqual(modelResolution.status, 'SELECTED');

  const result = executeRuntime({
    orchestrator: registries['orchestrator.yaml'],
    routeDecision,
    modelResolution,
    adapter: {
      execute: () => ({
        mode: 'simulated',
        provider: modelResolution.selected.provider,
        runtime_id: modelResolution.selected.runtime_id,
        outputs: [],
      }),
    },
    identityArtifact: {
      path: 'runs/FF-AI-VNEXT-008-integration/runtime-identity.json',
      hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      schema_version: 'fitflow-runtime-identity/v1',
    },
    eventMetadata: {
      event_id: 'integration-event-001',
      sequence: 4,
      task_id: 'FF-AI-VNEXT-008',
      run_id: 'FF-AI-VNEXT-008-integration',
      created_at: '2026-08-22T20:00:00-03:00',
    },
  });

  assert.strictEqual(result.identity.reason_code, 'SIMULATION_DECLARED');
  assert.strictEqual(result.identity.simulated, true);
  assert.strictEqual(RuntimeIdentity.safeParse(result.identity).success, true);
  assert.strictEqual(RunEvent.safeParse(result.event).success, true);
});
