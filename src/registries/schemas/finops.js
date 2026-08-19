'use strict';

const { z } = require('zod');

const PoolEntry = z
  .object({
    enabled: z.boolean(),
    cost_class: z.enum(['zero', 'zero_incremental', 'quota', 'free_external', 'paid']),
    access_mode: z.string().optional(),
    status: z.string().optional(),
    criticality_ceiling: z.string().optional(),
  })
  .strict();

const FinOps = z
  .object({
    schema_version: z.literal('fitflow-finops/v1'),
    incremental_budget_usd: z.number().min(0),
    paid_api_enabled: z.boolean(),
    optimization_order: z.array(z.string()),
    resource_pools: z.record(PoolEntry),
    metrics: z.array(z.string()),
    automatic_optimizer: z.enum(['disabled', 'enabled']),
  })
  .strict();

module.exports = { FinOps };
