---
document_id: TOF-MILESTONE-PLAN-001
status: accepted
materialization_status: ACCEPTED
owner: tecnotron-ai
type: milestone-plan
version: 1.4
updated: 2026-09-04
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
milestone_baseline: 41088a413d06ed1d58d63d92320e38d4b44b86ea
integration_target: tools
promotion_target: main
execution_status: IN_PROGRESS
architect_revision_status: COMPLETE
completed_work_packages:
  - WP-000
  - WP-001
next_gate: Developer READY gate after WP-002 WP PLAN materialization
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
  - specification
  - documentation
  - deterministic_validation
model_suggestions:
  - candidate: openai/gpt-5.6-sol
    purpose: planning_specification_and_architecture_review
    reasoning_effort: high
    binding: false
model_evidence_required:
  - bounded_invocation_result_on_equivalent_planning_input
  - instruction_adherence_and_scope_containment
  - cross_repo_reasoning_quality
  - token_usage_latency_and_rework_rate
dependencies:
  - Developer Acceptance Ruling
  - Architecture Plan Acceptance Revision Addendum
  - Tecnotron Operational Foundation v1 Architecture and Milestone Plan
  - tools@41088a413d06ed1d58d63d92320e38d4b44b86ea
ownership:
  terminal_acceptance: Developer
  planning: Tecnotron-ai
  product_configuration: FitFlow
  ai_core: Tecnotron-ai
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[implementation-roadmap]]"
  - "[[work-packages/wp-000-cross-repo-project-profile-baseline/PLAN]]"
---

# Milestone Plan: Tecnotron Operational Foundation v1

## 1. Authority, precedence, and current state

This document materializes the accepted milestone without reopening its
architecture. Its source precedence is:

1. `Developer Acceptance Ruling`;
2. `Architecture Plan — Acceptance Revision Addendum`;
3. `Tecnotron Operational Foundation v1 — Architecture and Milestone Plan`;
4. post-acceptance execution evidence, only for observed WP status and
   integration state.

The Developer accepted the original plan and its addendum, including all eight
Work Packages, the namespace, lifecycle, profile, launcher, SPEC, evidence, and
controlled cross-repository rulings. The addendum supersedes only the sections
it enumerates; all other original-plan sections remain in force.

| Field | Value |
| --- | --- |
| Milestone status | `ACCEPTED` |
| Materialization revision | `ACCEPTED` |
| Execution status | `IN_PROGRESS` |
| Architecture revision | `COMPLETE` |
| Milestone baseline | `41088a413d06ed1d58d63d92320e38d4b44b86ea` |
| Integration target | `tools` |
| Promotion target | `main` |
| Completed work packages | `WP-000`, `WP-001` |
| Next gate | Developer `READY` gate after WP-002 WP PLAN materialization |
| Terminal authority | Developer |

`tools` is the integration branch for this milestone. `main` receives the
milestone only after the closure gate. `tooling` is historical and has no
operational authority over this milestone.

## 2. Milestone outcome and boundaries

### Objective

Establish a sustainable vertical flow that can specify a capability, derive
bounded tasks, execute a project-scoped OpenCode profile, validate, review when
risk requires it, obtain Developer acceptance, integrate by squash into
`tools`, and preserve minimal trustworthy evidence.

### Terminal outcome

At least one representative capability completes the following path:

```text
accepted SPEC
→ WP PLAN
→ TASK and task PLAN
→ feat/* worktree
→ operational profile
→ deterministic OpenCode launcher
→ bounded context
→ runtime evidence
→ Validator
→ risk-based Reviewer
→ Developer gate
→ squash into tools
→ synchronized documentation
```

The milestone then becomes eligible for deliberate promotion from `tools` to
`main`.

### Included

- cross-repository Project Profile baseline;
- operational profile contracts;
- one generic deterministic OpenCode launcher and nine project-scoped profiles;
- SDD authority and artifacts;
- governed Task Cycle Lite;
- minimal execution observation;
- System Guide and navigation;
- milestone closure and promotion.

### Excluded

- model ranking and permanent model bindings;
- fitness-based routing or provider research;
- advanced FinOps or extensive telemetry;
- new Temporal, MCP, or retrieval implementation;
- automatic recovery of the archived milestone;
- FitFlow product or database behavior;
- FitFlow writes outside explicitly approved cross-repository TASKs.

## 3. Authority by responsibility

| Responsibility | Authority |
| --- | --- |
| Invariants, valid states, schemas, interoperability | Canonical contracts and ADRs |
| Expected capability behavior | Accepted `SPEC.md` |
| Technical solution and WP decomposition | WP `PLAN.md` |
| Operational authorization and assigned requirements | `TASK.md` |
| Local execution strategy | Task `PLAN.md` |
| Observed evidence | `RESULT.md`, Run Store, and referenced artifacts |
| Independent semantic review | `REVIEW.md` |
| Acceptance and promotion | Developer |
| Macro sequence | Implementation Roadmap and this Milestone Plan |
| Confirmed implementation reality | Current State |
| Navigation | Source of Truth |
| Explanation | Derived guides |
| Hypothesis or experiment | Research |
| Historical recovery material | Archive and preserved refs |

Conflict rules:

1. identify the responsibility in conflict;
2. stop for a ruling when a SPEC conflicts with a canonical contract or ADR;
3. update and approve the SPEC before PLAN or TASK changes behavior;
4. stop when a task PLAN expands its TASK;
5. preserve RESULT evidence even when it contradicts expectations;
6. correct or supersede a guide that contradicts a canonical source;
7. never let an index, runtime, model, or provider decide authority.

## 4. Waves and dependency graph

| Wave | Work Package | Name | Dependency | SPEC |
| --- | --- | --- | --- | --- |
| W0 | `WP-000` | Cross-Repo Project Profile Baseline | milestone baseline | not required unless new behavior appears |
| W1 | `WP-001` | Operational Profile Contracts | WP-000 | required |
| W1 | `WP-002` | Deterministic OpenCode Launchers | WP-001 | required |
| W2 | `WP-003` | SDD Authority and Artifacts | WP-002 | required |
| W2 | `WP-004` | Governed Task Cycle Lite | WP-003, WP-002, WP-000 | required |
| W3 | `WP-005` | Execution Observation Baseline | WP-004 | required |
| W4 | `WP-006` | System Guide and Navigation | WP-001–WP-005 | required |
| W4 | `WP-007` | Milestone Closure and Promotion | WP-000–WP-006 | not required while non-behavioral |

```text
WP-000
   ↓
WP-001 → WP-002 → WP-003 → WP-004 → WP-005 → WP-006 → WP-007
                    └──────── WP-000 also gates WP-004 ────────┘
```

WP identities do not depend on wave numbering. A wave may change without
renaming its Work Packages, but any dependency or outcome change requires a
Developer ruling.

## 5. Work Packages

### WP-000 — Cross-Repo Project Profile Baseline

```yaml
wave: W0
status: DONE
result: Reproducible and source-validated FitFlow/Tecnotron-ai project baseline
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget: {class: large, policy: one_repository_slice_at_a_time, expansion_limit: 2}
dependencies: [milestone_baseline]
ownership: {terminal_acceptance: Developer, ai_core: Tecnotron-ai, product_configuration: FitFlow}
integration:
  tecnotron_ai: tools@423714572af5332b2defa7265ff1514d0fd0c81a
  fitflow: develop@0c092b927acc4c46e2059fc91d3606ea41f3c9af
```

Result boundary:

- source-validated FitFlow Project Profile and active registries;
- explicit roots without sibling inference;
- reproducible task-scoped `FF_PROJECT_ROOT`, `FF_PROJECT_PROFILE`, and
  `FF_AI_CORE_ROOT` injection;
- joint positive and negative conformance;
- independent validation, review, acceptance, integration, and rollback per
  repository;
- paid API remains disabled;
- no new schema or contract was introduced without a separate ruling.

Completed TASKs:

1. `TOF-W0-001` — FitFlow Project Profile and Active Configuration.
2. `TOF-W0-002` — Project Resolution, Environment Injection and Cross-Repo
   Conformance.

Full plan: [WP-000 Plan](../../work-packages/wp-000-cross-repo-project-profile-baseline/PLAN.md).

### WP-001 — Operational Profile Contracts

```yaml
wave: W1
status: ACCEPTED_INTEGRATED
result: Nine model-independent operational profile contracts with exclusive responsibilities and enforceable permission boundaries
complexity: high
criticality: high
scope_fit: FIT
context_budget: {class: medium, policy: accepted_SPEC_plus_one_execution_unit, expansion_limit: 2}
required_capabilities: [specification, architecture_reasoning, security_boundaries, contract_design, deterministic_testing]
model_suggestions:
  - {candidate: openai/gpt-5.6-sol, purpose: specification_and_contract_review, reasoning_effort: high, binding: false}
model_evidence_required: [accepted_SPEC, contract_tests, negative_permission_tests, scope_containment]
dependencies: [WP-000]
ownership: {terminal_acceptance: Developer, semantics: Architect, implementation: Implementer}
gates: [WP-001_SPEC_accepted, exact_profile_set_validated, independent_contract_review]
acceptance_criteria: [exactly_nine_profile_ids, exactly_one_implementer, no_model_or_provider_identity, retired_coder_ids_rejected, deny_by_default_contract]
stop_conditions: [Router_or_Model_Resolver_scope_required, second_implementer, model_binding, FitFlow_dependency]
```

The exact profile set is:

`spec_analyst`, `planner`, `architect`, `explorer`, `implementer`,
`doc_curator`, `reviewer`, `researcher`, and `auditor`.

Profile semantics:

- `implementer` is the only source-code writer and only under TASK ownership;
- `doc_curator` writes documentation only under TASK ownership;
- all other profiles are read-only;
- delegation is denied for every profile;
- web is denied except for `researcher` under an authorized research TASK;
- models and providers are outside profile identity;
- Validator remains deterministic and external to profiles;
- personal Developer profiles remain outside the canonical registry.

WP-001 defines contracts and static conformance. It does not yet own the generic
launcher or its normalized launch-result contract.

Accepted SPEC: [WP-001 SPEC](../../work-packages/wp-001-operational-profile-contracts/SPEC.md).
Technical plan: [WP-001 Plan](../../work-packages/wp-001-operational-profile-contracts/PLAN.md).
Materialized task contract: [TOF-W1-001](../../tasks/TOF-W1-001/TASK.md),
whose materialization passed independent review, was accepted by the Developer,
and was integrated into `tools`. A later Developer ruling authorized execution
from `task_base` `651e84d` in its isolated worktree. Validation passed 11/11
focalized, 19/19 combined and 154/154 complete; independent review passed, the
Developer accepted the TASK, and PR #27 integrated it in
`tools@d7e1e7e4784cae455782b38797c199e380173804`. Publication, promotion to
`main`, and cleanup remain `NOT_RUN`.

### WP-002 — Deterministic OpenCode Launchers

```yaml
wave: W1
spec_status: ACCEPTED
spec_gate: WP-002_SPEC_ACCEPTANCE
spec_gate_status: SATISFIED
wp_plan_materialization_status: NOT_MATERIALIZED
implementation_authority: NOT_CREATED
result: One generic launcher parameterized by profile, nine project-scoped OpenCode profiles, tecnotron-agent-launch/v1, and positive/negative smokes
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget: {class: large, policy: accepted_SPEC_plus_one_launcher_slice, expansion_limit: 2}
required_capabilities: [specification, OpenCode_conformance, permission_enforcement, runtime_boundary_design, testing]
model_suggestions:
  - {candidate: openai/gpt-5.6-sol, purpose: launcher_and_runtime_boundary, reasoning_effort: high, binding: false}
model_evidence_required: [accepted_SPEC, local_CLI_discovery, positive_smokes, negative_smokes, normalized_result_validation]
dependencies: [WP-001]
ownership: {terminal_acceptance: Developer, launcher_and_profiles: Tecnotron-ai}
gates: [WP-002_SPEC_accepted, one_generic_launcher, project_scoped_profiles, independent_security_review]
acceptance_criteria: [nine_profiles_discoverable, valid_read_only_launch, authorized_writer_launch, retired_profile_rejected, malformed_output_fails_closed]
stop_conditions: [global_configuration_mutation, permanent_profile_model_binding, unprovable_permissions, paid_API_required]
accepted_spec:
  path: docs/work-packages/wp-002-deterministic-opencode-launchers/SPEC.md
  semantic_sha256: 4733259d18b3f64f58f31127b1de4ba1b2ee6ca2a09a9046d95fced04aaaf202
  acceptance_operation_id: TOF-WP002-SPEC-ACCEPTANCE-01
known_environment_limitations:
  - check: wp001_test
    status: UNAVAILABLE
    reason: declared yaml dependency absent from checkout
    disposition: resolve before relying on the affected test during WP-002 implementation or validation; SPEC acceptance remains valid
```

The launcher receives explicit profile, TASK, worktree, optional model request,
reasoning effort, context reference, and task-scoped environment inputs. It must
validate profile, cwd, worktree, ownership, and permissions before invoking one
OpenCode adapter. It distinguishes requested, resolved, and observed model
identity and normalizes the result against `tecnotron-agent-launch/v1`.

There are nine profiles and one launcher, not nine launch adapters.

Accepted SPEC: [WP-002 SPEC](../../work-packages/wp-002-deterministic-opencode-launchers/SPEC.md).
The next lifecycle boundary is Architect materialization of the WP PLAN followed
by the Developer `READY` gate. No executable TASK or implementation authority
exists yet.

### WP-003 — SDD Authority and Artifacts

```yaml
wave: W2
status: PLANNING_PENDING_SPEC
result: Unambiguous authority and validation for SPEC, WP PLAN, TASK, task PLAN, RESULT, and REVIEW
complexity: high
criticality: high
scope_fit: FIT
context_budget: {class: medium, policy: accepted_SPEC_plus_authority_slice, expansion_limit: 2}
required_capabilities: [specification, authority_design, documentation, template_design, validation]
model_suggestions:
  - {candidate: openai/gpt-5.6-sol, purpose: SDD_and_authority_design, reasoning_effort: xhigh, binding: false}
model_evidence_required: [accepted_SPEC, valid_and_invalid_fixtures, template_validation, authority_review]
dependencies: [WP-002]
ownership: {terminal_acceptance: Developer, semantics: Architect, writing: Doc_Curator}
gates: [WP-003_SPEC_accepted, ADR_accepted, templates_validated, no_parallel_authority]
acceptance_criteria: [stable_RF_and_RNF_ids, SPEC_defines_what_and_why, WP_PLAN_defines_how, TASK_assigns_requirements, split_required_blocks_READY]
stop_conditions: [contract_conflict, design_md_authority, tasks_md_authority, apply_authority, documentation_without_owner]
```

WP-003 formalizes the Change/SPEC and SDD rules. It must not introduce
`design.md`, `tasks.md`, or `apply` as competing authorities.

### WP-004 — Governed Task Cycle Lite

```yaml
wave: W2
status: PLANNING_PENDING_SPEC
result: tecnotron-task-lifecycle/v1 becomes the only operational lifecycle policy while fitflow-task/v2 remains immutable behind an explicit compatibility boundary
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget: {class: large, policy: accepted_SPEC_plus_one_migration_slice, expansion_limit: 2}
required_capabilities: [specification, lifecycle_design, compatibility_mapping, cross_repo_migration, deterministic_testing]
model_suggestions:
  - {candidate: openai/gpt-5.6-sol, purpose: lifecycle_and_migration_design, reasoning_effort: xhigh, binding: false}
model_evidence_required: [accepted_SPEC, mapping_fixtures, consumer_inventory, vertical_cycle_evidence, independent_schema_review]
dependencies: [WP-003, WP-002, WP-000]
ownership: {terminal_acceptance: Developer, lifecycle: Tecnotron-ai, conditional_product_consumers: FitFlow}
gates: [WP-004_SPEC_accepted, canonical_contract_validated, Tecnotron_consumers_migrated, conditional_FitFlow_gate, one_vertical_task_cycle]
acceptance_criteria: [one_operational_policy, legacy_input_compatibility, zero_direct_legacy_policy_consumers, orthogonal_validation_review_acceptance_integration, stable_DONE_paths]
stop_conditions: [fitflow_task_v2_mutation, parallel_operational_policies, unapproved_FitFlow_write, integration_without_Developer_acceptance]
```

Migration sequence:

1. define `tecnotron-task-lifecycle/v1`;
2. define explicit mapping from `fitflow-task/v2`;
3. validate compatible, ambiguous, and rejected cases;
4. migrate Tecnotron-ai consumers;
5. migrate actual FitFlow consumers in a separate cross-repository TASK when
   WP-000 evidence proves they exist;
6. document deprecation;
7. retire direct operational use of the legacy policy;
8. retain parser/adapter compatibility until another ruling.

WP-004 closes only when:

```text
new canonical policy: tecnotron-task-lifecycle/v1
legacy input compatibility: fitflow-task/v2
operational policy count: 1
direct legacy-policy consumers: 0
```

### WP-005 — Execution Observation Baseline

```yaml
wave: W3
status: PLANNING_PENDING_SPEC
result: Minimal structured, correlated, immutable execution evidence without duplicating Run State or introducing ranking
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget: {class: medium, policy: accepted_SPEC_plus_one_evidence_slice, expansion_limit: 2}
required_capabilities: [specification, schema_design, persistence, correlation, evidence_integrity]
model_suggestions:
  - {candidate: openai/gpt-5.6-sol, purpose: evidence_contract_and_correlation, reasoning_effort: high, binding: false}
model_evidence_required: [accepted_SPEC, schema_fixtures, persistence_tests, correlation_tests, unavailable_cases]
dependencies: [WP-004]
ownership: {terminal_acceptance: Developer, contracts_and_Run_Store: Tecnotron-ai}
gates: [WP-005_SPEC_accepted, observation_schema_validated, immutable_snapshot, RunEvent_correlation]
acceptance_criteria: [tecnotron_execution_observation_v1, usage_source_explicit, null_for_unavailable, content_hash_verified, RESULT_references_without_duplication]
stop_conditions: [ranking, fitness, extensive_telemetry, mutable_accepted_evidence, duplicated_Run_State]
```

Approved evidence composition:

```text
TASK + Run Store + RESULT + sanitized final artifact
```

The artifact uses `tecnotron-execution-observation/v1`, is correlated through
`usage_record_id`, carries a verifiable content hash, distinguishes provider,
estimated, and unavailable usage, and does not embed mutable Developer
acceptance or integration state.

### WP-006 — System Guide and Navigation

```yaml
wave: W4
status: PLANNING_PENDING_SPEC
result: Non-normative System Guide and verified navigation from SPEC through requirements, TASK, RESULT, and canonical sources
complexity: medium
criticality: medium
scope_fit: SPLIT_REQUIRED
context_budget: {class: large, policy: accepted_SPEC_plus_one_documentation_slice, expansion_limit: 2}
required_capabilities: [specification, documentation_architecture, link_validation, source_attribution]
model_suggestions:
  - {candidate: openai/gpt-5.6-sol, purpose: documentation_and_navigation, reasoning_effort: medium, binding: false}
model_evidence_required: [accepted_SPEC, link_validation, source_attribution_review, no_policy_drift]
dependencies: [WP-001, WP-002, WP-003, WP-004, WP-005]
ownership: {terminal_acceptance: Developer, documentation: Doc_Curator}
gates: [WP-006_SPEC_accepted, document_moves_validated, links_repaired, Guide_marked_derived]
acceptance_criteria: [portable_Markdown, no_Obsidian_dependency, traceable_SPEC_RF_TASK_RESULT, implemented_planned_deferred_distinguished, no_policy_created_by_Guide]
stop_conditions: [unsupported_claim, research_promoted_to_policy, broken_canonical_link, DONE_task_moved]
```

Documentation is reconstructed progressively from current sources. Archived
`tooling` content may be consulted explicitly but is never copied as authority.

### WP-007 — Milestone Closure and Promotion

```yaml
wave: W4
status: PLANNING_PENDING_DEPENDENCIES
result: Verifiable closure package for the Developer gate from tools to main
complexity: high
criticality: high
scope_fit: FIT_IF_NON_BEHAVIORAL
context_budget: {class: medium, policy: milestone_evidence_index_only, expansion_limit: 1}
required_capabilities: [audit, deterministic_validation, documentation, Git_operations, independent_review]
model_suggestions:
  - {candidate: openai/gpt-5.6-sol, purpose: closure_and_promotion_review, reasoning_effort: high, binding: false}
model_evidence_required: [complete_evidence_matrix, full_validation, remote_state_verification, no_undeclared_diff]
dependencies: [WP-000, WP-001, WP-002, WP-003, WP-004, WP-005, WP-006]
ownership: {terminal_acceptance: Developer, lifecycle_and_closure: Tecnotron-ai}
gates: [all_WPs_closed, all_required_reviews_complete, documentation_synchronized, Developer_promotion_authorization]
acceptance_criteria: [no_open_RF_without_disposition, integration_per_task_verifiable, clean_milestone_diff, FitFlow_changes_only_in_approved_TASKs]
stop_conditions: [blocking_finding, dirty_unowned_worktree, incomplete_requirement, divergent_PR_base, inferred_acceptance]
```

WP-007 has no SPEC while it remains non-behavioral. If closure requires new
behavior, it stops and enters the Change/SPEC Cycle.

## 6. Accepted planning decomposition

The following units are accepted as planning proposals, not executable TASKs.
They require the applicable accepted SPEC, fresh `task_base`, Architect
materialization, Developer READY gate, and Task Lifecycle isolation.

| Candidate TASK | WP | Planned result |
| --- | --- | --- |
| `TOF-W1-001` | WP-001 | Implement accepted `tecnotron-agent-profile/v1`, portable registry/schema, fixtures, contract tests and minimal contract documentation |
| `TOF-W1-002` | WP-002 | Nine project-scoped `.opencode/agents` profiles and static permission smokes |
| `TOF-W1-003` | WP-002 | Generic launcher, `tecnotron-agent-launch/v1`, and local OpenCode conformance |
| `TOF-W2-001` | WP-003 | SDD ADR, SPEC/WP/TASK templates, and validation |
| `TOF-W2-002` | WP-004 | Canonical `tecnotron-task-lifecycle/v1` contract, mapping, and tests |
| `TOF-W2-003` | WP-004 | Tecnotron lifecycle consumer migration |
| `TOF-W2-004` | WP-004 | Conditional FitFlow lifecycle consumer migration or evidence-backed cancellation |
| `TOF-W3-001` | WP-005 | Execution-observation schema and fixtures |
| `TOF-W3-002` | WP-005 | Run Store/RunEvent correlation and RESULT references |
| `TOF-W4-001` | WP-006 | Mechanical document moves and link repair |
| `TOF-W4-002` | WP-006 | Derived System Guide and requirement navigation |
| `TOF-W4-003` | WP-007 | Global conformance and promotion package |

These IDs do not authorize files, branches, worktrees, or implementation. A
phase is split again whenever ownership, repository, permissions, gate, result,
or context budget changes.

## 7. Milestone gates

- **G0 — Baseline:** canonical refs verified and milestone opened from
  `main@41088a413d06ed1d58d63d92320e38d4b44b86ea` through `tools`.
- **G0.5 — Cross-repository baseline:** Project Profile and registries
  source-validated, environment injection reproducible, and joint conformance
  accepted. `WP-000: DONE`.
- **G1 — Profile SPEC:** WP-001 SPEC accepted by the Developer.
- **G2 — Launcher:** WP-001 contracts, nine project-scoped profiles, one
  generic launcher, and positive/negative smokes accepted.
- **G3 — SDD:** WP-003 SPEC, templates, and authority model accepted.
- **G4 — Lifecycle migration:** `tecnotron-task-lifecycle/v1` is the sole
  operational policy and legacy compatibility is explicit.
- **G5 — Vertical cycle:** one real TASK completes the manual governed cycle
  through squash into `tools`.
- **G6 — Observation:** sanitized, correlated, immutable execution evidence is
  validated without duplicating Run State.
- **G7 — Guide:** navigation, links, source attribution, and derived Guide are
  validated.
- **G8 — Closure:** all eight WPs are closed and the Developer authorizes
  promotion.

## 8. SPEC approval gates

- [x] WP-001 SPEC approved by Developer and materialized at [WP-001 SPEC](../../work-packages/wp-001-operational-profile-contracts/SPEC.md); implementation and validation are complete, independent review passed, the Developer accepted the TASK, and PR #27 integrated it in `tools@d7e1e7e4784cae455782b38797c199e380173804`. Publication, promotion to `main`, and cleanup remain `NOT_RUN`.
- [x] WP-002 SPEC approved by Developer; `WP-002_SPEC_ACCEPTANCE` is satisfied, the WP PLAN is not materialized, and implementation authority has not been created.
- [ ] WP-003 SPEC approved by Developer.
- [ ] WP-004 SPEC approved by Developer.
- [ ] WP-005 SPEC approved by Developer.
- [ ] WP-006 SPEC approved by Developer.

WP-000 required no SPEC because it materialized existing accepted contracts.
WP-007 requires no SPEC while it only executes closure and promotion gates.
Candidate RF/RNF from the accepted Architecture Plan are clarification inputs;
they become governing requirements only when their individual SPEC is
materialized and accepted.

## 9. Compatibility and contract boundary

Existing `fitflow-*` contracts remain immutable during the transition. New
contracts use the accepted namespace and IDs:

```text
tecnotron-agent-profile/v1
tecnotron-agent-launch/v1
tecnotron-task-lifecycle/v1
tecnotron-execution-observation/v1
```

No published version changes meaning. Compatibility, migration, deprecation,
and eventual retirement are explicit. Direct operational use of
`fitflow-task/v2` ends through WP-004, while its compatibility parser/adapter
remains until a future ruling.

## 10. Review and evidence rules

Validator is always deterministic and never accepts work. Reviewer is required
for:

- cross-repository changes;
- schema, contract, state, or lifecycle changes;
- permissions or security boundaries;
- runtime or launcher boundaries;
- any risk trigger defined by an accepted SPEC or TASK.

Validation, review, Developer acceptance, integration, workflow state, and
lifecycle bookkeeping remain independent dimensions. `PASS` is not acceptance;
`PENDING_ACCEPTANCE` is not integration; only the Developer may authorize
integration or promotion.

Accepted execution evidence is:

```text
TASK + Run Store + RESULT + sanitized final artifact
```

`RESULT.md` summarizes and references evidence. It does not duplicate the event
log or Run State.

## 11. Closure and promotion criteria

Promotion from `tools` to `main` is allowed only when:

- WP-000 through WP-007 are closed;
- no requirement or finding lacks a disposition;
- deterministic validation passes or every unavailable check has an accepted
  disposition;
- all triggered independent reviews are complete;
- Developer acceptance is recorded;
- every task integration is verifiable;
- documentation and links are synchronized;
- FitFlow changes are limited to explicitly approved cross-repository TASKs,
  each with its own validation, review, acceptance, integration, and rollback;
- no historical implementation was recovered implicitly;
- the milestone diff contains no undeclared or unowned change;
- remote PR and base state are verified immediately before promotion.

## 12. Reconciliation record

This version supersedes the incomplete `1.0` materialization of this same
Milestone Plan. It does not supersede the accepted Architecture Plan or
Addendum.

```yaml
materialization_decision:
  subject: accepted_source_precedence
  decision: Apply Developer Acceptance Ruling over the Acceptance Revision Addendum, and the Addendum only over the original sections it explicitly supersedes.
  basis: The ruling accepts both documents and the Addendum section H enumerates its exact supersession scope.
  new_architectural_decision: false
---
materialization_decision:
  subject: WP-001_WP-002_boundary
  decision: Restore WP-001 as Operational Profile Contracts and WP-002 as Deterministic OpenCode Launchers; the nine project-scoped profiles and one generic launcher are delivered through WP-002 on top of WP-001 contracts.
  basis: Original Plan sections F through I plus Addendum sections E, G, and H.
  new_architectural_decision: false
---
materialization_decision:
  subject: WP-002_through_WP-007_recovery
  decision: Restore accepted names, results, waves, dependencies, gates, and planning proposals instead of PLANNING_PENDING_SPEC placeholders without outcomes.
  basis: Developer acceptance covers all eight Work Packages and the Addendum preserves non-superseded original-plan sections.
  new_architectural_decision: false
---
materialization_decision:
  subject: WP-000_execution_state
  decision: Preserve the accepted architecture while updating WP-000 from its original planning gate to DONE using post-acceptance RESULT, REVIEW, Developer acceptance, and integration evidence.
  basis: Tecnotron-ai tools@423714572af5332b2defa7265ff1514d0fd0c81a and FitFlow develop@0c092b927acc4c46e2059fc91d3606ea41f3c9af.
  new_architectural_decision: false
```

## 13. Milestone checklist

- [x] The milestone contains exactly WP-000 through WP-007.
- [x] The Developer accepted the original Architecture Plan and its Addendum.
- [x] WP-000 is accepted, reviewed, integrated, and closed before WP-001.
- [x] Namespace, compatibility, profile, launcher, evidence, and lifecycle
      rulings are represented.
- [x] WP-001–WP-007 names, outcomes, waves, dependencies, and gates are
      materialized without using historical `tooling` as authority.
- [ ] This corrected materialization is accepted and synchronized into `tools`.
- [ ] WP-001 through WP-006 each receive an individually accepted SPEC before
      executable TASK materialization.
- [ ] Cross-repository work uses independent baselines, worktrees, ownership,
      validation, review, acceptance, integration, and rollback.
- [ ] `tecnotron-task-lifecycle/v1` becomes the sole operational policy through
      the accepted compatibility and migration boundary.
- [ ] One real capability completes the vertical governed cycle.
- [ ] WP-000 through WP-007 close and the Developer explicitly authorizes
      promotion to `main`.

State of this corrected file materialization:

```text
ACCEPTED
```
