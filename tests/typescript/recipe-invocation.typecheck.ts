import {
  RecipeInvocationRequest,
  RecipeInvocationResult,
  type RecipeInvocationResult as RecipeInvocationResultValue,
} from '../../src-typescript/operational-spine-v0/invocation-contracts';
import { resolveExecutionSurface } from '../../src-typescript/operational-spine-v0/surface-resolution';

const request = RecipeInvocationRequest.parse({
  schema_version: 'tecnotron-recipe-invocation-request/v0',
  recipe: { id: 'render_current_state', version: 'v0' },
  operation_ref: 'OP-TC2',
  responsibility_ref: 'RESP-TC2',
  authority_ref: 'DEV-TC2',
  expected_effects: [{ effect: 'state.render', scope: 'none' }],
});

const resolution = resolveExecutionSurface([
  {
    id: 'native',
    adapter: 'NATIVE_NODE',
    capabilities: ['NODE_RUNTIME', 'FILESYSTEM_WRITE', 'DURABLE_DIRECTORY_FSYNC'],
    conformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:native' },
  },
], ['NODE_RUNTIME']);
if (resolution.status === 'SELECTED') resolution.selected_surface.id;

const unknown = RecipeInvocationResult.parse({
  schema_version: 'tecnotron-recipe-invocation-result/v0',
  operation_ref: request.operation_ref,
  attempt_ref: 'ATTEMPT-TC2',
  recipe: request.recipe,
  selected_surface: 'native',
  started: true,
  terminal_status: 'UNKNOWN',
  effect_state: 'UNKNOWN',
  receipt_ref: null,
  result_ref: null,
  execution_plan_ref: null,
  observed_identity: null,
  exit_code: null,
  stdout_ref: null,
  stderr_ref: null,
  terminal_artifact_ref: null,
  reason: 'ambiguous post-dispatch effect',
});
const typedUnknown: RecipeInvocationResultValue = unknown;
typedUnknown.effect_state;

// @ts-expect-error Surface capabilities are a finite Product-owned vocabulary.
resolveExecutionSurface([], ['DOCKER_REQUIRED']);

// @ts-expect-error The outer request does not expose caller-selected shell mechanics.
request.shell = 'powershell';

// @ts-expect-error terminal status is a finite discriminant.
const impossibleStatus: RecipeInvocationResultValue['terminal_status'] = 'RETRYING';
