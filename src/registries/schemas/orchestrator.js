'use strict';

const { z } = require('zod');

const State = z.enum([
  'BACKLOG', 'READY', 'PLANNING', 'ROUTING', 'EXPLORING', 'EXECUTING',
  'VALIDATING', 'REVIEWING', 'DOC_SYNC', 'PENDING_ACCEPTANCE',
  'WAITING_DEVELOPER', 'DONE', 'BLOCKED', 'BLOCKED_HIGH_RISK', 'CANCELLED',
]);

const Orchestrator = z
  .object({
    schema_version: z.literal('fitflow-orchestrator/v2'),
    baseline: z.string(),
    runtime: z.object({
      port: z.string(),
      preferred_adapter: z.string(),
      adapter_status: z.string(),
    }),
    control: z.object({
      planner: z.enum(['developer', 'planner_ai']),
      terminal_agent_state: z.literal('PENDING_ACCEPTANCE'),
      final_state: z.literal('DONE'),
      final_actor: z.literal('developer'),
      commits_by_agents: z.boolean(),
      dependency_changes_by_agents: z.boolean(),
    }),
    states: z.array(State).min(1),
    transitions: z.record(z.array(State)),
    limits: z.object({
      context_expansions: z.number().int(),
      implementation_attempts: z.number().int(),
      review_attempts: z.number().int(),
    }),
    parallelism: z.object({
      enabled: z.boolean(),
      require_disjoint_ownership_keys: z.boolean(),
      single_writer_per_key: z.boolean(),
    }),
    artifacts: z.object({
      task_root: z.string(),
      run_root: z.string(),
      local_root: z.string(),
      schema_root: z.string(),
    }),
  })
  .strict();

module.exports = { Orchestrator, State };
