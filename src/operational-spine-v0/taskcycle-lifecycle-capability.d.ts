import type { ExecutionAttemptId, ExecutionOutcome, OperationId } from '../contracts/execution-coordination';
import type { RecipeReceipt, Reference } from './contracts';
import type { RecipePreflight } from './recipe-registry';
import type { OperationAggregate } from './resolution';
export type AttemptPresence = 'PRESENT' | 'ABSENT' | 'UNKNOWN';
/**
 * @deprecated Type-only compatibility for historical compile-time consumers.
 * OperationalSpine does not accept or adapt this shape at runtime.
 */
export interface LegacyStateKernelInspectionPort {
    inspectOperation(operationId: OperationId): unknown;
}
export interface LifecycleInspection<T> {
    readonly aggregate: T;
    readonly store_revision: number;
    readonly legal_next: readonly string[];
}
export interface TaskCycleObligation {
    readonly id: string;
    readonly status: 'PENDING' | 'SATISFIED';
    readonly authority_ref: string | null;
}
export interface TaskCycleAggregate {
    readonly id: string;
    readonly revision: number;
    readonly state: string;
    readonly responsibility: string;
    readonly obligations: readonly TaskCycleObligation[];
    readonly authority_refs: readonly Reference[];
    readonly related_ids: readonly string[];
    readonly terminal_disposition_ref: string | null;
    readonly last_event_id: string | null;
    readonly [key: string]: unknown;
}
export interface ExecutionAttemptAggregate {
    readonly id: string;
    readonly revision: number;
    readonly state: string;
    readonly operation_id: string;
    readonly reconciliation_required: boolean;
    readonly [key: string]: unknown;
}
export interface LifecycleMutationResult {
    readonly revision: number;
    readonly event_id: string;
    readonly aggregate_revision: number;
    readonly kind: string;
    readonly aggregate_id: string;
}
export interface TaskCycleLifecycleSnapshot {
    readonly revision: number;
    readonly event_count: number;
    readonly taskcycle: TaskCycleAggregate;
    readonly legal_next: readonly string[];
    readonly obligations: Readonly<{
        id: string;
        store_revision: number;
        obligations: readonly TaskCycleObligation[];
        pending: readonly string[];
        legal_next: readonly string[];
    }>;
}
export interface InvocationBookkeepingSnapshot {
    readonly revision: number;
    readonly operation: OperationAggregate;
    readonly attempt: ExecutionAttemptAggregate;
}
export interface ExecutionLifecycleCapability {
    observeOperation(operationId: OperationId | string): LifecycleInspection<OperationAggregate>;
    observeAttemptPresence(attemptId: ExecutionAttemptId | string): AttemptPresence;
    prepareAttempt(input: Readonly<{
        attemptId: ExecutionAttemptId;
        operationId: OperationId;
        authorityRefs: readonly Reference[];
    }>): Readonly<{
        operation: LifecycleInspection<OperationAggregate>;
        attempt: LifecycleInspection<ExecutionAttemptAggregate>;
    }>;
    confirmDispatchStart(attemptId: ExecutionAttemptId): LifecycleInspection<ExecutionAttemptAggregate>;
    recordPreflightTerminalOutcome(input: Readonly<{
        attemptId: ExecutionAttemptId;
        operationId: OperationId;
        status: Exclude<RecipePreflight['status'], 'READY'>;
        receipt: RecipeReceipt;
        resultRefs: readonly Reference[];
    }>): Record<string, unknown>;
    recordExecutionOutcome(input: Readonly<{
        attemptId: ExecutionAttemptId;
        operationId: OperationId;
        coordinatorOutcome: ExecutionOutcome;
        receipt: RecipeReceipt;
        resultRefs: readonly Reference[];
    }>): Record<string, unknown>;
}
export interface TaskCycleLifecycleCapability {
    snapshot(taskcycleId: string): TaskCycleLifecycleSnapshot;
    observeInvocationBookkeeping(operationId: string, attemptId: string): InvocationBookkeepingSnapshot;
    hasUnreconciledExecution(taskcycleId: string): boolean;
    satisfyObligation(input: Readonly<{
        expectedRevision: number;
        taskcycleId: string;
        obligationId: string;
        authorityRef?: string;
        authorityReference?: Reference;
    }>): LifecycleMutationResult;
    closeTaskCycle(input: Readonly<{
        expectedRevision: number;
        taskcycleId: string;
        authorityRef: string;
        dispositionRef: string;
    }>): LifecycleMutationResult;
}
export declare function requireExecutionLifecycleCapability(value: unknown): ExecutionLifecycleCapability;
export declare function requireTaskCycleLifecycleCapability(value: unknown): TaskCycleLifecycleCapability;
