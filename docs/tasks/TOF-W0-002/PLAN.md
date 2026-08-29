---
document_id: TOF-PLAN-W0-002
status: accepted
owner: tecnotron-ai
type: task-plan
version: 1.0
updated: 2026-08-29
machine_context: true
task_id: TOF-W0-002
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget: {class: large, policy: injection_boundary_plus_one_repository_slice, expansion_limit: 2}
required_capabilities: [environment_resolution, cross_repo_testing, negative_testing, lifecycle_analysis, independent_review]
model_suggestions:
  - {candidate: opencode/big-pickle, purpose: bounded_failure_mode_reasoning, binding: false}
model_evidence_required: [equivalent_task_result, negative_case_coverage, deterministic_reproduction, scope_containment]
dependencies: [TOF-W0-001_accepted, dedicated_repository_worktrees]
ownership: {terminal_acceptance: Developer, injection_surface: FitFlow, resolver_and_conformance: Tecnotron-ai}
gates: [accepted_predecessor, isolation, supported_injection_surface, independent_repository_validation, independent_review]
acceptance_criteria: [TASK_spec_1_through_spec_10_evidenced]
stop_conditions: [secret_access, unsupported_injection, schema_or_contract_change, product_change, destructive_overwrite, dependency_install]
related:
  - "[[tasks/TOF-W0-002/TASK]]"
---

# PLAN TOF-W0-002

## Strategy

Use tests to prove the boundary before changing implementation. The mechanism is
not selected by this plan: execution must first verify the real supported Orca
injection surface. No undocumented syntax or `.env` behavior may be invented.

### Phase 0 — Predecessor, isolation, and mechanism discovery

1. Verify explicit Developer acceptance of `TOF-W0-001`.
2. Pin fresh repository baselines and establish exclusive worktrees.
3. Record pre-existing changes and execution-slice ownership.
4. Verify the supported deterministic workspace injection mechanism using real
   local evidence without web, package installation, or secret access.

Gate: `spec-1`. If no supported mechanism is verifiable, report `UNAVAILABLE`
and stop for a Developer ruling.

### Phase 1 — RED: reproducibility and failure cases

1. Add a fresh-worktree smoke that expects all three keys and validates only
   sanitized paths/key presence.
2. Add resolver tests for explicit root, explicit Profile, explicit AI Core
   root, and valid combined inputs.
3. Add fail-closed cases for missing directory, missing Profile, conflicting
   root/Profile, stale values, and absence of all external project inputs.
4. Confirm tests fail for the expected missing injection or boundary behavior,
   not because dependencies are absent.

Gate: `spec-2`, `spec-3`, `spec-4`, and `spec-6` have executable tests.

### Phase 2 — GREEN: minimum injection and resolver change

1. Configure only the verified workspace-owned injection surface.
2. Keep task-worktree paths ephemeral and out of the Profile.
3. Change `resolveProject` or doctor code only where a failing approved test
   demonstrates a gap within existing contracts.
4. Preserve explicit-input precedence and fail closed rather than selecting an
   unrelated checkout.

Gate: no schema, contract, global configuration, secret, or product change.

### Phase 3 — Cross-repo conformance

1. Create a new task worktree using the configured mechanism.
2. Verify the resolved Profile and roots point to active worktrees.
3. Load the active Profile, role v3, model v3, FinOps v1, and orchestrator v2.
4. Run declared simulations only; no provider/model call and no paid API.
5. Run negative tests with sanitized environment manipulation.
6. Report FitFlow and Tecnotron-ai outcomes independently.

Gate: `spec-5`, `spec-7`, `spec-8`, and `spec-9`.

### Phase 4 — Review and handoff

1. Inspect all modified files and both repository diffs.
2. Run relevant suites and `git diff --check` in both repositories.
3. Reviewer evaluates isolation, precedence, negative cases, lifecycle impact,
   compatibility, and absence of secret leakage.
4. Produce sanitized evidence and stop at `PENDING_ACCEPTANCE` until the
   Developer decision; after acceptance, Task Lifecycle may integrate it.

Gate: `spec-10` and explicit Developer decision.

## Planned validation matrix

| Validation | Expected handling |
| --- | --- |
| Resolver and doctor focused tests | `PASS` required |
| Registry contract tests | `PASS` required |
| Active FitFlow integration through explicit injected inputs | `PASS` required |
| Missing/conflicting/stale input cases | Stable fail-closed result required |
| Fresh-worktree reproducibility smoke | `PASS` required |
| FitFlow `git diff --check` | `PASS` required if FitFlow changes |
| Tecnotron-ai `git diff --check` | `PASS` required |
| Provider/model execution | `NOT_RUN` and prohibited |
| Product functional suite | `NOT_RUN` unless a later ruling changes scope |
