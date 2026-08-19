'use strict';

const { z } = require('zod');
const { TaskId, RunId, Timestamp, Baseline, NormalizedStatus, ArtifactRef } = require('./common');

const Gate = z
  .object({
    gate_id: z.string().min(1),
    command: z.string().min(1),
    cwd: z.string().min(1),
    status: NormalizedStatus,
    exit_code: z.union([z.number().int().min(0), z.null()]),
    duration_ms: z.union([z.number().int().min(0), z.null()]),
    summary: z.union([z.string(), z.null()]),
    output_artifact: z.union([z.string(), z.null()]),
  })
  .strict();

const ValidationResult = z
  .object({
    artifact: z.literal('VALIDATION_RESULT'),
    schema_version: z.literal('fitflow-validation-result/v2'),
    task_id: TaskId,
    run_id: RunId,
    created_at: Timestamp,
    baseline: Baseline,
    status: NormalizedStatus,
    gates: z.array(Gate).min(1),
    next_state: z.literal('REVIEWING'),
  })
  .strict();

const ReviewResult = z
  .object({
    artifact: z.literal('REVIEW_RESULT'),
    schema_version: z.literal('fitflow-review-result/v2'),
    task_id: TaskId,
    run_id: RunId,
    created_at: Timestamp,
    baseline: Baseline,
    reviewer_role: z.literal('reviewer'),
    independent: z.boolean(),
    verdict: NormalizedStatus,
    findings: z.array(
      z.object({
        severity: z.enum(['blocker', 'critical', 'major', 'minor', 'note']),
        path: z.string(),
        finding: z.string().min(1),
        action: z.string(),
      })
    ),
    validation_ref: ArtifactRef,
    summary: z.string().min(1),
    next_state: z.literal('DOC_SYNC'),
  })
  .strict();

module.exports = { Gate, ValidationResult, ReviewResult };
