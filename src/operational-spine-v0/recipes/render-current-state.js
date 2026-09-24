'use strict';

const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../contracts');

function createRenderCurrentStateRecipe({ renderState }) {
  const definition = RecipeDefinition.parse({
    id: 'render_current_state',
    version: 'v0',
    provides: ['state.render'],
    required_inputs: [],
    preconditions: ['State Kernel render capability is available'],
    effects: [],
    postconditions: ['current State Kernel projection is returned without mutation'],
  });

  async function preflight() {
    if (typeof renderState !== 'function') {
      return { status: 'UNAVAILABLE', reason: 'STATE_RENDERER_UNAVAILABLE' };
    }
    return { status: 'READY' };
  }

  async function execute(request) {
    let projection;
    try {
      projection = await renderState();
    } catch (error) {
      return RecipeReceipt.parse({
        schema_version: 'tecnotron-recipe-receipt/v0',
        receipt_ref: `recipe-receipt:${request.execution_attempt_id}:render-current-state`,
        recipe_id: request.recipe_id,
        recipe_version: request.recipe_version,
        operation_id: request.operation_id,
        execution_attempt_id: request.execution_attempt_id,
        status: 'FAIL',
        effect_state: 'NONE',
        reason: `STATE_RENDER_FAILED:${error?.message || String(error)}`,
        result_refs: [],
        evidence_refs: [],
      });
    }

    return RecipeReceipt.parse({
      schema_version: 'tecnotron-recipe-receipt/v0',
      receipt_ref: `recipe-receipt:${request.execution_attempt_id}:render-current-state`,
      recipe_id: request.recipe_id,
      recipe_version: request.recipe_version,
      operation_id: request.operation_id,
      execution_attempt_id: request.execution_attempt_id,
      status: 'PASS',
      effect_state: 'NONE',
      output: { projection },
      result_refs: [],
      evidence_refs: [],
    });
  }

  return { definition, preflight, execute };
}

module.exports = {
  createRenderCurrentStateRecipe,
};
