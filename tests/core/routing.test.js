'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { routeTask, RoutingInputError } = require('../../src/router');
const { evaluateModelEligibility, resolveModel } = require('../../src/model-resolver');
const { evaluateResourcePool } = require('../../src/finops');
const { appendRouteEvidence } = require('../../src/core/routing-evidence');

function clone(value) {
  return structuredClone(value);
}

function requirements(overrides = {}) {
  return {
    capabilities: ['coding'],
    criticality: 'low',
    minimum_trust: 'experimental',
    allowed_resource_classes: ['local'],
    allowed_access_modes: ['local'],
    ...overrides,
  };
}

function roles() {
  return {
    schema_version: 'fitflow-role-registry/v3',
    roles: {
      developer_planner: { status: 'active', actor_type: 'developer', writes_product: false },
      validator: { status: 'active', actor_type: 'deterministic', writes_product: false },
      disabled_model: { status: 'disabled', actor_type: 'model', writes_product: false, criticality_ceiling: 'low' },
      coder_b: { status: 'active_specification', actor_type: 'model', writes_product: true, criticality_ceiling: 'low' },
    },
    disabled_roles: [],
    routing_policy: {
      id: 'fitflow-routing-policy/v1',
      matching_order: ['task_type', 'area', 'risk'],
      rules: [{ id: 'tooling_low', precedence: 10, match: { task_type: 'tooling', area: 'ai_tooling', risk: 'low' }, role: 'coder_b', requirements: requirements() }],
    },
  };
}

function models() {
  const entry = (runtime, tier) => ({
    provider: 'local',
    runtime_id: runtime,
    display_name: runtime,
    availability: 'available',
    trust: 'experimental',
    resource_pool: 'local',
    capabilities: ['coding'],
    criticality_ceiling: 'low',
    eligible_roles: ['coder_b'],
    preferred_roles: [],
    selection_tier: tier,
    benchmark_status: 'tested',
    last_verified: '2026-08-22',
  });
  return {
    schema_version: 'fitflow-model-registry/v3',
    selection_policy: 'fitflow-model-selection/v1',
    entries: { alpha: entry('runtime-alpha', 10), beta: entry('runtime-beta', 20) },
  };
}

function finops() {
  return {
    schema_version: 'fitflow-finops/v1',
    eligibility_policy: 'fitflow-finops-fixed/v1',
    incremental_budget_usd: 0,
    paid_api_enabled: false,
    providers: { local: { available: true } },
    resource_pools: {
      local: {
        enabled: true,
        available: true,
        resource_class: 'local',
        access_mode: 'local',
        criticality_ceiling: 'low',
        quota_remaining: null,
        capacity_remaining: 1,
        rate_limit_remaining: 1,
        concurrency_available: 1,
      },
    },
  };
}

const TASK = { task_type: 'tooling', area: 'ai_tooling', risk: 'low' };

test('routes canonical task fields and derives all execution requirements', () => {
  const decision = routeTask(TASK, roles());
  assert.deepStrictEqual(decision, { status: 'ROUTED', reason_code: 'ROLE_SELECTED', role: 'coder_b', requirements: requirements() });
});

test('caller cannot provide a final role or capabilities', () => {
  for (const extra of [
    { role: 'coder_b' },
    { requirements: requirements() },
    { capabilities: ['coding'] },
    { provider: 'local' },
    { model: 'alpha' },
    { runtime_id: 'runtime-alpha' },
    { economic_selection: 'local' },
  ]) {
    assert.throws(() => routeTask({ ...TASK, ...extra }, roles()), RoutingInputError);
  }
});

test('returns stable unsupported, unavailable-policy and missing-role outcomes', () => {
  assert.strictEqual(routeTask(TASK, { schema_version: 'fitflow-role-registry/v2' }).reason_code, 'UNSUPPORTED_ROLE_REGISTRY_VERSION');
  assert.strictEqual(routeTask(TASK, { ...roles(), routing_policy: undefined }).reason_code, 'ROUTING_POLICY_UNAVAILABLE');
  const missing = roles();
  missing.routing_policy.rules[0].role = 'missing';
  assert.strictEqual(routeTask(TASK, missing).reason_code, 'ROLE_NOT_FOUND');
});

for (const [actorType, roleName, expected] of [
  ['developer', 'developer_planner', 'ROLE_NOT_MODEL_EXECUTABLE'],
  ['deterministic', 'validator', 'ROLE_NOT_MODEL_EXECUTABLE'],
  ['model', 'disabled_model', 'ROLE_DISABLED'],
]) {
  test(`rejects ${actorType} or disabled routing role`, () => {
    const registry = roles();
    registry.routing_policy.rules[0].role = roleName;
    assert.strictEqual(routeTask(TASK, registry).reason_code, expected);
  });
}

test('returns stable no-match and ambiguous outcomes', () => {
  assert.strictEqual(routeTask({ task_type: 'docs', area: 'docs', risk: 'low' }, roles()).reason_code, 'NO_MATCHING_RULE');
  const registry = roles();
  registry.routing_policy.rules.push({ ...clone(registry.routing_policy.rules[0]), id: 'same_precedence' });
  assert.strictEqual(routeTask(TASK, registry).reason_code, 'AMBIGUOUS_MATCH');
});

test('rejects role criticality incompatible with policy requirements', () => {
  const registry = roles();
  registry.routing_policy.rules[0].requirements.criticality = 'medium';
  assert.strictEqual(routeTask(TASK, registry).reason_code, 'CRITICALITY_INCOMPATIBLE');
});

test('model hard eligibility checks capability, criticality and trust', () => {
  const model = models().entries.alpha;
  assert.strictEqual(evaluateModelEligibility({ ...model, capabilities: [] }, 'coder_b', requirements(), finops()).reason, 'MISSING_CAPABILITY');
  assert.strictEqual(evaluateModelEligibility(model, 'coder_b', requirements({ criticality: 'medium' }), finops()).reason, 'MODEL_CRITICALITY_INCOMPATIBLE');
  assert.strictEqual(evaluateModelEligibility(model, 'coder_b', requirements({ minimum_trust: 'standard' }), finops()).reason, 'TRUST_INCOMPATIBLE');
});

test('FinOps checks provider and pool availability', () => {
  const model = models().entries.alpha;
  const providerDown = finops();
  providerDown.providers.local.available = false;
  assert.strictEqual(evaluateResourcePool(model, requirements(), providerDown).reason, 'PROVIDER_UNAVAILABLE');
  const disabled = finops();
  disabled.resource_pools.local.enabled = false;
  assert.strictEqual(evaluateResourcePool(model, requirements(), disabled).reason, 'POOL_DISABLED');
  const unavailable = finops();
  unavailable.resource_pools.local.available = false;
  assert.strictEqual(evaluateResourcePool(model, requirements(), unavailable).reason, 'POOL_UNAVAILABLE');
});

test('FinOps checks pool criticality', () => {
  assert.strictEqual(evaluateResourcePool(models().entries.alpha, requirements({ criticality: 'medium' }), finops()).reason, 'POOL_CRITICALITY_INCOMPATIBLE');
});

test('FinOps enforces resource class and access mode requirements', () => {
  const model = models().entries.alpha;
  assert.strictEqual(evaluateResourcePool(model, requirements({ allowed_resource_classes: ['quota'] }), finops()).reason, 'RESOURCE_CLASS_INCOMPATIBLE');
  assert.strictEqual(evaluateResourcePool(model, requirements({ allowed_access_modes: ['included'] }), finops()).reason, 'ACCESS_MODE_INCOMPATIBLE');
});

function quotaCase() {
  const snapshot = finops();
  snapshot.resource_pools.local.resource_class = 'quota';
  snapshot.resource_pools.local.access_mode = 'quota';
  snapshot.resource_pools.local.quota_remaining = 1;
  return { snapshot, required: requirements({ allowed_resource_classes: ['quota'], allowed_access_modes: ['quota'] }) };
}

test('FinOps checks quota, capacity, rate limit and concurrency', () => {
  const model = models().entries.alpha;
  for (const [field, value, reason] of [
    ['quota_remaining', 0, 'QUOTA_EXHAUSTED'],
    ['capacity_remaining', 0, 'CAPACITY_EXHAUSTED'],
    ['rate_limit_remaining', 0, 'RATE_LIMIT_EXHAUSTED'],
    ['concurrency_available', 0, 'CONCURRENCY_UNAVAILABLE'],
  ]) {
    const { snapshot, required } = quotaCase();
    snapshot.resource_pools.local[field] = value;
    assert.strictEqual(evaluateResourcePool(model, required, snapshot).reason, reason);
  }
});

test('FinOps keeps paid resources disabled', () => {
  const snapshot = finops();
  snapshot.resource_pools.local.resource_class = 'paid';
  snapshot.resource_pools.local.access_mode = 'api';
  const required = requirements({ allowed_resource_classes: ['paid'], allowed_access_modes: ['api'] });
  assert.strictEqual(evaluateResourcePool(models().entries.alpha, required, snapshot).reason, 'PAID_DISABLED');
});

function resolve(overrides = {}) {
  return resolveModel({ role: 'coder_b', requirements: requirements(), modelRegistry: models(), roleRegistry: roles(), finops: finops(), ...overrides });
}

test('resolver returns deterministic fallback without relaxing constraints', () => {
  const registry = models();
  registry.entries.alpha.availability = 'unavailable';
  const result = resolve({ modelRegistry: registry });
  assert.strictEqual(result.selected.registry_id, 'beta');
  assert.strictEqual(result.fallback_used, true);
});

test('resolver returns one stable no-candidate result', () => {
  const registry = models();
  registry.entries.alpha.capabilities = ['review'];
  registry.entries.beta.capabilities = ['review'];
  assert.deepStrictEqual(resolve({ modelRegistry: registry }), { status: 'BLOCKED', selected: null, reason_code: 'NO_ELIGIBLE_MODEL' });
});

test('selection orders by tier, then preference, then stable ID', () => {
  const byTier = models();
  byTier.entries.alpha.selection_tier = 20;
  byTier.entries.beta.selection_tier = 10;
  assert.strictEqual(resolve({ modelRegistry: byTier }).selected.registry_id, 'beta');

  const byPreference = models();
  byPreference.entries.beta.selection_tier = 10;
  byPreference.entries.beta.preferred_roles = ['coder_b'];
  assert.strictEqual(resolve({ modelRegistry: byPreference }).selected.registry_id, 'beta');

  const byId = models();
  byId.entries.beta.selection_tier = 10;
  assert.strictEqual(resolve({ modelRegistry: byId }).selected.registry_id, 'alpha');
});

test('preferred roles never authorize a model', () => {
  const registry = models();
  registry.entries.alpha.eligible_roles = ['other_role'];
  registry.entries.alpha.preferred_roles = ['other_role'];
  assert.strictEqual(resolve({ modelRegistry: registry }).selected.registry_id, 'beta');
});

test('insertion order and repeated identical inputs do not change resolution', () => {
  const registry = models();
  registry.entries.beta.selection_tier = 10;
  const reversed = { ...registry, entries: { beta: registry.entries.beta, alpha: registry.entries.alpha } };
  const first = resolve({ modelRegistry: registry });
  const second = resolve({ modelRegistry: reversed });
  const third = resolve({ modelRegistry: clone(registry) });
  assert.deepStrictEqual(first, second);
  assert.deepStrictEqual(first, third);
});

test('resolver proposes a runtime without invoking one', () => {
  let runtimeInvocations = 0;
  const result = resolve();
  assert.strictEqual(result.status, 'SELECTED');
  assert.strictEqual(runtimeInvocations, 0);
});

test('routing evidence accepts only model-resolution refs and deduplicates deterministically', () => {
  const ref = { path: 'model-resolution.json', hash: 'c'.repeat(64), schema_version: 'fitflow-model-resolution/v1' };
  assert.deepStrictEqual(appendRouteEvidence(appendRouteEvidence([], ref), ref), [ref]);
  assert.throws(() => appendRouteEvidence([], { ...ref, schema_version: 'fitflow-validation/v2' }));
});
