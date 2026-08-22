'use strict';

const { z } = require('zod');

const Capability = z.enum(['classification', 'coding', 'documentation', 'exploration', 'reasoning', 'review']);
const Criticality = z.enum(['low', 'medium', 'high']);
const TrustLevel = z.enum(['experimental', 'standard', 'trusted']);
const ResourceClass = z.enum(['local', 'zero', 'zero_incremental', 'free_external', 'quota', 'paid']);
const AccessMode = z.enum(['local', 'included', 'external', 'quota', 'api']);

const ExecutionRequirements = z
  .object({
    capabilities: z.array(Capability).min(1),
    criticality: Criticality,
    minimum_trust: TrustLevel,
    allowed_resource_classes: z.array(ResourceClass).min(1),
    allowed_access_modes: z.array(AccessMode).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const key of ['capabilities', 'allowed_resource_classes', 'allowed_access_modes']) {
      if (new Set(value[key]).size !== value[key].length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must be unique` });
      }
    }
  });

const BlockingReason = z.enum([
  'UNSUPPORTED_MODEL_REGISTRY_VERSION',
  'UNSUPPORTED_ROLE_REGISTRY_VERSION',
  'ROUTING_POLICY_UNAVAILABLE',
  'NO_MATCHING_RULE',
  'AMBIGUOUS_MATCH',
  'ROLE_NOT_FOUND',
  'ROLE_NOT_MODEL_EXECUTABLE',
  'ROLE_DISABLED',
  'CRITICALITY_INCOMPATIBLE',
]);

const RoutedDecision = z
  .object({
    status: z.literal('ROUTED'),
    reason_code: z.literal('ROLE_SELECTED'),
    role: z.string().min(1),
    requirements: ExecutionRequirements,
  })
  .strict();

const BlockedDecision = z
  .object({
    status: z.literal('BLOCKED'),
    reason_code: BlockingReason,
    role: z.null(),
    requirements: z.null(),
  })
  .strict();

const RouteDecision = z.discriminatedUnion('status', [RoutedDecision, BlockedDecision]);

module.exports = {
  Capability,
  Criticality,
  TrustLevel,
  ResourceClass,
  AccessMode,
  ExecutionRequirements,
  BlockingReason,
  RouteDecision,
};
