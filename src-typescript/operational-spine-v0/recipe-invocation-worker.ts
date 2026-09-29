import { spawnSync } from 'node:child_process';
import {
  RecipeInvocationResult,
  WorkerInvocationEnvelope,
  type RecipeInvocationResult as RecipeInvocationResultValue,
  type WorkerInvocationEnvelope as WorkerInvocationEnvelopeValue,
} from './invocation-contracts';
import { RecipeRegistry, type RecipePort } from './recipe-registry';
import { createOperationalSpine, type StateKernelPort } from './core';
import { createRecipeExecutionSurface } from './recipe-execution-surface';
import { FilesystemExecutionRecordStore } from './execution-record-store';
import { createExecutionCoordinator } from '../execution-coordinator';
import type { Reference } from './contracts';

interface StateStoreLike {
  verify(): { valid: boolean; revision: number; event_count: number };
}

const kernel = require('../state-kernel-v0') as {
  FilesystemStateStore: new (home: string) => StateStoreLike;
  inspect(store: StateStoreLike, kind: 'TaskCycle' | 'Operation' | 'ExecutionAttempt', id: string): any;
  obligations(store: StateStoreLike, id: string): any;
  satisfy(store: StateStoreLike, expectedRevision: number, id: string, obligationId: string, authorityRef?: string, authorityReference?: Reference): any;
  transition(store: StateStoreLike, expectedRevision: number, kind: 'TaskCycle', id: string, target: string, options?: any): any;
  render(store: StateStoreLike): string;
};

const { createStateKernelAdapter } = require('./state-kernel-adapter') as {
  createStateKernelAdapter(args: { store: StateStoreLike }): StateKernelPort;
};
const { createRenderCurrentStateRecipe } = require('./recipes/render-current-state') as {
  createRenderCurrentStateRecipe(args: { renderState: () => string }): RecipePort;
};
const { createIntegrateAcceptedCandidateRecipe } = require('./recipes/integrate-accepted-candidate') as {
  createIntegrateAcceptedCandidateRecipe(): RecipePort;
};
const { createMaterializeFrozenReviewInterfaceRecipe } = require('./recipes/materialize-frozen-review-interface') as {
  createMaterializeFrozenReviewInterfaceRecipe(): RecipePort;
};
const { createReconcileAndCloseTaskCycleRecipe } = require('./recipes/reconcile-and-close-taskcycle') as {
  createReconcileAndCloseTaskCycleRecipe(args: { stateKernel: unknown }): RecipePort;
};

function terminalBase(envelope: WorkerInvocationEnvelopeValue) {
  return {
    schema_version: 'tecnotron-recipe-invocation-result/v0' as const,
    operation_ref: envelope.request.operation_ref,
    attempt_ref: envelope.attempt_ref,
    recipe: envelope.request.recipe,
    selected_surface: envelope.selected_surface.id,
    observed_identity: {
      surface_id: envelope.selected_surface.id,
      platform: process.platform,
      runtime_identity: `node:${process.version}`,
    },
    exit_code: null,
    stdout_ref: null,
    stderr_ref: null,
    terminal_artifact_ref: null,
    validation_issues: [],
  };
}

function blocked(envelope: WorkerInvocationEnvelopeValue, reason: string): RecipeInvocationResultValue {
  return RecipeInvocationResult.parse({
    ...terminalBase(envelope),
    started: false,
    terminal_status: 'BLOCKED',
    effect_state: 'NONE',
    receipt_ref: null,
    result_ref: null,
    execution_plan_ref: null,
    reason,
  });
}

function unknown(envelope: WorkerInvocationEnvelopeValue, reason: string): RecipeInvocationResultValue {
  return RecipeInvocationResult.parse({
    ...terminalBase(envelope),
    started: true,
    terminal_status: 'UNKNOWN',
    effect_state: 'UNKNOWN',
    receipt_ref: null,
    result_ref: null,
    execution_plan_ref: null,
    reason,
  });
}

function closureKernel(store: StateStoreLike) {
  return {
    verify: () => store.verify(),
    inspectTaskCycle: (id: string) => kernel.inspect(store, 'TaskCycle', id),
    inspectOperation: (id: string) => kernel.inspect(store, 'Operation', id),
    inspectAttempt: (id: string) => kernel.inspect(store, 'ExecutionAttempt', id),
    obligations: (id: string) => kernel.obligations(store, id),
    satisfyObligation: ({ expectedRevision, taskcycleId, obligationId, authorityRef, authorityReference }: any) => (
      kernel.satisfy(store, expectedRevision, taskcycleId, obligationId, authorityRef, authorityReference)
    ),
    transitionTaskCycle: ({ expectedRevision, taskcycleId, target, authorityRef, dispositionRef }: any) => (
      kernel.transition(store, expectedRevision, 'TaskCycle', taskcycleId, target, {
        authority_ref: authorityRef,
        disposition_ref: dispositionRef,
      })
    ),
  };
}

function createBuiltinRecipe(recipeId: string, recipeVersion: string, store: StateStoreLike): RecipePort | null {
  if (recipeVersion !== 'v0') return null;
  switch (recipeId) {
    case 'render_current_state':
      return createRenderCurrentStateRecipe({ renderState: () => kernel.render(store) });
    case 'integrate_accepted_candidate':
      return createIntegrateAcceptedCandidateRecipe();
    case 'materialize_frozen_review_interface':
      return createMaterializeFrozenReviewInterfaceRecipe();
    case 'reconcile_and_close_taskcycle':
      return createReconcileAndCloseTaskCycleRecipe({ stateKernel: closureKernel(store) });
    default:
      return null;
  }
}

function gitContext(repositoryPath: string): { expected_ref: string; expected_commit: string } | undefined {
  const ref = spawnSync('git', ['symbolic-ref', '--quiet', 'HEAD'], {
    cwd: repositoryPath,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryPath,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  if (ref.status !== 0 || commit.status !== 0) return undefined;
  const expectedRef = ref.stdout.trim();
  const expectedCommit = commit.stdout.trim();
  if (!/^refs\/heads\/[A-Za-z0-9._\/-]+$/.test(expectedRef) || !/^[a-f0-9]{40,64}$/.test(expectedCommit)) return undefined;
  return { expected_ref: expectedRef, expected_commit: expectedCommit };
}

function prepareRecipeInput(envelope: WorkerInvocationEnvelopeValue): unknown {
  const raw = envelope.request.inputs;
  if (envelope.request.recipe.id !== 'materialize_frozen_review_interface') return raw;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const input = { ...(raw as Record<string, unknown>) };
  if (input.output_root === undefined) {
    const interfaceId = typeof input.interface_id === 'string' ? input.interface_id : envelope.attempt_ref;
    const path = require('node:path') as typeof import('node:path');
    input.output_root = path.join(
      envelope.environment.state_store.location,
      'artifacts',
      'review-interfaces',
      interfaceId,
    );
  }
  return input;
}

function mapSpineResult(envelope: WorkerInvocationEnvelopeValue, result: any): RecipeInvocationResultValue {
  const receipt = result?.receipt;
  const status = receipt?.status;
  if (status) {
    const terminalStatus = status as 'PASS' | 'FAIL' | 'BLOCKED' | 'UNAVAILABLE' | 'CANCELLED' | 'UNKNOWN';
    return RecipeInvocationResult.parse({
      ...terminalBase(envelope),
      started: Boolean(result?.coordinator_outcome?.started ?? (terminalStatus === 'PASS' || terminalStatus === 'FAIL' || terminalStatus === 'UNKNOWN')),
      terminal_status: terminalStatus,
      effect_state: receipt.effect_state,
      receipt_ref: receipt.receipt_ref,
      result_ref: Array.isArray(receipt.result_refs) && receipt.result_refs.length > 0 ? receipt.result_refs[0] : null,
      execution_plan_ref: result.plan_ref ?? null,
      ...(receipt.reason ? { reason: receipt.reason } : {}),
    });
  }

  if (result?.status === 'SEMANTIC_ESCALATION_REQUIRED') {
    return RecipeInvocationResult.parse({
      ...terminalBase(envelope),
      started: false,
      terminal_status: 'BLOCKED',
      effect_state: 'NONE',
      receipt_ref: null,
      result_ref: null,
      execution_plan_ref: result.plan_ref ?? null,
      reason: 'EXACT_RECIPE_DID_NOT_RESOLVE_DETERMINISTICALLY',
    });
  }

  return RecipeInvocationResult.parse({
    ...terminalBase(envelope),
    started: false,
    terminal_status: result?.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'BLOCKED',
    effect_state: 'NONE',
    receipt_ref: null,
    result_ref: null,
    execution_plan_ref: result?.plan_ref ?? null,
    reason: result?.reason || 'OPERATIONAL_SPINE_PRESTART_BLOCKED',
  });
}

function attemptExists(store: StateStoreLike, attemptId: string): boolean {
  try {
    kernel.inspect(store, 'ExecutionAttempt', attemptId);
    return true;
  } catch {
    return false;
  }
}

export async function runWorkerInvocation(rawEnvelope: unknown): Promise<RecipeInvocationResultValue> {
  const envelope = WorkerInvocationEnvelope.parse(rawEnvelope);
  const store = new kernel.FilesystemStateStore(envelope.environment.state_store.location);
  const recipe = createBuiltinRecipe(envelope.request.recipe.id, envelope.request.recipe.version, store);
  if (!recipe) return blocked(envelope, 'RECIPE_NOT_SHIPPED_BY_STABLE_ENTRYPOINT');

  const registry = new RecipeRegistry();
  const definition = registry.register(recipe);
  if (definition.id !== envelope.request.recipe.id || definition.version !== envelope.request.recipe.version) {
    return blocked(envelope, 'REGISTERED_RECIPE_IDENTITY_MISMATCH');
  }

  const stateKernel = createStateKernelAdapter({ store });
  const recipeSurface = createRecipeExecutionSurface({ recipeRegistry: registry });
  const coordinator = createExecutionCoordinator({ executionSurface: recipeSurface });
  const recordStore = new FilesystemExecutionRecordStore(envelope.environment.state_store.location);
  const spine = createOperationalSpine({
    stateKernel,
    recipeRegistry: registry,
    executionCoordinator: coordinator,
    executionRecordStore: recordStore,
  });

  const operation = kernel.inspect(store, 'Operation', envelope.request.operation_ref).aggregate;
  const observedGit = gitContext(envelope.environment.repository.location);
  const authorityRef: Reference = { kind: 'AUTHORITY', id: envelope.request.authority_ref };
  const executionContext = {
    schema_version: 'tecnotron-execution-context/v0' as const,
    operation_id: envelope.request.operation_ref,
    taskcycle_id: operation.taskcycle_id,
    repository: envelope.environment.repository,
    worktree: envelope.environment.repository,
    ...(observedGit ? { git: observedGit } : {}),
    runtime: {
      executor: 'stable-recipe-invocation',
      platform: process.platform,
      runtime_identity: `node:${process.version}`,
    },
    state_store: envelope.environment.state_store,
    authority_refs: [authorityRef],
    evidence_refs: envelope.request.evidence_refs,
  };
  const recipeInput = prepareRecipeInput(envelope);

  try {
    const plan = spine.plan({
      operationId: envelope.request.operation_ref as never,
      executionContext,
      requiredCapabilities: definition.provides,
      authorityRefs: [authorityRef],
      evidenceRefs: envelope.request.evidence_refs,
      input: recipeInput,
    });
    if (plan.resolution !== 'DETERMINISTIC_RECIPE'
      || plan.recipe.id !== envelope.request.recipe.id
      || plan.recipe.version !== envelope.request.recipe.version) {
      return blocked(envelope, 'EXACT_RECIPE_SELECTION_NOT_ESTABLISHED');
    }

    const result = await spine.executePlan(plan, {
      executionAttemptId: envelope.attempt_ref as never,
      authorization: {
        disposition: 'AUTHORIZED',
        authority_reference: envelope.request.authority_ref,
        effect_constraints: envelope.request.expected_effects,
      },
      harnessConformance: envelope.selected_surface.conformance,
      input: recipeInput,
    });
    return mapSpineResult(envelope, result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return attemptExists(store, envelope.attempt_ref)
      ? unknown(envelope, `WORKER_EXCEPTION_AFTER_ATTEMPT_CREATION:${reason}`)
      : blocked(envelope, `WORKER_EXCEPTION_BEFORE_ATTEMPT:${reason}`);
  }
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const result = await runWorkerInvocation(raw);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ code: 'WORKER_FATAL', detail: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  });
}
