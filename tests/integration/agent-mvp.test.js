'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { mkdtempSync, rmSync } = require('node:fs');

const { routeTask } = require('../../src/router');
const { resolveModel } = require('../../src/model-resolver');
const { ContextPackager, defaultTokenizer } = require('../../src/core/context-packager');
const { decideContext } = require('../../src/explorer');
const { executeRuntime } = require('../../src/agent-runtime');
const { createAgentMvp } = require('../../src/agent-mvp');
const { RuntimeIdentity } = require('../../src/contracts/runtime-identity');
const { RunEvent } = require('../../src/contracts/run-event');
const { resolveProject } = require('../../src/project-profile');
const { loadRegistries } = require('../../src/registries');

const externalProjectEnabled = process.env.FF_TEST_EXTERNAL_PROJECT === '1';

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

function deterministicMaterializer({ budget_tokens, requested_paths, requested_evidence }) {
  const evidence = [];
  for (const req of requested_evidence) {
    if (evidence.length >= 3) break;
    const content = `Deterministic evidence content for ${req.evidence_id}`.repeat(10);
    evidence.push({
      evidence_id: req.evidence_id,
      path: req.path || `src/${req.evidence_id}.js`,
      content,
    });
  }
  return {
    provider: 'deterministic-fake',
    evidence,
    omitted_paths: [],
    quality_status: 'CURRENT',
  };
}

function createTestAgentMvp() {
  const tokenizer = defaultTokenizer();
  const contextPackager = new ContextPackager({
    materializer: deterministicMaterializer,
    tokenizer,
  });

  const adapter = {
    execute: ({ proposal }) => ({
      mode: 'simulated',
      provider: proposal.provider,
      runtime_id: proposal.runtime_id,
      outputs: [],
    }),
  };

  const agent = createAgentMvp({
    router: (routingInput, roleRegistry) => routeTask(routingInput, roleRegistry),
    modelResolver: (args) => resolveModel(args),
    contextPackager,
    explorer: (contextResult) => decideContext(contextResult),
    agentRuntime: (args) => executeRuntime(args),
    adapter,
  });

  return agent;
}

function identityArtifactFixture() {
  return {
    path: 'runs/FF-AI-VNEXT-009-local/runtime-identity.json',
    hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    schema_version: 'fitflow-runtime-identity/v1',
  };
}

function eventMetadataFixture() {
  return {
    event_id: 'local-integration-event-001',
    sequence: 4,
    task_id: 'FF-AI-VNEXT-009',
    run_id: 'FF-AI-VNEXT-009-local',
    created_at: '2026-08-24T20:00:00-03:00',
  };
}

function localRoleRegistry() {
  return {
    schema_version: 'fitflow-role-registry/v3',
    roles: {
      coder_b: {
        status: 'active',
        actor_type: 'model',
        writes_product: true,
        terminal_authority: false,
        deterministic_first: true,
        allowed_skills: ['coding'],
        criticality_ceiling: 'low',
        require_independent_execution: true,
        promotion_authority: false,
      },
    },
    disabled_roles: [],
    routing_policy: {
      id: 'fitflow-routing-policy/v1',
      matching_order: ['task_type', 'area', 'risk'],
      rules: [
        {
          id: 'tooling-ai-tooling-low-coder-b',
          precedence: 10,
          match: { task_type: 'tooling', area: 'ai_tooling', risk: 'low' },
          role: 'coder_b',
          requirements: {
            capabilities: ['coding'],
            criticality: 'low',
            minimum_trust: 'experimental',
            allowed_resource_classes: ['local'],
            allowed_access_modes: ['local'],
          },
        },
      ],
    },
  };
}

function localModelRegistry() {
  return {
    schema_version: 'fitflow-model-registry/v3',
    selection_policy: 'fitflow-model-selection/v1',
    entries: {
      'local-simulator': {
        provider: 'local',
        runtime_id: 'simulator-v1',
        display_name: 'Local Simulator',
        availability: 'available',
        trust: 'experimental',
        resource_pool: 'local',
        capabilities: ['coding'],
        criticality_ceiling: 'low',
        eligible_roles: ['coder_b'],
        preferred_roles: ['coder_b'],
        selection_tier: 0,
        benchmark_status: 'verified',
        last_verified: '2026-08-24T00:00:00Z',
      },
    },
  };
}

function localFinOps() {
  return {
    schema_version: 'fitflow-finops/v1',
    eligibility_policy: 'fitflow-finops-fixed/v1',
    incremental_budget_usd: 0,
    paid_api_enabled: false,
    providers: {
      local: { available: true },
    },
    resource_pools: {
      local: {
        enabled: true,
        available: true,
        resource_class: 'local',
        access_mode: 'local',
        criticality_ceiling: 'low',
        quota_remaining: null,
        capacity_remaining: 10,
        rate_limit_remaining: 100,
        concurrency_available: 5,
      },
    },
  };
}

function runInputFixture() {
  return {
    routingInput: { task_type: 'tooling', area: 'ai_tooling', risk: 'low' },
    roleRegistry: localRoleRegistry(),
    modelRegistry: localModelRegistry(),
    finops: localFinOps(),
    requested_paths: ['src/agent-mvp/index.js'],
    requested_evidence: [
      { evidence_id: 'ev-001', path: 'src/agent-mvp/index.js', required: true },
      { evidence_id: 'ev-002', path: 'src/agent-runtime/index.js', required: true },
      { evidence_id: 'ev-003', path: 'src/contracts/route.js', required: true },
    ],
    budget_tokens: 4096,
    orchestrator: orchestratorFixture(),
    identityArtifact: identityArtifactFixture(),
    eventMetadata: eventMetadataFixture(),
  };
}

test('local end-to-end composition with real components and deterministic fake materializer', () => {
  const agent = createTestAgentMvp();
  const result = agent.execute(runInputFixture());

  assert.strictEqual(result.reachedRuntime, true);
  assert.strictEqual(result.stopped_at, 'runtime');
  assert.strictEqual(result.identity.status, 'CONFIRMED');
  assert.strictEqual(result.identity.reason_code, 'SIMULATION_DECLARED');
  assert.ok(result.identity !== null);
  assert.ok(result.runEvent !== null);
  assert.strictEqual(RuntimeIdentity.safeParse(result.identity).success, true);
  assert.strictEqual(RunEvent.safeParse(result.runEvent).success, true);
  assert.strictEqual(result.identity.simulated, true);
  assert.strictEqual(result.identity.reason_code, 'SIMULATION_DECLARED');
  assert.strictEqual(result.identity.effective.mode, 'simulated');
  assert.strictEqual(result.runEvent.event_type, 'EXECUTION_COMPLETED');
  assert.strictEqual(result.runEvent.state_to, 'VALIDATING');
  assert.strictEqual(result.runEvent.actor, 'adapter');
});

test('active v3 registries complete a declared simulation with paid API disabled', { skip: externalProjectEnabled ? false : 'set FF_TEST_EXTERNAL_PROJECT=1' }, () => {
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

  const tokenizer = defaultTokenizer();
  const contextPackager = new ContextPackager({
    materializer: deterministicMaterializer,
    tokenizer,
  });

  const adapter = {
    execute: ({ proposal }) => ({
      mode: 'simulated',
      provider: proposal.provider,
      runtime_id: proposal.runtime_id,
      outputs: [],
    }),
  };

  const agent = createAgentMvp({
    router: (routingInput, roleRegistry) => routeTask(routingInput, roleRegistry),
    modelResolver: (args) => resolveModel(args),
    contextPackager,
    explorer: (contextResult) => decideContext(contextResult),
    agentRuntime: (args) => executeRuntime(args),
    adapter,
  });

  const runInput = {
    routingInput: { task_type: 'tooling', area: 'ai_tooling', risk: 'low' },
    roleRegistry: registries['roles.yaml'],
    modelRegistry: registries['models.yaml'],
    finops: registries['finops.yaml'],
    requested_paths: ['src/agent-mvp/index.js'],
    requested_evidence: [
      { evidence_id: 'ev-001', path: 'src/agent-mvp/index.js', required: true },
      { evidence_id: 'ev-002', path: 'src/agent-runtime/index.js', required: true },
    ],
    budget_tokens: 4096,
    orchestrator: registries['orchestrator.yaml'],
    identityArtifact: {
      path: 'runs/FF-AI-VNEXT-009-integration/runtime-identity.json',
      hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      schema_version: 'fitflow-runtime-identity/v1',
    },
    eventMetadata: {
      event_id: 'integration-event-001',
      sequence: 4,
      task_id: 'FF-AI-VNEXT-009',
      run_id: 'FF-AI-VNEXT-009-integration',
      created_at: '2026-08-24T20:00:00-03:00',
    },
  };

  const result = agent.execute(runInput);

  assert.strictEqual(result.reachedRuntime, true);
  assert.strictEqual(result.stopped_at, 'runtime');
  assert.strictEqual(result.identity.status, 'CONFIRMED');
  assert.strictEqual(result.identity.reason_code, 'SIMULATION_DECLARED');
  assert.ok(result.identity !== null);
  assert.ok(result.runEvent !== null);
  assert.strictEqual(RuntimeIdentity.safeParse(result.identity).success, true);
  assert.strictEqual(RunEvent.safeParse(result.runEvent).success, true);
  assert.strictEqual(result.identity.simulated, true);
  assert.strictEqual(result.identity.reason_code, 'SIMULATION_DECLARED');
  assert.strictEqual(result.identity.effective.mode, 'simulated');
  assert.strictEqual(result.runEvent.event_type, 'EXECUTION_COMPLETED');
  assert.strictEqual(result.runEvent.state_to, 'VALIDATING');
  assert.strictEqual(result.runEvent.actor, 'adapter');
});
