import { type RecipeInvocationEnvironmentInput, type RecipeInvocationResult as RecipeInvocationResultValue, type WorkerInvocationEnvelope as WorkerInvocationEnvelopeValue } from './invocation-contracts';
import type { Reference } from './contracts';
import type { ExecutionLifecycleCapability } from './taskcycle-lifecycle-capability';
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
export declare class FilesystemInvocationArtifactStore implements InvocationArtifactStore {
    readonly home: string;
    readonly root: string;
    constructor(home: string);
    private save;
    saveText(kind: 'stdout' | 'stderr', id: string, data: string): Reference;
    saveResult(id: string, result: RecipeInvocationResultValue): Reference;
}
export interface RecipeInvocationEntrypointOptions {
    readonly launchers?: ReadonlyMap<string, SurfaceLauncher>;
    readonly artifactStore?: InvocationArtifactStore;
    readonly attemptIdFactory?: () => string;
    readonly attemptLifecycle?: Pick<ExecutionLifecycleCapability, 'observeAttemptPresence'>;
    readonly attemptObserver?: (attemptId: string) => boolean | null;
}
export declare function createRecipeInvocationEntrypoint(rawEnvironment: RecipeInvocationEnvironmentInput, options?: RecipeInvocationEntrypointOptions): {
    invoke: (rawRequest: unknown) => Promise<RecipeInvocationResultValue>;
};
