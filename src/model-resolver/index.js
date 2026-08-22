'use strict';

const { ExecutionRequirements, Criticality, TrustLevel } = require('../contracts/route');
const { ModelResolutionResult, MODEL_SELECTION_POLICY_ID } = require('../contracts/model-resolution');
const { ModelRegistry, MODEL_REGISTRY_VERSION } = require('../registries/schemas/models');
const { RoleRegistry, ROLE_REGISTRY_VERSION } = require('../registries/schemas/roles');
const { evaluateResourcePool } = require('../finops');

const CRITICALITY = { low: 0, medium: 1, high: 2 };
const TRUST = { experimental: 0, standard: 1, trusted: 2 };

function evaluateModelEligibility(model, role, requirements, finops) {
  if (!model.eligible_roles.includes(role)) return { eligible: false, reason: 'ROLE_NOT_ELIGIBLE' };
  if (!requirements.capabilities.every((capability) => model.capabilities.includes(capability))) return { eligible: false, reason: 'MISSING_CAPABILITY' };
  if (CRITICALITY[model.criticality_ceiling] < CRITICALITY[requirements.criticality]) return { eligible: false, reason: 'MODEL_CRITICALITY_INCOMPATIBLE' };
  if (TRUST[model.trust] < TRUST[requirements.minimum_trust]) return { eligible: false, reason: 'TRUST_INCOMPATIBLE' };
  if (model.availability === 'unavailable') return { eligible: false, reason: 'MODEL_UNAVAILABLE' };
  return evaluateResourcePool(model, requirements, finops);
}

function compareCandidates(role) {
  return ([leftId, left], [rightId, right]) =>
    left.selection_tier - right.selection_tier ||
    Number(!left.preferred_roles.includes(role)) - Number(!right.preferred_roles.includes(role)) ||
    leftId.localeCompare(rightId);
}

function blocked() {
  return ModelResolutionResult.parse({ status: 'BLOCKED', selected: null, reason_code: 'NO_ELIGIBLE_MODEL' });
}

function resolveModel({ role, requirements, modelRegistry, roleRegistry, finops }) {
  if (modelRegistry?.schema_version !== MODEL_REGISTRY_VERSION || roleRegistry?.schema_version !== ROLE_REGISTRY_VERSION) return blocked();
  const parsedModels = ModelRegistry.safeParse(modelRegistry);
  const parsedRoles = RoleRegistry.safeParse(roleRegistry);
  const parsedRequirements = ExecutionRequirements.safeParse(requirements);
  if (!parsedModels.success || !parsedRoles.success || !parsedRequirements.success) return blocked();
  const roleEntry = parsedRoles.data.roles[role];
  if (!roleEntry || roleEntry.actor_type !== 'model' || roleEntry.status === 'disabled' || parsedRoles.data.disabled_roles.includes(role)) return blocked();

  const authorized = Object.entries(parsedModels.data.entries)
    .filter(([, model]) => model.eligible_roles.includes(role))
    .sort(compareCandidates(role));
  const eligible = authorized.filter(([, model]) => evaluateModelEligibility(model, role, parsedRequirements.data, finops).eligible);
  if (eligible.length === 0) return blocked();
  const [registryId, selected] = eligible[0];
  const pool = finops.resource_pools[selected.resource_pool];
  return ModelResolutionResult.parse({
    status: 'SELECTED',
    selected: {
      registry_id: registryId,
      provider: selected.provider,
      runtime_id: selected.runtime_id,
      pool_id: selected.resource_pool,
      resource_class: pool.resource_class,
      access_mode: pool.access_mode,
    },
    policy_id: MODEL_SELECTION_POLICY_ID,
    fallback_used: authorized.length > 0 && authorized[0][0] !== registryId,
    reason_code: 'MODEL_SELECTED',
  });
}

module.exports = { evaluateModelEligibility, compareCandidates, resolveModel, Criticality, TrustLevel };
