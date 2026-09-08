'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { launchAgent, preflightAgentLaunch } = require('../../src/agent-launch/index');
const { createOpenCodeCLIAdapter } = require('../../src/adapters/opencode-cli');

function createMockAuthorityResolver(authority) {
  return () => authority;
}

function createMockContextResolver(context) {
  return () => context;
}

function createMockContextBudgetResolver(budget) {
  return () => budget;
}

function createMockRoutingDecisionResolver(decision) {
  return () => decision;
}

function createMockModelResolver(resolution) {
  return () => resolution;
}

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-launch-integration-'));
  fs.mkdirSync(path.join(root, '.ai', 'config'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'index.js'), 'module.exports = true;\n');
  const profile = {
    schema_version: 'fitflow-project-profile/v1',
    project_id: 'tecnotron-ai',
    baseline: 'test',
    roots: { product: root, ai_core: root },
    authority: { source_of_truth: 'SOURCE.md', agents: 'AGENTS.md', canonical_docs: [] },
    product_architecture: { backend_dependency_direction: [], target: 'test' },
    operational: { task_store: 'docs/tasks', project_count: 'one', run_root: '.ai/runs', local_state: '.ai/local' },
    specification: { adapter: 'none', status: 'accepted' },
    features: { semantic_retrieval: false, mcp: false, temporal: false, orchestrator_workers: false },
    environment: { reusable_discovery_env: 'none', official_ai_core_env: null },
  };
  const profilePath = path.join(root, '.ai', 'config', 'project-profile.yaml');
  fs.writeFileSync(profilePath, JSON.stringify(profile));
  execFileSync('git', ['init', '-b', 'task-branch'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  return { root, profilePath, head, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function slash(value) {
  return value.replaceAll('\\', '/');
}

function createValidLaunchCoordinates(t) {
  const fixture = createRepository();
  t.after(fixture.cleanup);
  const cwd = path.join(fixture.root, 'src');
  return {
    request: createRequest({
      project: {
        project_profile_ref: slash(fixture.profilePath),
        repository_ref: 'fitflow',
        cwd: slash(cwd),
        worktree_ref: null,
      },
    }),
    authority: createAuthority({
      project: {
        project_id: 'tecnotron-ai',
        project_profile_ref: slash(fixture.profilePath),
        repository_root: fixture.root,
      },
      repository: {
        repository_identity: 'fitflow',
        worktree_path: null,
        cwd,
        branch: 'task-branch',
        head_or_baseline: fixture.head,
      },
    }),
  };
}

function createMockAdapter(options = {}) {
  const {
    capabilities = {
      repository_read: true,
      filesystem_write: false,
      web: false,
      enforcement: {
        native_actor_shell_denied: true,
        scope_containment: true,
        delegation_denied: true,
        subagents_denied: true,
        task_spawning_denied: true,
        paid_api_denied: true,
        additional_tools_denied: true,
        additional_skills_denied: true,
        mcp_denied: true,
        plugins_denied: true,
        indirect_capability_routes_denied: true,
        unauthorized_web_denied: true,
        external_filesystem_denied: true,
      },
    },
    effectiveConfigProbe = ({ projected_config }) => ({
      effective_config: projected_config,
      capability_evidence: {
        source_categories: [{ source: 'project', state: 'projected' }],
        capabilities: ['repository_read'],
      },
    }),
    invoke = () => ({
      output: {
        model: 'model:free@v1',
        provider: 'local',
        runtime: 'runtime-free',
        version: 'runtime-free@1',
      },
      exitCode: 0,
      startedAt: '2026-09-07T00:00:00.000Z',
      finishedAt: '2026-09-07T00:00:01.000Z',
      version: '1.18.29',
    }),
  } = options;

  return {
    id: 'opencode-cli',
    version: '1.0.0',
    getCapabilities: () => capabilities,
    effectiveConfigProbe,
    invoke,
  };
}

function createRequest(overrides = {}) {
  return {
    schema_version: 'tecnotron-agent-launch/v1',
    operation_id: 'operation-001',
    accepted_authority_ref: 'authority:001@abc',
    profile_id: 'spec_analyst',
    project: {
      project_profile_ref: 'project-profile:001@abc',
      repository_ref: 'fitflow-ai',
      cwd: 'C:/work/project',
      worktree_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    model: {
      request: {
        state: 'EXPLICIT_CONSTRAINTS',
        request_ref: 'model-request:001@abc',
        model_ref: 'model:free@v1',
        provider_ref: null,
        runtime_constraints_ref: null,
      },
      routing_decision_ref: 'routing:001@abc',
      resolution_ref: null,
    },
    environment: { inherit: false, task_scoped_inputs_ref: null },
    execution: { adapter_id: 'opencode-cli', timeout_ms: 1000 },
    ...overrides,
  };
}

function createAuthority(overrides = {}) {
  return {
    authority_kind: 'READ_ONLY_ANALYSIS',
    authority_id: 'authority-001',
    operation_id: 'operation-001',
    profile_id: 'spec_analyst',
    project: {
      project_id: 'tecnotron-ai',
      project_profile_ref: 'project-profile:001@abc',
      repository_root: 'C:/work/project',
    },
    repository: {
      repository_identity: 'fitflow-ai',
      worktree_path: null,
      cwd: 'C:/work/project',
      branch: 'task-branch',
      head_or_baseline: 'a'.repeat(40),
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    provenance: { accepted_authority_ref: 'authority:001@abc' },
    ...overrides,
  };
}

function createContext() {
  const packageResult = {
    status: 'COMPLETE',
    coverage_status: 'COMPLETE',
    telemetry: {
      coverage_status: 'COMPLETE',
      missing_evidence_ids: [],
      budget_tokens: 10000,
      tokens_delivered: 5000,
      requested_paths: [],
      included_paths: [],
      omitted_paths: [],
      requested_evidence_ids: [],
      included_evidence_ids: [],
      fallback_used: false,
      retrieval_provider: ['test-provider'],
      tokenizer: {
        name: 'test',
        exact: true,
        limitation: null,
      },
    },
    missing_evidence_ids: [],
    budget_tokens: 10000,
    tokens_delivered: 5000,
    retrieval_providers: ['test-provider'],
    fallback: {
      used: false,
      provider: null,
      reason: null,
    },
    requested_evidence: [],
    included_evidence: [],
    omitted_evidence: [],
  };
  const serialized = JSON.stringify(packageResult);
  const crypto = require('node:crypto');
  const digest = 'sha256:' + crypto.createHash('sha256').update(serialized).digest('hex');
  return {
    context_ref: 'context:001@abc',
    digest,
    serialized,
  };
}

function createContextBudget() {
  return {
    context_budget_ref: 'context-budget:large@v1',
    budget_tokens: 10000,
  };
}

function createRoutingDecision() {
  return {
    routing_decision_ref: 'routing:001@abc',
    decision: {
      status: 'ROUTED',
      role: 'analyst',
      reason_code: 'ROLE_SELECTED',
      requirements: {
        capabilities: ['coding'],
        criticality: 'low',
        minimum_trust: 'standard',
        allowed_resource_classes: ['local', 'zero', 'free_external'],
        allowed_access_modes: ['local', 'included', 'external'],
      },
    },
  };
}

function createModelResolution() {
  return {
    status: 'SELECTED',
    selected: {
      registry_id: 'model:free@v1',
      provider: 'local',
      runtime_id: 'runtime-free',
      pool_id: 'pool-free',
      resource_class: 'local',
      access_mode: 'local',
    },
    policy_id: 'fitflow-model-selection/v1',
    fallback_used: false,
    reason_code: 'MODEL_SELECTED',
  };
}

function createModelRegistry() {
  return {
    schema_version: 'fitflow-model-registry/v3',
    selection_policy: 'fitflow-model-selection/v1',
    entries: {
      'model:free@v1': {
        provider: 'local',
        runtime_id: 'runtime-free',
        display_name: 'Free Model v1',
        availability: 'available',
        trust: 'trusted',
        resource_pool: 'pool-free',
        capabilities: ['coding'],
        criticality_ceiling: 'low',
        eligible_roles: ['analyst'],
        preferred_roles: ['analyst'],
        selection_tier: 0,
        benchmark_status: 'verified',
        last_verified: '2026-01-01',
      },
    },
  };
}

function createFinOps() {
  return {
    schema_version: 'fitflow-finops/v1',
    eligibility_policy: 'fitflow-finops-fixed/v1',
    incremental_budget_usd: 0,
    paid_api_enabled: false,
    providers: {
      local: { available: true },
    },
    resource_pools: {
      'pool-free': {
        enabled: true,
        available: true,
        resource_class: 'local',
        access_mode: 'local',
        criticality_ceiling: 'low',
        quota_remaining: null,
        capacity_remaining: 100,
        rate_limit_remaining: 100,
        concurrency_available: 10,
      },
    },
  };
}

test('preflightAgentLaunch succeeds with valid request and dependencies', (t) => {
  const fixture = createRepository();
  t.after(fixture.cleanup);

  const request = {
    schema_version: 'tecnotron-agent-launch/v1',
    operation_id: 'operation-001',
    accepted_authority_ref: 'authority:001@abc',
    profile_id: 'spec_analyst',
    project: {
      project_profile_ref: slash(fixture.profilePath),
      repository_ref: 'fitflow',
      cwd: slash(path.join(fixture.root, 'src')),
      worktree_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    model: {
      request: {
        state: 'EXPLICIT_CONSTRAINTS',
        request_ref: 'model-request:001@abc',
        model_ref: 'model:free@v1',
        provider_ref: null,
        runtime_constraints_ref: null,
      },
      routing_decision_ref: null,
      resolution_ref: null,
    },
    environment: { inherit: false, task_scoped_inputs_ref: null },
    execution: { adapter_id: 'opencode-cli', timeout_ms: 1000 },
  };

  const authority = {
    authority_kind: 'READ_ONLY_ANALYSIS',
    authority_id: 'authority-001',
    operation_id: 'operation-001',
    profile_id: 'spec_analyst',
    project: {
      project_id: 'tecnotron-ai',
      project_profile_ref: slash(fixture.profilePath),
      repository_root: fixture.root,
    },
    repository: {
      repository_identity: 'fitflow',
      worktree_path: null,
      cwd: path.join(fixture.root, 'src'),
      branch: 'task-branch',
      head_or_baseline: fixture.head,
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    provenance: { accepted_authority_ref: 'authority:001@abc' },
  };

  const context = createContext();
  const contextBudget = createContextBudget();

  const result = preflightAgentLaunch(request, {
    authorityResolver: createMockAuthorityResolver(authority),
    resolveContext: createMockContextResolver(context),
    resolveContextBudget: createMockContextBudgetResolver(contextBudget),
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.schema_version, 'tecnotron-agent-launch/v1');
  assert.strictEqual(result.actor_invoked, false);
  assert.ok(result.request);
  assert.ok(result.authority);
  assert.ok(result.profile);
  assert.ok(result.congruence);
  assert.ok(result.execution_observation);
  assert.ok(result.context);
});

test('preflightAgentLaunch fails with invalid request', () => {
  const result = preflightAgentLaunch({ invalid: true });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.reason_code, 'REQUEST_INVALID');
  assert.strictEqual(result.actor_invoked, false);
});

test('preflightAgentLaunch fails when authority resolution fails', () => {
  const request = createRequest();
  const result = preflightAgentLaunch(request, {
    authorityResolver: () => { throw new Error('resolution failed'); },
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.reason_code, 'AUTHORITY_RESOLUTION_FAILED');
  assert.strictEqual(result.actor_invoked, false);
});

test('launchAgent composes all preflight stages', (t) => {
  const fixture = createRepository();
  t.after(fixture.cleanup);

  const request = {
    schema_version: 'tecnotron-agent-launch/v1',
    operation_id: 'operation-001',
    accepted_authority_ref: 'authority:001@abc',
    profile_id: 'spec_analyst',
    project: {
      project_profile_ref: slash(fixture.profilePath),
      repository_ref: 'fitflow',
      cwd: slash(path.join(fixture.root, 'src')),
      worktree_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    model: {
      request: {
        state: 'EXPLICIT_CONSTRAINTS',
        request_ref: 'model-request:001@abc',
        model_ref: 'model:free@v1',
        provider_ref: null,
        runtime_constraints_ref: null,
      },
      routing_decision_ref: 'routing:001@abc',
      resolution_ref: null,
    },
    environment: { inherit: false, task_scoped_inputs_ref: null },
    execution: { adapter_id: 'opencode-cli', timeout_ms: 1000 },
  };

  const authority = {
    authority_kind: 'READ_ONLY_ANALYSIS',
    authority_id: 'authority-001',
    operation_id: 'operation-001',
    profile_id: 'spec_analyst',
    project: {
      project_id: 'tecnotron-ai',
      project_profile_ref: slash(fixture.profilePath),
      repository_root: fixture.root,
    },
    repository: {
      repository_identity: 'fitflow',
      worktree_path: null,
      cwd: path.join(fixture.root, 'src'),
      branch: 'task-branch',
      head_or_baseline: fixture.head,
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    provenance: { accepted_authority_ref: 'authority:001@abc' },
  };

  const context = createContext();
  const contextBudget = createContextBudget();
  const routingDecision = createRoutingDecision();
  const modelResolution = createModelResolution();

  const adapter = createMockAdapter();

  const result = launchAgent(request, {
    authorityResolver: createMockAuthorityResolver(authority),
    resolveContext: createMockContextResolver(context),
    resolveContextBudget: createMockContextBudgetResolver(contextBudget),
    resolveRoutingDecision: createMockRoutingDecisionResolver(routingDecision),
    modelResolver: createMockModelResolver(modelResolution),
    adapter,
    modelRegistry: createModelRegistry(),
    finops: createFinOps(),
    systemEnvironment: { PATH: '/usr/bin', LANG: 'en_US.UTF-8' },
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.actor_invoked, true);
  assert.strictEqual(result.result.status, 'COMPLETED');
  assert.strictEqual(result.result.reason_code, 'LAUNCH_OPERATION_COMPLETED');
  assert.strictEqual(result.result.identity.observed_runtime_ref, 'runtime-free');
});

test('launchAgent fails when adapter capabilities are missing', (t) => {
  const { request, authority } = createValidLaunchCoordinates(t);
  const context = createContext();
  const contextBudget = createContextBudget();
  const routingDecision = createRoutingDecision();
  const modelResolution = createModelResolution();

  const adapter = {
    id: 'opencode-cli',
    version: '1.0.0',
    getCapabilities: () => { throw new Error('capabilities unavailable'); },
    effectiveConfigProbe: () => ({ effective_config: {}, capability_evidence: {} }),
  };

  const result = launchAgent(request, {
    authorityResolver: createMockAuthorityResolver(authority),
    resolveContext: createMockContextResolver(context),
    resolveContextBudget: createMockContextBudgetResolver(contextBudget),
    resolveRoutingDecision: createMockRoutingDecisionResolver(routingDecision),
    modelResolver: createMockModelResolver(modelResolution),
    adapter,
    modelRegistry: createModelRegistry(),
    finops: createFinOps(),
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.actor_invoked, false);
  assert.strictEqual(result.error.reason_code, 'OPENCODE_CONFORMANCE_UNAVAILABLE');
});

test('launchAgent fails when permission projection denies', () => {
  const request = createRequest();
  const authority = createAuthority();
  const context = createContext();
  const contextBudget = createContextBudget();
  const routingDecision = createRoutingDecision();
  const modelResolution = createModelResolution();

  const adapter = createMockAdapter({
    capabilities: {
      repository_read: false,
      filesystem_write: false,
      web: false,
      enforcement: {
        native_actor_shell_denied: true,
        scope_containment: true,
        delegation_denied: true,
        subagents_denied: true,
        task_spawning_denied: true,
        paid_api_denied: true,
        additional_tools_denied: true,
        additional_skills_denied: true,
        mcp_denied: true,
        plugins_denied: true,
        indirect_capability_routes_denied: true,
        unauthorized_web_denied: true,
        external_filesystem_denied: true,
      },
    },
  });

  const result = launchAgent(request, {
    authorityResolver: createMockAuthorityResolver(authority),
    resolveContext: createMockContextResolver(context),
    resolveContextBudget: createMockContextBudgetResolver(contextBudget),
    resolveRoutingDecision: createMockRoutingDecisionResolver(routingDecision),
    modelResolver: createMockModelResolver(modelResolution),
    adapter,
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.actor_invoked, false);
});

test('launchAgent fails when effective config proof fails', (t) => {
  const { request, authority } = createValidLaunchCoordinates(t);
  const context = createContext();
  const contextBudget = createContextBudget();
  const routingDecision = createRoutingDecision();
  const modelResolution = createModelResolution();

  const adapter = createMockAdapter({
    effectiveConfigProbe: () => {
      throw new Error('proof failed');
    },
  });

  const result = launchAgent(request, {
    authorityResolver: createMockAuthorityResolver(authority),
    resolveContext: createMockContextResolver(context),
    resolveContextBudget: createMockContextBudgetResolver(contextBudget),
    resolveRoutingDecision: createMockRoutingDecisionResolver(routingDecision),
    modelResolver: createMockModelResolver(modelResolution),
    adapter,
    modelRegistry: createModelRegistry(),
    finops: createFinOps(),
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.actor_invoked, false);
  assert.strictEqual(result.error.reason_code, 'EFFECTIVE_CONFIG_UNPROVABLE');
});

test('launchAgent preserves requested/resolved/observed identity separately', (t) => {
  const fixture = createRepository();
  t.after(fixture.cleanup);

  const request = {
    schema_version: 'tecnotron-agent-launch/v1',
    operation_id: 'operation-001',
    accepted_authority_ref: 'authority:001@abc',
    profile_id: 'spec_analyst',
    project: {
      project_profile_ref: slash(fixture.profilePath),
      repository_ref: 'fitflow',
      cwd: slash(path.join(fixture.root, 'src')),
      worktree_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    model: {
      request: {
        state: 'EXPLICIT_CONSTRAINTS',
        request_ref: 'model-request:001@abc',
        model_ref: 'model:free@v1',
        provider_ref: null,
        runtime_constraints_ref: null,
      },
      routing_decision_ref: 'routing:001@abc',
      resolution_ref: null,
    },
    environment: { inherit: false, task_scoped_inputs_ref: null },
    execution: { adapter_id: 'opencode-cli', timeout_ms: 1000 },
  };

  const authority = {
    authority_kind: 'READ_ONLY_ANALYSIS',
    authority_id: 'authority-001',
    operation_id: 'operation-001',
    profile_id: 'spec_analyst',
    project: {
      project_id: 'tecnotron-ai',
      project_profile_ref: slash(fixture.profilePath),
      repository_root: fixture.root,
    },
    repository: {
      repository_identity: 'fitflow',
      worktree_path: null,
      cwd: path.join(fixture.root, 'src'),
      branch: 'task-branch',
      head_or_baseline: fixture.head,
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    provenance: { accepted_authority_ref: 'authority:001@abc' },
  };

  const context = createContext();
  const contextBudget = createContextBudget();
  const routingDecision = createRoutingDecision();
  const modelResolution = createModelResolution();

  const adapter = createMockAdapter();

  const result = launchAgent(request, {
    authorityResolver: createMockAuthorityResolver(authority),
    resolveContext: createMockContextResolver(context),
    resolveContextBudget: createMockContextBudgetResolver(contextBudget),
    resolveRoutingDecision: createMockRoutingDecisionResolver(routingDecision),
    modelResolver: createMockModelResolver(modelResolution),
    adapter,
    modelRegistry: createModelRegistry(),
    finops: createFinOps(),
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.result.identity.requested_model_ref, 'model:free@v1');
  assert.strictEqual(result.result.identity.resolved_model_ref, 'model:free@v1');
  assert.strictEqual(result.result.identity.observed_model_ref, 'model:free@v1');
});

test('launchAgent invokes actor once with the exact proven coordinates', (t) => {
  const fixture = createRepository();
  t.after(fixture.cleanup);

  const request = {
    schema_version: 'tecnotron-agent-launch/v1',
    operation_id: 'operation-001',
    accepted_authority_ref: 'authority:001@abc',
    profile_id: 'spec_analyst',
    project: {
      project_profile_ref: slash(fixture.profilePath),
      repository_ref: 'fitflow',
      cwd: slash(path.join(fixture.root, 'src')),
      worktree_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    model: {
      request: {
        state: 'EXPLICIT_CONSTRAINTS',
        request_ref: 'model-request:001@abc',
        model_ref: 'model:free@v1',
        provider_ref: null,
        runtime_constraints_ref: null,
      },
      routing_decision_ref: 'routing:001@abc',
      resolution_ref: null,
    },
    environment: { inherit: false, task_scoped_inputs_ref: null },
    execution: { adapter_id: 'opencode-cli', timeout_ms: 1000 },
  };

  const authority = {
    authority_kind: 'READ_ONLY_ANALYSIS',
    authority_id: 'authority-001',
    operation_id: 'operation-001',
    profile_id: 'spec_analyst',
    project: {
      project_id: 'tecnotron-ai',
      project_profile_ref: slash(fixture.profilePath),
      repository_root: fixture.root,
    },
    repository: {
      repository_identity: 'fitflow',
      worktree_path: null,
      cwd: path.join(fixture.root, 'src'),
      branch: 'task-branch',
      head_or_baseline: fixture.head,
    },
    authorization: {
      task_authorization_ref: null,
      research_authorization_ref: null,
      change_snapshot_ref: null,
      validation_evidence_ref: null,
      evidence_snapshot_ref: null,
      evidence_matrix_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    provenance: { accepted_authority_ref: 'authority:001@abc' },
  };

  const context = createContext();
  const contextBudget = createContextBudget();
  const routingDecision = createRoutingDecision();
  const modelResolution = createModelResolution();

  const probeCalls = [];
  const invocationCalls = [];
  const adapter = createMockAdapter({
    effectiveConfigProbe: (input) => {
      probeCalls.push(input);
      return {
        effective_config: input.projected_config,
        capability_evidence: {
          source_categories: [{ source: 'project', state: 'projected' }],
          capabilities: ['repository_read'],
        },
      };
    },
    invoke: (input) => {
      invocationCalls.push(input);
      return {
        output: {
          model: 'model:free@v1',
          provider: 'local',
          runtime: 'runtime-free',
          version: 'runtime-free@1',
        },
        exitCode: 0,
        startedAt: '2026-09-07T00:00:00.000Z',
        finishedAt: '2026-09-07T00:00:01.000Z',
        version: '1.18.29',
      };
    },
  });

  const result = launchAgent(request, {
    authorityResolver: createMockAuthorityResolver(authority),
    resolveContext: createMockContextResolver(context),
    resolveContextBudget: createMockContextBudgetResolver(contextBudget),
    resolveRoutingDecision: createMockRoutingDecisionResolver(routingDecision),
    modelResolver: createMockModelResolver(modelResolution),
    adapter,
    modelRegistry: createModelRegistry(),
    finops: createFinOps(),
    systemEnvironment: { PATH: 'C:/Windows/System32', LANG: 'C' },
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.actor_invoked, true);
  assert.strictEqual(probeCalls.length, 1);
  assert.strictEqual(invocationCalls.length, 1);
  assert.deepStrictEqual(probeCalls[0].environment, { LANG: 'C', PATH: 'C:/Windows/System32' });
  assert.strictEqual(probeCalls[0].invocation.cwd, path.join(fixture.root, 'src'));
  assert.strictEqual(probeCalls[0].agent_name, 'spec_analyst');
  assert.deepStrictEqual(invocationCalls[0].environment, probeCalls[0].environment);
  assert.strictEqual(invocationCalls[0].cwd, path.join(fixture.root, 'src'));
  assert.strictEqual(invocationCalls[0].agent, 'spec_analyst');
  assert.strictEqual(invocationCalls[0].model, 'model:free@v1');
  assert.strictEqual(invocationCalls[0].provider, 'local');
  assert.strictEqual(invocationCalls[0].runtime, 'runtime-free');
  assert.strictEqual(invocationCalls[0].timeout, 1000);
  assert.deepStrictEqual(invocationCalls[0].projectedConfig, probeCalls[0].projected_config);
});

test('launchAgent fails closed when observed runtime identity is missing', (t) => {
  const fixture = createRepository();
  t.after(fixture.cleanup);
  const cwd = path.join(fixture.root, 'src');
  const request = createRequest({
    project: {
      project_profile_ref: slash(fixture.profilePath),
      repository_ref: 'fitflow',
      cwd: slash(cwd),
      worktree_ref: null,
    },
  });
  const authority = createAuthority({
    project: {
      project_id: 'tecnotron-ai',
      project_profile_ref: slash(fixture.profilePath),
      repository_root: fixture.root,
    },
    repository: {
      repository_identity: 'fitflow',
      worktree_path: null,
      cwd,
      branch: 'task-branch',
      head_or_baseline: fixture.head,
    },
  });
  const adapter = createMockAdapter({
    invoke: () => ({
      output: { model: 'model:free@v1', provider: 'local' },
      exitCode: 0,
      startedAt: '2026-09-07T00:00:00.000Z',
      finishedAt: '2026-09-07T00:00:01.000Z',
      version: '1.18.29',
    }),
  });

  const result = launchAgent(request, {
    authorityResolver: createMockAuthorityResolver(authority),
    resolveContext: createMockContextResolver(createContext()),
    resolveContextBudget: createMockContextBudgetResolver(createContextBudget()),
    resolveRoutingDecision: createMockRoutingDecisionResolver(createRoutingDecision()),
    modelResolver: createMockModelResolver(createModelResolution()),
    adapter,
    modelRegistry: createModelRegistry(),
    finops: createFinOps(),
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.actor_invoked, true);
  assert.strictEqual(result.error.reason_code, 'OBSERVED_IDENTITY_MISMATCH');
  assert.strictEqual(result.result.phase, 'OUTPUT_NORMALIZATION');
});
