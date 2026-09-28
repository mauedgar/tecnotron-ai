---
document_id: TOF-PLAN-WP003-WU03-001
status: implementation_candidate
owner: tecnotron-ai
type: task-plan
version: 1.0
updated: 2026-09-28
machine_context: true
task_id: TOF-WP003-WU03-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP003-WU03-FAIL-CLOSED-LINT-VALIDATION-001
task: docs/tasks/TOF-WP003-WU03-001/TASK.md
task_base: f62199bee7819c8a9ae0f84deff6f102a9679b99
implementation_authority: WU03_ONLY
requirement_refs: [RF-201, RF-202, RF-203, RF-204, RF-205, RF-206, RF-207]
---

# Local PLAN: fail-closed lint validation

This PLAN executes only the bounded WU03 assignment. It treats the accepted WU01 validator as executable semantics and the accepted WU02 corpus as immutable test input. It creates no new Product authority.

## Sequence and gates

1. Freshly verify canonical `tools`, remote `tools`, accepted authority/WU01 blobs, the expected local-only `opencode.json` delta, and State Kernel consistency.
2. Initialize this new TaskCycle through the canonical State Kernel and move it from READY to ACTIVE without satisfying later gates.
3. RED/GREEN: add the read-only CLI facade and focused CLI tests against every WU02 positive/negative fixture; do not change WU01 or fixture semantics to make lint green.
4. Prove fail-closed status behavior: executable validation returns only WU01 PASS/FAIL; missing invocation is NOT_RUN; unavailable input is UNAVAILABLE; invalid explicit input is FAIL; only PASS exits zero.
5. Run focused tests, a direct complete WU02 fixture matrix through the CLI, contract validation, the complete repository test suite and candidate-scoped `git diff --check`.
6. Verify the changed-path allowlist and exact unchanged identities for accepted SPEC/PLAN/contract/ADR/WU01 plus all WU02 templates/fixtures.
7. Freeze one local candidate directly descended from the accepted WU02 predecessor, satisfy only IMPLEMENTATION and VALIDATION in the TaskCycle, and leave review/acceptance/integration/publication/reconciliation pending.
8. Build one self-contained external Independent Review package bound to exact candidate commit/tree and validation evidence. Do not execute the review.

## CLI contract

Invocation is `node scripts/validate-sdd-artifacts.js --input <json-path>`. The JSON envelope must explicitly contain `artifacts[]` and `external_references[]`. Extra fixture bookkeeping fields are non-authoritative and ignored by the facade. There is no `--fix`, default authority, provider inference, network dependency, migration, or write path.

Exit status is deterministic: PASS=0, FAIL=1, NOT_RUN=2, UNAVAILABLE=2. The executable WU01 result object is emitted unchanged for PASS/FAIL so its findings and limitations remain visible. CLI-local NOT_RUN/UNAVAILABLE/invalid-input findings describe only whether the check ran; they do not alter SDD semantics.
