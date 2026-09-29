---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TOF-WP-PB-001-WU01-001
artifact_kind: TASK
owner: tecnotron-ai
scope: "MATERIALIZE_REUSABLE_INDEPENDENT_REVIEW_PROTOCOL_V1"
revision: "1.0"
authority_refs:
  - ref: DEVELOPER-AUTHORIZE-WP-PB-001-WU01-PHASE1-20260928
    revision: "2026-09-28"
coverage:
  kind: approved_spec
  spec_ref:
    ref: TECNOTRON-WP-PB-001-SPEC-001
    revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea
requirement_refs:
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-001}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-002}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-003}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-004}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-005}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-006}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-007}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-008}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-009}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-010}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-011}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-012}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-013}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-014}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RF-IR-015}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RNF-IR-001}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RNF-IR-002}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RNF-IR-003}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RNF-IR-004}
  - {source: {ref: TECNOTRON-WP-PB-001-SPEC-001, revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea}, id: RNF-IR-005}
assignment_authority_ref:
  ref: DEVELOPER-AUTHORIZE-WP-PB-001-WU01-PHASE1-20260928
  revision: "2026-09-28"
write_scope:
  - docs/tasks/TOF-WP-PB-001-WU01-001/TASK.md
  - docs/tasks/TOF-WP-PB-001-WU01-001/PLAN.md
  - docs/contracts/tecnotron-independent-review-protocol-v1.md
acceptance_criteria:
  - "AC-01: Exact baseline and accepted SPEC/PLAN identities match."
  - "AC-02: TASK and local PLAN remain bounded WP003-derived artifacts."
  - "AC-03: One tecnotron-independent-review-protocol/v1 contract is materialized."
  - "AC-04: The accepted protocol semantics are projected without new behavior."
  - "AC-05: Required finding classifications and severities are preserved."
  - "AC-06: PASS, FAIL and BLOCKED remain distinct."
  - "AC-07: Neutrality and fail-closed input semantics are preserved."
  - "AC-08: WP003 REVIEW remains the artifact kind and lifecycle."
  - "AC-09: No later-WU or excluded implementation effect is introduced."
  - "AC-10: Validation reports actual PASS, FAIL, NOT_RUN or UNAVAILABLE."
  - "AC-11: Candidate changed paths equal the three-path allowlist."
  - "AC-12: One candidate and one review package are frozen without review or Phase 2."
relations:
  - relation: assigns_from
    target:
      ref: TECNOTRON-WP-PB-001-SPEC-001
      revision: 256232edf817fe1d88d246aca7b9ca27e9df33ea
  - relation: follows
    target:
      ref: TECNOTRON-WP-PB-001-PLAN-001
      revision: bfd81320b48436fa5a129635f4a95179a7d8dd50
---

# TASK TOF-WP-PB-001-WU01-001: Protocol Contract

## Assignment and authority

Under `DEVELOPER-AUTHORIZE-WP-PB-001-WU01-PHASE1-20260928`, materialize only
WU01 `MATERIALIZE_REUSABLE_INDEPENDENT_REVIEW_PROTOCOL_V1` from the accepted
[WP-PB-001 SPEC](../../work-packages/wp-pb-001-reusable-independent-review-protocol/SPEC.md)
and [WP PLAN](../../work-packages/wp-pb-001-reusable-independent-review-protocol/PLAN.md).
The accepted inputs are identified by the exact Git blobs in `coverage` and
`relations`; their frozen candidate-time frontmatter is historical and must not
be rewritten.

This assignment authorizes Phase 1 implementation, deterministic validation,
candidate freeze, and review-package preparation. It grants no Independent
Review execution, Developer acceptance, Phase 2, canonical integration, remote
publication, Stage-D closure, or Stage-E entry.

## Bounded responsibility

WU01 owns one provider-neutral repository contract at
`docs/contracts/tecnotron-independent-review-protocol-v1.md`. The contract
specializes the existing WP003 `REVIEW` artifact semantics and projects
RF-IR-001 through RF-IR-015 and RNF-IR-001 through RNF-IR-005 by reference. It
must not replace the six-artifact model, create a seventh artifact kind, or
create a second lifecycle.

WU02 retains ownership of reusable REVIEW template implementation and the
PASS/FAIL/BLOCKED conformance corpus. WU03 retains ownership of adoption and
Stage-D conformance disposition. This TASK does not prove or implement their
outputs.

Only the three paths in `write_scope` may change. No accepted definition,
template, reviewer profile, WP003 artifact, navigation, source, test, dependency,
State Kernel, Operational Spine, Phase2A/Phase2B, FitFlow, provider, Recipe,
runner, scheduler, workflow, F03/F07/F08/F09, `main`, or canonical `tools`
surface may change.

## Local acceptance criteria

| ID | Criterion | Required evidence |
| --- | --- | --- |
| AC-01 | The baseline commit/tree and accepted SPEC/PLAN blobs equal the exact authorized identities. | Fresh Git ref, tree, and blob checks. |
| AC-02 | TASK and local PLAN are bounded WP003-compatible derived artifacts with explicit authority, coverage, requirement references, relations, and write scope. | SDD validation where competently materialized and direct inspection. |
| AC-03 | Exactly one contract version, `tecnotron-independent-review-protocol/v1`, is materialized. | Contract metadata and changed-path inventory. |
| AC-04 | The contract defines exact subject, explicit input boundary, no undeclared context repair, preflight, common dimensions, validation/review separation, findings, classifications, severities, limitations, verdicts, independence, Developer separation, instantiation, history, and no deterministic semantic substitute without adding Product behavior. | RF/RNF traceability and semantic assessment. |
| AC-05 | Finding vocabulary includes `CANDIDATE_DEFECT`, `REVIEW_INTERFACE_DEFECT`, `EVIDENCE_LIMITATION`, `OBSERVATION`; severity includes `BLOCKING`, `MATERIAL`, `ADVISORY`. | Contract vocabulary tables. |
| AC-06 | PASS, FAIL, and BLOCKED are distinct; BLOCKED does not reject unadjudicated candidate semantics. | Verdict rules and preflight disposition. |
| AC-07 | Provider/harness neutrality, fail-closed material ambiguity, generated-material non-authority, and no conversational-memory dependency are preserved. | Contract boundaries and RNF traceability. |
| AC-08 | WP003 REVIEW remains the existing artifact kind; no seventh SDD kind or second lifecycle is created. | Compatibility section and unchanged WP003 contract. |
| AC-09 | No WU02/WU03 implementation or excluded Product/runtime effect is introduced. | Exact diff and scope assessment. |
| AC-10 | Actual deterministic checks are recorded only as `PASS`, `FAIL`, `NOT_RUN`, or `UNAVAILABLE`. | Validation evidence. |
| AC-11 | Candidate changed paths are exactly the three authorized paths. | Base-to-candidate path manifest. |
| AC-12 | One immutable candidate and one self-contained review package are frozen, with Independent Review `NOT_RUN` and Phase 2 `NOT_AUTHORIZED`. | Commit identity and reopened ZIP verification. |

## Execution and stop boundary

Execute the contained [local PLAN](PLAN.md). Deterministic checks prove only
their stated mechanical coverage; semantic authorship here is not Independent
Review. The future WU01 review must use currently accepted WP003 REVIEW
semantics and the explicit frozen package, not claim this unaccepted protocol
already governs its own review.

Stop for baseline or accepted-input drift, incompatible State Kernel identity,
write-scope expansion, Product-semantic change, later-WU implementation,
dependency mutation, unresolved effect, or inability to freeze a competent
review package. Otherwise stop at
`TECNOTRON_WP_PB_001_WU01_FROZEN_FOR_INDEPENDENT_REVIEW`.
