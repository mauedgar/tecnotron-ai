'use strict';

const { z } = require('zod');
const { ArtifactRef } = require('./common');
const { ResourceClass, AccessMode, RouteDecision } = require('./route');

const MODEL_SELECTION_POLICY_ID = 'fitflow-model-selection/v1';

const ModelSelectionConstraints = z
  .object({
    model_ref: z.string().min(1).optional(),
    provider_ref: z.string().min(1).optional(),
    runtime_ref: z.string().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'at least one model selection constraint is required');

const RuntimeConstraintsResolution = z.object({
  runtime_constraints_ref: z.string().min(1),
  runtime_ref: z.string().min(1),
}).strict();

const RoutingDecisionResolution = z.object({
  routing_decision_ref: z.string().min(1),
  decision: RouteDecision,
}).strict();

const DeterministicSelectionAuthorization = z.object({
  authorized: z.boolean(),
  authority_ref: z.string().min(1).nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.authorized && value.authority_ref === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['authority_ref'], message: 'authorized selection requires authority ref' });
  }
});

const SelectedModel = z
  .object({
    registry_id: z.string().min(1),
    provider: z.string().min(1),
    runtime_id: z.string().min(1),
    pool_id: z.string().min(1),
    resource_class: ResourceClass,
    access_mode: AccessMode,
  })
  .strict();

const SelectedResult = z
  .object({
    status: z.literal('SELECTED'),
    selected: SelectedModel,
    policy_id: z.literal(MODEL_SELECTION_POLICY_ID),
    fallback_used: z.boolean(),
    reason_code: z.literal('MODEL_SELECTED'),
  })
  .strict();

const BlockedResult = z
  .object({
    status: z.literal('BLOCKED'),
    selected: z.null(),
    reason_code: z.literal('NO_ELIGIBLE_MODEL'),
  })
  .strict();

const ModelResolutionResult = z.discriminatedUnion('status', [SelectedResult, BlockedResult]);
const ModelResolutionArtifactRef = ArtifactRef.extend({
  schema_version: z.literal('fitflow-model-resolution/v1'),
}).strict();

module.exports = {
  MODEL_SELECTION_POLICY_ID,
  ModelSelectionConstraints,
  RuntimeConstraintsResolution,
  RoutingDecisionResolution,
  DeterministicSelectionAuthorization,
  SelectedModel,
  ModelResolutionResult,
  ModelResolutionArtifactRef,
};
