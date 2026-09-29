---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TOF-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-001-PLAN
artifact_kind: TASK_PLAN
owner: tecnotron-ai
scope: Local execution strategy for MATERIALIZE_STABLE_RECIPE_INVOCATION_ENTRYPOINT_AND_EXECUTION_SURFACE_RESOLUTION
revision: "1.0"
authority_refs:
  - ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-20260929
    revision: "2026-09-29"
relations:
  - relation: executes
    target:
      ref: TOF-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-001
      revision: "1.0"
---

# Local PLAN: PRE-WU02 TC2 Stable Recipe Invocation

This PLAN executes only the bounded TASK and preserves all existing Recipe, State Kernel, Coordinator and lifecycle ownership.

## Sequence and Gates

1. Bind to the released TC1 baseline, verify exact local/remote/tree/clean identities, read the fresh State Kernel revision, create the exact persistent TaskCycle, and transition `READY -> ACTIVE` on the competent Linux mutation surface.
2. Freeze the smallest current-source boundary before edits. Do not reopen TC1 architecture or rediscover prematerialized reconciliation facts.
3. Add runtime-validated outer invocation/environment/result contracts and a finite execution-capability vocabulary in strict TypeScript.
4. Add deterministic surface resolution with `SELECTED`, `UNAVAILABLE`, `BLOCKED`, and `AMBIGUOUS`; more than one conforming match is fail-closed ambiguity, not a preference rule.
5. Add one stable Product entrypoint that internally assembles the exact built-in Recipe, Registry, ExecutionPlan, Coordinator, record store, State Kernel adapter and runtime context. Semantic callers provide Recipe identity, existing Operation reference, responsibility/authority references, expected effects, evidence and Recipe-specific semantic inputs only.
6. Add native Node and replaceable Linux-node launch adapters. The current Docker adapter is only a Linux execution vehicle and is never encoded as a Recipe requirement.
7. Preserve one-attempt semantics. After surface dispatch, malformed/missing/contradictory result evidence becomes `UNKNOWN` whenever the exact absence of a durable attempt cannot be established. Never relaunch another surface.
8. Persist plan/receipt through the existing execution record store and persist outer invocation diagnostics/result as supplementary artifacts. RecipeReceipt remains effect authority; process exit code never establishes PASS.
9. Validate typecheck/build, focused contracts/resolver/entrypoint tests, real native Linux Recipe invocation, malformed request/result handling, one-attempt/no-fallback/UNKNOWN behavior, current Recipe regressions and full Linux regression.
10. Satisfy only IMPLEMENTATION and VALIDATION after exact evidence exists. Leave all later TaskCycle obligations pending.
11. Freeze one coherent candidate commit rooted at `397ce92d501b6710f2033c5060c3e3790dff46ba`, verify exact tree/paths/clean worktree, and materialize `IND-REVIEW-TECNOTRON-PRE-WU02-TC2-STABLE-RECIPE-INVOCATION-001` via `materialize_frozen_review_interface@v0` without running Independent Review.
12. Produce the external result artifact and stop at `TC2_PHASE1_FROZEN_READY_FOR_INDEPENDENT_REVIEW` or one exact authorized blocker disposition.

## Validation

- `npm run typecheck`
- `npm run build`, repeated with clean generated correspondence
- `npm run test:recipe-invocation`
- existing Recipe tests for integrate/reconcile/materialize/render through the normal full suite
- `npm run contracts:check`
- `npm run workspace:verify`
- Linux `npm test` for the durable State Kernel boundary
- real shipped `render_current_state@v0` through the new stable entrypoint on a competent native Linux surface
- real `materialize_frozen_review_interface@v0` through the stable entrypoint at review-freeze time if non-circular and competent

No Independent Review, acceptance, Phase 2, integration/publication or WU02 effect is performed by this PLAN.
