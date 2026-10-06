"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesystemInvocationArtifactStore = void 0;
exports.createRecipeInvocationEntrypoint = createRecipeInvocationEntrypoint;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const invocation_contracts_1 = require("./invocation-contracts");
const surface_resolution_1 = require("./surface-resolution");
const { createStateKernelCompatibilityBinding } = require('./state-kernel-adapter');
function sha256(data) {
    return node_crypto_1.default.createHash('sha256').update(data).digest('hex');
}
function safeName(value) {
    return encodeURIComponent(value).replaceAll('%', '_');
}
class FilesystemInvocationArtifactStore {
    home;
    root;
    constructor(home) {
        this.home = node_path_1.default.resolve(home);
        this.root = node_path_1.default.join(this.home, 'artifacts', 'recipe-invocation-v0');
    }
    save(directory, id, data) {
        const relative = node_path_1.default.posix.join('artifacts', 'recipe-invocation-v0', directory, `${safeName(id)}.txt`);
        const file = node_path_1.default.join(this.root, directory, `${safeName(id)}.txt`);
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
        if (node_fs_1.default.existsSync(file)) {
            const existing = node_fs_1.default.readFileSync(file, 'utf8');
            if (existing !== data)
                throw new Error(`invocation artifact identity collision: ${directory}/${id}`);
        }
        else {
            const temp = `${file}.${process.pid}.tmp`;
            node_fs_1.default.writeFileSync(temp, data, { flag: 'wx' });
            node_fs_1.default.renameSync(temp, file);
        }
        return { kind: 'ARTIFACT', id: `${directory}:${id}`, location: relative, sha256: sha256(data) };
    }
    saveText(kind, id, data) {
        return this.save(kind, id, data);
    }
    saveResult(id, result) {
        const data = `${JSON.stringify(result, null, 2)}\n`;
        const relative = node_path_1.default.posix.join('artifacts', 'recipe-invocation-v0', 'results', `${safeName(id)}.json`);
        const file = node_path_1.default.join(this.root, 'results', `${safeName(id)}.json`);
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
        if (node_fs_1.default.existsSync(file)) {
            const existing = node_fs_1.default.readFileSync(file, 'utf8');
            if (existing !== data)
                throw new Error(`invocation artifact identity collision: result/${id}`);
        }
        else {
            const temp = `${file}.${process.pid}.tmp`;
            node_fs_1.default.writeFileSync(temp, data, { flag: 'wx' });
            node_fs_1.default.renameSync(temp, file);
        }
        return { kind: 'ARTIFACT', id: `invocation-result:${id}`, location: relative, sha256: sha256(data) };
    }
}
exports.FilesystemInvocationArtifactStore = FilesystemInvocationArtifactStore;
function workerPath() {
    return node_path_1.default.join(__dirname, 'recipe-invocation-worker.js');
}
function nativeLauncher(surface, repositoryPath) {
    return {
        surface_id: surface.id,
        invoke(envelope) {
            const result = (0, node_child_process_1.spawnSync)(process.execPath, [workerPath()], {
                cwd: repositoryPath,
                input: JSON.stringify(envelope),
                encoding: 'utf8',
                shell: false,
                windowsHide: true,
                maxBuffer: 16 * 1024 * 1024,
            });
            return {
                started: result.error === undefined,
                exit_code: result.status,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                ...(result.error ? { error: result.error.message } : {}),
            };
        },
    };
}
function underRoot(hostValue, root) {
    const relative = node_path_1.default.relative(node_path_1.default.resolve(root), node_path_1.default.resolve(hostValue));
    if (relative === '')
        return '';
    if (relative.startsWith('..') || node_path_1.default.isAbsolute(relative))
        return null;
    return relative;
}
function mappedPath(hostValue, environment) {
    const repositoryRelative = underRoot(hostValue, environment.repository.location);
    if (repositoryRelative !== null)
        return node_path_1.default.posix.join('/repo', repositoryRelative.split(node_path_1.default.sep).join('/'));
    const stateRelative = underRoot(hostValue, environment.state_store.location);
    if (stateRelative !== null)
        return node_path_1.default.posix.join('/home', stateRelative.split(node_path_1.default.sep).join('/'));
    return null;
}
function looksAbsolute(value) {
    return node_path_1.default.win32.isAbsolute(value) || node_path_1.default.posix.isAbsolute(value);
}
function translateKnownPaths(value, environment) {
    const unmapped = [];
    function visit(current) {
        if (typeof current === 'string' && looksAbsolute(current)) {
            const mapped = mappedPath(current, environment);
            if (mapped === null) {
                unmapped.push(current);
                return current;
            }
            return mapped;
        }
        if (Array.isArray(current))
            return current.map(visit);
        if (current && typeof current === 'object') {
            return Object.fromEntries(Object.entries(current).map(([key, child]) => [key, visit(child)]));
        }
        return current;
    }
    return { value: visit(value), unmapped };
}
function dockerLauncher(surface, environment) {
    return {
        surface_id: surface.id,
        invoke(rawEnvelope) {
            const translated = translateKnownPaths(rawEnvelope.request.inputs, environment);
            if (translated.unmapped.length > 0) {
                return {
                    started: false,
                    exit_code: null,
                    stdout: '',
                    stderr: '',
                    error: `UNMAPPABLE_ABSOLUTE_INPUT_PATH:${translated.unmapped[0]}`,
                };
            }
            const workerEnvironment = invocation_contracts_1.RecipeInvocationEnvironment.parse({
                ...environment,
                repository: { ...environment.repository, location: '/repo' },
                state_store: { ...environment.state_store, location: '/home' },
            });
            const envelope = invocation_contracts_1.WorkerInvocationEnvelope.parse({
                ...rawEnvelope,
                request: { ...rawEnvelope.request, inputs: translated.value },
                environment: workerEnvironment,
            });
            const args = [
                'run', '--rm', '-i',
                '-v', `${environment.repository.location}:/repo`,
                '-v', `${environment.state_store.location}:/home`,
                '-w', '/repo',
                surface.image,
                'node', 'src/operational-spine-v0/recipe-invocation-worker.js',
            ];
            const result = (0, node_child_process_1.spawnSync)('docker', args, {
                cwd: environment.repository.location,
                input: JSON.stringify(envelope),
                encoding: 'utf8',
                shell: false,
                windowsHide: true,
                maxBuffer: 16 * 1024 * 1024,
            });
            return {
                started: result.error === undefined,
                exit_code: result.status,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                ...(result.error ? { error: result.error.message } : {}),
            };
        },
    };
}
function defaultLaunchers(environment) {
    const result = new Map();
    for (const surface of environment.surfaces) {
        const launcher = surface.adapter === 'NATIVE_NODE'
            ? nativeLauncher(surface, environment.repository.location)
            : dockerLauncher(surface, environment);
        result.set(surface.id, launcher);
    }
    return result;
}
function prestartResult(request, terminalStatus, reason, selectedSurface = null, validationIssues = []) {
    return invocation_contracts_1.RecipeInvocationResult.parse({
        schema_version: 'tecnotron-recipe-invocation-result/v0',
        operation_ref: request?.operation_ref ?? null,
        attempt_ref: null,
        recipe: request?.recipe ?? null,
        selected_surface: selectedSurface,
        started: false,
        terminal_status: terminalStatus,
        effect_state: 'NONE',
        receipt_ref: null,
        result_ref: null,
        execution_plan_ref: null,
        observed_identity: null,
        exit_code: null,
        stdout_ref: null,
        stderr_ref: null,
        terminal_artifact_ref: null,
        reason,
        validation_issues: validationIssues,
    });
}
function persistResult(artifactStore, invocationId, result, preserveOnFailure = false) {
    const withoutSelf = invocation_contracts_1.RecipeInvocationResult.parse({ ...result, terminal_artifact_ref: null });
    try {
        const ref = artifactStore.saveResult(invocationId, withoutSelf);
        return invocation_contracts_1.RecipeInvocationResult.parse({ ...withoutSelf, terminal_artifact_ref: ref });
    }
    catch (error) {
        if (!preserveOnFailure)
            throw error;
        const detail = error instanceof Error ? error.message : String(error);
        return invocation_contracts_1.RecipeInvocationResult.parse({
            ...withoutSelf,
            supplementary_diagnostics: [
                ...withoutSelf.supplementary_diagnostics,
                `SUPPLEMENTARY_RESULT_PERSISTENCE_FAILED:${detail}`,
            ],
        });
    }
}
function createRecipeInvocationEntrypoint(rawEnvironment, options = {}) {
    const environment = invocation_contracts_1.RecipeInvocationEnvironment.parse(rawEnvironment);
    const launchers = options.launchers ?? defaultLaunchers(environment);
    const artifactStore = options.artifactStore ?? new FilesystemInvocationArtifactStore(environment.state_store.location);
    const attemptIdFactory = options.attemptIdFactory ?? (() => `ATTEMPT-${node_crypto_1.default.randomUUID()}`);
    const attemptLifecycle = options.attemptObserver === undefined
        ? options.attemptLifecycle
            ?? createStateKernelCompatibilityBinding({ home: environment.state_store.location }).executionLifecycle
        : null;
    const attemptObserver = options.attemptObserver ?? ((attemptId) => {
        const presence = attemptLifecycle.observeAttemptPresence(attemptId);
        if (presence === 'PRESENT')
            return true;
        if (presence === 'ABSENT')
            return false;
        return null;
    });
    async function invoke(rawRequest) {
        const parsedRequest = invocation_contracts_1.RecipeInvocationRequest.safeParse(rawRequest);
        if (!parsedRequest.success) {
            const result = prestartResult(null, 'BLOCKED', 'INVALID_RECIPE_INVOCATION_REQUEST', null, parsedRequest.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`));
            return persistResult(artifactStore, `invalid-${node_crypto_1.default.randomUUID()}`, result);
        }
        const request = parsedRequest.data;
        const requirements = (0, surface_resolution_1.executionRequirementsForRecipe)(request.recipe, request.inputs, request.execution_constraints.require);
        if (!requirements) {
            return persistResult(artifactStore, `blocked-${node_crypto_1.default.randomUUID()}`, prestartResult(request, 'BLOCKED', 'RECIPE_REQUIREMENTS_UNDEFINED'));
        }
        const resolution = (0, surface_resolution_1.resolveExecutionSurface)(environment.surfaces, requirements);
        if (resolution.status !== 'SELECTED') {
            return persistResult(artifactStore, `resolution-${node_crypto_1.default.randomUUID()}`, prestartResult(request, resolution.status, resolution.reason));
        }
        const surface = resolution.selected_surface;
        const launcher = launchers.get(surface.id);
        if (!launcher || launcher.surface_id !== surface.id) {
            return persistResult(artifactStore, `blocked-${node_crypto_1.default.randomUUID()}`, prestartResult(request, 'BLOCKED', 'SELECTED_SURFACE_LAUNCHER_UNAVAILABLE', surface.id));
        }
        const attemptId = attemptIdFactory();
        const envelope = invocation_contracts_1.WorkerInvocationEnvelope.parse({
            schema_version: 'tecnotron-recipe-invocation-worker-envelope/v0',
            request,
            attempt_ref: attemptId,
            environment,
            selected_surface: surface,
        });
        const launch = await launcher.invoke(envelope);
        if (!launch.started) {
            return persistResult(artifactStore, attemptId, prestartResult(request, 'UNAVAILABLE', launch.error || 'SELECTED_SURFACE_DID_NOT_START', surface.id));
        }
        let stdoutRef = null;
        let stderrRef = null;
        try {
            stdoutRef = artifactStore.saveText('stdout', attemptId, launch.stdout);
            stderrRef = artifactStore.saveText('stderr', attemptId, launch.stderr);
        }
        catch {
        }
        let workerResult = null;
        try {
            workerResult = invocation_contracts_1.RecipeInvocationResult.parse(JSON.parse(launch.stdout.trim()));
        }
        catch {
            workerResult = null;
        }
        if (!workerResult
            || workerResult.operation_ref !== request.operation_ref
            || workerResult.attempt_ref !== attemptId
            || workerResult.recipe?.id !== request.recipe.id
            || workerResult.recipe?.version !== request.recipe.version
            || workerResult.selected_surface !== surface.id
            || (workerResult.started && workerResult.observed_identity === null)
            || (workerResult.observed_identity !== null && workerResult.observed_identity.surface_id !== surface.id)
            || (workerResult.started && workerResult.terminal_status !== 'UNKNOWN' && workerResult.receipt === null)) {
            let observed = null;
            try {
                observed = attemptObserver(attemptId);
            }
            catch {
                observed = null;
            }
            const ambiguous = observed !== false;
            const result = invocation_contracts_1.RecipeInvocationResult.parse({
                schema_version: 'tecnotron-recipe-invocation-result/v0',
                operation_ref: request.operation_ref,
                attempt_ref: attemptId,
                recipe: request.recipe,
                selected_surface: surface.id,
                started: ambiguous,
                terminal_status: ambiguous ? 'UNKNOWN' : 'BLOCKED',
                effect_state: ambiguous ? 'UNKNOWN' : 'NONE',
                receipt_ref: null,
                result_ref: null,
                execution_plan_ref: null,
                observed_identity: null,
                exit_code: launch.exit_code,
                stdout_ref: stdoutRef,
                stderr_ref: stderrRef,
                terminal_artifact_ref: null,
                reason: ambiguous
                    ? 'WORKER_RESULT_NONCONFORMANT_AFTER_POSSIBLE_ATTEMPT'
                    : 'WORKER_RESULT_NONCONFORMANT_BEFORE_ATTEMPT',
                validation_issues: [],
            });
            return persistResult(artifactStore, attemptId, result);
        }
        const enriched = invocation_contracts_1.RecipeInvocationResult.parse({
            ...workerResult,
            exit_code: launch.exit_code,
            stdout_ref: stdoutRef,
            stderr_ref: stderrRef,
            terminal_artifact_ref: null,
        });
        return persistResult(artifactStore, attemptId, enriched, true);
    }
    return { invoke };
}
