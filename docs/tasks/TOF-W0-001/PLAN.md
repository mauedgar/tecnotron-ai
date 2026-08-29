---
document_id: TOF-PLAN-W0-001
status: accepted
owner: tecnotron-ai
type: task-plan
version: 1.0
updated: 2026-08-29
machine_context: true
task_id: TOF-W0-001
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget: {class: large, policy: one_repository_slice_at_a_time, expansion_limit: 2}
required_capabilities: [configuration_analysis, schema_validation, testing, documentation, independent_review]
model_suggestions:
  - {candidate: opencode/big-pickle, purpose: bounded_configuration_reasoning, binding: false}
model_evidence_required: [equivalent_task_result, citation_accuracy, negative_test_quality, rework_rate]
dependencies: [WP-000_plan, dedicated_repository_worktrees]
ownership: {terminal_acceptance: Developer, FitFlow_configuration: FitFlow, conformance: Tecnotron-ai}
gates: [isolation, direct_source_validation, compatibility, independent_review]
acceptance_criteria: [TASK_spec_1_through_spec_8_evidenced]
stop_conditions: [schema_or_contract_change, product_change, secrets, destructive_overwrite, dependency_install]
related:
  - "[[tasks/TOF-W0-001/TASK]]"
---

# PLAN TOF-W0-001

## Strategy

Execution is deterministic-first and repository-scoped. Complete each phase with
evidence before moving forward; do not blend dirty state or validation outcomes
between repositories.

### Phase 0 — Assign execution slices

1. Pin fresh FitFlow and Tecnotron-ai baselines.
2. Establish one exclusive branch/worktree per written repository.
3. Record pre-existing changes and path ownership.
4. Confirm Reviewer independence.

Gate: `spec-1`. Stop if either write surface is not isolated.

### Phase 1 — Source inventory without edits

1. Read FitFlow `AGENTS.md`, `docs/SOURCE_OF_TRUTH.md`, Profile, config README,
   active registries, and relevant execution configuration.
2. Read Tecnotron-ai Profile schema, loaders, and existing tests.
3. Build a source-cited matrix for Profile fields, registry versions, ownership,
   roots, compatibility, and unresolved differences.
4. Classify each difference as source mismatch, derived-evidence staleness, or
   unapproved schema/contract need.

Gate: `spec-2` through `spec-5`. A schema/contract need stops execution.

### Phase 2 — Minimal FitFlow alignment

1. Write only source-demonstrated corrections within the assigned FitFlow paths.
2. Preserve existing namespaces, registry versions, FinOps policy, and product
   architecture.
3. Update narrow operational documentation only when required to keep source and
   instructions coherent.
4. Inspect the FitFlow diff before any Tecnotron-ai test change.

Gate: `spec-6`. No edit is justified solely by Codebase Memory.

### Phase 3 — Conformance evidence

1. Run existing registry contract tests.
2. Run active FitFlow configuration integration with explicit roots.
3. Add only approved test cases needed to demonstrate malformed versions,
   missing roots, and source/config mismatch handling.
4. Report skipped or inaccessible validation as `UNAVAILABLE` or `NOT_RUN`.
5. Run `git diff --check` separately in both repositories.

Gate: `spec-7`. A failure is not relaxed or relabeled.

### Phase 4 — Independent review and handoff

1. Reviewer checks source citations, ownership, compatibility, negative tests,
   and both diffs.
2. Produce a sanitized result and repository-separated validation matrix.
3. Leave both repositories at `PENDING_ACCEPTANCE`; do not commit or integrate.

Gate: `spec-8` and explicit Developer decision.

## Planned validation matrix

| Validation | Expected handling |
| --- | --- |
| Existing registry contract tests | `PASS` required for acceptance |
| Active FitFlow Profile and registry load from explicit root | `PASS` required |
| Unsupported/malformed registry cases | Deterministic rejection required |
| Paid API and compatibility assertions | `PASS` required |
| FitFlow `git diff --check` | `PASS` required if FitFlow changes |
| Tecnotron-ai `git diff --check` | `PASS` required |
| Product test suite | `NOT_RUN` unless a later ruling makes it relevant; product code is out of scope |
