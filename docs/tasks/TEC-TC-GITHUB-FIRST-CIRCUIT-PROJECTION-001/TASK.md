---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-GITHUB-FIRST-CIRCUIT-PROJECTION-001
artifact_kind: TASK
owner: tecnotron-ai
scope: QUALIFY_PROMOTED_GITHUB_WORK_ITEM_PROJECTION_AND_READINESS_BOUNDARY
revision: "2026-10-08-001"
authority_refs:
  - ref: DEVELOPER-CONTROL-004-GITHUB-FIRST-CIRCUIT-AUTHORIZATION-2026-10-08
    revision: "2026-10-08"
coverage:
  kind: competent_exception
  exception_ref:
    ref: DEVELOPER-CONTROL-004-GITHUB-FIRST-CIRCUIT-AUTHORIZATION-2026-10-08
    revision: "2026-10-08"
requirement_refs:
  - source: {ref: DEVELOPER-CONTROL-004-GITHUB-FIRST-CIRCUIT-AUTHORIZATION-2026-10-08, revision: "2026-10-08"}
    id: RF-GH-001
  - source: {ref: DEVELOPER-CONTROL-004-GITHUB-FIRST-CIRCUIT-AUTHORIZATION-2026-10-08, revision: "2026-10-08"}
    id: RF-GH-002
  - source: {ref: DEVELOPER-CONTROL-004-GITHUB-FIRST-CIRCUIT-AUTHORIZATION-2026-10-08, revision: "2026-10-08"}
    id: RF-GH-004
assignment_authority_ref:
  ref: DEVELOPER-CONTROL-004-GITHUB-FIRST-CIRCUIT-AUTHORIZATION-2026-10-08
  revision: "2026-10-08"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: 5e72795b4e65cd943372fc4a099f8233b31c99a3
  tree: ddd7bffd2b0be6be67355ab586ff4b5234b99c43
write_scope:
  - src/adapters/github.js
  - tests/adapters/github-operational-projection.test.js
  - docs/contracts/github-operational-projection-v0.md
acceptance_criteria:
  - "AC-GH-A01: Reobserve current tools exact commit/tree, TASK carrier identity and #30 promotion decision before any effect; fail closed on drift or conflicting Product authority."
  - "AC-GH-A02: Reuse existing src/adapters/github.js and qualified GitHub facilities before considering new mechanics or component owners. Any adapter delta remains within the explicit write scope."
  - "AC-GH-A03: Verify #30 as a single actual promoted work item with exact source-bound Product promotion; no adoption of Issue #1, no duplicate issue and no auto-promotion of findings."
  - "AC-GH-A04: Provider status Backlog and Ready are distinct from Issue open/closed; no Ready without explicit competent Product-Control decision and satisfied dependencies."
  - "AC-GH-A05: Qualify safe actual provider observations plus deterministic idempotency, intended diffs, no-op, post-effect correspondence and NONE/CONFIRMED/UNKNOWN; never blindly retry UNKNOWN."
  - "AC-GH-A06: If GitHub Projects access or field mapping is absent, identify the exact missing capability and report BLOCKED_EXTERNAL instead of simulating provider PASS or mutating production by guesswork."
  - "AC-GH-A07: Preserve all ordinary TC Core obligations with canonical independent frozen review, distinct Developer acceptance and authorized Phase 2; no kernel reopen, broad orchestration or additional Product admission."
  - "AC-GH-A08: At PENDING_INDEPENDENT_REVIEW, after materializing and verifying the frozen review interface, pause canonical lifecycle. Fix the original same-chat read-only experimental verdict from frozen evidence only, then stop and deliver frozen input identity for separate fresh-chat Independent Review. No compare before both are fixed."
relations:
  - relation: follows
    target:
      ref: docs/work-packages/tecnotron-github-first-circuit-v1/PLAN.md
      revision: "2026-10-08-001"
---

# Task A — First real GitHub operational projection qualification

## Assignment

Control `TECNOTRON_CONTROL_004`, successor of Control 003, selected exactly this TaskCycle after the Developer's bounded Product authorization on 2026-10-08:

- **TaskCycle:** `TASKCYCLE-TECNOTRON-GITHUB-FIRST-CIRCUIT-PROJECTION-001`
- **Responsibility:** `QUALIFY_PROMOTED_GITHUB_WORK_ITEM_PROJECTION_AND_READINESS_BOUNDARY`
- **Promoted Product work item:** `https://github.com/mauedgar/tecnotron-ai/issues/30`
- **Promotion reference:** `TECNOTRON-CONTROL-004-GITHUB-FIRST-CIRCUIT-ADMISSION-2026-10-08-001`.
- **WP_PLAN:** `docs/work-packages/tecnotron-github-first-circuit-v1/PLAN.md`
- **Product baseline:** `tools@5e72795b4e65cd943372fc4a099f8233b31c99a3`, tree `ddd7bffd2b0be6be67355ab586ff4b5234b99c43`.
- **Existing adapter:** `src/adapters/github.js` (observed `GitHubAdapter.syncIssue` and `syncProjectMacrostate`); this is the first reuse candidate.

This TASK is a bounded assignment, not already an initialized TaskCycle. Issue #30 is promoted operational identity, not a `Ready` or an execution authorization. Issue #1 is not part of this Product objective.

## Phase 1 scope

1. Establish actual #30 materialization/identity and qualified GitHub Issue/Projects capabilities on the available provider; preserve exact cutoffs and provenance.
2. Trace relevant existing adapter behavior, coverage and actual provider limits; add only minimal adapter-contract/test changes inside `write_scope` where a real gap requires them.
3. Distinguish GitHub Issues' `open` from qualified operational Project `Backlog/Ready` values. Prove `Ready` preconditions with deterministic fixtures and only provider observations actually authorized/available.
4. Verify exact-diff, idempotency/no-op, post-effect verification and explicit `UNKNOWN` behavior in the declared qualified provider scope. If live Project binding cannot be reached, declare `BLOCKED_EXTERNAL` and preserve diagnostic evidence; do not claim provider qualification.
5. Produce bounded consumer/qualification evidence and return to Control with limitations. Task B lifecycle transitions/Post-Close remain separately unselected.

No Product-backlog duplicate, issue #1 adoption, milestone, second state machine, generic runner, framework construction, automatic next-work selection or transfer of Product authority to GitHub.

## Mandatory lifecycle and observer pilot

Normal gates remain:
`initialization → Phase 1 → validation → exact candidate → frozen review interface → PENDING_INDEPENDENT_REVIEW → Independent Review → Developer acceptance → Phase 2 → effect reconciliation → logical close`.

The Developer additionally specified an **observational DevLab pilot** at the review boundary, without modifying gates:

- Freeze and verify the exact review interface before any semantic reviewer judgment.
- In this **same TaskCycle execution chat**, perform one read-only experimental semantic review solely from the frozen input and its explicitly listed evidence. Do not use the preceding implementation conversation as review evidence or claim technical context isolation.
- Materialize and fix the original report with its own unique review identity, verdict `PASS/FAIL/BLOCKED`, exact candidate/tree/digests, every finding and limitations. Do not consult an external reviewer report, comparator or earlier results before fixing it.
- Stop with `PENDING_INDEPENDENT_REVIEW`, giving Developer the exact frozen input locator and integrity digest for independent assessment in a fresh chat.
- The external canonical Independent Review result remains separate and must be fixed before comparing or reconciling outcomes. The same-chat report does not grant Product acceptance, Phase 2, review equivalence or Product effects.
- Never silently retry/review candidate or integrate; keep existing TC Core frozen.

## Write and no-touch

Candidate write scope is precisely the three paths in frontmatter; add no other Product path without competent authority. This TASK and WP_PLAN on its isolated carrier are planning/assignment materialization, not permission to amend unrelated Product state. Transport receipts belong to their declared evidence location and may not become normative Product SOT.

## Initial obligations

All pending until proven:
`implementation`, `promotion_grade_validation`, `exact_candidate`, `frozen_review_interface`, `independent_review`, `Developer_acceptance`, `Phase_2`, `effect_reconciliation`, `logical_close`.

## Next gate

`INITIALIZE_KERNEL_FREE_TASKCYCLE_EXACT_CARRIER` — the selected Control must reobserve exact Product and TASK carrier SHA/tree and materialize/verify one canonical kernel-free initialization projection. If this cannot be done competently, record BLOCKED rather than assert ACTIVE. After a verified initialization the next gate is `PHASE1_IMPLEMENT_BOUNDED_CANDIDATE`, not a leap to review or integration.
