'use strict';

const { z } = require('zod');

const ModelEntry = z
  .object({
    provider: z.string(),
    runtime_id: z.string(),
    display_name: z.string(),
    availability: z.string(),
    trust: z.string(),
    quota_pool: z.string(),
    capabilities: z.array(z.string()),
    criticality_ceiling: z.enum(['low', 'medium', 'high']),
    preferred_roles: z.array(z.string()),
    benchmark_status: z.string(),
    last_verified: z.string(),
  })
  .strict();

const ModelRegistry = z
  .object({
    schema_version: z.literal('fitflow-model-registry/v2'),
    selection_policy: z.string(),
    record_effective_runtime_id: z.boolean(),
    unknown_runtime_policy: z.string(),
    entries: z.record(ModelEntry),
    dynamic_sources: z.array(
      z.object({
        adapter: z.string(),
        surface: z.string(),
        version: z.string(),
        status: z.string(),
        allowed_pools: z.array(z.string()),
      })
    ),
    deferred_sources: z.record(
      z.object({
        status: z.string(),
        access_mode: z.string(),
        programmatic_access: z.boolean(),
        reason: z.string().optional(),
      })
    ),
    prohibited: z.array(z.string()),
  })
  .strict();

module.exports = { ModelRegistry };
