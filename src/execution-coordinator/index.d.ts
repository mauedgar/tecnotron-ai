import { type ExecutionAttemptRequest as ExecutionAttemptRequestValue, type ExecutionAttemptRequestInput, type ExecutionOutcome as ExecutionOutcomeValue, type ExecutionOutcomeInput } from '../contracts/execution-coordination';
export interface ExecutionSurfacePort {
    execute(request: Readonly<ExecutionAttemptRequestValue>): ExecutionOutcomeInput | Promise<ExecutionOutcomeInput>;
}
export interface ExecutionCoordinatorPort {
    execute(rawRequest: ExecutionAttemptRequestInput): Promise<ExecutionOutcomeValue>;
    runAttempt(rawRequest: ExecutionAttemptRequestInput): Promise<ExecutionOutcomeValue>;
}
export declare function createExecutionCoordinator({ executionSurface, }: {
    readonly executionSurface: ExecutionSurfacePort | null | undefined;
}): ExecutionCoordinatorPort;
