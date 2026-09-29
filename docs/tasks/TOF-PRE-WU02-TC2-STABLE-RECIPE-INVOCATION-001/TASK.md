---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TOF-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-001
artifact_kind: TASK
owner: tecnotron-ai
scope: MATERIALIZE_STABLE_RECIPE_INVOCATION_ENTRYPOINT_AND_EXECUTION_SURFACE_RESOLUTION
revision: "1.0"
authority_refs:
  - ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-20260929
    revision: "2026-09-29"
coverage:
  kind: competent_exception
  exception_ref:
    ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-20260929
    revision: "2026-09-29"
requirement_refs:
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-20260929, revision: "2026-09-29"}
    id: RF-TC2-001
  - source: {ref: DEVLAB-TECNOTRON-PRE-WU02-RUNTIME-AND-INVOCATION-RECONCILIATION-001, revision: "2026-09-29"}
    id: RF-TC2-002
assignment_authority_ref:
  ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-20260929
  revision: "2026-09-29"
write_scope:
  - docs/tasks/TOF-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-001/TASK.md
  - docs/tasks/TOF-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-001/PLAN.md
  - package.json
  - src-typescript/operational-spine-v0/invocation-contracts.ts
  - src-typescript/operational-spine-v0/surface-resolution.ts
  - src-typescript/operational-spine-v0/recipe-invocation.ts
  - src-typescript/operational-spine-v0/recipe-invocation-worker.ts
  - src-typescript/operational-spine-v0/recipe-invocation-cli.ts
  - src/operational-spine-v0/invocation-contracts.js
  - src/operational-spine-v0/invocation-contracts.d.ts
  - src/operational-spine-v0/surface-resolution.js
  - src/operational-spine-v0/surface-resolution.d.ts
  - src/operational-spine-v0/recipe-invocation.js
  - src/operational-spine-v0/recipe-invocation.d.ts
  - src/operational-spine-v0/recipe-invocation-worker.js
  - src/operational-spine-v0/recipe-invocation-worker.d.ts
  - src/operational-spine-v0/recipe-invocation-cli.js
  - src/operational-spine-v0/recipe-invocation-cli.d.ts
  - src/operational-spine-v0/index.js
  - src/operational-spine-v0/index.d.ts
  - tests/operational-spine-v0/recipe-invocation.test.js
  - tests/operational-spine-v0/recipe-invocation-worker.test.js
  - tests/typescript/recipe-invocation.typecheck.ts
acceptance_criteria:
  - "AC-01: RecipeInvocationRequest and RecipeInvocationResult are runtime-validated and typed without exposing shell/Docker/Registry/Coordinator construction to semantic callers."
  - "AC-02: Surface requirements use a finite capability vocabulary and resolve deterministically to SELECTED, UNAVAILABLE, BLOCKED, or AMBIGUOUS with no hidden fallback."
  - "AC-03: The shipped entrypoint performs exactly one selected surface launch and never retries after dispatch."
  - "AC-04: Existing RecipeRegistry, ExecutionPlan, Coordinator, RecipeReceipt and State Kernel semantics remain owners of their existing responsibilities."
  - "AC-05: RecipeReceipt status/effect state remains authoritative; process exit code/stdout/stderr remain supplementary evidence."
  - "AC-06: Malformed or contradictory post-dispatch worker output becomes UNKNOWN when an attempt may exist and is never converted to no-effect."
  - "AC-07: Native and Linux-capable surfaces are adapters behind the same Product contract; Docker is an implementation vehicle, not a semantic requirement."
  - "AC-08: At least one real existing Recipe executes through the stable entrypoint without caller-side Registry/Coordinator composition."
  - "AC-09: Strict typecheck, deterministic build, focused invocation/surface tests, existing Recipe regression and full Linux regression pass."
  - "AC-10: State Kernel, Recipe semantics, WP-PB-001, parallel Recipe TaskCycles, Stage D and Stage E remain unchanged."
  - "AC-11: One immutable review interface is materialized for IND-REVIEW-TECNOTRON-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-001 without executing Independent Review."
relations: []
---

# TASK TOF-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-001

## Assignment

Under `DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-20260929`, materialize the smallest Product-owned stable invocation path that composes the already-accepted typed core, RecipeRegistry, Operational Spine, Execution Coordinator, Recipe execution surface and State Kernel without making the caller reconstruct that object graph or shell transport.

The TaskCycle may characterize, implement, validate, freeze one candidate, and materialize one review interface. Independent Review execution, Developer acceptance, Phase 2, canonical integration/publication, WP-PB-001 WU02/WU03, Stage-D closure and Stage-E entry are not authorized.

## Boundary Characterization

```yaml
BOUNDARY_CHARACTERIZATION:
  existing_modules_to_change:
    - package.json
    - src/operational-spine-v0/index.js
    - src/operational-spine-v0/index.d.ts
  new_modules:
    - src-typescript/operational-spine-v0/invocation-contracts.ts
    - src-typescript/operational-spine-v0/surface-resolution.ts
    - src-typescript/operational-spine-v0/recipe-invocation.ts
    - src-typescript/operational-spine-v0/recipe-invocation-worker.ts
    - src-typescript/operational-spine-v0/recipe-invocation-cli.ts
    - generated CommonJS runtime/declarations at matching src paths
  tests_to_add:
    - tests/operational-spine-v0/recipe-invocation.test.js
    - tests/operational-spine-v0/recipe-invocation-worker.test.js
    - tests/typescript/recipe-invocation.typecheck.ts
  adapters:
    - native Node launcher
    - Docker-backed Linux Node launcher behind generic Linux-capability semantics
  State_Kernel_changes_required: false
  Recipe_semantic_changes_required: false
  broader_orchestration_framework_required: false
```

The current State Kernel and Recipes are consumed through their existing public/runtime contracts. Surface selection is capability matching only. It does not select semantic responsibility, manufacture authority, or retry another surface.

## Stop Boundary

Stop on baseline drift, dirty canonical state, a required State Kernel/Recipe semantic change, unresolved surface-policy ambiguity, automatic retry/fallback requirement, broad TypeScript/framework expansion, dependency on a not-yet-canonical parallel Recipe TaskCycle, WU02/Stage-D semantics, or any unreconciled UNKNOWN effect.
