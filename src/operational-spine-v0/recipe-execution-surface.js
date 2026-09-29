"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coordinatorEvidence = coordinatorEvidence;
exports.createRecipeExecutionSurface = createRecipeExecutionSurface;
const contracts_1 = require("./contracts");
function coordinatorEvidence(refs) {
    return refs.map((ref) => ({ kind: ref.kind.toLowerCase(), ref: ref.id }));
}
function errorDetails(error) {
    const record = error !== null && (typeof error === 'object' || typeof error === 'function')
        ? error
        : undefined;
    return {
        error_name: record?.name || 'Error',
        error_message: record?.message || String(error),
    };
}
function createRecipeExecutionSurface({ recipeRegistry, }) {
    if (!recipeRegistry || typeof recipeRegistry.execute !== 'function')
        throw new TypeError('recipeRegistry is required');
    return {
        async execute(coordinatorRequest) {
            const input = coordinatorRequest.input;
            const rawRecipeRequest = input?.recipe_request;
            let receipt;
            try {
                receipt = contracts_1.RecipeReceipt.parse(await recipeRegistry.execute(rawRecipeRequest));
            }
            catch (error) {
                const rawIdentity = rawRecipeRequest;
                receipt = contracts_1.RecipeReceipt.parse({
                    schema_version: 'tecnotron-recipe-receipt/v0',
                    receipt_ref: `recipe-receipt:${coordinatorRequest.execution_attempt_id}:execution-error`,
                    recipe_id: (rawIdentity?.recipe_id || 'unknown-recipe'),
                    recipe_version: (rawIdentity?.recipe_version || 'unknown-version'),
                    operation_id: coordinatorRequest.operation_id,
                    execution_attempt_id: coordinatorRequest.execution_attempt_id,
                    status: 'UNKNOWN',
                    effect_state: 'UNKNOWN',
                    reason: 'RECIPE_EXECUTION_EXCEPTION_AFTER_DISPATCH',
                    output: errorDetails(error),
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
                case 'PASS': return { ...common, status: 'SUCCESS' };
                case 'FAIL': return { ...common, status: 'FAILED', reason: receipt.reason };
                case 'CANCELLED': return { ...common, status: 'CANCELLED', reason: receipt.reason };
                case 'UNKNOWN': return { ...common, status: 'UNKNOWN', reason: receipt.reason };
                case 'BLOCKED':
                case 'UNAVAILABLE': {
                    const normalizedReceipt = contracts_1.RecipeReceipt.parse({
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
            }
        },
    };
}
