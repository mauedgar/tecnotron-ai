---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TOF-PRE-WU02-TC1-TYPESCRIPT-RECIPE-CONTRACT-CORE-001
artifact_kind: TASK
owner: tecnotron-ai
scope: ESTABLISH_BOUNDED_TYPESCRIPT_STRICT_RECIPE_INVOCATION_CONTRACT_CORE
revision: "1.0"
authority_refs:
  - ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC1-TYPESCRIPT-CORE-20260929
    revision: "2026-09-29"
coverage:
  kind: competent_exception
  exception_ref:
    ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC1-TYPESCRIPT-CORE-20260929
    revision: "2026-09-29"
requirement_refs:
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC1-TYPESCRIPT-CORE-20260929, revision: "2026-09-29"}
    id: RF-TC1-001
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC1-TYPESCRIPT-CORE-20260929, revision: "2026-09-29"}
    id: RNF-TC1-001
assignment_authority_ref:
  ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC1-TYPESCRIPT-CORE-20260929
  revision: "2026-09-29"
write_scope:
  - docs/tasks/TOF-PRE-WU02-TC1-TYPESCRIPT-RECIPE-CONTRACT-CORE-001/TASK.md
  - docs/tasks/TOF-PRE-WU02-TC1-TYPESCRIPT-RECIPE-CONTRACT-CORE-001/PLAN.md
  - package.json
  - package-lock.json
  - tsconfig.build.json
  - tsconfig.typecheck.json
  - src-typescript/contracts/execution-coordination.ts
  - src-typescript/operational-spine-v0/contracts.ts
  - src-typescript/operational-spine-v0/recipe-registry.ts
  - src-typescript/operational-spine-v0/resolution.ts
  - src-typescript/operational-spine-v0/core.ts
  - src-typescript/operational-spine-v0/recipe-execution-surface.ts
  - src-typescript/operational-spine-v0/execution-record-store.ts
  - src-typescript/execution-coordinator/index.ts
  - src/contracts/execution-coordination.js
  - src/contracts/execution-coordination.d.ts
  - src/contracts/index.d.ts
  - src/contracts/package.json
  - src/contracts/validate-package.js
  - src/operational-spine-v0/contracts.js
  - src/operational-spine-v0/contracts.d.ts
  - src/operational-spine-v0/recipe-registry.js
  - src/operational-spine-v0/recipe-registry.d.ts
  - src/operational-spine-v0/resolution.js
  - src/operational-spine-v0/resolution.d.ts
  - src/operational-spine-v0/core.js
  - src/operational-spine-v0/core.d.ts
  - src/operational-spine-v0/index.js
  - src/operational-spine-v0/index.d.ts
  - src/operational-spine-v0/recipe-execution-surface.js
  - src/operational-spine-v0/recipe-execution-surface.d.ts
  - src/operational-spine-v0/execution-record-store.js
  - src/operational-spine-v0/execution-record-store.d.ts
  - src/execution-coordinator/index.js
  - src/execution-coordinator/index.d.ts
  - scripts/workspace/verify.js
  - tests/typescript/recipe-contract-core.typecheck.ts
  - tests/contracts/package-modes.test.js
acceptance_criteria:
  - "AC-01: The candidate remains one commit rooted at the exact authorized tools baseline."
  - "AC-02: Only the characterized contract/composition island is authored in strict TypeScript."
  - "AC-03: Operation and attempt identities, requests and receipts, plans and observed outcomes remain statically distinct."
  - "AC-04: PASS, FAIL, BLOCKED, UNAVAILABLE, CANCELLED, UNKNOWN and effect-state invariants preserve runtime semantics."
  - "AC-05: Zod remains the runtime validation authority and exported TypeScript types derive from schemas where applicable."
  - "AC-06: Emitted CommonJS JavaScript remains the Node runtime path; no per-invocation TypeScript transpilation is introduced."
  - "AC-07: Existing Recipes, State Kernel, adapters, Recipe behavior, one-attempt semantics and UNKNOWN preservation remain unchanged."
  - "AC-08: Strict typecheck, deterministic build, focused tests, public export checks and full regression pass."
  - "AC-09: TC2, WP-PB-001 WU02/WU03, Stage-D closure, Stage-E entry and broad TypeScript migration remain out of scope."
  - "AC-10: One frozen review interface is materialized without executing Independent Review."
relations: []
---

# TASK TOF-PRE-WU02-TC1-TYPESCRIPT-RECIPE-CONTRACT-CORE-001

## Assignment

Under `DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC1-TYPESCRIPT-CORE-20260929`,
establish only the smallest coherent strict-TypeScript contractual and
composition core needed by a later stable Recipe invocation entrypoint. The
selected Product direction is the accepted reconciliation
`DEVLAB-TECNOTRON-PRE-WU02-RUNTIME-AND-INVOCATION-RECONCILIATION-001`, path 3;
this TASK references that decision without promoting it into architecture.

The authorized phase includes characterization, implementation, deterministic
validation, candidate freeze, and review-interface materialization. It does not
authorize Independent Review, Developer acceptance, canonical integration,
publication, Phase 2, TC2, WU02/WU03, Stage-D closure, or Stage-E entry.

## Boundary Characterization

```yaml
BOUNDARY_CHARACTERIZATION:
  required_existing_modules:
    - src/contracts/execution-coordination.js
    - src/operational-spine-v0/contracts.js
    - src/operational-spine-v0/recipe-registry.js
    - src/operational-spine-v0/resolution.js
    - src/operational-spine-v0/index.js
    - src/operational-spine-v0/recipe-execution-surface.js
    - src/operational-spine-v0/execution-record-store.js
    - src/execution-coordinator/index.js
  required_new_support_files:
    - strict TypeScript sources mirroring the seven migrated runtime modules
    - one extracted typed Operational Spine composition core
    - generated declarations and bounded TypeScript build configuration
    - CommonJS/public declaration facades
  required_test_changes:
    - compile-time negative assertions for central impossible states
    - public CommonJS, ESM and declaration correspondence
  required_package_changes:
    - exact TypeScript and Node declaration dev dependencies
    - typecheck, build and focused-test scripts
    - declaration metadata for @tecnotron-ai/contracts
  required_build_config:
    - strict no-emit typecheck
    - deterministic CommonJS JavaScript and declaration emission
  exact_reason_for_each_included_module:
    execution-coordination: shared Zod/runtime boundary for one-attempt coordinator requests and outcomes
    operational-contracts: Recipe request, receipt, plan, context and effect invariant authority
    recipe-registry: typed injected Recipe port and deterministic selection/execution boundary
    resolution: typed plan discriminant producer and authority/evidence containment
    operational-spine-index: preserve the existing barrel while extracting only composition logic
    recipe-execution-surface: explicit receipt-to-observed-outcome translation and UNKNOWN preservation
    execution-record-store: typed persistence port for plans and receipts
    execution-coordinator: typed one-attempt invocation boundary without routing or substitution
  broader_migration_required: false
```

The existing Recipe implementations, State Kernel, adapters and reconciliation
runtime remain JavaScript behind typed structural ports. The Operational Spine
barrel remains a CommonJS compatibility facade so its Recipe exports and their
current collision/order behavior are not redesigned in TC1.

## Semantic Boundary

TC1 encodes only current invariants. It preserves `FAILED` before or after a
confirmed start, preflight as a pre-dispatch boundary, post-dispatch ambiguity
as `UNKNOWN`, current evidence conversion, static/dynamic effect behavior, and
the existing JSON persistence domain. Those observed limitations are not
silently normalized. Any implementation need that requires new behavior stops
for control.

## Stop Boundary

Stop on baseline drift, unexpected dirty state, broad migration, incompatible
CommonJS runtime, Product-semantic change, stable invocation implementation,
State Kernel/Recipe/WP-PB-001 behavior change, unresolved semantic ambiguity,
review Recipe mismatch, or unreconciled UNKNOWN effect. Otherwise stop at
`TC1_PHASE1_FROZEN_READY_FOR_INDEPENDENT_REVIEW`.
