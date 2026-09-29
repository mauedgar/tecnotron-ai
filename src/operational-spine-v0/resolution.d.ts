import { type Capability, type ExecutionContextInput, type ExecutionPlan as ExecutionPlanValue, type Reference } from './contracts';
import type { OperationId } from '../contracts/execution-coordination';
import type { RecipeRegistryPort } from './recipe-registry';
export interface OperationAggregate {
    readonly kind: 'Operation';
    readonly id: OperationId;
    readonly taskcycle_id: string;
    readonly [key: string]: unknown;
}
export declare function sameReference(left: Reference | undefined, right: Reference | undefined): boolean;
export declare function resolvePlanReferences(contextRefs: readonly Reference[], requestedRefs: readonly Reference[] | undefined, label: string): readonly Reference[];
export interface MaterializeExecutionPlanInput {
    readonly operation: OperationAggregate;
    readonly executionContext: ExecutionContextInput;
    readonly requiredCapabilities: readonly Capability[];
    readonly recipeRegistry: Pick<RecipeRegistryPort, 'resolve'>;
    readonly authorityRefs?: readonly Reference[];
    readonly evidenceRefs?: readonly Reference[];
}
export declare function materializeExecutionPlan({ operation, executionContext, requiredCapabilities, recipeRegistry, authorityRefs, evidenceRefs, }: MaterializeExecutionPlanInput): ExecutionPlanValue;
