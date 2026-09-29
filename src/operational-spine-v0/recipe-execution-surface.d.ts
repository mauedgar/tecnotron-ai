import { type EvidenceRef, type ExecutionAttemptRequest, type ExecutionOutcome } from '../contracts/execution-coordination';
import { type Reference } from './contracts';
import type { RecipeRegistryPort } from './recipe-registry';
export declare function coordinatorEvidence(refs: readonly Reference[]): EvidenceRef[];
export interface RecipeExecutionSurfacePort {
    execute(coordinatorRequest: Readonly<ExecutionAttemptRequest>): Promise<ExecutionOutcome>;
}
export declare function createRecipeExecutionSurface({ recipeRegistry, }: {
    readonly recipeRegistry: Pick<RecipeRegistryPort, 'execute'>;
}): RecipeExecutionSurfacePort;
