'use strict';

const {
  ModelResolutionResult,
  ModelSelectionConstraints,
  RuntimeConstraintsResolution,
  RoutingDecisionResolution,
  DeterministicSelectionAuthorization,
} = require('../contracts/model-resolution');
const { ModelRegistry } = require('../registries/schemas/models');
const { FinOps } = require('../registries/schemas/finops');
const { resolveModel: defaultModelResolver, evaluateModelEligibility } = require('../model-resolver');
const { AgentLaunchPreflightError, canonicalJson, digestValue } = require('./authority');

const UNAVAILABLE_REASONS = new Set([
  'MODEL_UNAVAILABLE',
  'PROVIDER_UNAVAILABLE',
  'POOL_DISABLED',
  'POOL_UNAVAILABLE',
  'QUOTA_EXHAUSTED',
  'CAPACITY_EXHAUSTED',
  'RATE_LIMIT_EXHAUSTED',
  'CONCURRENCY_UNAVAILABLE',
]);

function fail(reasonCode, status = 'BLOCKED') {
  throw new AgentLaunchPreflightError(reasonCode, status);
}

function resolvePort(port, value, unavailableReason, malformedReason, schema) {
  if (typeof port !== 'function') fail(unavailableReason, unavailableReason === 'MODEL_RESOLUTION_UNAVAILABLE' ? 'UNAVAILABLE' : 'BLOCKED');
  let resolved;
  try {
    resolved = port(value);
  } catch {
    fail('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
  }
  const parsed = schema.safeParse(resolved);
  if (!parsed.success) fail(malformedReason);
  return parsed.data;
}

function buildConstraints(modelRequest, dependencies) {
  const constraints = {};
  if (modelRequest.model_ref) constraints.model_ref = modelRequest.model_ref;
  if (modelRequest.provider_ref) constraints.provider_ref = modelRequest.provider_ref;
  if (modelRequest.runtime_constraints_ref) {
    const runtime = resolvePort(
      dependencies.resolveRuntimeConstraints,
      modelRequest.runtime_constraints_ref,
      'MODEL_RESOLUTION_UNAVAILABLE',
      'MODEL_REQUEST_UNSUPPORTED',
      RuntimeConstraintsResolution,
    );
    if (runtime.runtime_constraints_ref !== modelRequest.runtime_constraints_ref) fail('MODEL_REQUEST_UNSUPPORTED');
    constraints.runtime_ref = runtime.runtime_ref;
  }
  if (!ModelSelectionConstraints.safeParse(constraints).success) fail('MODEL_REQUEST_UNSUPPORTED');
  return constraints;
}

function authorizeSelection(authorityResult, dependencies) {
  if (!authorityResult.resolvedAuthority?.authority_id || typeof dependencies.authorizeDeterministicSelection !== 'function') {
    fail('CONDITIONAL_AUTHORIZATION_MISSING');
  }
  let decision;
  try {
    decision = dependencies.authorizeDeterministicSelection({
      resolved_authority: authorityResult.resolvedAuthority || null,
      model_request: authorityResult.request.model.request,
    });
  } catch {
    fail('CONDITIONAL_AUTHORIZATION_MISSING');
  }
  const parsed = DeterministicSelectionAuthorization.safeParse(decision);
  if (!parsed.success || !parsed.data.authorized) fail('CONDITIONAL_AUTHORIZATION_MISSING');
  return parsed.data.authority_ref;
}

function resolveRouting(request, dependencies) {
  if (!request.model.routing_decision_ref || typeof dependencies.resolveRoutingDecision !== 'function') {
    fail('MODEL_SELECTION_UNRESOLVED');
  }
  let decision;
  try {
    decision = dependencies.resolveRoutingDecision(request.model.routing_decision_ref);
  } catch (err) {
    fail('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
  }
  const parsed = RoutingDecisionResolution.safeParse(decision);
  if (
    !parsed.success
    || parsed.data.routing_decision_ref !== request.model.routing_decision_ref
    || parsed.data.decision.status !== 'ROUTED'
  ) {
    fail('MODEL_SELECTION_UNRESOLVED');
  }
  return parsed.data.decision;
}

function matchingCandidates(registry, constraints) {
  return Object.entries(registry.entries).filter(([registryId, model]) => (
    (!constraints.model_ref || registryId === constraints.model_ref)
    && (!constraints.provider_ref || model.provider === constraints.provider_ref)
    && (!constraints.runtime_ref || model.runtime_id === constraints.runtime_ref)
  ));
}

function classifyBlocked(constraints, routing, dependencies) {
  const parsedModels = ModelRegistry.safeParse(dependencies.modelRegistry);
  const parsedFinOps = FinOps.safeParse(dependencies.finops);
  if (!parsedModels.success || !parsedFinOps.success) fail('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
  const allEntries = Object.entries(parsedModels.data.entries);
  if (constraints.model_ref) {
    const named = parsedModels.data.entries[constraints.model_ref];
    if (!named) fail('MODEL_INELIGIBLE');
    if (constraints.provider_ref && named.provider !== constraints.provider_ref) fail('PROVIDER_INELIGIBLE');
    if (constraints.runtime_ref && named.runtime_id !== constraints.runtime_ref) fail('MODEL_INELIGIBLE');
  }
  if (constraints.provider_ref && !allEntries.some(([, model]) => model.provider === constraints.provider_ref)) {
    fail('PROVIDER_INELIGIBLE');
  }
  const candidates = matchingCandidates(parsedModels.data, constraints);
  if (candidates.length === 0) fail(constraints.provider_ref ? 'PROVIDER_INELIGIBLE' : 'MODEL_INELIGIBLE');
  if (candidates.every(([, model]) => parsedFinOps.data.resource_pools[model.resource_pool]?.resource_class === 'paid')) {
    fail('PAID_API_DISABLED');
  }
  const reasons = candidates.map(([, model]) => evaluateModelEligibility(
    model,
    routing.role,
    routing.requirements,
    parsedFinOps.data,
  ).reason);
  if (reasons.length > 0 && reasons.every((reason) => UNAVAILABLE_REASONS.has(reason))) {
    fail('PROVIDER_RUNTIME_UNAVAILABLE', 'UNAVAILABLE');
  }
  fail('MODEL_INELIGIBLE');
}

function verifyAssertedResolution(request, resolution, dependencies) {
  if (request.model.resolution_ref === null) return digestValue({
    kind: 'model-resolution',
    request_ref: request.model.request.request_ref,
    routing_decision_ref: request.model.routing_decision_ref,
    resolution,
  });
  if (typeof dependencies.resolveModelResolution !== 'function') fail('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
  let asserted;
  try {
    asserted = dependencies.resolveModelResolution(request.model.resolution_ref);
  } catch {
    fail('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
  }
  if (
    !asserted
    || asserted.resolution_ref !== request.model.resolution_ref
    || !ModelResolutionResult.safeParse(asserted.resolution).success
    || canonicalJson(asserted.resolution) !== canonicalJson(resolution)
  ) fail('MODEL_SELECTION_UNRESOLVED');
  return request.model.resolution_ref;
}

function validateSelectedIdentity(selected, routing, dependencies) {
  const parsedModels = ModelRegistry.safeParse(dependencies.modelRegistry);
  const parsedFinOps = FinOps.safeParse(dependencies.finops);
  if (!parsedModels.success || !parsedFinOps.success) {
    fail('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
  }
  const model = parsedModels.data.entries[selected.registry_id];
  const pool = model && parsedFinOps.data.resource_pools[model.resource_pool];
  if (
    !model
    || !pool
    || model.provider !== selected.provider
    || model.runtime_id !== selected.runtime_id
    || model.resource_pool !== selected.pool_id
    || pool.resource_class !== selected.resource_class
    || pool.access_mode !== selected.access_mode
  ) {
    fail('MODEL_SELECTION_UNRESOLVED');
  }
  if (pool.resource_class === 'paid') fail('PAID_API_DISABLED');
  const eligibility = evaluateModelEligibility(model, routing.role, routing.requirements, parsedFinOps.data);
  if (!eligibility.eligible) {
    if (UNAVAILABLE_REASONS.has(eligibility.reason)) fail('PROVIDER_RUNTIME_UNAVAILABLE', 'UNAVAILABLE');
    fail('MODEL_INELIGIBLE');
  }
}

function resolveLaunchModel(authorityResult, dependencies = {}) {
  const request = authorityResult?.request;
  const modelRequest = request?.model?.request;
  if (!modelRequest || !['EXPLICIT_CONSTRAINTS', 'AUTHORIZED_DETERMINISTIC_SELECTION'].includes(modelRequest.state)) {
    fail('MODEL_REQUEST_UNSUPPORTED');
  }

  let constraints;
  let selectionAuthorityRef = null;
  if (modelRequest.state === 'EXPLICIT_CONSTRAINTS') {
    constraints = buildConstraints(modelRequest, dependencies);
  } else {
    if (modelRequest.model_ref || modelRequest.provider_ref || modelRequest.runtime_constraints_ref || modelRequest.request_ref) {
      fail('MODEL_REQUEST_UNSUPPORTED');
    }
    selectionAuthorityRef = authorizeSelection(authorityResult, dependencies);
    constraints = null;
  }

  const routing = resolveRouting(request, dependencies);
  const modelResolver = dependencies.modelResolver === undefined ? defaultModelResolver : dependencies.modelResolver;
  if (typeof modelResolver !== 'function') fail('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
  let rawResolution;
  try {
    rawResolution = modelResolver({
      role: routing.role,
      requirements: routing.requirements,
      modelRegistry: dependencies.modelRegistry,
      roleRegistry: dependencies.roleRegistry,
      finops: dependencies.finops,
      ...(constraints ? { constraints } : {}),
    });
  } catch {
    fail('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
  }
  const parsedResolution = ModelResolutionResult.safeParse(rawResolution);
  if (!parsedResolution.success) {
    fail('MODEL_SELECTION_UNRESOLVED');
  }
  const resolution = parsedResolution.data;
  if (resolution.status !== 'SELECTED') classifyBlocked(constraints || {}, routing, dependencies);
  const selected = resolution.selected;
  if (!selected.registry_id || !selected.provider || !selected.runtime_id) fail('MODEL_SELECTION_UNRESOLVED');
  if (
    constraints
    && (
      (constraints.model_ref && selected.registry_id !== constraints.model_ref)
      || (constraints.provider_ref && selected.provider !== constraints.provider_ref)
      || (constraints.runtime_ref && selected.runtime_id !== constraints.runtime_ref)
    )
  ) fail('MODEL_SELECTION_UNRESOLVED');
  validateSelectedIdentity(selected, routing, dependencies);
  const modelResolutionRef = verifyAssertedResolution(request, resolution, dependencies);

  return Object.freeze({
    ok: true,
    identity: Object.freeze({
      request_state: modelRequest.state,
      requested_model_ref: modelRequest.model_ref,
      requested_provider_ref: modelRequest.provider_ref,
      requested_runtime_constraints_ref: modelRequest.runtime_constraints_ref,
      model_request_ref: modelRequest.request_ref,
      resolved_model_ref: selected.registry_id,
      resolved_provider_ref: selected.provider,
      resolved_runtime_ref: selected.runtime_id,
      model_resolution_ref: modelResolutionRef,
      observed_model_ref: null,
      observed_provider_ref: null,
      observed_runtime_ref: null,
    }),
    routing: Object.freeze({
      routing_decision_ref: request.model.routing_decision_ref,
      role: routing.role,
    }),
    selection_authority_ref: selectionAuthorityRef,
    resolution,
    actor_invoked: false,
  });
}

module.exports = { resolveLaunchModel };
