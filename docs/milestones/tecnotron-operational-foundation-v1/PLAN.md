---
document_id: TOF-MILESTONE-PLAN-001
status: accepted
owner: tecnotron-ai
type: milestone-plan
version: 1.0
updated: 2026-08-29
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
baseline: 41088a413d06ed1d58d63d92320e38d4b44b86ea
task_base: 41088a413d06ed1d58d63d92320e38d4b44b86ea
integration_target: tools
promotion_target: main
architect_revision_status: PARTIAL
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget:
  class: large
  policy: milestone-index-plus-one-approved-work-package-or-spec
  expansion_limit: 2
required_capabilities:
  - cross_repo_planning
  - architecture_reasoning
  - documentation
  - deterministic_validation
model_suggestions:
  - candidate: opencode/big-pickle
    purpose: planning_and_architecture_review
    binding: false
  - candidate: opencode/hy3-free
    purpose: bounded_documentation
    binding: false
model_evidence_required:
  - bounded_invocation_result_on_equivalent_planning_input
  - instruction_adherence_and_scope_containment
  - cross_repo_reasoning_quality
  - token_usage_and_rework_rate
dependencies:
  - Developer-accepted milestone architecture
  - tools@41088a413d06ed1d58d63d92320e38d4b44b86ea
  - FitFlow source and active configuration for WP-000 conformance
ownership:
  terminal_acceptance: Developer
  planning: Tecnotron-ai
  product_configuration: FitFlow
  ai_core: Tecnotron-ai
gates:
  - WP-000 before WP-001
  - approved individual SPEC before executable TASKs for WP-001 through WP-006
  - repository-scoped isolation and validation before any cross-repo write
  - independent Reviewer for cross-repo, schema, contract, or lifecycle changes
acceptance_criteria:
  - eight Work Packages are represented without inventing unapproved scope
  - WP-000 has an approved plan and exactly the two approved TASK definitions
  - compatibility and lifecycle transition boundaries are explicit
  - no implementation or active configuration change is part of this artifact
stop_conditions:
  - an unapproved WP outcome, SPEC, schema, contract, wave, or executable TASK would be invented
  - ownership, permission, worktree, gate, or result changes without a repository-scoped split
  - implementation would precede its required SPEC or Developer gate
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[implementation-roadmap]]"
  - "[[work-packages/wp-000-cross-repo-project-profile-baseline/PLAN]]"
---

# Milestone Plan: tecnotron-operational-foundation-v1

## 1. Authority and status

The Developer accepted this Milestone Plan for materialization. The active
integration target for this milestone is `tools`; `main` receives accepted
milestones, and `tooling` is historical for this milestone.

`ARCHITECT_REVISION_STATUS: PARTIAL` is retained as historical state. It records
the limitation of the prior architecture review and does not reject this plan.
The source reads performed while materializing this document do not rewrite that
historical status.

| Field | Value |
| --- | --- |
| Milestone status | `ACCEPTED` |
| Execution status | `PLANNING_ONLY` |
| Baseline and task base | `41088a413d06ed1d58d63d92320e38d4b44b86ea` |
| Integration target | `tools` |
| Promotion target | `main` |
| Terminal authority | Developer |

## 2. Milestone outcome and boundaries

The milestone establishes an operational foundation for project resolution,
project-scoped agent profiles, compatible operational contracts, deterministic
evidence, and one final lifecycle policy. It contains exactly `WP-000` through
`WP-007`.

This plan does not implement any Work Package, schema, contract, profile,
launcher, runtime, provider, ranking, telemetry, or product behavior. Historical
TASKs before the milestone baseline remain records and are not active context.

Approved invariants:

- `WP-000` precedes `WP-001`.
- `WP-001` through `WP-006` require an accepted individual SPEC before
  executable TASKs may be materialized.
- `WP-000` and `WP-007` do not require a SPEC while they remain non-behavioral.
- `fitflow-task/v2` remains immutable and compatible during transition.
- Existing `fitflow-*` contracts remain compatible.
- `tecnotron-task-lifecycle/v1` is the only final operational policy; migration
  must have one explicit compatibility and deprecation boundary, never parallel
  active policies.
- Accepted operational evidence is `TASK`, Run Store, `RESULT`, and a sanitized
  final artifact. `REVIEW.md` carries independent findings and verdict.
- `PASS` is not acceptance, and `PENDING_ACCEPTANCE` is not integration.

## 3. Dependency view

```text
WP-000 -> WP-001

WP-001..WP-006 -> accepted individual SPEC before executable TASKs
WP-007 -> non-behavioral closeout boundary unless the Developer approves more
```

No additional dependency edges or waves are approved by this plan.

## 4. Work Packages

### WP-000 — Cross-repo Project Profile baseline

```yaml
status: DONE
result: Reproducible and source-validated FitFlow/Tecnotron-ai project baseline
integration: Tecnotron-ai tools@423714572af5332b2defa7265ff1514d0fd0c81a; FitFlow develop@0c092b927acc4c46e2059fc91d3606ea41f3c9af
boundary: Project Profile, active registries, ownership, roots, environment injection, cross-repo conformance, compatibility, and per-repository gates
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget: {class: large, policy: one_repository_slice_at_a_time, expansion_limit: 2}
required_capabilities: [cross_repo_analysis, configuration_review, testing, documentation, independent_review]
model_suggestions:
  - {candidate: opencode/big-pickle, purpose: cross_repo_reasoning, binding: false}
model_evidence_required: [equivalent_cross_repo_task_result, source_citation_accuracy, scope_containment, validation_quality]
dependencies: [tools_baseline, FitFlow_source, dedicated_worktrees]
ownership: {terminal_acceptance: Developer, ai_core: Tecnotron-ai, product_configuration: FitFlow}
gates: [TOF-W0-001_before_TOF-W0-002, source_level_conformance, repository_isolation, independent_review]
acceptance_criteria: [project_identity_is_explicit, roots_are_reproducible, active_registries_conform, cross_repo_tests_are_independent]
stop_conditions: [secret_access, destructive_overwrite, product_behavior_change, unapproved_schema_or_contract]
```

Full plan: [WP-000 Plan](../../work-packages/wp-000-cross-repo-project-profile-baseline/PLAN.md).

Approved TASKs only:

1. `TOF-W0-001` — FitFlow Project Profile and Active Configuration.
2. `TOF-W0-002` — Project Resolution, Environment Injection and Cross-Repo
   Conformance.

### WP-001 — Project-scoped Agent Profiles MVP

```yaml
status: PLANNING_PENDING_SPEC
result: Nine project-scoped profiles, one implementer, one generic parameterized launcher, one result contract, and positive/negative smokes
boundary: Deny-by-default permissions, no delegation, no global configuration, models outside profile identity, deterministic Validator outside profiles
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget: {class: large, policy: accepted_SPEC_plus_one_execution_unit, expansion_limit: 2}
required_capabilities: [specification, security_boundaries, runtime_design, contract_reasoning, testing]
model_suggestions: []
model_evidence_required: [accepted_SPEC, profile_permission_tests, launcher_smokes, model_binding_isolation_evidence]
dependencies: [WP-000]
ownership: {terminal_acceptance: Developer, profiles_and_launcher: Tecnotron-ai}
gates: [individual_SPEC_accepted, reviewer_required_for_contracts, deny_by_default_proven]
acceptance_criteria: [approved_SPEC_materialized_before_TASKs, exactly_nine_profiles, exactly_one_implementer, exactly_one_generic_launcher]
stop_conditions: [profile_identity_contains_model_binding, delegation_enabled, global_configuration_required, executable_TASK_without_SPEC]
```

Profiles in the accepted boundary: `spec_analyst`, `planner`, `architect`,
`explorer`, `implementer`, `doc_curator`, `reviewer`, `researcher`, and `auditor`.
Only `implementer` may write code under TASK; `doc_curator` may write only
documentation under TASK; all others are read-only. Web access belongs only to
`researcher`.

### WP-002

```yaml
status: PLANNING_PENDING_SPEC
result: PLANNING_PENDING_SPEC
boundary: No outcome, executable TASK, schema, contract, or behavior is inferred in this bootstrap
complexity: UNASSESSED_PENDING_SPEC
criticality: UNASSESSED_PENDING_SPEC
scope_fit: UNASSESSED_PENDING_SPEC
context_budget: {class: pending, policy: accepted_SPEC_required}
required_capabilities: [specification]
model_suggestions: []
model_evidence_required: [accepted_SPEC, bounded_model_evaluation_for_approved_capabilities]
dependencies: [approved_dependency_graph_pending_SPEC]
ownership: {terminal_acceptance: Developer, detailed_scope: pending_SPEC}
gates: [individual_SPEC_accepted_before_executable_TASKs]
acceptance_criteria: [SPEC_defines_result_boundary_ownership_gates_and_stop_conditions]
stop_conditions: [scope_inference_from_historical_TASKs, executable_TASK_without_SPEC]
```

### WP-003

```yaml
status: PLANNING_PENDING_SPEC
result: PLANNING_PENDING_SPEC
boundary: No outcome, executable TASK, schema, contract, or behavior is inferred in this bootstrap
complexity: UNASSESSED_PENDING_SPEC
criticality: UNASSESSED_PENDING_SPEC
scope_fit: UNASSESSED_PENDING_SPEC
context_budget: {class: pending, policy: accepted_SPEC_required}
required_capabilities: [specification]
model_suggestions: []
model_evidence_required: [accepted_SPEC, bounded_model_evaluation_for_approved_capabilities]
dependencies: [approved_dependency_graph_pending_SPEC]
ownership: {terminal_acceptance: Developer, detailed_scope: pending_SPEC}
gates: [individual_SPEC_accepted_before_executable_TASKs]
acceptance_criteria: [SPEC_defines_result_boundary_ownership_gates_and_stop_conditions]
stop_conditions: [scope_inference_from_historical_TASKs, executable_TASK_without_SPEC]
```

### WP-004

```yaml
status: PLANNING_PENDING_SPEC
result: PLANNING_PENDING_SPEC
boundary: No outcome, executable TASK, schema, contract, or behavior is inferred in this bootstrap
complexity: UNASSESSED_PENDING_SPEC
criticality: UNASSESSED_PENDING_SPEC
scope_fit: UNASSESSED_PENDING_SPEC
context_budget: {class: pending, policy: accepted_SPEC_required}
required_capabilities: [specification]
model_suggestions: []
model_evidence_required: [accepted_SPEC, bounded_model_evaluation_for_approved_capabilities]
dependencies: [approved_dependency_graph_pending_SPEC]
ownership: {terminal_acceptance: Developer, detailed_scope: pending_SPEC}
gates: [individual_SPEC_accepted_before_executable_TASKs]
acceptance_criteria: [SPEC_defines_result_boundary_ownership_gates_and_stop_conditions]
stop_conditions: [scope_inference_from_historical_TASKs, executable_TASK_without_SPEC]
```

### WP-005

```yaml
status: PLANNING_PENDING_SPEC
result: PLANNING_PENDING_SPEC
boundary: No outcome, executable TASK, schema, contract, or behavior is inferred in this bootstrap
complexity: UNASSESSED_PENDING_SPEC
criticality: UNASSESSED_PENDING_SPEC
scope_fit: UNASSESSED_PENDING_SPEC
context_budget: {class: pending, policy: accepted_SPEC_required}
required_capabilities: [specification]
model_suggestions: []
model_evidence_required: [accepted_SPEC, bounded_model_evaluation_for_approved_capabilities]
dependencies: [approved_dependency_graph_pending_SPEC]
ownership: {terminal_acceptance: Developer, detailed_scope: pending_SPEC}
gates: [individual_SPEC_accepted_before_executable_TASKs]
acceptance_criteria: [SPEC_defines_result_boundary_ownership_gates_and_stop_conditions]
stop_conditions: [scope_inference_from_historical_TASKs, executable_TASK_without_SPEC]
```

### WP-006

```yaml
status: PLANNING_PENDING_SPEC
result: PLANNING_PENDING_SPEC
boundary: No outcome, executable TASK, schema, contract, or behavior is inferred in this bootstrap
complexity: UNASSESSED_PENDING_SPEC
criticality: UNASSESSED_PENDING_SPEC
scope_fit: UNASSESSED_PENDING_SPEC
context_budget: {class: pending, policy: accepted_SPEC_required}
required_capabilities: [specification]
model_suggestions: []
model_evidence_required: [accepted_SPEC, bounded_model_evaluation_for_approved_capabilities]
dependencies: [approved_dependency_graph_pending_SPEC]
ownership: {terminal_acceptance: Developer, detailed_scope: pending_SPEC}
gates: [individual_SPEC_accepted_before_executable_TASKs]
acceptance_criteria: [SPEC_defines_result_boundary_ownership_gates_and_stop_conditions]
stop_conditions: [scope_inference_from_historical_TASKs, executable_TASK_without_SPEC]
```

### WP-007 — Non-behavioral milestone closeout boundary

```yaml
status: PLANNING_PENDING_CONFIRMATION
result: Consolidated milestone evidence and Developer acceptance boundary, without adding runtime behavior
boundary: Evidence navigation, compatibility/deprecation confirmation, independent review record, and terminal Developer gate only
complexity: medium
criticality: high
scope_fit: FIT_IF_NON_BEHAVIORAL
context_budget: {class: medium, policy: milestone_evidence_index_only, expansion_limit: 1}
required_capabilities: [audit, documentation, deterministic_validation, independent_review]
model_suggestions: []
model_evidence_required: [complete_milestone_evidence_matrix, independent_review_quality, no_behavior_change_diff]
dependencies: [approved_milestone_outputs]
ownership: {terminal_acceptance: Developer, evidence_curation: Tecnotron-ai}
gates: [no_new_behavior_or_SPEC_required, compatibility_boundary_confirmed, Developer_acceptance]
acceptance_criteria: [no_parallel_operational_policy, evidence_is_sanitized_and_navigable, no_implicit_integration]
stop_conditions: [new_behavior_required, missing_accepted_dependency, inferred_terminal_acceptance]
```

The closeout interpretation is deliberately minimal and remains subject to
Developer confirmation before executable work is created.

## 5. Contract and migration boundary

Existing `fitflow-*` contracts remain compatible. The following are candidates,
not implemented or fully specified here:

```text
tecnotron-agent-profile/v1
tecnotron-agent-launch/v1
tecnotron-task-lifecycle/v1
tecnotron-execution-observation/v1
```

Any candidate that introduces behavior requires the applicable accepted SPEC and
independent Reviewer. Transition away from operational use of `fitflow-task/v2`
must define migration, explicit compatibility, coordinated deprecation, and the
point at which `tecnotron-task-lifecycle/v1` becomes the sole policy.

## 6. Materialization decisions

```yaml
materialization_decision:
  subject: WP-002-through-WP-006-detail
  decision: Preserve identifiers and mandatory planning gates; mark all unapproved outcomes PLANNING_PENDING_SPEC.
  basis: The accepted prompt prohibits inventing TASKs, waves, or unspecified behavior.
  uncertainty: Outcomes and dependency edges are not present in approved evidence.
  future_confirmation_required: true
---
materialization_decision:
  subject: WP-007-minimum-boundary
  decision: Represent WP-007 only as non-behavioral milestone evidence and acceptance closeout.
  basis: WP-007 is exempt from SPEC only while it introduces no new behavior.
  uncertainty: Its exhaustive result and task decomposition were not provided.
  future_confirmation_required: true
---
materialization_decision:
  subject: cross-repo-task-fit
  decision: Mark WP-000 and its cross-repo coordination TASKs SPLIT_REQUIRED; retain approved TASK IDs as coordination contracts and require repository-scoped execution slices before writes.
  basis: Ownership, worktree, permissions, validation, integration, and rollback differ by repository.
  uncertainty: Execution-slice identifiers and fresh baselines belong to a later lifecycle gate.
  future_confirmation_required: true
```

## 7. Milestone acceptance checklist

- [ ] Eight Work Packages remain exactly `WP-000` through `WP-007`.
- [ ] `WP-000` is accepted and validated before `WP-001` starts.
- [ ] Each of `WP-001` through `WP-006` has an accepted individual SPEC before
      executable TASK materialization.
- [ ] Cross-repo work has independent repository baselines, worktrees, scopes,
      paths, permissions, validation, integration, and rollback.
- [ ] Reviewer evidence exists for every cross-repo, schema, contract, or
      lifecycle change.
- [ ] `fitflow-task/v2` remains immutable and compatible during transition.
- [ ] Only `tecnotron-task-lifecycle/v1` remains as final operational policy.
- [ ] Final milestone status is decided explicitly by the Developer.
