import { type GitExecutionQualificationResult as GitExecutionQualificationResultValue, type RecipeInvocationResult as RecipeInvocationResultValue, type WorkerInvocationEnvelope as WorkerInvocationEnvelopeValue } from './invocation-contracts';
import type { ExecutionLifecycleCapability, TaskCycleLifecycleCapability } from './taskcycle-lifecycle-capability';
export interface RecipeInvocationBinding {
    readonly executionLifecycle: ExecutionLifecycleCapability;
    readonly taskcycleLifecycle: TaskCycleLifecycleCapability;
    renderState(): string;
}
export interface RunWorkerInvocationOptions {
    readonly binding?: RecipeInvocationBinding;
}
export declare function workerExceptionResult(envelope: WorkerInvocationEnvelopeValue, reason: string, observeAttempt: (attemptId: string) => boolean | null, gitQualification?: GitExecutionQualificationResultValue | null): RecipeInvocationResultValue;
export declare function runWorkerInvocation(rawEnvelope: unknown, options?: RunWorkerInvocationOptions): Promise<RecipeInvocationResultValue>;
