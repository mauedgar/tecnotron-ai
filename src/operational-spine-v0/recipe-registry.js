'use strict';

const { z } = require('zod');
const {
  EffectDescriptor,
  RecipeDefinition,
  RecipeRequest,
  RecipeReceipt,
} = require('./contracts');

function key(definition) {
  return `${definition.id}@${definition.version}`;
}

function dynamicEffectProfile(rawEffects) {
  const effects = z.array(EffectDescriptor).parse(rawEffects);
  const seen = new Set();
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

class RecipeRegistry {
  constructor() {
    this.recipes = new Map();
  }

  register(recipe) {
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
    if (this.recipes.has(registryKey)) {
      throw new Error(`recipe already registered: ${registryKey}`);
    }

    this.recipes.set(registryKey, {
      definition,
      preflight: recipe.preflight || (async () => ({ status: 'READY' })),
      execute: recipe.execute,
      effectsForInput: recipe.effectsForInput,
    });
    return definition;
  }

  resolve(requiredCapabilities) {
    if (!Array.isArray(requiredCapabilities) || requiredCapabilities.length === 0) {
      throw new TypeError('requiredCapabilities must be a non-empty array');
    }
    const requested = [...new Set(requiredCapabilities)];
    const matches = [...this.recipes.values()]
      .filter(({ definition }) => requested.every((capability) => definition.provides.includes(capability)))
      .sort((left, right) => key(left.definition).localeCompare(key(right.definition), 'en'));

    if (matches.length === 0) {
      return { resolution: 'NONE', recipes: [] };
    }
    if (matches.length > 1) {
      return { resolution: 'AMBIGUOUS', recipes: matches.map(({ definition }) => definition) };
    }
    return { resolution: 'SELECTED', recipe: matches[0].definition };
  }

  find(recipeId, version) {
    const candidates = [...this.recipes.values()]
      .filter(({ definition }) => definition.id === recipeId && (version === undefined || definition.version === version));
    if (candidates.length !== 1) {
      throw new Error(candidates.length === 0
        ? `recipe not registered: ${recipeId}${version ? `@${version}` : ''}`
        : `recipe identity is ambiguous: ${recipeId}`);
    }
    return candidates[0];
  }

  resolveEffects(recipeId, version, input) {
    const recipe = this.find(recipeId, version);
    if (recipe.effectsForInput === undefined) return recipe.definition.effects;
    return dynamicEffectProfile(recipe.effectsForInput(input));
  }

  async preflight(rawRequest) {
    const request = RecipeRequest.parse(rawRequest);
    const recipe = this.find(request.recipe_id, request.recipe_version);
    return recipe.preflight(request);
  }

  async execute(rawRequest) {
    const request = RecipeRequest.parse(rawRequest);
    const recipe = this.find(request.recipe_id, request.recipe_version);
    const receipt = RecipeReceipt.parse(await recipe.execute(request));

    const identityMatches = (
      receipt.recipe_id === request.recipe_id &&
      receipt.recipe_version === request.recipe_version &&
      receipt.operation_id === request.operation_id &&
      receipt.execution_attempt_id === request.execution_attempt_id
    );
    if (!identityMatches) {
      throw new Error('recipe receipt identity mismatch');
    }

    return receipt;
  }
}

module.exports = {
  RecipeRegistry,
  dynamicEffectProfile,
};
