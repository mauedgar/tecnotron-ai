'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { OperationalRunnerError, runOperationalWorkflow } = require('../../src/operational-runner');

function taskFixture(overrides = {}) {
  return {
    artifact: 'TASK',
    schema_version: 'fitflow-task/v2',
    task_id: 'FF-AI-OPS-TEST',
    title: 'Exercise the operational runner',
    status: 'EXECUTING',
    task_type: 'tooling',
    area: 'ai_tooling',
    scope: 'mixed',
    lane: 'ai_orchestrated',
    risk: 'low',
    priority: 'P1',
    created_at: '2026-08-26T00:00:00Z',
    author_role: 'developer',
    baseline: { revision: 'abc123', fingerprint_status: 'unavailable', working_tree_fingerprint: null, fingerprint_reason: 'test baseline' },
    github_issue: null,
    openspec_change: 'operational-workflow-mvp',
    objective: 'Exercise a complete deterministic workflow with bounded context and no inference.',
    in_scope: ['runner'],
    out_of_scope: ['provider calls'],
    acceptance_criteria: [{ id: 'AC-1', criterion: 'The simulation reaches validation' }],
    ownership_keys: ['path:src/operational-runner/**'],
    required_docs: ['AGENTS.md'],
    ...overrides,
  };
}

function orchestratorFixture() {
  return {
    schema_version: 'fitflow-orchestrator/v2',
    baseline: 'test',
    runtime: { port: 'AgentRuntimePort', preferred_adapter: 'simulation', adapter_status: 'available' },
    control: {
      planner: 'developer', terminal_agent_state: 'PENDING_ACCEPTANCE', final_state: 'DONE', final_actor: 'developer',
      commits_by_agents: false, dependency_changes_by_agents: false,
    },
    states: ['BACKLOG', 'READY', 'PLANNING', 'ROUTING', 'EXPLORING', 'EXECUTING', 'VALIDATING', 'REVIEWING', 'DOC_SYNC', 'PENDING_ACCEPTANCE', 'WAITING_DEVELOPER', 'DONE', 'BLOCKED', 'BLOCKED_HIGH_RISK', 'CANCELLED'],
    transitions: {
      BACKLOG: ['READY'], READY: ['PLANNING'], PLANNING: ['ROUTING', 'BLOCKED'],
      ROUTING: ['EXPLORING', 'EXECUTING', 'BLOCKED'], EXPLORING: ['EXPLORING', 'EXECUTING', 'BLOCKED'],
      EXECUTING: ['VALIDATING', 'BLOCKED'], VALIDATING: ['REVIEWING', 'BLOCKED'], REVIEWING: ['DOC_SYNC', 'BLOCKED'],
      DOC_SYNC: ['PENDING_ACCEPTANCE', 'BLOCKED'], PENDING_ACCEPTANCE: ['DONE', 'BLOCKED'],
      WAITING_DEVELOPER: ['PLANNING', 'BLOCKED'], BLOCKED: ['READY'], BLOCKED_HIGH_RISK: ['READY'], DONE: [], CANCELLED: [],
    },
    limits: { context_expansions: 1, implementation_attempts: 1, review_attempts: 1 },
    parallelism: { enabled: false, require_disjoint_ownership_keys: true, single_writer_per_key: true },
    artifacts: { task_root: '.ai/tasks', run_root: '.ai/runs', local_root: '.ai/local', schema_root: '.ai/contracts/v2' },
  };
}

function roleRegistryFixture() {
  return {
    schema_version: 'fitflow-role-registry/v3',
    roles: { coder_b: { status: 'active', actor_type: 'model', writes_product: true, criticality_ceiling: 'low' } },
    disabled_roles: [],
    routing_policy: {
      id: 'fitflow-routing-policy/v1',
      matching_order: ['task_type', 'area', 'risk'],
      rules: [{
        id: 'tooling_low', precedence: 1, match: { task_type: 'tooling', area: 'ai_tooling', risk: 'low' }, role: 'coder_b',
        requirements: {
          capabilities: ['coding'], criticality: 'low', minimum_trust: 'experimental',
          allowed_resource_classes: ['local'], allowed_access_modes: ['local'],
        },
      }],
    },
  };
}

function modelRegistryFixture() {
  return {
    schema_version: 'fitflow-model-registry/v3',
    selection_policy: 'fitflow-model-selection/v1',
    entries: {
      simulator: {
        provider: 'local', runtime_id: 'simulator-v1', display_name: 'Simulator', availability: 'available', trust: 'experimental',
        resource_pool: 'local', capabilities: ['coding'], criticality_ceiling: 'low', eligible_roles: ['coder_b'],
        preferred_roles: ['coder_b'], selection_tier: 1, benchmark_status: 'verified', last_verified: '2026-08-26',
      },
    },
  };
}

function finopsFixture(overrides = {}) {
  return {
    schema_version: 'fitflow-finops/v1',
    eligibility_policy: 'fitflow-finops-fixed/v1',
    incremental_budget_usd: 0,
    paid_api_enabled: false,
    providers: { local: { available: true } },
    resource_pools: {
      local: {
        enabled: true, available: true, resource_class: 'local', access_mode: 'local', criticality_ceiling: 'low',
        quota_remaining: null, capacity_remaining: 1, rate_limit_remaining: 1, concurrency_available: 1,
      },
    },
    ...overrides,
  };
}

function semanticRoleRegistryFixture({ role, risk, roleCeiling, requirementCriticality }) {
  return {
    schema_version: 'fitflow-role-registry/v3',
    roles: { [role]: { status: 'active', actor_type: 'model', writes_product: true, criticality_ceiling: roleCeiling } },
    disabled_roles: [],
    routing_policy: {
      id: 'fitflow-routing-policy/v1',
      matching_order: ['task_type', 'area', 'risk'],
      rules: [{
        id: `${role}_${risk}`, precedence: 1, match: { task_type: 'tooling', area: 'ai_tooling', risk }, role,
        requirements: {
          capabilities: ['coding'], criticality: requirementCriticality, minimum_trust: risk === 'high' ? 'trusted' : 'standard',
          allowed_resource_classes: ['zero_incremental'], allowed_access_modes: ['included'],
        },
      }],
    },
  };
}

function semanticModelRegistryFixture(role, { id = 'big_pickle_opencode', runtimeId = 'opencode/big-pickle', availability = 'available', criticality = 'medium' } = {}) {
  return {
    schema_version: 'fitflow-model-registry/v3',
    selection_policy: 'fitflow-model-selection/v1',
    entries: {
      [id]: {
        provider: 'opencode', runtime_id: runtimeId, display_name: id, availability, trust: criticality === 'high' ? 'trusted' : 'standard',
        resource_pool: 'opencode_zero_incremental', capabilities: ['coding', 'reasoning', 'review'], criticality_ceiling: criticality,
        eligible_roles: [role], preferred_roles: [role], selection_tier: 1,
        benchmark_status: availability === 'available' ? 'developer_observed_operational' : 'temporarily_unavailable', last_verified: '2026-08-26',
      },
    },
  };
}

function semanticFinopsFixture() {
  return {
    schema_version: 'fitflow-finops/v1',
    eligibility_policy: 'fitflow-finops-fixed/v1',
    incremental_budget_usd: 0,
    paid_api_enabled: false,
    providers: { opencode: { available: true } },
    resource_pools: {
      opencode_zero_incremental: {
        enabled: true, available: true, resource_class: 'zero_incremental', access_mode: 'included', criticality_ceiling: 'medium',
        quota_remaining: null, capacity_remaining: 1, rate_limit_remaining: 1, concurrency_available: 1,
      },
    },
  };
}

function dependencies(root, overrides = {}) {
  const task = overrides.task || taskFixture();
  const finops = overrides.finops || finopsFixture();
  return {
    clock: () => new Date('2026-08-26T00:00:00Z'),
    resolveProject: () => ({
      projectRoot: root,
      aiCoreRoot: root,
      configDir: path.join(root, '.ai', 'config'),
      profile: { operational: { run_root: '.ai/runs' } },
    }),
    readTaskFile: () => task,
    loadRegistries: () => ({
      'orchestrator.yaml': orchestratorFixture(),
      'roles.yaml': overrides.roleRegistry || roleRegistryFixture(),
      'models.yaml': overrides.modelRegistry || modelRegistryFixture(),
      'finops.yaml': finops,
    }),
    openSpecClient: overrides.openSpecClient || {
      listChanges: () => [],
      readChange: (id) => ({ id, title: id, status: 'active', delta: { requirements: ['bounded context'] } }),
    },
    repositoryMaterializer: overrides.repositoryMaterializer || ((request) => ({
      provider: 'repo-packager',
      evidence: request.requested_evidence.map((item) => ({ evidence_id: item.evidence_id, path: item.path, content: `evidence:${item.path}` })),
      omitted_paths: [],
      quality_status: 'CURRENT',
    })),
    runtimeAdapter: overrides.runtimeAdapter,
  };
}

test('operational runner persists bounded OpenSpec context and reaches VALIDATING in simulation', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ffai-runner-'));
  let handoff;
  const deps = dependencies(root, {
    runtimeAdapter: {
      execute(input) {
        handoff = input;
        return { mode: 'simulated', provider: input.proposal.provider, runtime_id: input.proposal.runtime_id, outputs: [] };
      },
    },
  });
  const output = await runOperationalWorkflow({ projectRoot: root, taskId: 'FF-AI-OPS-TEST', runId: 'FF-AI-OPS-TEST-run', budgetTokens: 1000 }, deps);
  assert.strictEqual(output.summary.reached_runtime, true);
  assert.strictEqual(output.summary.lifecycle_state, 'VALIDATING');
  assert.strictEqual(output.summary.openspec_status, 'PASS');
  assert.strictEqual(handoff.task.task_id, 'FF-AI-OPS-TEST');
  assert.strictEqual(handoff.context.status, 'COMPLETE');
  assert.deepStrictEqual(handoff.context.included_evidence.map((item) => item.path), ['openspec:operational-workflow-mvp', 'AGENTS.md']);

  const runDir = path.join(output.runRoot, output.summary.run_id);
  assert.strictEqual(fs.existsSync(path.join(runDir, 'run-state.json')), true);
  const events = fs.readFileSync(path.join(runDir, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepStrictEqual(events.map((event) => event.event_type), ['ROUTE_DECIDED', 'CONTEXT_DELIVERED', 'EXECUTION_COMPLETED']);
});

test('operational runner treats unavailable linked OpenSpec as missing required evidence', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ffai-runner-'));
  let runtimeCalls = 0;
  const deps = dependencies(root, {
    openSpecClient: { listChanges: () => [], readChange: () => { throw new Error('missing'); } },
    runtimeAdapter: { execute: () => { runtimeCalls += 1; return {}; } },
  });
  const output = await runOperationalWorkflow({ projectRoot: root, taskId: 'FF-AI-OPS-TEST', runId: 'FF-AI-OPS-TEST-missing', budgetTokens: 1000 }, deps);
  assert.strictEqual(output.summary.openspec_status, 'UNAVAILABLE');
  assert.strictEqual(output.summary.context.coverage_status, 'PARTIAL');
  assert.strictEqual(output.summary.reached_runtime, false);
  assert.strictEqual(output.summary.lifecycle_state, 'EXPLORING');
  assert.strictEqual(runtimeCalls, 0);
});

test('operational runner blocks paid configuration before runtime', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ffai-runner-'));
  const deps = dependencies(root, { finops: finopsFixture({ paid_api_enabled: true, incremental_budget_usd: 1 }) });
  await assert.rejects(
    runOperationalWorkflow({ projectRoot: root, taskId: 'FF-AI-OPS-TEST' }, deps),
    (error) => error instanceof OperationalRunnerError && error.code === 'PAID_API_BLOCKED',
  );
});

test('operational runner replay does not duplicate durable events', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ffai-runner-'));
  const deps = dependencies(root);
  let clockCalls = 0;
  deps.clock = () => new Date(clockCalls++ === 0 ? '2026-08-26T00:00:00Z' : '2026-08-26T01:00:00Z');
  const options = { projectRoot: root, taskId: 'FF-AI-OPS-TEST', runId: 'FF-AI-OPS-TEST-replay', budgetTokens: 1000 };
  const first = await runOperationalWorkflow(options, deps);
  await runOperationalWorkflow(options, deps);
  const lines = fs.readFileSync(path.join(first.runRoot, options.runId, 'events.jsonl'), 'utf8').trim().split('\n');
  assert.strictEqual(lines.length, 3);
});

test('Big Pickle is selected for coder_a through zero-incremental FinOps', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ffai-runner-'));
  const role = 'coder_a';
  const deps = dependencies(root, {
    task: taskFixture({ risk: 'medium', openspec_change: null }),
    roleRegistry: semanticRoleRegistryFixture({ role, risk: 'medium', roleCeiling: 'medium', requirementCriticality: 'medium' }),
    modelRegistry: semanticModelRegistryFixture(role),
    finops: semanticFinopsFixture(),
  });
  const output = await runOperationalWorkflow({ projectRoot: root, taskId: 'FF-AI-OPS-TEST', runId: 'FF-AI-OPS-TEST-ox', budgetTokens: 1000 }, deps);
  assert.strictEqual(output.summary.reached_runtime, true);
  const identity = JSON.parse(fs.readFileSync(path.join(output.runRoot, output.summary.run_id, 'artifacts', 'runtime-identity.json'), 'utf8'));
  assert.strictEqual(identity.proposal.runtime_id, 'opencode/big-pickle');
  assert.strictEqual(identity.proposal.resource_class, 'zero_incremental');
  assert.strictEqual(identity.simulated, true);
});

test('enabled Coder Strong A with Big Pickle does not bypass the HIGH role ceiling', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ffai-runner-'));
  const role = 'coder_strong_a';
  const deps = dependencies(root, {
    task: taskFixture({ risk: 'high', openspec_change: null }),
    roleRegistry: semanticRoleRegistryFixture({ role, risk: 'high', roleCeiling: 'medium', requirementCriticality: 'high' }),
    modelRegistry: semanticModelRegistryFixture(role, {
      id: 'big_pickle_opencode', runtimeId: 'opencode/big-pickle', criticality: 'medium',
    }),
    finops: semanticFinopsFixture(),
  });
  const output = await runOperationalWorkflow({ projectRoot: root, taskId: 'FF-AI-OPS-TEST', runId: 'FF-AI-OPS-TEST-high', budgetTokens: 1000 }, deps);
  assert.strictEqual(output.summary.reached_runtime, false);
  assert.strictEqual(output.summary.reason_code, 'CRITICALITY_INCOMPATIBLE');
  assert.strictEqual(output.summary.lifecycle_state, 'BLOCKED_HIGH_RISK');
});
