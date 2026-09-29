import {
  type EvidenceRef,
  type ExecutionAttemptRequest,
  type ExecutionOutcome,
} from '../contracts/execution-coordination';
import {
  RecipeReceipt,
  type RecipeReceipt as RecipeReceiptValue,
  type Reference,
} from './contracts';
import type { RecipeRegistryPort } from './recipe-registry';

export function coordinatorEvidence(refs: readonly Reference[]): EvidenceRef[] {
  return refs.map((ref) => ({ kind: ref.kind.toLowerCase(), ref: ref.id }));
}

export interface RecipeExecutionSurfacePort {
  execute(coordinatorRequest: Readonly<ExecutionAttemptRequest>): Promise<ExecutionOutcome>;
}

function errorDetails(error: unknown): { error_name: unknown; error_message: unknown } {
  const record = error !== null && (typeof error === 'object' || typeof error === 'function')
    ? error as { name?: unknown; message?: unknown }
    : undefined;
  return {
    error_name: record?.name || 'Error',
    error_message: record?.message || String(error),
  };
}

export function createRecipeExecutionSurface({
  recipeRegistry,
}: {
  readonly recipeRegistry: Pick<RecipeRegistryPort, 'execute'>;
}): RecipeExecutionSurfacePort {
  if (!recipeRegistry || typeof recipeRegistry.execute !== 'function') throw new TypeError('recipeRegistry is required');

  return {
    async execute(coordinatorRequest) {
      const input = coordinatorRequest.input as { recipe_request?: unknown } | undefined;
      const rawRecipeRequest = input?.recipe_request;
      let receipt: RecipeReceiptValue;
      try {
        receipt = RecipeReceipt.parse(await recipeRegistry.execute(rawRecipeRequest as never));
      } catch (error) {
        const rawIdentity = rawRecipeRequest as { recipe_id?: unknown; recipe_version?: unknown } | undefined;
        receipt = RecipeReceipt.parse({
          schema_version: 'tecnotron-recipe-receipt/v0',
          receipt_ref: `recipe-receipt:${coordinatorRequest.execution_attempt_id}:execution-error`,
          recipe_id: (rawIdentity?.recipe_id || 'unknown-recipe') as string,
          recipe_version: (rawIdentity?.recipe_version || 'unknown-version') as string,
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
        started: true as const,
        result: receipt,
        evidence_refs: coordinatorEvidence(receipt.evidence_refs),
      };

      switch (receipt.status) {
        case 'PASS': return { ...common, status: 'SUCCESS' };
        case 'FAIL': return { ...common, status: 'FAILED', reason: receipt.reason! };
        case 'CANCELLED': return { ...common, status: 'CANCELLED', reason: receipt.reason! };
        case 'UNKNOWN': return { ...common, status: 'UNKNOWN', reason: receipt.reason! };
        case 'BLOCKED':
        case 'UNAVAILABLE': {
          const normalizedReceipt = RecipeReceipt.parse({
            ...receipt,
            status: 'FAIL',
            reason: `POST_DISPATCH_${receipt.status}:${receipt.reason}`,
          });
          return {
            ...common,
            status: 'FAILED',
            reason: normalizedReceipt.reason!,
            result: normalizedReceipt,
            evidence_refs: coordinatorEvidence(normalizedReceipt.evidence_refs),
          };
        }
      }
    },
  };
}
