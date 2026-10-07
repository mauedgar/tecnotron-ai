import { z } from 'zod';
export declare const ExactGitSubject: z.ZodObject<{
    repository: z.ZodString;
    commit: z.ZodString;
    tree: z.ZodOptional<z.ZodString>;
    expected_ref: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type ExactGitSubject = z.output<typeof ExactGitSubject>;
export type ExactGitSubjectInput = z.input<typeof ExactGitSubject>;
export declare const ValidationProfileRef: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strict>;
export type ValidationProfileRef = z.output<typeof ValidationProfileRef>;
export type ValidationProfileRefInput = z.input<typeof ValidationProfileRef>;
export declare const ValidationCorrelation: z.ZodObject<{
    operation_id: z.ZodPipe<z.ZodString, z.ZodTransform<string & z.$brand<"OperationId">, string>>;
    execution_attempt_id: z.ZodPipe<z.ZodString, z.ZodTransform<string & z.$brand<"ExecutionAttemptId">, string>>;
}, z.core.$strict>;
export type ValidationCorrelation = z.output<typeof ValidationCorrelation>;
export type ValidationCorrelationInput = z.input<typeof ValidationCorrelation>;
export declare const DeterministicValidationRequest: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-deterministic-validation-request/v0">;
    subject: z.ZodObject<{
        repository: z.ZodString;
        commit: z.ZodString;
        tree: z.ZodOptional<z.ZodString>;
        expected_ref: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    profile: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strict>;
    correlation: z.ZodOptional<z.ZodObject<{
        operation_id: z.ZodPipe<z.ZodString, z.ZodTransform<string & z.$brand<"OperationId">, string>>;
        execution_attempt_id: z.ZodPipe<z.ZodString, z.ZodTransform<string & z.$brand<"ExecutionAttemptId">, string>>;
    }, z.core.$strict>>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodString;
        ref: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export type DeterministicValidationRequest = z.output<typeof DeterministicValidationRequest>;
export type DeterministicValidationRequestInput = z.input<typeof DeterministicValidationRequest>;
export declare const ValidationCheckStatus: z.ZodEnum<{
    BLOCKED: "BLOCKED";
    CANCELLED: "CANCELLED";
    FAIL: "FAIL";
    PASS: "PASS";
    UNAVAILABLE: "UNAVAILABLE";
    UNKNOWN: "UNKNOWN";
}>;
export type ValidationCheckStatus = z.output<typeof ValidationCheckStatus>;
export declare const ValidationCheck: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<{
        BLOCKED: "BLOCKED";
        CANCELLED: "CANCELLED";
        FAIL: "FAIL";
        PASS: "PASS";
        UNAVAILABLE: "UNAVAILABLE";
        UNKNOWN: "UNKNOWN";
    }>;
    elapsed_ms: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type ValidationCheck = z.output<typeof ValidationCheck>;
export type ValidationCheckInput = z.input<typeof ValidationCheck>;
export declare const GitHubActionsExecutionRef: z.ZodObject<{
    provider: z.ZodLiteral<"github-actions">;
    run_id: z.ZodString;
    run_attempt: z.ZodNumber;
    workflow_ref: z.ZodString;
    workflow_sha: z.ZodString;
}, z.core.$strict>;
export type GitHubActionsExecutionRef = z.output<typeof GitHubActionsExecutionRef>;
export type GitHubActionsExecutionRefInput = z.input<typeof GitHubActionsExecutionRef>;
export declare const SubjectCorrespondence: z.ZodEnum<{
    EXACT: "EXACT";
    MISMATCH: "MISMATCH";
    UNKNOWN: "UNKNOWN";
}>;
export type SubjectCorrespondence = z.output<typeof SubjectCorrespondence>;
export declare const ValidationConclusion: z.ZodEnum<{
    BLOCKED: "BLOCKED";
    CANCELLED: "CANCELLED";
    FAIL: "FAIL";
    PASS: "PASS";
    UNAVAILABLE: "UNAVAILABLE";
    UNKNOWN: "UNKNOWN";
}>;
export type ValidationConclusion = z.output<typeof ValidationConclusion>;
export declare const DeterministicValidationReceipt: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-deterministic-validation-receipt/v0">;
    requested_subject: z.ZodObject<{
        repository: z.ZodString;
        commit: z.ZodString;
        tree: z.ZodOptional<z.ZodString>;
        expected_ref: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    observed_subject: z.ZodNullable<z.ZodObject<{
        repository: z.ZodString;
        commit: z.ZodString;
        tree: z.ZodOptional<z.ZodString>;
        expected_ref: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    correspondence: z.ZodEnum<{
        EXACT: "EXACT";
        MISMATCH: "MISMATCH";
        UNKNOWN: "UNKNOWN";
    }>;
    profile: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strict>;
    execution: z.ZodObject<{
        provider: z.ZodLiteral<"github-actions">;
        run_id: z.ZodString;
        run_attempt: z.ZodNumber;
        workflow_ref: z.ZodString;
        workflow_sha: z.ZodString;
    }, z.core.$strict>;
    checks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        status: z.ZodEnum<{
            BLOCKED: "BLOCKED";
            CANCELLED: "CANCELLED";
            FAIL: "FAIL";
            PASS: "PASS";
            UNAVAILABLE: "UNAVAILABLE";
            UNKNOWN: "UNKNOWN";
        }>;
        elapsed_ms: z.ZodNumber;
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    conclusion: z.ZodEnum<{
        BLOCKED: "BLOCKED";
        CANCELLED: "CANCELLED";
        FAIL: "FAIL";
        PASS: "PASS";
        UNAVAILABLE: "UNAVAILABLE";
        UNKNOWN: "UNKNOWN";
    }>;
    effect_state: z.ZodLiteral<"NONE">;
    artifact_refs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodString;
        ref: z.ZodString;
    }, z.core.$strict>>>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodString;
        ref: z.ZodString;
    }, z.core.$strict>>>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type DeterministicValidationReceipt = z.output<typeof DeterministicValidationReceipt>;
export type DeterministicValidationReceiptInput = z.input<typeof DeterministicValidationReceipt>;
