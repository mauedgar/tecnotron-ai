import { z } from 'zod';
import {
  EvidenceRef,
  type ExecutionAttemptId,
  type OperationId,
} from './execution-coordination';

const NonEmpty = z.string().min(1);
const GitOid = z.string().regex(/^[a-f0-9]{40,64}$/);
const RepositoryFullName = z.string().regex(/^[^/\\s]+\/[^/\\s]+$/);

const OperationIdValue = NonEmpty.transform((value) => value as OperationId);
const ExecutionAttemptIdValue = NonEmpty.transform((value) => value as ExecutionAttemptId);

export const ExactGitSubject = z.object({
  repository: RepositoryFullName,
  commit: GitOid,
  tree: GitOid.optional(),
  expected_ref: NonEmpty.optional(),
}).strict();
export type ExactGitSubject = z.output<typeof ExactGitSubject>;
export type ExactGitSubjectInput = z.input<typeof ExactGitSubject>;

export const ValidationProfileRef = z.object({
  id: NonEmpty,
  version: NonEmpty,
}).strict();
export type ValidationProfileRef = z.output<typeof ValidationProfileRef>;
export type ValidationProfileRefInput = z.input<typeof ValidationProfileRef>;

export const ValidationCorrelation = z.object({
  operation_id: OperationIdValue,
  execution_attempt_id: ExecutionAttemptIdValue,
}).strict().superRefine((value, ctx) => {
  if (value.operation_id === (value.execution_attempt_id as unknown as OperationId)) {
    ctx.addIssue({
      code: 'custom',
      path: ['execution_attempt_id'],
      message: 'execution_attempt_id must remain distinct from operation_id',
    });
  }
});
export type ValidationCorrelation = z.output<typeof ValidationCorrelation>;
export type ValidationCorrelationInput = z.input<typeof ValidationCorrelation>;

export const DeterministicValidationRequest = z.object({
  schema_version: z.literal('tecnotron-deterministic-validation-request/v0'),
  subject: ExactGitSubject,
  profile: ValidationProfileRef,
  correlation: ValidationCorrelation.optional(),
  evidence_refs: z.array(EvidenceRef).default([]),
}).strict();
export type DeterministicValidationRequest = z.output<typeof DeterministicValidationRequest>;
export type DeterministicValidationRequestInput = z.input<typeof DeterministicValidationRequest>;

export const ValidationCheckStatus = z.enum([
  'PASS',
  'FAIL',
  'BLOCKED',
  'UNAVAILABLE',
  'CANCELLED',
  'UNKNOWN',
]);
export type ValidationCheckStatus = z.output<typeof ValidationCheckStatus>;

export const ValidationCheck = z.object({
  id: NonEmpty,
  status: ValidationCheckStatus,
  elapsed_ms: z.number().int().nonnegative(),
  reason: NonEmpty.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.status !== 'PASS' && !value.reason) {
    ctx.addIssue({
      code: 'custom',
      path: ['reason'],
      message: `${value.status} requires reason`,
    });
  }
});
export type ValidationCheck = z.output<typeof ValidationCheck>;
export type ValidationCheckInput = z.input<typeof ValidationCheck>;

export const GitHubActionsExecutionRef = z.object({
  provider: z.literal('github-actions'),
  run_id: NonEmpty,
  run_attempt: z.number().int().positive(),
  workflow_ref: NonEmpty,
  workflow_sha: GitOid,
}).strict();
export type GitHubActionsExecutionRef = z.output<typeof GitHubActionsExecutionRef>;
export type GitHubActionsExecutionRefInput = z.input<typeof GitHubActionsExecutionRef>;

export const SubjectCorrespondence = z.enum(['EXACT', 'MISMATCH', 'UNKNOWN']);
export type SubjectCorrespondence = z.output<typeof SubjectCorrespondence>;

export const ValidationConclusion = ValidationCheckStatus;
export type ValidationConclusion = z.output<typeof ValidationConclusion>;

function subjectsCorrespond(requested: ExactGitSubject, observed: ExactGitSubject): boolean {
  if (requested.repository !== observed.repository) return false;
  if (requested.commit !== observed.commit) return false;
  if (requested.tree !== undefined && requested.tree !== observed.tree) return false;
  return true;
}

export const DeterministicValidationReceipt = z.object({
  schema_version: z.literal('tecnotron-deterministic-validation-receipt/v0'),
  requested_subject: ExactGitSubject,
  observed_subject: ExactGitSubject.nullable(),
  correspondence: SubjectCorrespondence,
  profile: ValidationProfileRef,
  execution: GitHubActionsExecutionRef,
  checks: z.array(ValidationCheck).min(1),
  conclusion: ValidationConclusion,
  effect_state: z.literal('NONE'),
  artifact_refs: z.array(EvidenceRef).default([]),
  evidence_refs: z.array(EvidenceRef).default([]),
  reason: NonEmpty.optional(),
}).strict().superRefine((value, ctx) => {
  const observed = value.observed_subject;
  const sameSubject = observed === null ? null : subjectsCorrespond(value.requested_subject, observed);

  if (value.correspondence === 'EXACT' && sameSubject !== true) {
    ctx.addIssue({
      code: 'custom',
      path: ['correspondence'],
      message: 'EXACT requires an observed subject matching the requested subject',
    });
  }

  if (value.correspondence === 'MISMATCH' && sameSubject !== false) {
    ctx.addIssue({
      code: 'custom',
      path: ['correspondence'],
      message: 'MISMATCH requires an observed subject different from the requested subject',
    });
  }

  if (value.correspondence === 'UNKNOWN' && sameSubject !== null) {
    ctx.addIssue({
      code: 'custom',
      path: ['correspondence'],
      message: 'UNKNOWN correspondence requires observed_subject=null',
    });
  }

  if (value.conclusion === 'PASS') {
    if (value.correspondence !== 'EXACT') {
      ctx.addIssue({
        code: 'custom',
        path: ['conclusion'],
        message: 'PASS requires exact subject correspondence',
      });
    }
    if (value.checks.some((check) => check.status !== 'PASS')) {
      ctx.addIssue({
        code: 'custom',
        path: ['checks'],
        message: 'PASS requires every validation check to PASS',
      });
    }
  } else if (!value.reason) {
    ctx.addIssue({
      code: 'custom',
      path: ['reason'],
      message: `${value.conclusion} requires reason`,
    });
  }
});
export type DeterministicValidationReceipt = z.output<typeof DeterministicValidationReceipt>;
export type DeterministicValidationReceiptInput = z.input<typeof DeterministicValidationReceipt>;
