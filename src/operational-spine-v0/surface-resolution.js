"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveExecutionSurface = resolveExecutionSurface;
exports.executionRequirementsForRecipe = executionRequirementsForRecipe;
const invocation_contracts_1 = require("./invocation-contracts");
function normalizedCapabilities(capabilities) {
    return [...new Set(capabilities)].sort();
}
function hasCapabilities(surface, required) {
    const offered = new Set(surface.capabilities);
    return required.every((capability) => offered.has(capability));
}
function resolveExecutionSurface(rawSurfaces, rawRequiredCapabilities) {
    const surfaces = rawSurfaces.map((surface) => invocation_contracts_1.InvocationSurface.parse(surface));
    const required = normalizedCapabilities(rawRequiredCapabilities.map((capability) => invocation_contracts_1.ExecutionCapability.parse(capability)));
    const matching = surfaces.filter((surface) => hasCapabilities(surface, required));
    if (matching.length === 0) {
        return invocation_contracts_1.SurfaceResolution.parse({
            status: 'UNAVAILABLE',
            required_capabilities: required,
            selected_surface: null,
            matching_surface_ids: [],
            reason: 'NO_REGISTERED_SURFACE_SATISFIES_REQUIREMENTS',
        });
    }
    const conforming = matching.filter((surface) => surface.conformance.disposition === 'CONFORMING');
    if (conforming.length === 0) {
        return invocation_contracts_1.SurfaceResolution.parse({
            status: 'BLOCKED',
            required_capabilities: required,
            selected_surface: null,
            matching_surface_ids: matching.map((surface) => surface.id).sort(),
            reason: 'MATCHING_SURFACES_ARE_NOT_CONFORMING',
        });
    }
    if (conforming.length > 1) {
        return invocation_contracts_1.SurfaceResolution.parse({
            status: 'AMBIGUOUS',
            required_capabilities: required,
            selected_surface: null,
            matching_surface_ids: conforming.map((surface) => surface.id).sort(),
            reason: 'MULTIPLE_CONFORMING_SURFACES_SATISFY_REQUIREMENTS',
        });
    }
    return invocation_contracts_1.SurfaceResolution.parse({
        status: 'SELECTED',
        required_capabilities: required,
        selected_surface: conforming[0],
        matching_surface_ids: [conforming[0].id],
    });
}
const BASE_DURABLE_ATTEMPT_REQUIREMENTS = [
    'NODE_RUNTIME',
    'FILESYSTEM_WRITE',
    'DURABLE_DIRECTORY_FSYNC',
];
function executionRequirementsForRecipe(recipe, input, additional = []) {
    if (recipe.version !== 'v0')
        return null;
    const required = new Set(BASE_DURABLE_ATTEMPT_REQUIREMENTS);
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
            const candidateInput = input;
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
    for (const capability of additional)
        required.add(invocation_contracts_1.ExecutionCapability.parse(capability));
    return normalizedCapabilities([...required]);
}
