'use strict';

const { z } = require('zod');

const EvidenceRef = z.object({
  kind: z.string().min(1),
  ref: z.string().min(1),
}).strict();

const EffectConstraint = z.object({
  effect: z.string().min(1),
  scope: z.string().min(1),
}).strict();

const ResolvedExecution = z.object({
  decision_ref: z.string().min(1),
  actor_id: z.string().min(1),
  runtime_id: z.string().min(1),
  model_id: z.string().min(1).optional(),
  provider_id: z.string().min(1).optional(),
}).strict();

const AuthorizationContext = z.object({
  disposition: z.enum(['AUTHORIZED', 'DENIED', 'UNKNOWN']),
  authority_reference: z.string().min(1),
  effect_constraints: z.array(EffectConstraint).min(1),
}).strict();

const HarnessConformance = z.object({
  disposition: z.enum(['CONFORMING', 'NONCONFORMING', 'UNKNOWN']),
  evidence_ref: z.string().min(1),
}).strict();

const ExecutionAttemptRequest = z.object({
  operation_id: z.string().min(1),
  execution_attempt_id: z.string().min(1),
  resolved_execution: ResolvedExecution,
  authorization: AuthorizationContext,
  harness_conformance: HarnessConformance,
  evidence_refs: z.array(EvidenceRef).default([]),
  cancellation_requested: z.boolean().default(false),
  input: z.unknown().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.operation_id === value.execution_attempt_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['execution_attempt_id'],
      message: 'execution_attempt_id must remain distinct from operation_id',
    });
  }
});

const OutcomeStatus = z.enum([
  'NO_START',
  'PARTIAL_RESULT',
  'SUCCESS',
  'FAILED',
  'BLOCKED',
  'UNAVAILABLE',
  'CANCELLED',
  'UNKNOWN',
]);

const ExecutionOutcome = z.object({
  operation_id: z.string().min(1),
  execution_attempt_id: z.string().min(1),
  status: OutcomeStatus,
  started: z.boolean(),
  reason: z.string().min(1).optional(),
  result: z.unknown().optional(),
  partial_result: z.unknown().optional(),
  evidence_refs: z.array(EvidenceRef).default([]),
}).strict().superRefine((value, ctx) => {
  if (['NO_START', 'BLOCKED', 'UNAVAILABLE'].includes(value.status) && value.started !== false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['started'],
      message: `${value.status} requires started=false`,
    });
  }

  if (['SUCCESS', 'PARTIAL_RESULT', 'CANCELLED', 'UNKNOWN'].includes(value.status) && value.started !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['started'],
      message: `${value.status} requires started=true`,
    });
  }

  if (value.status === 'PARTIAL_RESULT' && value.partial_result === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['partial_result'],
      message: 'PARTIAL_RESULT requires partial_result',
    });
  }

  if (value.status !== 'SUCCESS' && !value.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: `${value.status} requires an explicit reason`,
    });
  }
});

function mergeEvidenceRefs(baseRefs, additionalRefs) {
  const seen = new Set();
  const merged = [];

  for (const entry of [...baseRefs, ...additionalRefs]) {
    const parsed = EvidenceRef.parse(entry);
    const key = `${parsed.kind}\u0000${parsed.ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(parsed);
  }

  return merged;
}

module.exports = {
  EvidenceRef,
  EffectConstraint,
  ResolvedExecution,
  AuthorizationContext,
  HarnessConformance,
  ExecutionAttemptRequest,
  OutcomeStatus,
  ExecutionOutcome,
  mergeEvidenceRefs,
};