---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-WP-ULC-GITHUB-FIRST-CIRCUIT-001
artifact_kind: WP_PLAN
owner: tecnotron-ai
scope: QUALIFY_FIRST_PROMOTED_GITHUB_OPERATIONAL_CIRCUIT
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
    id: RF-GH-003
  - source: {ref: DEVELOPER-CONTROL-004-GITHUB-FIRST-CIRCUIT-AUTHORIZATION-2026-10-08, revision: "2026-10-08"}
    id: RF-GH-004
relations: []
---

# Upper LC — First GitHub Operational Circuit: bounded planning

## Competent authorization and promotion

Developer explicitly authorized `TECNOTRON_CONTROL_004` (successor of Control 003) on **2026-10-08** to admit, plan and select the minimum Product work for the first GitHub operational circuit, and to initialize the first competent TaskCycle if unambiguous. Original Developer request remains the authority; this document is a planning projection.

Promoted Product objective: `TECNOTRON-UPPER-LC-GITHUB-FIRST-CIRCUIT-2026-10-08-001`.
Promoted operational item: `https://github.com/mauedgar/tecnotron-ai/issues/30`.
Promotion decision: `TECNOTRON-CONTROL-004-GITHUB-FIRST-CIRCUIT-ADMISSION-2026-10-08-001`.
Original Product baseline: `mauedgar/tecnotron-ai:tools@5e72795b4e65cd943372fc4a099f8233b31c99a3`, tree `ddd7bffd2b0be6be67355ab586ff4b5234b99c43`.

Issue #30 carries operational intent and links to the original decision; its creation does **not** establish Project `Backlog` field correspondence, readiness, execution authority or TaskCycle identity. Existing issue #1 is unrelated and was not promoted.

## Derived bounded requirements (for coverage navigation)

- **RF-GH-001:** Establish one actual promoted Product work item with exact authority, identity, evidence, scope and GitHub correlation without silent admission or duplicates.
- **RF-GH-002:** Qualify GitHub Issues/Projects projection of `Backlog`, `Ready` and dependencies; `Ready` only from competent Control readiness decision and satisfied dependencies, never Issue existence.
- **RF-GH-003:** Competently correlate selection, TaskCycle lifecycle, validation/review/acceptance, and authorized Post-Close to operational status transitions, without GitHub semantic authority.
- **RF-GH-004:** Preserve Upper LC and TC Core gates, exact effects `NONE/CONFIRMED/UNKNOWN`, deterministic idempotence, source identity and bounded feedback; stop on material mapping/permission/authority blocker.

These IDs index the Developer's already authorized scope. They are not a synthetic approved SPEC or expansion of the original decision. The original message and GitHub promotion receipt must remain resolvable at execution.

## Adaptive planning / minimal decomposition

### Task A — SELECTED for kernel-free TaskCycle initialization

`TASKCYCLE-TECNOTRON-GITHUB-FIRST-CIRCUIT-PROJECTION-001`

Responsibility `QUALIFY_PROMOTED_GITHUB_WORK_ITEM_PROJECTION_AND_READINESS_BOUNDARY`.

Owns RF-GH-001/002 and only the prerequisites of RF-GH-004 needed for these. Inspect existing `src/adapters/github.js` and current GitHub provider binding first (reuse-before-build). Qualification must be empirical: observe actual #30; establish idempotent issue correlation and a truthful `Backlog` projection status; prove the `Ready` dependency/authority guard with deterministic fixtures and, where authorized and accessible, provider observations. No manufactured `Ready`, no silent Project-field write, no unsafe live mutation. If Project access/field mapping is missing, report exact `BLOCKED_EXTERNAL` and return to Control for disposition. Thin adaptation only where existing composition demonstrably fails.

### Task B — NOT SELECTED; dependent on Task A

Responsibility candidate `QUALIFY_GITHUB_LIFECYCLE_AND_POSTCLOSE_PROJECTION_FOR_REAL_BOUNDED_RESPONSIBILITY`.

Owns remaining RF-GH-003/004. Only after Task A evidence and separate competent selection, consume a real selected bounded responsibility and qualify `In Progress`, `Review`, authorized Phase 2 reconciliation, Post-Close eligibility and `Done` or explicit no-op. Do not create Task B/TaskCycle automatically.

## Independence and DevLab observational gate for Task A

At `PENDING_INDEPENDENT_REVIEW` after the exact frozen input has been materialized **and integrity-verified**, suspend canonical lifecycle progression.

1. In the Task A execution chat, conduct one experimental read-only semantic assessment using **only** the frozen exact candidate and its declared evidence. Do not treat implementation conversation, prior reasoning or non-frozen sources as evidence.
2. Emit and durably preserve its untouched original `PASS`, `FAIL` or `BLOCKED` report, all findings and isolation limitations **before** consulting any external review or previous comparison results.
3. Stop. Hand Developer the immutable frozen input ID, candidate/tree and digest to launch the fresh separate-chat canonical Independent Review.
4. No comparison/reconciliation until both original reports are fixed. Internal assessment is noncanonical observational DevLab evidence only; no Developer acceptance, Phase 2, Product effect or TC Core modification. Ordinary independent-review/acceptance/effect gates remain required.

This observational pilot is not an additional mandatory TC Core gate, and any experiment finding is not auto-promoted.

## Exclusions and stop gates

- No issue #1 adoption; no issue-exists → Ready; no board auto-launch.
- No generic orchestrator, second planning authority, State Kernel disposition, TC Core reopen, feedback platform, Milestone creation or experimental findings auto-promotion.
- No promised ready query without qualified provider mapping; no claim of GitHub Projects access absent observed evidence.
- Control remains `TECNOTRON_CONTROL_004`; Product semantics reside in repository SOT and competent Developer decisions, not this unintegrated planning branch.
- Separate candidate validation, frozen review, canonical fresh Independent Review, Developer acceptance, Phase 2 and logical Post-Close remain intact.

## Next work

Materialize Task A on the same isolated carrier; verify exact carrier commit/tree and perform qualified kernel-free initialization once. Stop at `PHASE1_IMPLEMENT_BOUNDED_CANDIDATE`; Phase 1 work requires its own execution handling and may not overwrite historical initialization.
