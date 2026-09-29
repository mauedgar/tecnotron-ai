import { type AuthorizationContext, type ExecutionAttemptId, type ExecutionAttemptRequestInput, type ExecutionOutcome, type HarnessConformance, type OperationId } from '../contracts/execution-coordination';
import { RecipeReceipt, type Capability, type ExecutionContextInput, type ExecutionPlan as ExecutionPlanValue, type ExecutionPlanInput, type RecipeReceipt as RecipeReceiptValue, type Reference } from './contracts';
import type { ExecutionRecordStorePort } from './execution-record-store';
import type { RecipePreflight, RecipeRegistryPort } from './recipe-registry';
import { type OperationAggregate } from './resolution';
interface StateKernelInspection {
    readonly aggregate: OperationAggregate;
    readonly [key: string]: unknown;
}
export interface StateKernelPort {
    inspectOperation(operationId: OperationId): StateKernelInspection;
    ensureOperationRunning(operationId: OperationId): unknown;
    startAttempt(input: Readonly<{
        attemptId: ExecutionAttemptId;
        operationId: OperationId;
        authorityRefs: readonly Reference[];
    }>): unknown;
    markAttemptDispatched(attemptId: ExecutionAttemptId): unknown;
    markAttemptRunning(attemptId: ExecutionAttemptId): unknown;
    recordPreflightTerminal(input: Readonly<{
        attemptId: ExecutionAttemptId;
        operationId: OperationId;
        status: Exclude<RecipePreflight['status'], 'READY'>;
        receipt: RecipeReceiptValue;
        resultRefs: readonly Reference[];
    }>): Record<string, unknown>;
    recordExecutionOutcome(input: Readonly<{
        attemptId: ExecutionAttemptId;
        operationId: OperationId;
        coordinatorOutcome: ExecutionOutcome;
        receipt: RecipeReceiptValue;
        resultRefs: readonly Reference[];
    }>): Record<string, unknown>;
}
export interface ExecutionCoordinatorPort {
    runAttempt(request: ExecutionAttemptRequestInput): Promise<ExecutionOutcome>;
}
export interface OperationalSpineDependencies {
    readonly stateKernel: StateKernelPort;
    readonly recipeRegistry: RecipeRegistryPort;
    readonly executionCoordinator: ExecutionCoordinatorPort;
    readonly executionRecordStore: ExecutionRecordStorePort;
}
export interface PlanRequest {
    readonly operationId: OperationId;
    readonly executionContext: ExecutionContextInput;
    readonly requiredCapabilities: readonly Capability[];
    readonly authorityRefs?: readonly Reference[];
    readonly evidenceRefs?: readonly Reference[];
    readonly input?: unknown;
}
export interface ExecutePlanRequest {
    readonly executionAttemptId: ExecutionAttemptId;
    readonly authorization: AuthorizationContext;
    readonly harnessConformance: HarnessConformance;
    readonly input?: unknown;
    readonly cancellationRequested?: boolean;
}
export declare function createOperationalSpine({ stateKernel, recipeRegistry, executionCoordinator, executionRecordStore, }: OperationalSpineDependencies): {
    plan: ({ operationId, executionContext, requiredCapabilities, authorityRefs, evidenceRefs, input, }: PlanRequest) => ExecutionPlanValue;
    executePlan: (rawPlan: ExecutionPlanInput, { executionAttemptId, authorization, harnessConformance, input, cancellationRequested, }: ExecutePlanRequest) => Promise<{
        status: 'SEMANTIC_ESCALATION_REQUIRED';
        plan: import("./contracts").SemanticEscalationExecutionPlan;
        attempt: null;
        operation: StateKernelInspection;
        plan_ref: Reference;
        reason?: never;
    } | {
        status: 'BLOCKED';
        reason: string;
        plan: import("./contracts").DeterministicExecutionPlan;
        attempt: null;
        operation: StateKernelInspection;
        plan_ref: Reference;
    } | {
        status: 'NO_START';
        reason: string;
        plan: import("./contracts").DeterministicExecutionPlan;
        attempt: null;
        operation: StateKernelInspection;
        plan_ref: Reference;
    } | {
        reason?: never;
        attempt?: never;
        operation?: never;
        status: "BLOCKED" | "CANCELLED" | "UNAVAILABLE";
        plan: import("./contracts").DeterministicExecutionPlan;
        receipt: RecipeReceipt;
        plan_ref: Reference;
        receipt_artifact_ref: Reference | null;
    } | {
        reason?: never;
        attempt?: never;
        operation?: never;
        status: "CANCELLED" | "FAILED" | "PARTIAL_RESULT" | "SUCCESS" | "UNKNOWN";
        plan: import("./contracts").DeterministicExecutionPlan;
        receipt: RecipeReceipt;
        plan_ref: Reference;
        receipt_artifact_ref: Reference | null;
        coordinator_outcome: ({
            operation_id: string & import("zod").$brand<"OperationId">;
            execution_attempt_id: string & import("zod").$brand<"ExecutionAttemptId">;
            result?: unknown;
            evidence_refs: {
                kind: string;
                ref: string;
            }[];
        } & {
            status: "FAILED";
            started: boolean;
            reason: string;
            partial_result?: unknown;
        }) | ({
            operation_id: string & import("zod").$brand<"OperationId">;
            execution_attempt_id: string & import("zod").$brand<"ExecutionAttemptId">;
            result?: unknown;
            evidence_refs: {
                kind: string;
                ref: string;
            }[];
        } & {
            status: "CANCELLED" | "UNKNOWN";
            started: true;
            reason: string;
            partial_result?: unknown;
        }) | ({
            operation_id: string & import("zod").$brand<"OperationId">;
            execution_attempt_id: string & import("zod").$brand<"ExecutionAttemptId">;
            result?: unknown;
            evidence_refs: {
                kind: string;
                ref: string;
            }[];
        } & {
            status: 'SUCCESS';
            started: true;
            reason?: string;
            partial_result?: unknown;
        }) | ({
            operation_id: string & import("zod").$brand<"OperationId">;
            execution_attempt_id: string & import("zod").$brand<"ExecutionAttemptId">;
            result?: unknown;
            evidence_refs: {
                kind: string;
                ref: string;
            }[];
        } & {
            status: "PARTIAL_RESULT";
            started: true;
            reason: string;
            partial_result?: unknown;
        } & {
            partial_result: unknown;
        });
    }>;
};
export {};
