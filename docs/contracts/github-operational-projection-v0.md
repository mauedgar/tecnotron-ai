# GitHub operational projection v0 — bounded Task A qualification

Status: Phase 1 candidate, NOT ACCEPTED. Owner: Tecnotron Product Control for semantic admission/readiness, GitHub provider for observed operational state. This contract is confined to the selected `TASKCYCLE-TECNOTRON-GITHUB-FIRST-CIRCUIT-PROJECTION-001`; it is not a general GitHub service, and it neither supersedes TC Core nor creates Product authority.

## Real Product subject

- Integration baseline: `mauedgar/tecnotron-ai:tools@5e72795b4e65cd943372fc4a099f8233b31c99a3` (tree `ddd7bffd2b0be6be67355ab586ff4b5234b99c43`).
- Assignment: `docs/tasks/TEC-TC-GITHUB-FIRST-CIRCUIT-PROJECTION-001/TASK.md` on exact task carrier.
- Promoted operational Issue: `https://github.com/mauedgar/tecnotron-ai/issues/30`, promotion `TECNOTRON-CONTROL-004-GITHUB-FIRST-CIRCUIT-ADMISSION-2026-10-08-001`.
- Only observed real provider facts at qualification: issue #30 exists and is `open`, with the declared promotion identity in its body. GitHub Projects item membership, field IDs, option IDs and actual `Backlog` value are **NOT_VERIFIED**. Project `Ready` is **NOT_DECIDED**. No Project-field write authorized.

## Thin reuse/adaptation

Legacy `GitHubAdapter.syncIssue`, `syncProjectMacrostate`, PR and checks operations remain unchanged. Their old contract must not be mistaken for this new qualified path; in particular, `syncProjectMacrostate` does not reobserve after its update. The new `observePromotedIssue` and `evaluateOperationalReady` are read-only decision guards. `reconcileOperationalMacrostate` is an opt-in, provider-normalized boundary with a separate explicit write grant; it is NOT connected to actual GitHub Projects by this Task A candidate.

The caller must provide an exact `operationId`, separately competent `authorityRef`, `authorizationKind: OPERATIONAL_PROJECTION`, `writeAuthorized: true`, exact Issue URL, Project/item/field IDs, observed status option mapping, `mappingVerified: true`, an exact `observationRef`, an expected prior status option ID (optimistic drift guard), and desired `Backlog` or `Ready`. A `Ready` projection additionally needs a matching eligible assessment and its distinct readiness authority. These values are inputs, never inferred from the Issue or fabricated by the adapter.

The normalized provider client must expose `getProjectItem(itemId)` returning exact `id`, `issueUrl`, `projectId`, `statusFieldId`, `statusOptionId`; authorized writes use `updateProjectItem(itemId, {statusFieldId,statusOptionId})`. A real GitHub Projects GraphQL client or field mapping is **not implemented or qualified** here. This is an interface contract for a competent provider binding, not an assertion that the GitHub connector exposes Projects v2.

## Effect states

- `NONE`: missing authority/capability/mapping, identity drift before effect, or exact no-op after read; no write attempted.
- `CONFIRMED`: write attempted AND subsequent independent provider read matches exact Issue/Project/item/field/desired option.
- `UNKNOWN`: any update exception or failed/mismatching post-effect read. **No automatic retry**; reconcile current provider state and the operation identity before a later authorized action. A changed option since the declared pre-observation blocks before writing (unless it already equals the desired option).

Readiness requires exact competent `READY_GRANTED` decision for this Issue; verified and correlated Project Backlog/Ready observation with actual IDs; complete declared dependency inventory with every dependency satisfied and no duplicates. `Ready` eligibility never launches work, initializes a TaskCycle, grants acceptance, or maps `CLOSED_PASS` to `Done`. No `Done` projection is in Task A scope.

## Qualification limits

- Synthetic deterministic fixtures demonstrate the guard, no-op, diff, effect reconciliation and fail-closed behavior; they do **not** demonstrate actual GitHub Projects read/write conformance, permissions, immutable field mapping, or cross-request idempotency in a provider implementation.
- The currently connected GitHub interface does not offer Projects v2 item/field methods; live provider mapping, membership, `Backlog` observation and safe writable Project fixture are `BLOCKED_EXTERNAL / NOT_QUALIFIED` for this execution surface.
- Real Product Project state is unchanged; Issue #1 is untouched; no second Product Issue, Milestone, broader adapter or new Product authority is created.
- This candidate may undergo independent semantic review as a *partial bounded qualification with a disclosed external blocker*, not a provider PASS. Any future live provider binding qualification needs its own competent disposition and exact evidence.
