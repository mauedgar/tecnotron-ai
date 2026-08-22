'use strict';

const { z } = require('zod');
const { TaskId, RunId, Timestamp, State, Actor, Baseline, ArtifactRef } = require('./common');
const { ModelResolutionArtifactRef } = require('./model-resolution');

const RunEvent = z
  .object({
    artifact: z.literal('RUN_EVENT'),
    schema_version: z.literal('fitflow-run-event/v2'),
    event_id: z.string().min(3),
    sequence: z.number().int().min(0),
    task_id: TaskId,
    run_id: RunId,
    created_at: Timestamp,
    actor: Actor,
    event_type: z.enum([
      'STATE_TRANSITION', 'ROUTE_DECIDED', 'CONTEXT_REQUESTED',
      'CONTEXT_DELIVERED', 'EXECUTION_COMPLETED', 'VALIDATION_COMPLETED',
      'REVIEW_COMPLETED', 'DOC_IMPACT_RECORDED', 'DEVELOPER_DECISION', 'ERROR',
    ]),
    state_from: z.union([State, z.null()]),
    state_to: State,
    reason_code: z.string().min(1),
    inputs: z.array(ArtifactRef),
    outputs: z.array(ArtifactRef),
    usage_record_id: z.union([z.string(), z.null()]).optional(),
    idempotency_key: z.union([z.string(), z.null()]).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.event_type === 'ROUTE_DECIDED') {
      if (val.outputs.length !== 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['outputs'], message: 'ROUTE_DECIDED requires exactly one model-resolution artifact' });
      } else {
        const parsed = ModelResolutionArtifactRef.safeParse(val.outputs[0]);
        if (!parsed.success) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['outputs', 0], message: 'ROUTE_DECIDED requires a model-resolution artifact' });
        }
      }
    }
    if (val.state_to === 'DONE') {
      if (val.state_from !== 'PENDING_ACCEPTANCE') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['state_from'], message: 'DONE requires PENDING_ACCEPTANCE' });
      }
      if (val.actor !== 'developer') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['actor'], message: 'only developer can emit DONE' });
      }
      if (val.event_type !== 'DEVELOPER_DECISION') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['event_type'], message: 'DONE requires DEVELOPER_DECISION' });
      }
    }
  });

module.exports = { RunEvent };
