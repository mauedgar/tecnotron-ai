import { z } from 'zod';
import {
  EffectDescriptor,
  RecipeDefinition,
  RecipeRequest,
  RecipeReceipt,
  type Capability,
  type EffectDescriptor as EffectDescriptorValue,
  type RecipeDefinition as RecipeDefinitionValue,
  type RecipeDefinitionInput,
  type RecipeRequest as RecipeRequestValue,
  type RecipeRequestInput,
  type RecipeReceipt as RecipeReceiptValue,
  type RecipeReceiptInput,
} from './contracts';

export type RecipePreflight =
  | { status: 'READY'; reason?: string; evidence_refs?: readonly ReferenceLike[]; handoff?: unknown }
  | { status: 'BLOCKED' | 'UNAVAILABLE' | 'CANCELLED'; reason?: string; evidence_refs?: readonly ReferenceLike[] };

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

export type RecipeResolution =
  | { resolution: 'NONE'; recipes: RecipeDefinitionValue[] }
  | { resolution: 'AMBIGUOUS'; recipes: RecipeDefinitionValue[] }
  | { resolution: 'SELECTED'; recipe: RecipeDefinitionValue };

function key(definition: Pick<RecipeDefinitionValue, 'id' | 'version'>): string {
  return `${definition.id}@${definition.version}`;
}

export function dynamicEffectProfile(rawEffects: unknown): EffectDescriptorValue[] {
  const effects = z.array(EffectDescriptor).parse(rawEffects);
  const seen = new Set<string>();
  const normalized = effects.map((descriptor) => {
    const identity = `${descriptor.effect}\u0000${descriptor.scope}`;
    if (seen.has(identity)) throw new Error(`duplicate dynamic effect descriptor: ${descriptor.effect}/${descriptor.scope}`);
    seen.add(identity);
    return descriptor;
  });
  return normalized.sort((left, right) => (
    left.effect.localeCompare(right.effect, 'en') || left.scope.localeCompare(right.scope, 'en')
  ));
}

export class RecipeRegistry {
  private readonly recipes = new Map<string, RegisteredRecipe>();

  register(recipe: RecipePort): RecipeDefinitionValue {
    if (!recipe || typeof recipe !== 'object') throw new TypeError('recipe is required');
    const definition = RecipeDefinition.parse(recipe.definition);
    if (typeof recipe.execute !== 'function') throw new TypeError('recipe.execute is required');
    if (recipe.preflight !== undefined && typeof recipe.preflight !== 'function') {
      throw new TypeError('recipe.preflight must be a function when supplied');
    }
    if (recipe.effectsForInput !== undefined && typeof recipe.effectsForInput !== 'function') {
      throw new TypeError('recipe.effectsForInput must be a function when supplied');
    }

    const registryKey = key(definition);
    if (this.recipes.has(registryKey)) throw new Error(`recipe already registered: ${registryKey}`);

    const registered: RegisteredRecipe = {
      definition,
      preflight: recipe.preflight ?? (async () => ({ status: 'READY' as const })),
      execute: recipe.execute,
    };
    if (recipe.effectsForInput !== undefined) registered.effectsForInput = recipe.effectsForInput;
    this.recipes.set(registryKey, registered);
    return definition;
  }

  resolve(requiredCapabilities: readonly Capability[]): RecipeResolution {
    if (!Array.isArray(requiredCapabilities) || requiredCapabilities.length === 0) {
      throw new TypeError('requiredCapabilities must be a non-empty array');
    }
    const requested = [...new Set(requiredCapabilities)];
    const matches = [...this.recipes.values()]
      .filter(({ definition }) => requested.every((capability) => definition.provides.includes(capability)))
      .sort((left, right) => key(left.definition).localeCompare(key(right.definition), 'en'));

    if (matches.length === 0) return { resolution: 'NONE', recipes: [] };
    if (matches.length > 1) return { resolution: 'AMBIGUOUS', recipes: matches.map(({ definition }) => definition) };
    return { resolution: 'SELECTED', recipe: matches[0]!.definition };
  }

  find(recipeId: string, version?: string): RegisteredRecipe {
    const candidates = [...this.recipes.values()]
      .filter(({ definition }) => definition.id === recipeId && (version === undefined || definition.version === version));
    if (candidates.length !== 1) {
      throw new Error(candidates.length === 0
        ? `recipe not registered: ${recipeId}${version ? `@${version}` : ''}`
        : `recipe identity is ambiguous: ${recipeId}`);
    }
    return candidates[0]!;
  }

  resolveEffects(recipeId: string, version: string | undefined, input: unknown): EffectDescriptorValue[] {
    const recipe = this.find(recipeId, version);
    if (recipe.effectsForInput === undefined) return recipe.definition.effects;
    return dynamicEffectProfile(recipe.effectsForInput(input));
  }

  async preflight(rawRequest: RecipeRequestInput): Promise<RecipePreflight> {
    const request = RecipeRequest.parse(rawRequest);
    return this.find(request.recipe_id, request.recipe_version).preflight(request);
  }

  async execute(rawRequest: RecipeRequestInput): Promise<RecipeReceiptValue> {
    const request = RecipeRequest.parse(rawRequest);
    const recipe = this.find(request.recipe_id, request.recipe_version);
    const receipt = RecipeReceipt.parse(await recipe.execute(request));
    const identityMatches = receipt.recipe_id === request.recipe_id
      && receipt.recipe_version === request.recipe_version
      && receipt.operation_id === request.operation_id
      && receipt.execution_attempt_id === request.execution_attempt_id;
    if (!identityMatches) throw new Error('recipe receipt identity mismatch');
    return receipt;
  }
}

export interface RecipeRegistryPort {
  resolve(requiredCapabilities: readonly Capability[]): RecipeResolution;
  resolveEffects?(recipeId: string, version: string, input: unknown): EffectDescriptorValue[];
  preflight(rawRequest: RecipeRequestInput): Promise<RecipePreflight>;
  execute(rawRequest: RecipeRequestInput): Promise<RecipeReceiptValue>;
}
