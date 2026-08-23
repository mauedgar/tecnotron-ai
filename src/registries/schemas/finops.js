'use strict';

const { z } = require('zod');
const { Criticality, ResourceClass, AccessMode } = require('../../contracts/route');

const FINOPS_POLICY_ID = 'fitflow-finops-fixed/v1';
const CLASS_ACCESS = Object.freeze({
  local: 'local',
  zero: 'included',
  zero_incremental: 'included',
  free_external: 'external',
  quota: 'quota',
  paid: 'api',
});

const ProviderState = z.object({ available: z.boolean() }).strict();
const PoolEntry = z
  .object({
    enabled: z.boolean(),
    available: z.boolean(),
    resource_class: ResourceClass,
    access_mode: AccessMode,
    criticality_ceiling: Criticality,
    quota_remaining: z.number().int().min(0).nullable(),
    capacity_remaining: z.number().int().min(0),
    rate_limit_remaining: z.number().int().min(0),
    concurrency_available: z.number().int().min(0),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (CLASS_ACCESS[value.resource_class] !== value.access_mode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['access_mode'], message: 'INVALID_CLASS_ACCESS_PAIR' });
    }
  });

const FinOps = z
  .object({
    schema_version: z.literal('fitflow-finops/v1'),
    eligibility_policy: z.literal(FINOPS_POLICY_ID),
    incremental_budget_usd: z.literal(0),
    paid_api_enabled: z.literal(false),
    providers: z.record(z.string().min(1), ProviderState),
    resource_pools: z.record(z.string().min(1), PoolEntry),
  })
  .strict();

module.exports = { FINOPS_POLICY_ID, CLASS_ACCESS, ProviderState, PoolEntry, FinOps };
