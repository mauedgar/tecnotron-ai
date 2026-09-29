import { z } from 'zod';

const OperationIdSchema = z.string().min(1).brand<'OperationId'>();
const ExecutionAttemptIdSchema = z.string().min(1).brand<'ExecutionAttemptId'>();

export type OperationId = z.output<typeof OperationIdSchema>;
export type ExecutionAttemptId = z.output<typeof ExecutionAttemptIdSchema>;

export const EvidenceRef = z.object({
  kind: z.string().min(1),
  ref: z.string().min(1),
}).strict();
export type EvidenceRef = z.output<typeof EvidenceRef>;

export const EffectConstraint = z.object({
  effect: z.string().min(1),
  scope: z.string().min(1),
}).strict();
export type EffectConstraint = z.output<typeof EffectConstraint>;

export const ResolvedExecution = z.object({
  decision_ref: z.string().min(1),
  actor_id: z.string().min(1),
  runtime_id: z.string().min(1),
  model_id: z.string().min(1).optional(),
  provider_id: z.string().min(1).optional(),
}).strict();
export type ResolvedExecution = z.output<typeof ResolvedExecution>;

export const AuthorizationContext = z.object({
  disposition: z.enum(['AUTHORIZED', 'DENIED', 'UNKNOWN']),
  authority_reference: z.string().min(1),
  effect_constraints: z.array(EffectConstraint).min(1),
}).strict();
export type AuthorizationContext = z.output<typeof AuthorizationContext>;
export type AuthorizationContextInput = z.input<typeof AuthorizationContext>;

export const HarnessConformance = z.object({
  disposition: z.enum(['CONFORMING', 'NONCONFORMING', 'UNKNOWN']),
  evidence_ref: z.string().min(1),
}).strict();
export type HarnessConformance = z.output<typeof HarnessConformance>;
export type HarnessConformanceInput = z.input<typeof HarnessConformance>;

export const ExecutionAttemptRequest = z.object({
  operation_id: OperationIdSchema,
  execution_attempt_id: ExecutionAttemptIdSchema,
  resolved_execution: ResolvedExecution,
  authorization: AuthorizationContext,
  harness_conformance: HarnessConformance,
  evidence_refs: z.array(EvidenceRef).default([]),
  cancellation_requested: z.boolean().default(false),
  input: z.unknown().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.operation_id === (value.execution_attempt_id as unknown as OperationId)) {
    ctx.addIssue({
      code: 'custom',
      path: ['execution_attempt_id'],
      message: 'execution_attempt_id must remain distinct from operation_id',
    });
  }
});
export type ExecutionAttemptRequest = z.output<typeof ExecutionAttemptRequest>;
export type ExecutionAttemptRequestInput = z.input<typeof ExecutionAttemptRequest>;

export const OutcomeStatus = z.enum([
  'NO_START',
  'PARTIAL_RESULT',
  'SUCCESS',
  'FAILED',
  'BLOCKED',
  'UNAVAILABLE',
  'CANCELLED',
  'UNKNOWN',
]);
export type OutcomeStatus = z.output<typeof OutcomeStatus>;

const ExecutionOutcomeSchema = z.object({
  operation_id: OperationIdSchema,
  execution_attempt_id: ExecutionAttemptIdSchema,
  status: OutcomeStatus,
  started: z.boolean(),
  reason: z.string().min(1).optional(),
  result: z.unknown().optional(),
  partial_result: z.unknown().optional(),
  evidence_refs: z.array(EvidenceRef).default([]),
}).strict().superRefine((value, ctx) => {
  if (['NO_START', 'BLOCKED', 'UNAVAILABLE'].includes(value.status) && value.started !== false) {
    ctx.addIssue({
      code: 'custom',
      path: ['started'],
      message: `${value.status} requires started=false`,
    });
  }

  if (['SUCCESS', 'PARTIAL_RESULT', 'CANCELLED', 'UNKNOWN'].includes(value.status) && value.started !== true) {
    ctx.addIssue({
      code: 'custom',
      path: ['started'],
      message: `${value.status} requires started=true`,
    });
  }

  if (value.status === 'PARTIAL_RESULT' && value.partial_result === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['partial_result'],
      message: 'PARTIAL_RESULT requires partial_result',
    });
  }

  if (value.status !== 'SUCCESS' && !value.reason) {
    ctx.addIssue({
      code: 'custom',
      path: ['reason'],
      message: `${value.status} requires an explicit reason`,
    });
  }
});

type OutcomeShape = z.output<typeof ExecutionOutcomeSchema>;
type OutcomeCommon = Omit<OutcomeShape, 'status' | 'started' | 'reason' | 'partial_result'>;
type ReasonedOutcome<S extends OutcomeStatus, Started extends boolean> = OutcomeCommon & {
  status: S;
  started: Started;
  reason: string;
  partial_result?: unknown;
};

export type ExecutionOutcome =
  | (OutcomeCommon & { status: 'SUCCESS'; started: true; reason?: string; partial_result?: unknown })
  | (ReasonedOutcome<'PARTIAL_RESULT', true> & { partial_result: unknown })
  | ReasonedOutcome<'CANCELLED' | 'UNKNOWN', true>
  | ReasonedOutcome<'NO_START' | 'BLOCKED' | 'UNAVAILABLE', false>
  | ReasonedOutcome<'FAILED', boolean>;
export type ExecutionOutcomeInput = z.input<typeof ExecutionOutcomeSchema>;

export const ExecutionOutcome = ExecutionOutcomeSchema as z.ZodType<
  ExecutionOutcome,
  ExecutionOutcomeInput
>;

export function mergeEvidenceRefs(
  baseRefs: readonly EvidenceRef[],
  additionalRefs: readonly EvidenceRef[],
): EvidenceRef[] {
  const seen = new Set<string>();
  const merged: EvidenceRef[] = [];

  for (const entry of [...baseRefs, ...additionalRefs]) {
    const parsed = EvidenceRef.parse(entry);
    const key = `${parsed.kind}\u0000${parsed.ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(parsed);
  }

  return merged;
}
