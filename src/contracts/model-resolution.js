'use strict';

const { z } = require('zod');
const { ArtifactRef } = require('./common');
const { ResourceClass, AccessMode } = require('./route');

const MODEL_SELECTION_POLICY_ID = 'fitflow-model-selection/v1';

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
  SelectedModel,
  ModelResolutionResult,
  ModelResolutionArtifactRef,
};
