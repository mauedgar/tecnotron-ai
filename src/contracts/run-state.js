'use strict';

const { z } = require('zod');
const { TaskId, RunId, Timestamp, State, Actor, Baseline, ArtifactRef, Hash } = require('./common');

const RetryCounters = z.object({
  context: z.number().int().min(0),
  implementation: z.number().int().min(0),
  review: z.number().int().min(0),
});

const ContextDelivery = z.object({
  package_id: z.string().min(1),
  consumer_role: Actor,
  mode: z.enum(['reduced', 'drill_down', 'expanded']),
  paths: z.array(z.string()),
  tokens: z.number().int().min(0),
  content_hash: Hash,
});

const RunState = z
  .object({
    artifact: z.literal('RUN_STATE'),
    schema_version: z.literal('fitflow-run-state/v2'),
    task_id: TaskId,
    run_id: RunId,
    updated_at: Timestamp,
    baseline: Baseline,
    workflow_id: z.enum(['development', 'bugfix', 'documentation_sync']),
    current_state: State,
    next_state: z.union([State, z.null()]),
    sequence: z.number().int().min(0),
    retry_counters: RetryCounters,
    context_deliveries: z.array(ContextDelivery),
    route_history: z.array(ArtifactRef),
    validation_history: z.array(ArtifactRef),
    review_history: z.array(ArtifactRef),
    blocked_by: z.array(z.string()),
    last_error: z.union([z.string(), z.null()]),
  })
  .strict();

module.exports = { RunState, RetryCounters, ContextDelivery };
