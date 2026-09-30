import {
  ExecutionCapability,
  InvocationSurface,
  SurfaceResolution,
  type ExecutionCapability as ExecutionCapabilityValue,
  type InvocationSurface as InvocationSurfaceValue,
  type RecipeIdentity,
  type SurfaceResolution as SurfaceResolutionValue,
} from './invocation-contracts';

function normalizedCapabilities(capabilities: readonly ExecutionCapabilityValue[]): ExecutionCapabilityValue[] {
  return [...new Set(capabilities)].sort();
}

function hasCapabilities(surface: InvocationSurfaceValue, required: readonly ExecutionCapabilityValue[]): boolean {
  const offered = new Set(surface.capabilities);
  return required.every((capability) => offered.has(capability));
}

export function resolveExecutionSurface(
  rawSurfaces: readonly InvocationSurfaceValue[],
  rawRequiredCapabilities: readonly ExecutionCapabilityValue[],
): SurfaceResolutionValue {
  const surfaces = rawSurfaces.map((surface) => InvocationSurface.parse(surface));
  const required = normalizedCapabilities(rawRequiredCapabilities.map((capability) => ExecutionCapability.parse(capability)));
  const matching = surfaces.filter((surface) => hasCapabilities(surface, required));
  if (matching.length === 0) {
    return SurfaceResolution.parse({
      status: 'UNAVAILABLE',
      required_capabilities: required,
      selected_surface: null,
      matching_surface_ids: [],
      reason: 'NO_REGISTERED_SURFACE_SATISFIES_REQUIREMENTS',
    });
  }

  const conforming = matching.filter((surface) => surface.conformance.disposition === 'CONFORMING');
  if (conforming.length === 0) {
    return SurfaceResolution.parse({
      status: 'BLOCKED',
      required_capabilities: required,
      selected_surface: null,
      matching_surface_ids: matching.map((surface) => surface.id).sort(),
      reason: 'MATCHING_SURFACES_ARE_NOT_CONFORMING',
    });
  }

  if (conforming.length > 1) {
    return SurfaceResolution.parse({
      status: 'AMBIGUOUS',
      required_capabilities: required,
      selected_surface: null,
      matching_surface_ids: conforming.map((surface) => surface.id).sort(),
      reason: 'MULTIPLE_CONFORMING_SURFACES_SATISFY_REQUIREMENTS',
    });
  }

  return SurfaceResolution.parse({
    status: 'SELECTED',
    required_capabilities: required,
    selected_surface: conforming[0],
    matching_surface_ids: [conforming[0]!.id],
  });
}

const BASE_DURABLE_ATTEMPT_REQUIREMENTS: readonly ExecutionCapabilityValue[] = [
  'NODE_RUNTIME',
  'FILESYSTEM_WRITE',
  'DURABLE_DIRECTORY_FSYNC',
];

export function executionRequirementsForRecipe(
  recipe: RecipeIdentity,
  input: unknown,
  additional: readonly ExecutionCapabilityValue[] = [],
): ExecutionCapabilityValue[] | null {
  if (recipe.version !== 'v0') return null;
  const required = new Set<ExecutionCapabilityValue>(BASE_DURABLE_ATTEMPT_REQUIREMENTS);

  switch (recipe.id) {
    case 'render_current_state':
      break;
    case 'materialize_frozen_review_interface':
      required.add('REPOSITORY_ACCESS');
      required.add('CHILD_PROCESS');
      break;
    case 'integrate_accepted_candidate': {
      required.add('REPOSITORY_ACCESS');
      required.add('CHILD_PROCESS');
      const candidateInput = input as { remote?: unknown } | null | undefined;
      if (candidateInput && typeof candidateInput === 'object' && candidateInput.remote !== undefined) {
        required.add('NETWORK_REMOTE_GIT');
      }
      break;
    }
    case 'reconcile_and_close_taskcycle':
      break;
    case 'prepare_fitflow_test_runtime':
    case 'validate_fitflow_http_contract_candidate':
      required.add('REPOSITORY_ACCESS');
      required.add('CHILD_PROCESS');
      break;
    default:
      return null;
  }

  for (const capability of additional) required.add(ExecutionCapability.parse(capability));
  return normalizedCapabilities([...required]);
}
