import { type ExecutionCapability as ExecutionCapabilityValue, type InvocationSurface as InvocationSurfaceValue, type RecipeIdentity, type SurfaceResolution as SurfaceResolutionValue } from './invocation-contracts';
export declare function resolveExecutionSurface(rawSurfaces: readonly InvocationSurfaceValue[], rawRequiredCapabilities: readonly ExecutionCapabilityValue[]): SurfaceResolutionValue;
export declare function executionRequirementsForRecipe(recipe: RecipeIdentity, input: unknown, additional?: readonly ExecutionCapabilityValue[]): ExecutionCapabilityValue[] | null;
