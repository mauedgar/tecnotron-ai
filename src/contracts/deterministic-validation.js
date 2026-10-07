"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicValidationReceipt = exports.ValidationConclusion = exports.SubjectCorrespondence = exports.GitHubActionsExecutionRef = exports.ValidationCheck = exports.ValidationCheckStatus = exports.DeterministicValidationRequest = exports.ValidationCorrelation = exports.ValidationProfileRef = exports.ExactGitSubject = void 0;
const zod_1 = require("zod");
const execution_coordination_1 = require("./execution-coordination");
const NonEmpty = zod_1.z.string().min(1);
const GitOid = zod_1.z.string().regex(/^[a-f0-9]{40,64}$/);
const RepositoryFullName = zod_1.z.string().regex(/^[^/\\s]+\/[^/\\s]+$/);
const OperationIdValue = NonEmpty.transform((value) => value);
const ExecutionAttemptIdValue = NonEmpty.transform((value) => value);
exports.ExactGitSubject = zod_1.z.object({
    repository: RepositoryFullName,
    commit: GitOid,
    tree: GitOid.optional(),
    expected_ref: NonEmpty.optional(),
}).strict();
exports.ValidationProfileRef = zod_1.z.object({
    id: NonEmpty,
    version: NonEmpty,
}).strict();
exports.ValidationCorrelation = zod_1.z.object({
    operation_id: OperationIdValue,
    execution_attempt_id: ExecutionAttemptIdValue,
}).strict().superRefine((value, ctx) => {
    if (value.operation_id === value.execution_attempt_id) {
        ctx.addIssue({
            code: 'custom',
            path: ['execution_attempt_id'],
            message: 'execution_attempt_id must remain distinct from operation_id',
        });
    }
});
exports.DeterministicValidationRequest = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-deterministic-validation-request/v0'),
    subject: exports.ExactGitSubject,
    profile: exports.ValidationProfileRef,
    correlation: exports.ValidationCorrelation.optional(),
    evidence_refs: zod_1.z.array(execution_coordination_1.EvidenceRef).default([]),
}).strict();
exports.ValidationCheckStatus = zod_1.z.enum([
    'PASS',
    'FAIL',
    'BLOCKED',
    'UNAVAILABLE',
    'CANCELLED',
    'UNKNOWN',
]);
exports.ValidationCheck = zod_1.z.object({
    id: NonEmpty,
    status: exports.ValidationCheckStatus,
    elapsed_ms: zod_1.z.number().int().nonnegative(),
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
exports.GitHubActionsExecutionRef = zod_1.z.object({
    provider: zod_1.z.literal('github-actions'),
    run_id: NonEmpty,
    run_attempt: zod_1.z.number().int().positive(),
    workflow_ref: NonEmpty,
    workflow_sha: GitOid,
}).strict();
exports.SubjectCorrespondence = zod_1.z.enum(['EXACT', 'MISMATCH', 'UNKNOWN']);
exports.ValidationConclusion = exports.ValidationCheckStatus;
function subjectsCorrespond(requested, observed) {
    if (requested.repository !== observed.repository)
        return false;
    if (requested.commit !== observed.commit)
        return false;
    if (requested.tree !== undefined && requested.tree !== observed.tree)
        return false;
    return true;
}
exports.DeterministicValidationReceipt = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-deterministic-validation-receipt/v0'),
    requested_subject: exports.ExactGitSubject,
    observed_subject: exports.ExactGitSubject.nullable(),
    correspondence: exports.SubjectCorrespondence,
    profile: exports.ValidationProfileRef,
    execution: exports.GitHubActionsExecutionRef,
    checks: zod_1.z.array(exports.ValidationCheck).min(1),
    conclusion: exports.ValidationConclusion,
    effect_state: zod_1.z.literal('NONE'),
    artifact_refs: zod_1.z.array(execution_coordination_1.EvidenceRef).default([]),
    evidence_refs: zod_1.z.array(execution_coordination_1.EvidenceRef).default([]),
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
    }
    else if (!value.reason) {
        ctx.addIssue({
            code: 'custom',
            path: ['reason'],
            message: `${value.conclusion} requires reason`,
        });
    }
});
