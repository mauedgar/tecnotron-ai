import { type DeterministicValidationReceipt as DeterministicValidationReceiptValue, type DeterministicValidationRequest as DeterministicValidationRequestValue, type DeterministicValidationRequestInput, type GitHubActionsExecutionRefInput } from '../contracts/deterministic-validation';
export declare const TECNOTRON_PROMOTION_PROFILE: {
    readonly id: 'tecnotron-promotion';
    readonly version: 'v0';
};
interface CommandSpec {
    readonly id: string;
    readonly command: string;
    readonly args: readonly string[];
}
export interface CommandResult {
    readonly status: 'PASS' | 'FAIL' | 'UNAVAILABLE' | 'UNKNOWN';
    readonly elapsed_ms: number;
    readonly reason?: string;
}
export interface ValidationRunnerHooks {
    readonly observeSubject: (repositoryRoot: string, repository: string) => {
        repository: string;
        commit: string;
        tree: string;
    };
    readonly executeCommand: (spec: CommandSpec, repositoryRoot: string) => CommandResult;
}
export declare function observeExactSubject(repositoryRoot: string, repository: string): {
    repository: string;
    commit: string;
    tree: string;
};
export declare function executeValidationCommand(spec: CommandSpec, repositoryRoot: string): CommandResult;
export declare function runTecnotronDeterministicValidation(rawRequest: DeterministicValidationRequestInput, execution: GitHubActionsExecutionRefInput, repositoryRoot?: string, hooks?: ValidationRunnerHooks): {
    request: DeterministicValidationRequestValue;
    receipt: DeterministicValidationReceiptValue;
    exitCode: number;
};
export declare function runCli(argv: readonly string[]): number;
export {};
