---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-REVIEW-TXT-CARRIER-ADOPTION-001
artifact_kind: TASK
owner: tecnotron-ai
scope: ADOPT_QUALIFIED_IR_TXT_PROJECTION_IN_EXISTING_FROZEN_REVIEW_RECIPE
revision: "2026-10-11-001"
authority_refs:
  - ref: DEVELOPER-TECNOTRON-REVIEW-TXT-ADOPTION-GRANT-2026-10-11
    revision: "2026-10-11"
coverage:
  kind: competent_exception
  exception_ref:
    ref: DEVELOPER-TECNOTRON-REVIEW-TXT-ADOPTION-GRANT-2026-10-11
    revision: "2026-10-11"
requirement_refs:
  - source: {ref: DEVELOPER-TECNOTRON-REVIEW-TXT-ADOPTION-GRANT-2026-10-11, revision: "2026-10-11"}
    id: RF-REVIEW-TXT-001
assignment_authority_ref:
  ref: DEVELOPER-TECNOTRON-REVIEW-TXT-ADOPTION-GRANT-2026-10-11
  revision: "2026-10-11"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: c875ef7c14ac95d8fa80f617cd36b86978290f99
  tree: 467151f16353970514d485eab0ef731052bac465
write_scope:
  - docs/tasks/TEC-TC-REVIEW-TXT-CARRIER-ADOPTION-001/TASK.md
  - scripts/review_txt_carrier.py
  - tests/review-txt-carrier/test_review_txt_carrier.py
  - src/operational-spine-v0/recipes/materialize-frozen-review-interface.js
  - tests/operational-spine-v0/materialize-frozen-review-interface.test.js
acceptance_criteria:
  - "AC-01: Preserve original materialize_frozen_review_interface@v0 TAR archive, manifest, exact Git candidate guards, create-only behavior and historical review identities."
  - "AC-02: Reuse the already-qualified IR-TXT-CARRIER/1 readable projection from ts-execution-lab@5c7d21198e878576c1d49d3e36b497dce3576ad6 without creating a second independent carrier format or general runtime."
  - "AC-03: Offer explicitly selected reviewer-facing UTF-8 TXT with verified archive/source correspondence, complete readable leaf bytes, hash, size, and original archive provenance; preserve TAR-only compatibility for existing callers."
  - "AC-04: The external review launch prompt names TXT, not TAR, when TXT is selected; TAR remains frozen archival evidence and is not sent as a duplicate semantic input."
  - "AC-05: Fail closed on unsafe paths, non-readable/binary leaves, truncation, tampering, missing interpreter, preflight/identity drift, and incomplete projection; distinguish local byte integrity from native model-visible delivery."
  - "AC-06: Native deterministic validation and independent read-only semantic review must precede candidate-specific Developer acceptance, separately authorized Phase2 integration, effect reconciliation and logical close."
relations:
  - relation: follows
    target: {ref: docs/SOURCE_OF_TRUTH.md, revision: "2026-10-04"}
---

# Review TXT Carrier adoption — bounded Product TaskCycle

TaskCycle: `TASKCYCLE-TECNOTRON-REVIEW-TXT-CARRIER-ADOPTION-001`.
Responsibility: `ADOPT_QUALIFIED_IR_TXT_PROJECTION_IN_EXISTING_FROZEN_REVIEW_RECIPE`.

## Developer selection

The Developer explicitly accepted the proposal to evolve the frozen review Recipe to prefer verified UTF-8 TXT for reviewer-facing input, preserving TAR as frozen evidence; the Developer also authorized necessary canonical promotion, subject to competent lifecycle reconciliation. This is a bounded selection/Phase1 grant, **not candidate-specific terminal acceptance or evidence that an Independent Review already passed**.

## Exact source and evidence

- Product baseline `mauedgar/tecnotron-ai:tools@c875ef7c14ac95d8fa80f617cd36b86978290f99`, tree `467151f16353970514d485eab0ef731052bac465`.
- Qualified historical TXT source: `mauedgar/ts-execution-lab@5c7d21198e878576c1d49d3e36b497dce3576ad6:experiments/TS-DEVLAB-INDEPENDENT-REVIEW-TXT-CARRIER-001/review_txt_carrier.py`, blob `96971cf4a39a6bcb64e8b1982010b6d50a1f7ca4`.
- Qualification was experimental; this TaskCycle is its explicit bounded Product adoption, not automatic Product authority.
- Historical IR003-F001 for #32 and original M08 UNKNOWN remain untouched. #33 candidate `81a3555c4257f9e1a451796676b13acb52395bd7` / PR #38 remains independent.

## Bounded implementation

Vendor exact qualified Python projection as Product-local stable adapter and reuse it from the existing Recipe only when `reviewer_transport: TXT` is explicitly selected. Default remains TAR for legacy callers until competent consumer migration; TXT is preferred for new review dispatches. The Recipe must produce a verified TXT, not simply assume that a provider consumed it. Python binding availability is a qualified environment precondition, not a new actor or Product authority. No new general Primitive, ContextPackager, runner, queue, state store, model or lifecycle gate.

## DoD / gates

1. Isolated immutable candidate with only declared write paths.
2. Python projector copied exactly, with existing tests and a bounded Product Recipe adapter.
3. Native targeted and full regression PASS, with explicit availability/failure evidence.
4. Frozen review interface and fresh Independent Review of exact candidate, independent of implementation.
5. Candidate-specific Developer acceptance and separately authorized Phase2 with live ref guards.
6. Effect reconciliation, logical close, and optional consumer adoption only under its own competent scope.

**No mutation or restart of #32/#33, no replacement of IR003 and no merge on test PASS alone.**
