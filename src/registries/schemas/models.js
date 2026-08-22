'use strict';

const { z } = require('zod');
const { Capability, Criticality, TrustLevel } = require('../../contracts/route');

const MODEL_REGISTRY_VERSION = 'fitflow-model-registry/v3';
const MODEL_SELECTION_POLICY_ID = 'fitflow-model-selection/v1';

const ModelEntry = z
  .object({
    provider: z.string().min(1),
    runtime_id: z.string().min(1),
    display_name: z.string().min(1),
    availability: z.enum(['available', 'discovered_local', 'unavailable']),
    trust: TrustLevel,
    resource_pool: z.string().min(1),
    capabilities: z.array(Capability).min(1),
    criticality_ceiling: Criticality,
    eligible_roles: z.array(z.string().min(1)).min(1),
    preferred_roles: z.array(z.string().min(1)),
    selection_tier: z.number().int().min(0),
    benchmark_status: z.string().min(1),
    last_verified: z.string().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const key of ['capabilities', 'eligible_roles', 'preferred_roles']) {
      if (new Set(value[key]).size !== value[key].length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must be unique` });
      }
    }
    for (const role of value.preferred_roles) {
      if (!value.eligible_roles.includes(role)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['preferred_roles'], message: 'preferred role must also be eligible' });
      }
    }
  });

const ModelRegistry = z
  .object({
    schema_version: z.literal(MODEL_REGISTRY_VERSION),
    selection_policy: z.literal(MODEL_SELECTION_POLICY_ID),
    entries: z.record(z.string().min(1), ModelEntry),
  })
  .strict();

module.exports = { MODEL_REGISTRY_VERSION, MODEL_SELECTION_POLICY_ID, ModelEntry, ModelRegistry };
