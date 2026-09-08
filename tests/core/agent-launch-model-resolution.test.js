'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { resolveModel } = require('../../src/model-resolver');
const { resolveLaunchModel } = require('../../src/agent-launch/model-resolution');

function requirements() {
  return {
    capabilities: ['coding'],
    criticality: 'low',
    minimum_trust: 'experimental',
    allowed_resource_classes: ['local'],
    allowed_access_modes: ['local'],
  };
}

function roles() {
  return {
    schema_version: 'fitflow-role-registry/v3',
    roles: { coder_b: { status: 'active_specification', actor_type: 'model', writes_product: true, criticality_ceiling: 'low' } },
    disabled_roles: [],
    routing_policy: {
      id: 'fitflow-routing-policy/v1',
      matching_order: ['task_type', 'area', 'risk'],
      rules: [{
        id: 'test',
        precedence: 1,
        match: { risk: 'low' },
        role: 'coder_b',
        requirements: requirements(),
      }],
    },
  };
}

function model(provider, runtimeId, tier = 10) {
  return {
    provider,
    runtime_id: runtimeId,
    display_name: runtimeId,
    availability: 'available',
    trust: 'experimental',
    resource_pool: provider,
    capabilities: ['coding'],
    criticality_ceiling: 'low',
    eligible_roles: ['coder_b'],
    preferred_roles: [],
    selection_tier: tier,
    benchmark_status: 'tested',
    last_verified: '2026-09-07',
  };
}

function models() {
  return {
    schema_version: 'fitflow-model-registry/v3',
    selection_policy: 'fitflow-model-selection/v1',
    entries: {
      alpha: model('local', 'runtime-alpha', 5),
      beta: model('opencode', 'runtime-beta', 10),
      gamma: model('opencode', 'runtime-gamma', 20),
    },
  };
}

function pool() {
  return {
    enabled: true,
    available: true,
    resource_class: 'local',
    access_mode: 'local',
    criticality_ceiling: 'low',
    quota_remaining: null,
    capacity_remaining: 1,
    rate_limit_remaining: 1,
    concurrency_available: 1,
  };
}

function finops() {
  return {
    schema_version: 'fitflow-finops/v1',
    eligibility_policy: 'fitflow-finops-fixed/v1',
    incremental_budget_usd: 0,
    paid_api_enabled: false,
    providers: { local: { available: true }, opencode: { available: true } },
    resource_pools: { local: pool(), opencode: pool() },
  };
}

function request(state = 'EXPLICIT_CONSTRAINTS', constraints = { model_ref: 'alpha' }) {
  return {
    model: {
      request: {
        state,
        request_ref: state === 'EXPLICIT_CONSTRAINTS' ? 'model-request:001@abc' : null,
        model_ref: constraints.model_ref || null,
        provider_ref: constraints.provider_ref || null,
        runtime_constraints_ref: constraints.runtime_constraints_ref || null,
      },
      routing_decision_ref: 'routing:001@abc',
      resolution_ref: null,
    },
  };
}

function dependencies(overrides = {}) {
  return {
    modelRegistry: models(),
    roleRegistry: roles(),
    finops: finops(),
    resolveRoutingDecision: (ref) => ({
      routing_decision_ref: ref,
      decision: { status: 'ROUTED', reason_code: 'ROLE_SELECTED', role: 'coder_b', requirements: requirements() },
    }),
    resolveRuntimeConstraints: (ref) => ({ runtime_constraints_ref: ref, runtime_ref: 'runtime-beta' }),
    authorizeDeterministicSelection: () => ({ authorized: true, authority_ref: 'authority:selection@abc' }),
    modelResolver: resolveModel,
    ...overrides,
  };
}

test('existing model resolver filters model, provider, and runtime constraints before stable selection', () => {
  const base = { role: 'coder_b', requirements: requirements(), modelRegistry: models(), roleRegistry: roles(), finops: finops() };
  assert.strictEqual(resolveModel({ ...base, constraints: { provider_ref: 'opencode' } }).selected.registry_id, 'beta');
  assert.strictEqual(resolveModel({ ...base, constraints: { model_ref: 'gamma', provider_ref: 'opencode' } }).selected.registry_id, 'gamma');
  assert.strictEqual(resolveModel({ ...base, constraints: { runtime_ref: 'runtime-gamma' } }).selected.registry_id, 'gamma');
  assert.deepStrictEqual(resolveModel({ ...base, constraints: { provider_ref: 'missing' } }), {
    status: 'BLOCKED', selected: null, reason_code: 'NO_ELIGIBLE_MODEL',
  });
});

test('all explicit constraint shapes converge on concrete model, provider, runtime, and resolution refs', () => {
  const cases = [
    [{ model_ref: 'alpha' }, ['alpha', 'local', 'runtime-alpha']],
    [{ model_ref: 'beta', provider_ref: 'opencode' }, ['beta', 'opencode', 'runtime-beta']],
    [{ provider_ref: 'opencode' }, ['beta', 'opencode', 'runtime-beta']],
    [{ runtime_constraints_ref: 'runtime-constraints:beta@abc' }, ['beta', 'opencode', 'runtime-beta']],
    [{ provider_ref: 'opencode', runtime_constraints_ref: 'runtime-constraints:beta@abc' }, ['beta', 'opencode', 'runtime-beta']],
  ];
  for (const [constraints, expected] of cases) {
    const result = resolveLaunchModel({ request: request('EXPLICIT_CONSTRAINTS', constraints) }, dependencies());
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual([
      result.identity.resolved_model_ref,
      result.identity.resolved_provider_ref,
      result.identity.resolved_runtime_ref,
    ], expected);
    assert.match(result.identity.model_resolution_ref, /^sha256:[a-f0-9]{64}$/);
    assert.strictEqual(result.identity.observed_model_ref, null);
    assert.strictEqual(result.identity.observed_provider_ref, null);
    assert.strictEqual(result.identity.observed_runtime_ref, null);
    assert.strictEqual(result.actor_invoked, false);
  }
});

test('authorized deterministic selection requires an explicit competent grant', () => {
  const selected = resolveLaunchModel({
    request: request('AUTHORIZED_DETERMINISTIC_SELECTION', {}),
    resolvedAuthority: { authority_id: 'authority-001' },
  }, dependencies());
  assert.strictEqual(selected.ok, true);
  assert.strictEqual(selected.identity.resolved_model_ref, 'alpha');

  let resolverCalls = 0;
  const denied = () => resolveLaunchModel(
    { request: request('AUTHORIZED_DETERMINISTIC_SELECTION', {}), resolvedAuthority: { authority_id: 'authority-001' } },
    dependencies({
      authorizeDeterministicSelection: () => ({ authorized: false, authority_ref: null }),
      modelResolver: () => { resolverCalls += 1; },
    }),
  );
  assert.throws(denied, (error) => error.reasonCode === 'CONDITIONAL_AUTHORIZATION_MISSING');
  assert.strictEqual(resolverCalls, 0);
  assert.throws(
    () => resolveLaunchModel({ request: request('AUTHORIZED_DETERMINISTIC_SELECTION', {}) }, dependencies()),
    (error) => error.reasonCode === 'CONDITIONAL_AUTHORIZATION_MISSING',
  );
});

test('launch model resolution never passes profile identity into routing or model selection', () => {
  const result = resolveLaunchModel(
    { request: request(), profile: { id: 'implementer', preferred_roles: ['coder_b'] } },
    dependencies({
      modelResolver: (input) => {
        assert.strictEqual(Object.hasOwn(input, 'profile'), false);
        assert.strictEqual(Object.hasOwn(input, 'profile_id'), false);
        return resolveModel(input);
      },
    }),
  );
  assert.strictEqual(result.ok, true);
});

test('constraint mismatches and unresolved identities block without implicit fallback', () => {
  const cases = [
    [request('EXPLICIT_CONSTRAINTS', { model_ref: 'missing' }), 'MODEL_INELIGIBLE'],
    [request('EXPLICIT_CONSTRAINTS', { provider_ref: 'missing' }), 'PROVIDER_INELIGIBLE'],
    [request('EXPLICIT_CONSTRAINTS', { model_ref: 'alpha', provider_ref: 'opencode' }), 'PROVIDER_INELIGIBLE'],
    [request('EXPLICIT_CONSTRAINTS', { runtime_constraints_ref: 'runtime-constraints:missing@abc' }), 'MODEL_INELIGIBLE'],
  ];
  for (const [modelRequest, reasonCode] of cases) {
    const deps = dependencies();
    if (modelRequest.model.request.runtime_constraints_ref) {
      deps.resolveRuntimeConstraints = (ref) => ({ runtime_constraints_ref: ref, runtime_ref: 'missing-runtime' });
    }
    assert.throws(
      () => resolveLaunchModel({ request: modelRequest }, deps),
      (error) => error.reasonCode === reasonCode,
      reasonCode,
    );
  }

  assert.throws(
    () => resolveLaunchModel({ request: request() }, dependencies({
      modelResolver: () => ({
        status: 'SELECTED',
        selected: { registry_id: 'alpha', provider: 'local', runtime_id: '' },
        policy_id: 'fitflow-model-selection/v1',
        fallback_used: false,
        reason_code: 'MODEL_SELECTED',
      }),
    })),
    (error) => error.reasonCode === 'MODEL_SELECTION_UNRESOLVED',
  );

  assert.throws(
    () => resolveLaunchModel({ request: request() }, dependencies({
      modelResolver: () => ({
        status: 'SELECTED',
        selected: {
          registry_id: 'alpha',
          provider: 'unexpected-provider',
          runtime_id: 'runtime-alpha',
          pool_id: 'local',
          resource_class: 'local',
          access_mode: 'local',
        },
        policy_id: 'fitflow-model-selection/v1',
        fallback_used: false,
        reason_code: 'MODEL_SELECTED',
      }),
    })),
    (error) => error.reasonCode === 'MODEL_SELECTION_UNRESOLVED',
  );
});

test('resolver and provider/runtime unavailability remain distinct from policy ineligibility', () => {
  assert.throws(
    () => resolveLaunchModel({ request: request() }, dependencies({ modelResolver: null })),
    (error) => error.status === 'UNAVAILABLE' && error.reasonCode === 'MODEL_RESOLUTION_UNAVAILABLE',
  );

  const unavailableFinOps = finops();
  unavailableFinOps.providers.local.available = false;
  assert.throws(
    () => resolveLaunchModel({ request: request() }, dependencies({ finops: unavailableFinOps })),
    (error) => error.status === 'UNAVAILABLE' && error.reasonCode === 'PROVIDER_RUNTIME_UNAVAILABLE',
  );

  const ineligibleModels = models();
  ineligibleModels.entries.alpha.capabilities = ['review'];
  assert.throws(
    () => resolveLaunchModel({ request: request() }, dependencies({ modelRegistry: ineligibleModels })),
    (error) => error.status === 'BLOCKED' && error.reasonCode === 'MODEL_INELIGIBLE',
  );
});

test('unsupported runtime constraints and absent independent routing fail closed', () => {
  assert.throws(
    () => resolveLaunchModel(
      { request: request('EXPLICIT_CONSTRAINTS', { runtime_constraints_ref: 'runtime-constraints:bad@abc' }) },
      dependencies({ resolveRuntimeConstraints: () => ({ runtime_ref: 'runtime-beta', unknown: true }) }),
    ),
    (error) => error.reasonCode === 'MODEL_REQUEST_UNSUPPORTED',
  );
  assert.throws(
    () => resolveLaunchModel({ request: request() }, dependencies({ resolveRoutingDecision: null })),
    (error) => error.reasonCode === 'MODEL_SELECTION_UNRESOLVED',
  );
  assert.throws(
    () => resolveLaunchModel({ request: request() }, dependencies({
      resolveRoutingDecision: () => ({
        routing_decision_ref: 'routing:other@abc',
        decision: { status: 'ROUTED', reason_code: 'ROLE_SELECTED', role: 'coder_b', requirements: requirements() },
      }),
    })),
    (error) => error.reasonCode === 'MODEL_SELECTION_UNRESOLVED',
  );
});

test('paid resources remain ineligible even when explicit constraints name them', () => {
  const paidModels = models();
  paidModels.entries.paid = {
    ...model('paid-provider', 'runtime-paid', 0),
    resource_pool: 'paid',
  };
  const paidFinOps = finops();
  paidFinOps.providers['paid-provider'] = { available: true };
  paidFinOps.resource_pools.paid = {
    ...pool(),
    resource_class: 'paid',
    access_mode: 'api',
  };
  assert.throws(
    () => resolveLaunchModel(
      { request: request('EXPLICIT_CONSTRAINTS', { model_ref: 'paid' }) },
      dependencies({ modelRegistry: paidModels, finops: paidFinOps }),
    ),
    (error) => error.status === 'BLOCKED' && error.reasonCode === 'PAID_API_DISABLED',
  );
});
