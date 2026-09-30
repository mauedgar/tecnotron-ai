import { z } from 'zod';
import { RecipeReceipt, type Reference } from './contracts';
export declare const RecipeIdentity: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strict>;
export type RecipeIdentity = z.output<typeof RecipeIdentity>;
export declare const ExecutionCapability: z.ZodEnum<{
    CHILD_PROCESS: "CHILD_PROCESS";
    DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
    FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
    LINUX_SEMANTICS: "LINUX_SEMANTICS";
    NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
    NODE_RUNTIME: "NODE_RUNTIME";
    REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
}>;
export type ExecutionCapability = z.output<typeof ExecutionCapability>;
export declare const SurfaceConformance: z.ZodObject<{
    disposition: z.ZodEnum<{
        CONFORMING: "CONFORMING";
        NONCONFORMING: "NONCONFORMING";
        UNKNOWN: "UNKNOWN";
    }>;
    evidence_ref: z.ZodString;
}, z.core.$strict>;
export type SurfaceConformance = z.output<typeof SurfaceConformance>;
export declare const NativeNodeSurface: z.ZodObject<{
    id: z.ZodString;
    capabilities: z.ZodArray<z.ZodEnum<{
        CHILD_PROCESS: "CHILD_PROCESS";
        DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
        FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
        LINUX_SEMANTICS: "LINUX_SEMANTICS";
        NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
        NODE_RUNTIME: "NODE_RUNTIME";
        REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
    }>>;
    conformance: z.ZodObject<{
        disposition: z.ZodEnum<{
            CONFORMING: "CONFORMING";
            NONCONFORMING: "NONCONFORMING";
            UNKNOWN: "UNKNOWN";
        }>;
        evidence_ref: z.ZodString;
    }, z.core.$strict>;
    adapter: z.ZodLiteral<"NATIVE_NODE">;
}, z.core.$strict>;
export type NativeNodeSurface = z.output<typeof NativeNodeSurface>;
export declare const DockerLinuxNodeSurface: z.ZodObject<{
    id: z.ZodString;
    capabilities: z.ZodArray<z.ZodEnum<{
        CHILD_PROCESS: "CHILD_PROCESS";
        DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
        FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
        LINUX_SEMANTICS: "LINUX_SEMANTICS";
        NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
        NODE_RUNTIME: "NODE_RUNTIME";
        REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
    }>>;
    conformance: z.ZodObject<{
        disposition: z.ZodEnum<{
            CONFORMING: "CONFORMING";
            NONCONFORMING: "NONCONFORMING";
            UNKNOWN: "UNKNOWN";
        }>;
        evidence_ref: z.ZodString;
    }, z.core.$strict>;
    adapter: z.ZodLiteral<"DOCKER_LINUX_NODE">;
    image: z.ZodString;
}, z.core.$strict>;
export type DockerLinuxNodeSurface = z.output<typeof DockerLinuxNodeSurface>;
export declare const InvocationSurface: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    capabilities: z.ZodArray<z.ZodEnum<{
        CHILD_PROCESS: "CHILD_PROCESS";
        DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
        FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
        LINUX_SEMANTICS: "LINUX_SEMANTICS";
        NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
        NODE_RUNTIME: "NODE_RUNTIME";
        REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
    }>>;
    conformance: z.ZodObject<{
        disposition: z.ZodEnum<{
            CONFORMING: "CONFORMING";
            NONCONFORMING: "NONCONFORMING";
            UNKNOWN: "UNKNOWN";
        }>;
        evidence_ref: z.ZodString;
    }, z.core.$strict>;
    adapter: z.ZodLiteral<"NATIVE_NODE">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    capabilities: z.ZodArray<z.ZodEnum<{
        CHILD_PROCESS: "CHILD_PROCESS";
        DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
        FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
        LINUX_SEMANTICS: "LINUX_SEMANTICS";
        NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
        NODE_RUNTIME: "NODE_RUNTIME";
        REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
    }>>;
    conformance: z.ZodObject<{
        disposition: z.ZodEnum<{
            CONFORMING: "CONFORMING";
            NONCONFORMING: "NONCONFORMING";
            UNKNOWN: "UNKNOWN";
        }>;
        evidence_ref: z.ZodString;
    }, z.core.$strict>;
    adapter: z.ZodLiteral<"DOCKER_LINUX_NODE">;
    image: z.ZodString;
}, z.core.$strict>], "adapter">;
export type InvocationSurface = z.output<typeof InvocationSurface>;
export declare const RecipeInvocationEnvironment: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-recipe-invocation-environment/v0">;
    repository: z.ZodObject<{
        identity: z.ZodString;
        location: z.ZodString;
    }, z.core.$strict>;
    state_store: z.ZodObject<{
        reference: z.ZodString;
        location: z.ZodString;
    }, z.core.$strict>;
    surfaces: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        capabilities: z.ZodArray<z.ZodEnum<{
            CHILD_PROCESS: "CHILD_PROCESS";
            DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
            FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
            LINUX_SEMANTICS: "LINUX_SEMANTICS";
            NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
            NODE_RUNTIME: "NODE_RUNTIME";
            REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
        }>>;
        conformance: z.ZodObject<{
            disposition: z.ZodEnum<{
                CONFORMING: "CONFORMING";
                NONCONFORMING: "NONCONFORMING";
                UNKNOWN: "UNKNOWN";
            }>;
            evidence_ref: z.ZodString;
        }, z.core.$strict>;
        adapter: z.ZodLiteral<"NATIVE_NODE">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        capabilities: z.ZodArray<z.ZodEnum<{
            CHILD_PROCESS: "CHILD_PROCESS";
            DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
            FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
            LINUX_SEMANTICS: "LINUX_SEMANTICS";
            NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
            NODE_RUNTIME: "NODE_RUNTIME";
            REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
        }>>;
        conformance: z.ZodObject<{
            disposition: z.ZodEnum<{
                CONFORMING: "CONFORMING";
                NONCONFORMING: "NONCONFORMING";
                UNKNOWN: "UNKNOWN";
            }>;
            evidence_ref: z.ZodString;
        }, z.core.$strict>;
        adapter: z.ZodLiteral<"DOCKER_LINUX_NODE">;
        image: z.ZodString;
    }, z.core.$strict>], "adapter">>;
}, z.core.$strict>;
export type RecipeInvocationEnvironment = z.output<typeof RecipeInvocationEnvironment>;
export type RecipeInvocationEnvironmentInput = z.input<typeof RecipeInvocationEnvironment>;
export declare const RecipeInvocationRequest: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-recipe-invocation-request/v0">;
    recipe: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strict>;
    operation_ref: z.ZodString;
    responsibility_ref: z.ZodString;
    authority_ref: z.ZodString;
    expected_effects: z.ZodArray<z.ZodObject<{
        effect: z.ZodString;
        scope: z.ZodString;
    }, z.core.$strict>>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
    inputs: z.ZodOptional<z.ZodUnknown>;
    execution_constraints: z.ZodDefault<z.ZodObject<{
        require: z.ZodDefault<z.ZodArray<z.ZodEnum<{
            CHILD_PROCESS: "CHILD_PROCESS";
            DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
            FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
            LINUX_SEMANTICS: "LINUX_SEMANTICS";
            NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
            NODE_RUNTIME: "NODE_RUNTIME";
            REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
        }>>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type RecipeInvocationRequest = z.output<typeof RecipeInvocationRequest>;
export type RecipeInvocationRequestInput = z.input<typeof RecipeInvocationRequest>;
export declare const SurfaceResolutionStatus: z.ZodEnum<{
    AMBIGUOUS: "AMBIGUOUS";
    BLOCKED: "BLOCKED";
    SELECTED: "SELECTED";
    UNAVAILABLE: "UNAVAILABLE";
}>;
export type SurfaceResolutionStatus = z.output<typeof SurfaceResolutionStatus>;
declare const SurfaceResolutionSchema: z.ZodObject<{
    status: z.ZodEnum<{
        AMBIGUOUS: "AMBIGUOUS";
        BLOCKED: "BLOCKED";
        SELECTED: "SELECTED";
        UNAVAILABLE: "UNAVAILABLE";
    }>;
    required_capabilities: z.ZodArray<z.ZodEnum<{
        CHILD_PROCESS: "CHILD_PROCESS";
        DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
        FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
        LINUX_SEMANTICS: "LINUX_SEMANTICS";
        NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
        NODE_RUNTIME: "NODE_RUNTIME";
        REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
    }>>;
    selected_surface: z.ZodNullable<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        capabilities: z.ZodArray<z.ZodEnum<{
            CHILD_PROCESS: "CHILD_PROCESS";
            DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
            FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
            LINUX_SEMANTICS: "LINUX_SEMANTICS";
            NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
            NODE_RUNTIME: "NODE_RUNTIME";
            REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
        }>>;
        conformance: z.ZodObject<{
            disposition: z.ZodEnum<{
                CONFORMING: "CONFORMING";
                NONCONFORMING: "NONCONFORMING";
                UNKNOWN: "UNKNOWN";
            }>;
            evidence_ref: z.ZodString;
        }, z.core.$strict>;
        adapter: z.ZodLiteral<"NATIVE_NODE">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        capabilities: z.ZodArray<z.ZodEnum<{
            CHILD_PROCESS: "CHILD_PROCESS";
            DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
            FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
            LINUX_SEMANTICS: "LINUX_SEMANTICS";
            NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
            NODE_RUNTIME: "NODE_RUNTIME";
            REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
        }>>;
        conformance: z.ZodObject<{
            disposition: z.ZodEnum<{
                CONFORMING: "CONFORMING";
                NONCONFORMING: "NONCONFORMING";
                UNKNOWN: "UNKNOWN";
            }>;
            evidence_ref: z.ZodString;
        }, z.core.$strict>;
        adapter: z.ZodLiteral<"DOCKER_LINUX_NODE">;
        image: z.ZodString;
    }, z.core.$strict>], "adapter">>;
    matching_surface_ids: z.ZodArray<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
type SurfaceResolutionShape = z.output<typeof SurfaceResolutionSchema>;
type SurfaceResolutionCommon = Omit<SurfaceResolutionShape, 'status' | 'selected_surface' | 'reason'>;
export type SurfaceResolution = (SurfaceResolutionCommon & {
    status: 'SELECTED';
    selected_surface: InvocationSurface;
    reason?: string;
}) | (SurfaceResolutionCommon & {
    status: 'UNAVAILABLE' | 'BLOCKED' | 'AMBIGUOUS';
    selected_surface: null;
    reason: string;
});
export type SurfaceResolutionInput = z.input<typeof SurfaceResolutionSchema>;
export declare const SurfaceResolution: z.ZodType<SurfaceResolution, SurfaceResolutionInput>;
export declare const InvocationObservedIdentity: z.ZodObject<{
    surface_id: z.ZodString;
    platform: z.ZodString;
    runtime_identity: z.ZodString;
}, z.core.$strict>;
export type InvocationObservedIdentity = z.output<typeof InvocationObservedIdentity>;
export declare const RecipeInvocationTerminalStatus: z.ZodEnum<{
    AMBIGUOUS: "AMBIGUOUS";
    BLOCKED: "BLOCKED";
    CANCELLED: "CANCELLED";
    FAIL: "FAIL";
    PASS: "PASS";
    UNAVAILABLE: "UNAVAILABLE";
    UNKNOWN: "UNKNOWN";
}>;
export type RecipeInvocationTerminalStatus = z.output<typeof RecipeInvocationTerminalStatus>;
export declare const RecipeInvocationResult: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-recipe-invocation-result/v0">;
    operation_ref: z.ZodNullable<z.ZodString>;
    attempt_ref: z.ZodNullable<z.ZodString>;
    recipe: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strict>>;
    selected_surface: z.ZodNullable<z.ZodString>;
    started: z.ZodBoolean;
    terminal_status: z.ZodEnum<{
        AMBIGUOUS: "AMBIGUOUS";
        BLOCKED: "BLOCKED";
        CANCELLED: "CANCELLED";
        FAIL: "FAIL";
        PASS: "PASS";
        UNAVAILABLE: "UNAVAILABLE";
        UNKNOWN: "UNKNOWN";
    }>;
    effect_state: z.ZodEnum<{
        CONFIRMED: "CONFIRMED";
        NONE: "NONE";
        UNKNOWN: "UNKNOWN";
    }>;
    receipt_ref: z.ZodNullable<z.ZodString>;
    receipt: z.ZodDefault<z.ZodNullable<z.ZodType<RecipeReceipt, {
        schema_version: "tecnotron-recipe-receipt/v0";
        receipt_ref: string;
        recipe_id: string;
        recipe_version: string;
        operation_id: string;
        execution_attempt_id: string;
        status: "BLOCKED" | "CANCELLED" | "FAIL" | "PASS" | "UNAVAILABLE" | "UNKNOWN";
        effect_state: "CONFIRMED" | "NONE" | "UNKNOWN";
        reason?: string | undefined;
        output?: unknown;
        result_refs?: unknown[] | undefined;
        evidence_refs?: unknown[] | undefined;
    }, z.core.$ZodTypeInternals<RecipeReceipt, {
        schema_version: "tecnotron-recipe-receipt/v0";
        receipt_ref: string;
        recipe_id: string;
        recipe_version: string;
        operation_id: string;
        execution_attempt_id: string;
        status: "BLOCKED" | "CANCELLED" | "FAIL" | "PASS" | "UNAVAILABLE" | "UNKNOWN";
        effect_state: "CONFIRMED" | "NONE" | "UNKNOWN";
        reason?: string | undefined;
        output?: unknown;
        result_refs?: unknown[] | undefined;
        evidence_refs?: unknown[] | undefined;
    }>>>>;
    result_ref: z.ZodNullable<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>;
    execution_plan_ref: z.ZodNullable<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>;
    observed_identity: z.ZodNullable<z.ZodObject<{
        surface_id: z.ZodString;
        platform: z.ZodString;
        runtime_identity: z.ZodString;
    }, z.core.$strict>>;
    exit_code: z.ZodNullable<z.ZodNumber>;
    stdout_ref: z.ZodNullable<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>;
    stderr_ref: z.ZodNullable<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>;
    terminal_artifact_ref: z.ZodNullable<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>;
    reason: z.ZodOptional<z.ZodString>;
    validation_issues: z.ZodDefault<z.ZodArray<z.ZodString>>;
    supplementary_diagnostics: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export type RecipeInvocationResult = z.output<typeof RecipeInvocationResult>;
export type RecipeInvocationResultInput = z.input<typeof RecipeInvocationResult>;
export declare const WorkerInvocationEnvelope: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-recipe-invocation-worker-envelope/v0">;
    request: z.ZodObject<{
        schema_version: z.ZodLiteral<"tecnotron-recipe-invocation-request/v0">;
        recipe: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
        }, z.core.$strict>;
        operation_ref: z.ZodString;
        responsibility_ref: z.ZodString;
        authority_ref: z.ZodString;
        expected_effects: z.ZodArray<z.ZodObject<{
            effect: z.ZodString;
            scope: z.ZodString;
        }, z.core.$strict>>;
        evidence_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
        inputs: z.ZodOptional<z.ZodUnknown>;
        execution_constraints: z.ZodDefault<z.ZodObject<{
            require: z.ZodDefault<z.ZodArray<z.ZodEnum<{
                CHILD_PROCESS: "CHILD_PROCESS";
                DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
                FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
                LINUX_SEMANTICS: "LINUX_SEMANTICS";
                NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
                NODE_RUNTIME: "NODE_RUNTIME";
                REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
            }>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    attempt_ref: z.ZodString;
    environment: z.ZodObject<{
        schema_version: z.ZodLiteral<"tecnotron-recipe-invocation-environment/v0">;
        repository: z.ZodObject<{
            identity: z.ZodString;
            location: z.ZodString;
        }, z.core.$strict>;
        state_store: z.ZodObject<{
            reference: z.ZodString;
            location: z.ZodString;
        }, z.core.$strict>;
        surfaces: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            id: z.ZodString;
            capabilities: z.ZodArray<z.ZodEnum<{
                CHILD_PROCESS: "CHILD_PROCESS";
                DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
                FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
                LINUX_SEMANTICS: "LINUX_SEMANTICS";
                NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
                NODE_RUNTIME: "NODE_RUNTIME";
                REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
            }>>;
            conformance: z.ZodObject<{
                disposition: z.ZodEnum<{
                    CONFORMING: "CONFORMING";
                    NONCONFORMING: "NONCONFORMING";
                    UNKNOWN: "UNKNOWN";
                }>;
                evidence_ref: z.ZodString;
            }, z.core.$strict>;
            adapter: z.ZodLiteral<"NATIVE_NODE">;
        }, z.core.$strict>, z.ZodObject<{
            id: z.ZodString;
            capabilities: z.ZodArray<z.ZodEnum<{
                CHILD_PROCESS: "CHILD_PROCESS";
                DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
                FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
                LINUX_SEMANTICS: "LINUX_SEMANTICS";
                NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
                NODE_RUNTIME: "NODE_RUNTIME";
                REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
            }>>;
            conformance: z.ZodObject<{
                disposition: z.ZodEnum<{
                    CONFORMING: "CONFORMING";
                    NONCONFORMING: "NONCONFORMING";
                    UNKNOWN: "UNKNOWN";
                }>;
                evidence_ref: z.ZodString;
            }, z.core.$strict>;
            adapter: z.ZodLiteral<"DOCKER_LINUX_NODE">;
            image: z.ZodString;
        }, z.core.$strict>], "adapter">>;
    }, z.core.$strict>;
    selected_surface: z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        capabilities: z.ZodArray<z.ZodEnum<{
            CHILD_PROCESS: "CHILD_PROCESS";
            DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
            FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
            LINUX_SEMANTICS: "LINUX_SEMANTICS";
            NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
            NODE_RUNTIME: "NODE_RUNTIME";
            REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
        }>>;
        conformance: z.ZodObject<{
            disposition: z.ZodEnum<{
                CONFORMING: "CONFORMING";
                NONCONFORMING: "NONCONFORMING";
                UNKNOWN: "UNKNOWN";
            }>;
            evidence_ref: z.ZodString;
        }, z.core.$strict>;
        adapter: z.ZodLiteral<"NATIVE_NODE">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        capabilities: z.ZodArray<z.ZodEnum<{
            CHILD_PROCESS: "CHILD_PROCESS";
            DURABLE_DIRECTORY_FSYNC: "DURABLE_DIRECTORY_FSYNC";
            FILESYSTEM_WRITE: "FILESYSTEM_WRITE";
            LINUX_SEMANTICS: "LINUX_SEMANTICS";
            NETWORK_REMOTE_GIT: "NETWORK_REMOTE_GIT";
            NODE_RUNTIME: "NODE_RUNTIME";
            REPOSITORY_ACCESS: "REPOSITORY_ACCESS";
        }>>;
        conformance: z.ZodObject<{
            disposition: z.ZodEnum<{
                CONFORMING: "CONFORMING";
                NONCONFORMING: "NONCONFORMING";
                UNKNOWN: "UNKNOWN";
            }>;
            evidence_ref: z.ZodString;
        }, z.core.$strict>;
        adapter: z.ZodLiteral<"DOCKER_LINUX_NODE">;
        image: z.ZodString;
    }, z.core.$strict>], "adapter">;
}, z.core.$strict>;
export type WorkerInvocationEnvelope = z.output<typeof WorkerInvocationEnvelope>;
export type WorkerInvocationEnvelopeInput = z.input<typeof WorkerInvocationEnvelope>;
export {};
