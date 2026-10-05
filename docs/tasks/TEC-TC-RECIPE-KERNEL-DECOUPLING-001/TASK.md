---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-RECIPE-KERNEL-DECOUPLING-001
artifact_kind: TASK
owner: tecnotron-ai
scope: DECOUPLE_TASKCYCLE_RECIPE_PATH_FROM_STATE_KERNEL
revision: "1.0"
authority_refs:
  - ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005
    revision: "2026-10-05"
coverage:
  kind: competent_exception
  exception_ref:
    ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005
    revision: "2026-10-05"
requirement_refs:
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005, revision: "2026-10-05"}
    id: RF-KD-001
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005, revision: "2026-10-05"}
    id: RF-KD-002
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005, revision: "2026-10-05"}
    id: RF-KD-003
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005, revision: "2026-10-05"}
    id: RF-KD-004
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005, revision: "2026-10-05"}
    id: RF-KD-005
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005, revision: "2026-10-05"}
    id: RF-KD-006
  - source: {ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005, revision: "2026-10-05"}
    id: RF-KD-007
assignment_authority_ref:
  ref: DEVELOPER-AUTHORIZE-TECNOTRON-DECOUPLE-TASKCYCLE-RECIPE-PATH-FROM-STATE-KERNEL-20261005
  revision: "2026-10-05"
write_scope:
  - docs/tasks/TEC-TC-RECIPE-KERNEL-DECOUPLING-001/TASK.md
  - src-typescript/operational-spine-v0/core.ts
  - src-typescript/operational-spine-v0/recipe-invocation.ts
  - src-typescript/operational-spine-v0/recipe-invocation-worker.ts
  - src-typescript/operational-spine-v0/invocation-contracts.ts
  - src-typescript/operational-spine-v0/taskcycle-lifecycle-capability.ts
  - src/operational-spine-v0/core.js
  - src/operational-spine-v0/core.d.ts
  - src/operational-spine-v0/recipe-invocation.js
  - src/operational-spine-v0/recipe-invocation.d.ts
  - src/operational-spine-v0/recipe-invocation-worker.js
  - src/operational-spine-v0/recipe-invocation-worker.d.ts
  - src/operational-spine-v0/invocation-contracts.js
  - src/operational-spine-v0/invocation-contracts.d.ts
  - src/operational-spine-v0/taskcycle-lifecycle-capability.js
  - src/operational-spine-v0/taskcycle-lifecycle-capability.d.ts
  - src/operational-spine-v0/state-kernel-adapter.js
  - src/operational-spine-v0/recipes/reconcile-and-close-taskcycle.js
  - src/operational-spine-v0/index.js
  - src/operational-spine-v0/index.d.ts
  - tests/operational-spine-v0/reconcile-and-close-taskcycle.test.js
  - tests/operational-spine-v0/recipe-invocation.test.js
  - tests/operational-spine-v0/recipe-invocation-worker.test.js
  - tests/operational-spine-v0/taskcycle-lifecycle-capability.test.js
  - tests/typescript/recipe-invocation.typecheck.ts
acceptance_criteria:
  - "AC-01: reconcile_and_close_taskcycle depends on a TaskCycle lifecycle capability contract and has no direct import of state-kernel-v0 contracts or implementation."
  - "AC-02: OperationalSpine and stable Recipe invocation depend on portable Operation/ExecutionAttempt lifecycle capabilities rather than a StateKernel-named port or direct state-kernel-v0 inspection."
  - "AC-03: All concrete state-kernel-v0 imports and filesystem-store construction required by the legacy path are isolated behind the State Kernel compatibility adapter/binding boundary; Recipe implementations do not import State Kernel."
  - "AC-04: The extracted capability vocabulary is smaller than and semantically independent of the State Kernel API; it represents required observations, guarded mutations and effect correspondence rather than renaming Kernel methods."
  - "AC-05: Existing identity, obligation, authority/evidence correspondence, exact concurrency guard, legal-close, NONE/CONFIRMED/UNKNOWN, no-blind-retry and post-effect verification semantics remain preserved."
  - "AC-06: The current State Kernel-backed path remains conforming through the compatibility adapter and existing focused/full regressions continue to pass."
  - "AC-07: Focused tests exercise the Operational Spine and reconcile/close Recipe through a non-State-Kernel test capability implementation, proving the core no longer requires a State Kernel store or module to execute its deterministic semantics."
  - "AC-08: No State Kernel physical removal, persistence-backend migration, Restate/Temporal adoption, unrelated component cleanup, automatic TaskCycle creation or broad Operational Spine rewrite is introduced."
  - "AC-09: Strict typecheck, deterministic build, focused Operational Spine/Recipe tests and full regression pass on a competent execution surface."
  - "AC-10: One immutable candidate may later be frozen only after a separately initialized TaskCycle authorizes implementation; Independent Review, Developer acceptance and Phase 2 remain separate gates."
relations: []
---

# TASK TEC-TC-RECIPE-KERNEL-DECOUPLING-001

## Assignment

Under the Developer-selected responsibility
`DECOUPLE_TASKCYCLE_RECIPE_PATH_FROM_STATE_KERNEL`, materialize the bounded
implementation assignment required to make the active TaskCycle Recipe/invocation path
depend on portable lifecycle/execution capabilities rather than concrete State Kernel
APIs.

This TASK is materialized from the explicit Developer responsibility ruling of
2026-10-05. It is a competent-exception assignment because the upper planning/specification
architecture is deliberately not being redesigned during the current TaskCycle /
Primitive / Recipe maturation line.

The current gate authorizes **TASK materialization only**. It does not initialize a
TaskCycle and does not authorize implementation, candidate freeze, Independent Review,
Developer acceptance, Phase 2, integration, publication or close.

## Normalized bounded requirements

The following IDs are a lossless decomposition of the selected responsibility. They do not
expand the Developer ruling.

- **RF-KD-001 — Recipe lifecycle decoupling.**
  `reconcile_and_close_taskcycle` must consume a portable lifecycle capability contract,
  not `state-kernel-v0` implementation/contracts or State-Kernel-specific vocabulary.

- **RF-KD-002 — Invocation bookkeeping decoupling.**
  Operational Spine planning/execution and stable invocation must consume portable
  Operation/ExecutionAttempt lifecycle capabilities rather than a
  `StateKernelPort`-named dependency or direct Kernel inspection.

- **RF-KD-003 — Concrete binding isolation.**
  State Kernel filesystem/store construction and concrete calls required for compatibility
  must be isolated behind an adapter/binding boundary. The compatibility implementation
  may remain current; the semantic Recipe path must not know that its provider is the
  State Kernel.

- **RF-KD-004 — Capability extraction from need, not implementation shape.**
  The new contract must expose only the observations, guarded mutations and effect
  correspondence actually required by TaskCycle/Recipe execution. A 1:1 rename of
  `verify/inspect/satisfy/transition` is nonconformant.

- **RF-KD-005 — Semantic equivalence.**
  Preserve exact responsibility/Operation/ExecutionAttempt identities, obligation state,
  authority/evidence linkage, concurrency protection, legal closure, effect classification
  and the rule that unresolved/UNKNOWN effects forbid blind retry.

- **RF-KD-006 — Alternate-provider proof.**
  Focused tests must execute the decoupled core with a deterministic non-State-Kernel test
  capability implementation. This proves separation without yet choosing a new durable
  substrate.

- **RF-KD-007 — Migration boundary.**
  Physical Kernel removal, Restate/Temporal selection, persistence migration and broader
  component disposition remain out of scope.

## Observed current coupling boundary

At the canonical baseline
`20da8daac3f2758dc8c45ec5b418153ae85a20e4` /
`63da03fa77bbc834a984401d14028fb81a251d7c`:

1. `reconcile-and-close-taskcycle.js` imports a State Kernel reference schema, uses a
   State-Kernel-shaped contract, names State Kernel revisions in its input/preconditions,
   inspects TaskCycle/Operation/ExecutionAttempt aggregates and performs obligation/close
   mutations through Kernel-shaped calls.
2. `operational-spine-v0/core` names and requires `StateKernelPort` for
   Operation/ExecutionAttempt lifecycle bookkeeping.
3. `recipe-invocation.ts` directly constructs/inspects State Kernel state when resolving
   whether an attempt may have been created.
4. `recipe-invocation-worker.ts` constructs `FilesystemStateStore`, directly calls
   Kernel functions, creates closure wiring and then builds the State Kernel adapter.

These are the owned coupling points for this TASK. Other State Kernel consumers are not
implicitly in scope.

## Required implementation boundary

The future implementation TaskCycle must:

1. derive the smallest lifecycle/execution capability vocabulary from the needs above;
2. make Operational Spine and the reconcile/close Recipe consume that vocabulary;
3. isolate current State Kernel-specific translation in the compatibility binding;
4. preserve the current State Kernel path as an equivalence baseline;
5. demonstrate at least one non-State-Kernel focused test implementation;
6. preserve all current authority/effect/retry guarantees; and
7. stop before any decision about the final durable substrate.

The implementation may refine internal names and exact method partitioning inside the
declared write scope if that refinement is necessary to satisfy the acceptance criteria.
It may not widen the capability semantics or ownership boundary.

## Validation expectation

When a future TaskCycle is separately initialized, its candidate must at minimum run:

- strict TypeScript typecheck;
- deterministic build;
- focused `reconcile-and-close-taskcycle` tests;
- focused Recipe invocation/worker tests;
- focused capability-contract tests including a non-State-Kernel provider;
- existing Operational Spine regression; and
- full repository test regression on a competent execution surface.

Unavailable checks must remain `UNAVAILABLE`, never silently reported as PASS.

## Stop boundary

Stop and return to Developer control if any of the following becomes necessary:

- changing TaskCycle authority, obligation, review, acceptance or effect semantics;
- introducing a persistence/backend decision to make the decoupling work;
- physically removing State Kernel;
- selecting Restate, Temporal or another durable runtime;
- widening into unrelated Operational Spine/component cleanup;
- inventing automatic TaskCycle creation or planner/executor architecture;
- changing code outside the declared write scope;
- relaxing UNKNOWN/no-blind-retry behavior;
- or proceeding without a separately authorized TaskCycle.

## Next gate

```yaml
next_gate:
  id: INITIALIZE_TASKCYCLE_FOR_TEC_TC_RECIPE_KERNEL_DECOUPLING_001
  status: NOT_AUTHORIZED
```
