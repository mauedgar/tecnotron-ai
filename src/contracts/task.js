'use strict';

const { z } = require('zod');
const { TaskId, Timestamp, Baseline } = require('./common');

const TaskType = z.enum(['use_case', 'feature', 'fix', 'refactor', 'audit', 'test', 'docs', 'tooling', 'migration']);
const TaskArea = z.enum(['backend', 'frontend', 'infra', 'docs', 'ai_tooling', 'mixed']);
const TaskRisk = z.enum(['low', 'medium', 'high']);

const Task = z
  .object({
    artifact: z.literal('TASK'),
    schema_version: z.literal('fitflow-task/v2'),
    task_id: TaskId,
    title: z.string().min(3).max(180),
    status: z.enum(['BACKLOG', 'READY', 'PLANNING', 'EXECUTING', 'VALIDATING', 'REVIEWING', 'PENDING_ACCEPTANCE', 'WAITING_DEVELOPER', 'DONE', 'BLOCKED', 'CANCELLED']),
    task_type: TaskType,
    area: TaskArea,
    scope: z.enum(['backend', 'frontend', 'mixed', 'docs_tooling']),
    lane: z.enum(['developer', 'ai_orchestrated', 'mixed', 'undecided']),
    risk: TaskRisk,
    priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4', 'P5']),
    created_at: Timestamp,
    author_role: z.enum(['developer', 'planner_ai']),
    baseline: Baseline,
    github_issue: z.union([z.string(), z.null()]),
    openspec_change: z.union([z.string(), z.null()]),
    objective: z.string().min(10).max(1600),
    in_scope: z.array(z.string().min(1)).min(1),
    out_of_scope: z.array(z.string().min(1)),
    constraints: z.array(z.string().min(1)).optional(),
    acceptance_criteria: z
      .array(
        z.object({
          id: z.string().regex(/^AC-[0-9]+$/),
          criterion: z.string().min(5),
          evidence: z.union([z.string(), z.null()]).optional(),
        })
      )
      .min(1),
    ownership_keys: z.array(z.string().regex(/^(path|api|domain|db|doc|config):.+$/)).min(1),
    required_docs: z.array(z.string()).optional(),
    validation_expected: z.array(z.string()).optional(),
    document_impact: z.array(z.string()).optional(),
    depends_on: z.array(TaskId).optional(),
    supersedes: z.array(TaskId).optional(),
  })
  .strict();

const TaskRoutingInput = z
  .object({ task_type: TaskType, area: TaskArea, risk: TaskRisk })
  .strict();

module.exports = { Task, TaskType, TaskArea, TaskRisk, TaskRoutingInput };
