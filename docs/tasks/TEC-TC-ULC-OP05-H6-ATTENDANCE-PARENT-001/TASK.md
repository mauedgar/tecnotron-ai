---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-ULC-OP05-H6-ATTENDANCE-PARENT-001
artifact_kind: TASK
owner: tecnotron-ai
scope: ATTENDANCE_STANDALONE_B_FIRST_PILOT_001
revision: "2026-11-02-001"
authority_refs:
  - ref: https://github.com/mauedgar/tecnotron-ai/issues/35#issuecomment-6568309396
    revision: "2026-11-02"
coverage:
  kind: competent_exception
  exception_ref:
    ref: https://github.com/mauedgar/tecnotron-ai/issues/35#issuecomment-6568309396
    revision: "2026-11-02"
assignment_authority_ref:
  ref: https://github.com/mauedgar/tecnotron-ai/issues/35#issuecomment-6568309396
  revision: "2026-11-02"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: bc9e60b9cad79037b40c298d5c9a84f17a33d909
  tree: e6be65e0c3d9aca074218b2fff92e6d42fc76141
write_scope:
  - attendance/tests/e2e/**
acceptance_criteria:
  - "Parent owns no changes to the frozen contract, no direct child implementation paths, and only prospective end-to-end tests."
  - "Coordinate two real, independently initialized TaskCycles with distinct write-sets, freeze/validation/IR/Developer acceptance/Phase2/reconciliation/close receipts."
  - "Verify operator+domain integrated against the same SQLite service; prove actual child work rather than synthetic Beads tasks."
  - "Parent close only after BOTH original child terminal receipts and independent ordinary workflow; H7 conditional and not selected."
---

# #35 H6 Attendance — PARENT bounded TASK

**TaskCycle ID:** `TASKCYCLE-TECNOTRON-ULC-OP05-H6-ATTENDANCE-PARENT-001`. **Responsibility:** `ATTENDANCE_STANDALONE_B_FIRST_PILOT_001`. **Authority:** explicit Developer grant limited to Parent+two child initialization and Phase 1/validation/Independent Review; no acceptance or Phase 2.

## Exact binding
Product: mauedgar/tecnotron-ai tools@bc9e60b9cad79037b40c298d5c9a84f17a33d909, tree e6be65e0c3d9aca074218b2fff92e6d42fc76141.
Developer grant: https://github.com/mauedgar/tecnotron-ai/issues/35#issuecomment-6568309396.
Selected Attendance baseline: mauedgar/ts-execution-lab pilot/tecnotron-h6-attendance-001@f6ea85050734bfd7f0fd2a8fa4c6d1f869f134bc, tree d65f818f4256d2ebc7b8847ab1d5dcb6084ed53d.
Immutable shared contract: https://github.com/mauedgar/ts-execution-lab/blob/f6ea85050734bfd7f0fd2a8fa4c6d1f869f134bc/attendance/contracts/attendance-v0.md (blob 2e939672a8401154289ea94aab83194f689247f0).
Product Control: TECNOTRON_BETA_RUN_001, #35. #34 original CLOSED_PASS remains untouched.

## Exclusive write-set
- `attendance/tests/e2e/**`
Parent integration verification paths only; no mutation of frozen interface or child-owned code.

## Acceptance criteria
1. Parent owns no changes to the frozen contract, no direct child implementation paths, and only prospective end-to-end tests.
2. Coordinate two real, independently initialized TaskCycles with distinct write-sets, freeze/validation/IR/Developer acceptance/Phase2/reconciliation/close receipts.
3. Verify operator+domain integrated against the same SQLite service; prove actual child work rather than synthetic Beads tasks.
4. Parent close only after BOTH original child terminal receipts and independent ordinary workflow; H7 conditional and not selected.

## Responsibilities/dependencies
- ATTENDANCE_DOMAIN_PERSISTENCE_001
- ATTENDANCE_OPERATOR_CONSUMER_001

## Gate order and stop conditions
TASK carrier and exact Git identity → qualified kernel-free initialization receipt → Phase 1 implementation → deterministic scoped validation → immutable candidate → fresh independent review → **STOP for candidate-specific Developer acceptance** → separately authorized Phase 2 → effect reconciliation → logical close. Each child independently has obligations: implementation, promotion_grade_validation, exact_candidate, frozen_review_interface, independent_review, Developer_acceptance, Phase_2, effect_reconciliation, logical_close. Reviewer PASS or CI PASS never grants acceptance. No Phase 2, merge, close, scheduler, Beads adoption, State Kernel migration, FitFlow writes or unauthorized retry. If binding/runtime/provider identity or original receipt is missing, mark blocked and do not invent PASS.

**Execution:** No OpenCode task-specific binding or Operation/ExecutionAttempt is inherent to this TASK. Control must first verify effective native V2 config/model/provider, exact isolated workspace, original initialization receipt and original effect identity; absent binding is `BLOCKED_PRECONDITION`. This carrier does not dispatch a worker by itself.
