'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { loadRegistryFile, REGISTRY_SCHEMAS, RegistryLoadError } = require('../../src/registries/index.js');
const { resolveProject } = require('../../src/project-profile');
const { ModelRegistry } = require('../../src/registries/schemas/models');
const { RoleRegistry } = require('../../src/registries/schemas/roles');
const { FinOps, CLASS_ACCESS } = require('../../src/registries/schemas/finops');
const { Orchestrator } = require('../../src/registries/schemas/orchestrator');
const { ProjectProfile } = require('../../src/registries/schemas/project-profile');

const PRODUCT_ROOT = fs.mkdtempSync(path.join(require('os').tmpdir(), 'fitflow-profile-'));
const CONFIG_DIR = path.join(PRODUCT_ROOT, '.ai', 'config');
fs.mkdirSync(CONFIG_DIR, { recursive: true });
fs.writeFileSync(path.join(CONFIG_DIR, 'project-profile.yaml'), `schema_version: fitflow-project-profile/v1
project_id: fitflow-test
baseline: test
roots:
  product: ignored-by-explicit-root
  ai_core: ignored-by-explicit-root
authority:
  source_of_truth: docs/SOURCE_OF_TRUTH.md
  agents: AGENTS.md
  canonical_docs: []
product_architecture:
  backend_dependency_direction: [router]
  target: test
operational:
  task_store: local
  project_count: one
  run_root: .ai/runs
  local_state: .ai/local/state.sqlite
specification:
  adapter: openspec
  status: planned
features:
  semantic_retrieval: false
  mcp: false
  temporal: false
  orchestrator_workers: false
environment:
  reusable_discovery_env: none
  official_ai_core_env: null
`);
const RESOLUTION = resolveProject({ projectRoot: PRODUCT_ROOT, aiCoreRoot: path.resolve(__dirname, '..', '..') });

test('registry schemas cover the canonical config set', () => {
  for (const expected of ['orchestrator.yaml', 'roles.yaml', 'models.yaml', 'project-profile.yaml', 'finops.yaml']) {
    assert.ok(REGISTRY_SCHEMAS[expected], `missing schema for ${expected}`);
  }
});

test('resuelve perfil sin depender de repositorios hermanos', () => {
  const reg = loadRegistryFile('project-profile.yaml', RESOLUTION.configDir);
  assert.strictEqual(reg.project_id, 'fitflow-test');
  assert.strictEqual(RESOLUTION.projectRoot, PRODUCT_ROOT);
});

test('loader rejects malformed YAML deterministically', () => {
  fs.writeFileSync(path.join(CONFIG_DIR, 'models.yaml'), 'schema_version: [\n');
  assert.throws(() => {
    loadRegistryFile('models.yaml', CONFIG_DIR);
  }, (error) => error instanceof RegistryLoadError && error.code === 'REGISTRY_LOAD_FAILED');
});

test('strict registry schemas require model and role registry v3', () => {
  assert.strictEqual(ModelRegistry.safeParse({ schema_version: 'fitflow-model-registry/v2' }).success, false);
  assert.strictEqual(RoleRegistry.safeParse({ schema_version: 'fitflow-role-registry/v2' }).success, false);
});

test('active profile, FinOps, and orchestrator schemas reject unsupported versions', () => {
  assert.strictEqual(ProjectProfile.safeParse({ schema_version: 'fitflow-project-profile/v2' }).success, false);
  assert.strictEqual(FinOps.safeParse({ schema_version: 'fitflow-finops/v2' }).success, false);
  assert.strictEqual(Orchestrator.safeParse({ schema_version: 'fitflow-orchestrator/v1' }).success, false);
});

test('strict model and role registry v3 instances validate directly', () => {
  const model = {
    schema_version: 'fitflow-model-registry/v3', selection_policy: 'fitflow-model-selection/v1',
    entries: { model: { provider: 'local', runtime_id: 'runtime', display_name: 'Model', availability: 'available', trust: 'experimental', resource_pool: 'local', capabilities: ['coding'], criticality_ceiling: 'low', eligible_roles: ['coder_b'], preferred_roles: ['coder_b'], selection_tier: 1, benchmark_status: 'tested', last_verified: '2026-08-22' } },
  };
  const requirements = { capabilities: ['coding'], criticality: 'low', minimum_trust: 'experimental', allowed_resource_classes: ['local'], allowed_access_modes: ['local'] };
  const role = {
    schema_version: 'fitflow-role-registry/v3', roles: { coder_b: { status: 'active_specification', actor_type: 'model', writes_product: true, criticality_ceiling: 'low' } }, disabled_roles: [],
    routing_policy: { id: 'fitflow-routing-policy/v1', matching_order: ['task_type', 'area', 'risk'], rules: [{ id: 'low', precedence: 1, match: { risk: 'low' }, role: 'coder_b', requirements }] },
  };
  assert.strictEqual(ModelRegistry.safeParse(model).success, true);
  assert.strictEqual(RoleRegistry.safeParse(role).success, true);
});

test('FinOps v1 accepts only the fixed class/access matrix', () => {
  assert.deepStrictEqual(CLASS_ACCESS, { local: 'local', zero: 'included', zero_incremental: 'included', free_external: 'external', quota: 'quota', paid: 'api' });
  const snapshot = {
    schema_version: 'fitflow-finops/v1', eligibility_policy: 'fitflow-finops-fixed/v1', incremental_budget_usd: 0, paid_api_enabled: false,
    providers: { local: { available: true } },
    resource_pools: { local: { enabled: true, available: true, resource_class: 'local', access_mode: 'local', criticality_ceiling: 'low', quota_remaining: null, capacity_remaining: 1, rate_limit_remaining: 1, concurrency_available: 1 } },
  };
  assert.strictEqual(FinOps.safeParse(snapshot).success, true);
  snapshot.resource_pools.local.access_mode = 'api';
  assert.strictEqual(FinOps.safeParse(snapshot).success, false);
});

test('loaders reject legacy versions with stable errors', () => {
  fs.writeFileSync(path.join(CONFIG_DIR, 'models.yaml'), 'schema_version: fitflow-model-registry/v2\n');
  fs.writeFileSync(path.join(CONFIG_DIR, 'roles.yaml'), 'schema_version: fitflow-role-registry/v2\n');
  assert.throws(
    () => loadRegistryFile('models.yaml', CONFIG_DIR),
    (error) => error instanceof RegistryLoadError && error.code === 'UNSUPPORTED_MODEL_REGISTRY_VERSION'
  );
  assert.throws(
    () => loadRegistryFile('roles.yaml', CONFIG_DIR),
    (error) => error instanceof RegistryLoadError && error.code === 'UNSUPPORTED_ROLE_REGISTRY_VERSION'
  );
});
