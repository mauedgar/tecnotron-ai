---
document_id: TOF-PLAN-WP003-WU01-001
status: implementation_candidate
owner: tecnotron-ai
type: task-plan
version: 1.0
updated: 2026-09-25
machine_context: true
task_id: TOF-WP003-WU01-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP003-WU01-DETERMINISTIC-PARSER-RELATION-VALIDATOR-001
task: docs/tasks/TOF-WP003-WU01-001/TASK.md
task_base: 4f789caf8c02ce68a6dd6980e18e983053addfee
implementation_authority: WU01_ONLY
requirement_refs: [RF-201, RF-202, RF-203, RF-204, RF-205, RF-206, RF-207]
---

# Local PLAN: deterministic parser and relation validator

This is the local execution strategy for the bounded WU01 assignment. The
accepted SPEC owns WHAT, the accepted WP PLAN owns HOW/decomposition, and this
document does not change either.

## TDD sequence and gates

1. Verify the exact canonical `tools` HEAD/tree and source blobs, create the
   isolated task worktree, read repository guidance and authoritative inputs.
2. RED: add focused contract tests for the accepted WU01 structural surface and
   demonstrate failure because the executable module does not exist.
3. GREEN: implement strict parsing and relation validation with existing
   JavaScript/Zod/YAML dependencies. Add only required CommonJS/ESM exports.
4. REFACTOR: consolidate diagnostics and relation/index helpers without adding
   lifecycle, CLI, fixture-corpus or semantic-review behavior.
5. Re-run focused tests. Exercise valid chain and explicit exception, missing
   metadata, unknown kinds, broken/unsupported relations, authority ambiguity,
   RF consistency, split/READY, convenience authority, REVIEW identity/evidence,
   RESULT conflict preservation and non-mutation/no-default behavior.
6. Run export checks, all contract tests, the competent broader repository
   suite where the execution surface permits it, and `git diff --check`. Record
   any native/runtime limitation as `UNAVAILABLE`, never PASS.
7. Verify the exact changed-path allowlist and unchanged authoritative blobs.
   Freeze exactly one candidate commit descended directly from the baseline.
8. Bind validation to the frozen bytes and build one external self-contained
   Independent Review package with exact sources, diff, code/tests, evidence,
   limitations, manifest/checksums and portable Git bundle. Do not review it.

## Deterministic versus semantic coverage

WU01 checks declared structure and explicit contradictions. It cannot prove
natural-language semantic equivalence, completeness of omitted behavior,
competence of a real-world owner, truth of observations, or Developer acceptance.
Those limits are returned explicitly by the validator and remain review inputs.

No invalid document is mutated, repaired, defaulted or promoted. Unknown kinds,
metadata or relations fail closed. References resolve only against the supplied
artifact set and exact caller-supplied external identities; no repository,
network, provider or filename inference is performed.
