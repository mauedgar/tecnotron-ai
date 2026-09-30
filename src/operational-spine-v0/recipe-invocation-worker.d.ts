import { type RecipeInvocationResult as RecipeInvocationResultValue, type WorkerInvocationEnvelope as WorkerInvocationEnvelopeValue } from './invocation-contracts';
export declare function workerExceptionResult(envelope: WorkerInvocationEnvelopeValue, reason: string, observeAttempt: (attemptId: string) => boolean | null): RecipeInvocationResultValue;
export declare function runWorkerInvocation(rawEnvelope: unknown): Promise<RecipeInvocationResultValue>;
