'use strict';

const { FinOps } = require('../registries/schemas/finops');

const CRITICALITY = { low: 0, medium: 1, high: 2 };

function reject(reason) {
  return { eligible: false, reason };
}

function evaluateResourcePool(model, requirements, rawFinOps) {
  const parsed = FinOps.safeParse(rawFinOps);
  if (!parsed.success) return reject('FINOPS_POLICY_UNAVAILABLE');
  const finops = parsed.data;
  const provider = finops.providers[model.provider];
  if (!provider?.available) return reject('PROVIDER_UNAVAILABLE');
  const pool = finops.resource_pools[model.resource_pool];
  if (!pool) return reject('POOL_NOT_FOUND');
  if (!pool.enabled) return reject('POOL_DISABLED');
  if (!pool.available) return reject('POOL_UNAVAILABLE');
  if (CRITICALITY[pool.criticality_ceiling] < CRITICALITY[requirements.criticality]) return reject('POOL_CRITICALITY_INCOMPATIBLE');
  if (!requirements.allowed_resource_classes.includes(pool.resource_class)) return reject('RESOURCE_CLASS_INCOMPATIBLE');
  if (!requirements.allowed_access_modes.includes(pool.access_mode)) return reject('ACCESS_MODE_INCOMPATIBLE');
  if (pool.resource_class === 'quota' && (!pool.quota_remaining || pool.quota_remaining <= 0)) return reject('QUOTA_EXHAUSTED');
  if (pool.capacity_remaining <= 0) return reject('CAPACITY_EXHAUSTED');
  if (pool.rate_limit_remaining <= 0) return reject('RATE_LIMIT_EXHAUSTED');
  if (pool.concurrency_available <= 0) return reject('CONCURRENCY_UNAVAILABLE');
  if (pool.resource_class === 'paid' && (!finops.paid_api_enabled || finops.incremental_budget_usd <= 0)) return reject('PAID_DISABLED');
  return { eligible: true, reason: 'FINOPS_ELIGIBLE', pool };
}

module.exports = { evaluateResourcePool };
