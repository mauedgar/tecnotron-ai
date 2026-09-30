import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RecipeInvocationEnvironment,
  RecipeInvocationRequest,
  RecipeInvocationResult,
  WorkerInvocationEnvelope,
  type InvocationSurface,
  type RecipeInvocationEnvironment as RecipeInvocationEnvironmentValue,
  type RecipeInvocationEnvironmentInput,
  type RecipeInvocationRequest as RecipeInvocationRequestValue,
  type RecipeInvocationResult as RecipeInvocationResultValue,
  type WorkerInvocationEnvelope as WorkerInvocationEnvelopeValue,
} from './invocation-contracts';
import { executionRequirementsForRecipe, resolveExecutionSurface } from './surface-resolution';
import type { Reference } from './contracts';

const kernel = require('../state-kernel-v0') as {
  FilesystemStateStore: new (home: string) => unknown;
  inspect(store: unknown, kind: 'ExecutionAttempt', id: string): unknown;
};

export interface SurfaceLaunchResult {
  readonly started: boolean;
  readonly exit_code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: string;
}

export interface SurfaceLauncher {
  readonly surface_id: string;
  invoke(envelope: WorkerInvocationEnvelopeValue): SurfaceLaunchResult | Promise<SurfaceLaunchResult>;
}

export interface InvocationArtifactStore {
  saveText(kind: 'stdout' | 'stderr', id: string, data: string): Reference;
  saveResult(id: string, result: RecipeInvocationResultValue): Reference;
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function safeName(value: string): string {
  return encodeURIComponent(value).replaceAll('%', '_');
}

export class FilesystemInvocationArtifactStore implements InvocationArtifactStore {
  readonly home: string;
  readonly root: string;

  constructor(home: string) {
    this.home = path.resolve(home);
    this.root = path.join(this.home, 'artifacts', 'recipe-invocation-v0');
  }

  private save(directory: string, id: string, data: string): Reference {
    const relative = path.posix.join('artifacts', 'recipe-invocation-v0', directory, `${safeName(id)}.txt`);
    const file = path.join(this.root, directory, `${safeName(id)}.txt`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf8');
      if (existing !== data) throw new Error(`invocation artifact identity collision: ${directory}/${id}`);
    } else {
      const temp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temp, data, { flag: 'wx' });
      fs.renameSync(temp, file);
    }
    return { kind: 'ARTIFACT', id: `${directory}:${id}`, location: relative, sha256: sha256(data) };
  }

  saveText(kind: 'stdout' | 'stderr', id: string, data: string): Reference {
    return this.save(kind, id, data);
  }

  saveResult(id: string, result: RecipeInvocationResultValue): Reference {
    const data = `${JSON.stringify(result, null, 2)}\n`;
    const relative = path.posix.join('artifacts', 'recipe-invocation-v0', 'results', `${safeName(id)}.json`);
    const file = path.join(this.root, 'results', `${safeName(id)}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf8');
      if (existing !== data) throw new Error(`invocation artifact identity collision: result/${id}`);
    } else {
      const temp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temp, data, { flag: 'wx' });
      fs.renameSync(temp, file);
    }
    return { kind: 'ARTIFACT', id: `invocation-result:${id}`, location: relative, sha256: sha256(data) };
  }
}

function workerPath(): string {
  return path.join(__dirname, 'recipe-invocation-worker.js');
}

function nativeLauncher(surface: InvocationSurface, repositoryPath: string): SurfaceLauncher {
  return {
    surface_id: surface.id,
    invoke(envelope) {
      const result = spawnSync(process.execPath, [workerPath()], {
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

function underRoot(hostValue: string, root: string): string | null {
  const relative = path.relative(path.resolve(root), path.resolve(hostValue));
  if (relative === '') return '';
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return relative;
}

function mappedPath(hostValue: string, environment: RecipeInvocationEnvironmentValue): string | null {
  const repositoryRelative = underRoot(hostValue, environment.repository.location);
  if (repositoryRelative !== null) return path.posix.join('/repo', repositoryRelative.split(path.sep).join('/'));
  const stateRelative = underRoot(hostValue, environment.state_store.location);
  if (stateRelative !== null) return path.posix.join('/home', stateRelative.split(path.sep).join('/'));
  return null;
}

function looksAbsolute(value: string): boolean {
  return path.win32.isAbsolute(value) || path.posix.isAbsolute(value);
}

function translateKnownPaths(value: unknown, environment: RecipeInvocationEnvironmentValue): { value: unknown; unmapped: string[] } {
  const unmapped: string[] = [];
  function visit(current: unknown): unknown {
    if (typeof current === 'string' && looksAbsolute(current)) {
      const mapped = mappedPath(current, environment);
      if (mapped === null) {
        unmapped.push(current);
        return current;
      }
      return mapped;
    }
    if (Array.isArray(current)) return current.map(visit);
    if (current && typeof current === 'object') {
      return Object.fromEntries(Object.entries(current as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    }
    return current;
  }
  return { value: visit(value), unmapped };
}

function dockerLauncher(
  surface: Extract<InvocationSurface, { adapter: 'DOCKER_LINUX_NODE' }>,
  environment: RecipeInvocationEnvironmentValue,
): SurfaceLauncher {
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
      const workerEnvironment = RecipeInvocationEnvironment.parse({
        ...environment,
        repository: { ...environment.repository, location: '/repo' },
        state_store: { ...environment.state_store, location: '/home' },
      });
      const envelope = WorkerInvocationEnvelope.parse({
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
      const result = spawnSync('docker', args, {
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

function defaultLaunchers(environment: RecipeInvocationEnvironmentValue): Map<string, SurfaceLauncher> {
  const result = new Map<string, SurfaceLauncher>();
  for (const surface of environment.surfaces) {
    const launcher = surface.adapter === 'NATIVE_NODE'
      ? nativeLauncher(surface, environment.repository.location)
      : dockerLauncher(surface, environment);
    result.set(surface.id, launcher);
  }
  return result;
}

function prestartResult(
  request: RecipeInvocationRequestValue | null,
  terminalStatus: 'BLOCKED' | 'UNAVAILABLE' | 'AMBIGUOUS',
  reason: string,
  selectedSurface: string | null = null,
  validationIssues: string[] = [],
): RecipeInvocationResultValue {
  return RecipeInvocationResult.parse({
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

function persistResult(
  artifactStore: InvocationArtifactStore,
  invocationId: string,
  result: RecipeInvocationResultValue,
  preserveOnFailure = false,
): RecipeInvocationResultValue {
  const withoutSelf = RecipeInvocationResult.parse({ ...result, terminal_artifact_ref: null });
  try {
    const ref = artifactStore.saveResult(invocationId, withoutSelf);
    return RecipeInvocationResult.parse({ ...withoutSelf, terminal_artifact_ref: ref });
  } catch (error) {
    if (!preserveOnFailure) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    return RecipeInvocationResult.parse({
      ...withoutSelf,
      supplementary_diagnostics: [
        ...withoutSelf.supplementary_diagnostics,
        `SUPPLEMENTARY_RESULT_PERSISTENCE_FAILED:${detail}`,
      ],
    });
  }
}

function attemptWasCreated(environment: RecipeInvocationEnvironmentValue, attemptId: string): boolean | null {
  try {
    const store = new kernel.FilesystemStateStore(environment.state_store.location);
    kernel.inspect(store, 'ExecutionAttempt', attemptId);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(`missing ExecutionAttempt/${attemptId}`)) return false;
    return null;
  }
}

export interface RecipeInvocationEntrypointOptions {
  readonly launchers?: ReadonlyMap<string, SurfaceLauncher>;
  readonly artifactStore?: InvocationArtifactStore;
  readonly attemptIdFactory?: () => string;
  readonly attemptObserver?: (attemptId: string) => boolean | null;
}

export function createRecipeInvocationEntrypoint(
  rawEnvironment: RecipeInvocationEnvironmentInput,
  options: RecipeInvocationEntrypointOptions = {},
) {
  const environment = RecipeInvocationEnvironment.parse(rawEnvironment);
  const launchers = options.launchers ?? defaultLaunchers(environment);
  const artifactStore = options.artifactStore ?? new FilesystemInvocationArtifactStore(environment.state_store.location);
  const attemptIdFactory = options.attemptIdFactory ?? (() => `ATTEMPT-${crypto.randomUUID()}`);
  const attemptObserver = options.attemptObserver ?? ((attemptId: string) => attemptWasCreated(environment, attemptId));

  async function invoke(rawRequest: unknown): Promise<RecipeInvocationResultValue> {
    const parsedRequest = RecipeInvocationRequest.safeParse(rawRequest);
    if (!parsedRequest.success) {
      const result = prestartResult(
        null,
        'BLOCKED',
        'INVALID_RECIPE_INVOCATION_REQUEST',
        null,
        parsedRequest.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`),
      );
      return persistResult(artifactStore, `invalid-${crypto.randomUUID()}`, result);
    }
    const request = parsedRequest.data;
    const requirements = executionRequirementsForRecipe(
      request.recipe,
      request.inputs,
      request.execution_constraints.require,
    );
    if (!requirements) {
      return persistResult(
        artifactStore,
        `blocked-${crypto.randomUUID()}`,
        prestartResult(request, 'BLOCKED', 'RECIPE_REQUIREMENTS_UNDEFINED'),
      );
    }

    const resolution = resolveExecutionSurface(environment.surfaces, requirements);
    if (resolution.status !== 'SELECTED') {
      return persistResult(
        artifactStore,
        `resolution-${crypto.randomUUID()}`,
        prestartResult(request, resolution.status, resolution.reason!),
      );
    }

    const surface = resolution.selected_surface!;
    const launcher = launchers.get(surface.id);
    if (!launcher || launcher.surface_id !== surface.id) {
      return persistResult(
        artifactStore,
        `blocked-${crypto.randomUUID()}`,
        prestartResult(request, 'BLOCKED', 'SELECTED_SURFACE_LAUNCHER_UNAVAILABLE', surface.id),
      );
    }

    const attemptId = attemptIdFactory();
    const envelope = WorkerInvocationEnvelope.parse({
      schema_version: 'tecnotron-recipe-invocation-worker-envelope/v0',
      request,
      attempt_ref: attemptId,
      environment,
      selected_surface: surface,
    });
    const launch = await launcher.invoke(envelope);
    if (!launch.started) {
      return persistResult(
        artifactStore,
        attemptId,
        prestartResult(request, 'UNAVAILABLE', launch.error || 'SELECTED_SURFACE_DID_NOT_START', surface.id),
      );
    }

    let stdoutRef: Reference | null = null;
    let stderrRef: Reference | null = null;
    try {
      stdoutRef = artifactStore.saveText('stdout', attemptId, launch.stdout);
      stderrRef = artifactStore.saveText('stderr', attemptId, launch.stderr);
    } catch {
    }

    let workerResult: RecipeInvocationResultValue | null = null;
    try {
      workerResult = RecipeInvocationResult.parse(JSON.parse(launch.stdout.trim()));
    } catch {
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
      let observed: boolean | null = null;
      try {
        observed = attemptObserver(attemptId);
      } catch {
        observed = null;
      }
      const ambiguous = observed !== false;
      const result = RecipeInvocationResult.parse({
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

    const enriched = RecipeInvocationResult.parse({
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
