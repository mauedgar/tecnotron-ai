'use strict';

const {
  RecipeReceipt,
} = require('./contracts');

function coordinatorEvidence(refs) {
  return refs.map((ref) => ({
    kind: ref.kind.toLowerCase(),
    ref: ref.id,
  }));
}

function createRecipeExecutionSurface({ recipeRegistry }) {
  if (!recipeRegistry || typeof recipeRegistry.execute !== 'function') {
    throw new TypeError('recipeRegistry is required');
  }

  return {
    async execute(coordinatorRequest) {
      const rawRecipeRequest = coordinatorRequest.input?.recipe_request;

      let receipt;
      try {
        receipt = RecipeReceipt.parse(await recipeRegistry.execute(rawRecipeRequest));
      } catch (error) {
        // This surface is invoked only after the Operational Spine has moved the
        // ExecutionAttempt through DISPATCHED/RUNNING. An exception here cannot
        // be safely rewritten as a pre-start failure because an effect may have
        // occurred before the exception became observable.
        receipt = RecipeReceipt.parse({
          schema_version: 'tecnotron-recipe-receipt/v0',
          receipt_ref: `recipe-receipt:${coordinatorRequest.execution_attempt_id}:execution-error`,
          recipe_id: rawRecipeRequest?.recipe_id || 'unknown-recipe',
          recipe_version: rawRecipeRequest?.recipe_version || 'unknown-version',
          operation_id: coordinatorRequest.operation_id,
          execution_attempt_id: coordinatorRequest.execution_attempt_id,
          status: 'UNKNOWN',
          effect_state: 'UNKNOWN',
          reason: 'RECIPE_EXECUTION_EXCEPTION_AFTER_DISPATCH',
          output: {
            error_name: error && error.name ? error.name : 'Error',
            error_message: error && error.message ? error.message : String(error),
          },
          result_refs: [],
          evidence_refs: [],
        });
      }

      const common = {
        operation_id: coordinatorRequest.operation_id,
        execution_attempt_id: coordinatorRequest.execution_attempt_id,
        started: true,
        result: receipt,
        evidence_refs: coordinatorEvidence(receipt.evidence_refs),
      };

      switch (receipt.status) {
        case 'PASS':
          return { ...common, status: 'SUCCESS' };
        case 'FAIL':
          return { ...common, status: 'FAILED', reason: receipt.reason };
        case 'CANCELLED':
          return { ...common, status: 'CANCELLED', reason: receipt.reason };
        case 'UNKNOWN':
          return { ...common, status: 'UNKNOWN', reason: receipt.reason };
        case 'BLOCKED':
        case 'UNAVAILABLE': {
          // These are legitimate preflight statuses. If a recipe returns one
          // after dispatch while asserting effect_state=NONE, normalize the
          // lifecycle-compatible post-dispatch result to explicit failure.
          const normalizedReceipt = RecipeReceipt.parse({
            ...receipt,
            status: 'FAIL',
            reason: `POST_DISPATCH_${receipt.status}:${receipt.reason}`,
          });
          return {
            ...common,
            status: 'FAILED',
            reason: normalizedReceipt.reason,
            result: normalizedReceipt,
            evidence_refs: coordinatorEvidence(normalizedReceipt.evidence_refs),
          };
        }
        default:
          return {
            ...common,
            status: 'UNKNOWN',
            reason: 'UNSUPPORTED_RECIPE_RECEIPT_STATUS_AFTER_DISPATCH',
          };
      }
    },
  };
}

module.exports = {
  createRecipeExecutionSurface,
  coordinatorEvidence,
};
