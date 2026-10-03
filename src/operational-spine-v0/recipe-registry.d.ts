import { type Capability, type EffectDescriptor as EffectDescriptorValue, type RecipeDefinition as RecipeDefinitionValue, type RecipeDefinitionInput, type RecipeRequest as RecipeRequestValue, type RecipeRequestInput, type RecipeReceipt as RecipeReceiptValue, type RecipeReceiptInput } from './contracts';
export type RecipePreflight = {
    status: 'READY';
    reason?: string;
    evidence_refs?: readonly ReferenceLike[];
    handoff?: unknown;
} | {
    status: 'BLOCKED' | 'UNAVAILABLE' | 'CANCELLED';
    reason?: string;
    evidence_refs?: readonly ReferenceLike[];
};
interface ReferenceLike {
    kind: 'AUTHORITY' | 'EVIDENCE' | 'ARTIFACT' | 'GIT_OBJECT';
    id: string;
    location?: string;
    sha256?: string;
    git_oid?: string;
}
export interface RecipePort {
    readonly definition: RecipeDefinitionInput;
    readonly preflight?: (request: Readonly<RecipeRequestValue>) => RecipePreflight | Promise<RecipePreflight>;
    readonly execute: (request: Readonly<RecipeRequestValue>) => RecipeReceiptInput | Promise<RecipeReceiptInput>;
    readonly effectsForInput?: (input: unknown) => readonly EffectDescriptorValue[];
}
interface RegisteredRecipe {
    definition: RecipeDefinitionValue;
    preflight: (request: Readonly<RecipeRequestValue>) => RecipePreflight | Promise<RecipePreflight>;
    execute: (request: Readonly<RecipeRequestValue>) => RecipeReceiptInput | Promise<RecipeReceiptInput>;
    effectsForInput?: (input: unknown) => readonly EffectDescriptorValue[];
}
export type RecipeResolution = {
    resolution: 'NONE';
    recipes: RecipeDefinitionValue[];
} | {
    resolution: 'AMBIGUOUS';
    recipes: RecipeDefinitionValue[];
} | {
    resolution: 'SELECTED';
    recipe: RecipeDefinitionValue;
};
export declare function dynamicEffectProfile(rawEffects: unknown): EffectDescriptorValue[];
export declare class RecipeRegistry {
    private readonly recipes;
    register(recipe: RecipePort): RecipeDefinitionValue;
    resolve(requiredCapabilities: readonly Capability[]): RecipeResolution;
    find(recipeId: string, version?: string): RegisteredRecipe;
    resolveEffects(recipeId: string, version: string | undefined, input: unknown): EffectDescriptorValue[];
    preflight(rawRequest: RecipeRequestInput): Promise<RecipePreflight>;
    execute(rawRequest: RecipeRequestInput): Promise<RecipeReceiptValue>;
}
export interface RecipeRegistryPort {
    resolve(requiredCapabilities: readonly Capability[]): RecipeResolution;
    resolveEffects?(recipeId: string, version: string, input: unknown): EffectDescriptorValue[];
    preflight(rawRequest: RecipeRequestInput): Promise<RecipePreflight>;
    execute(rawRequest: RecipeRequestInput): Promise<RecipeReceiptValue>;
}
export {};
