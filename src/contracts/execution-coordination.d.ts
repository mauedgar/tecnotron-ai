import { z } from 'zod';
declare const OperationIdSchema: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
declare const ExecutionAttemptIdSchema: z.core.$ZodBranded<z.ZodString, "ExecutionAttemptId", "out">;
export type OperationId = z.output<typeof OperationIdSchema>;
export type ExecutionAttemptId = z.output<typeof ExecutionAttemptIdSchema>;
export declare const EvidenceRef: z.ZodObject<{
    kind: z.ZodString;
    ref: z.ZodString;
}, z.core.$strict>;
export type EvidenceRef = z.output<typeof EvidenceRef>;
export declare const EffectConstraint: z.ZodObject<{
    effect: z.ZodString;
    scope: z.ZodString;
}, z.core.$strict>;
export type EffectConstraint = z.output<typeof EffectConstraint>;
export declare const ResolvedExecution: z.ZodObject<{
    decision_ref: z.ZodString;
    actor_id: z.ZodString;
    runtime_id: z.ZodString;
    model_id: z.ZodOptional<z.ZodString>;
    provider_id: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type ResolvedExecution = z.output<typeof ResolvedExecution>;
export declare const AuthorizationContext: z.ZodObject<{
    disposition: z.ZodEnum<{
        AUTHORIZED: "AUTHORIZED";
        DENIED: "DENIED";
        UNKNOWN: "UNKNOWN";
    }>;
    authority_reference: z.ZodString;
    effect_constraints: z.ZodArray<z.ZodObject<{
        effect: z.ZodString;
        scope: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type AuthorizationContext = z.output<typeof AuthorizationContext>;
export type AuthorizationContextInput = z.input<typeof AuthorizationContext>;
export declare const HarnessConformance: z.ZodObject<{
    disposition: z.ZodEnum<{
        CONFORMING: "CONFORMING";
        NONCONFORMING: "NONCONFORMING";
        UNKNOWN: "UNKNOWN";
    }>;
    evidence_ref: z.ZodString;
}, z.core.$strict>;
export type HarnessConformance = z.output<typeof HarnessConformance>;
export type HarnessConformanceInput = z.input<typeof HarnessConformance>;
export declare const ExecutionAttemptRequest: z.ZodObject<{
    operation_id: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
    execution_attempt_id: z.core.$ZodBranded<z.ZodString, "ExecutionAttemptId", "out">;
    resolved_execution: z.ZodObject<{
        decision_ref: z.ZodString;
        actor_id: z.ZodString;
        runtime_id: z.ZodString;
        model_id: z.ZodOptional<z.ZodString>;
        provider_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    authorization: z.ZodObject<{
        disposition: z.ZodEnum<{
            AUTHORIZED: "AUTHORIZED";
            DENIED: "DENIED";
            UNKNOWN: "UNKNOWN";
        }>;
        authority_reference: z.ZodString;
        effect_constraints: z.ZodArray<z.ZodObject<{
            effect: z.ZodString;
            scope: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    harness_conformance: z.ZodObject<{
        disposition: z.ZodEnum<{
            CONFORMING: "CONFORMING";
            NONCONFORMING: "NONCONFORMING";
            UNKNOWN: "UNKNOWN";
        }>;
        evidence_ref: z.ZodString;
    }, z.core.$strict>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodString;
        ref: z.ZodString;
    }, z.core.$strict>>>;
    cancellation_requested: z.ZodDefault<z.ZodBoolean>;
    input: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strict>;
export type ExecutionAttemptRequest = z.output<typeof ExecutionAttemptRequest>;
export type ExecutionAttemptRequestInput = z.input<typeof ExecutionAttemptRequest>;
export declare const OutcomeStatus: z.ZodEnum<{
    BLOCKED: "BLOCKED";
    CANCELLED: "CANCELLED";
    FAILED: "FAILED";
    NO_START: "NO_START";
    PARTIAL_RESULT: "PARTIAL_RESULT";
    SUCCESS: "SUCCESS";
    UNAVAILABLE: "UNAVAILABLE";
    UNKNOWN: "UNKNOWN";
}>;
export type OutcomeStatus = z.output<typeof OutcomeStatus>;
declare const ExecutionOutcomeSchema: z.ZodObject<{
    operation_id: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
    execution_attempt_id: z.core.$ZodBranded<z.ZodString, "ExecutionAttemptId", "out">;
    status: z.ZodEnum<{
        BLOCKED: "BLOCKED";
        CANCELLED: "CANCELLED";
        FAILED: "FAILED";
        NO_START: "NO_START";
        PARTIAL_RESULT: "PARTIAL_RESULT";
        SUCCESS: "SUCCESS";
        UNAVAILABLE: "UNAVAILABLE";
        UNKNOWN: "UNKNOWN";
    }>;
    started: z.ZodBoolean;
    reason: z.ZodOptional<z.ZodString>;
    result: z.ZodOptional<z.ZodUnknown>;
    partial_result: z.ZodOptional<z.ZodUnknown>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodString;
        ref: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
type OutcomeShape = z.output<typeof ExecutionOutcomeSchema>;
type OutcomeCommon = Omit<OutcomeShape, 'status' | 'started' | 'reason' | 'partial_result'>;
type ReasonedOutcome<S extends OutcomeStatus, Started extends boolean> = OutcomeCommon & {
    status: S;
    started: Started;
    reason: string;
    partial_result?: unknown;
};
export type ExecutionOutcome = (OutcomeCommon & {
    status: 'SUCCESS';
    started: true;
    reason?: string;
    partial_result?: unknown;
}) | (ReasonedOutcome<'PARTIAL_RESULT', true> & {
    partial_result: unknown;
}) | ReasonedOutcome<'CANCELLED' | 'UNKNOWN', true> | ReasonedOutcome<'NO_START' | 'BLOCKED' | 'UNAVAILABLE', false> | ReasonedOutcome<'FAILED', boolean>;
export type ExecutionOutcomeInput = z.input<typeof ExecutionOutcomeSchema>;
export declare const ExecutionOutcome: z.ZodType<ExecutionOutcome, ExecutionOutcomeInput>;
export declare function mergeEvidenceRefs(baseRefs: readonly EvidenceRef[], additionalRefs: readonly EvidenceRef[]): EvidenceRef[];
export {};
