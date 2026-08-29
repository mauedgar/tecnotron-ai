---
document_id: TOF-WP-000-PLAN-001
status: accepted
owner: tecnotron-ai
type: work-package-plan
version: 1.0
updated: 2026-08-29
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-000
execution_status: DONE
baseline: 41088a413d06ed1d58d63d92320e38d4b44b86ea
integration_target: tools
integration:
  tecnotron_ai: tools@423714572af5332b2defa7265ff1514d0fd0c81a
  fitflow: develop@0c092b927acc4c46e2059fc91d3606ea41f3c9af
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget:
  class: large
  policy: one_repository_slice_and_its_conformance_evidence
  expansion_limit: 2
required_capabilities:
  - cross_repo_analysis
  - project_configuration
  - environment_resolution
  - deterministic_testing
  - documentation
  - independent_review
model_suggestions:
  - candidate: opencode/big-pickle
    purpose: cross_repo_reasoning
    binding: false
model_evidence_required:
  - bounded_result_on_equivalent_cross_repo_configuration_task
  - accurate_source_citations
  - negative_test_quality
  - no_scope_leakage
dependencies:
  - tools@41088a413d06ed1d58d63d92320e38d4b44b86ea
  - FitFlow active Project Profile and registries
  - dedicated execution worktrees per repository
ownership:
  terminal_acceptance: Developer
  project_profile_and_product_configuration: FitFlow
  resolver_and_ai_core_conformance: Tecnotron-ai
gates:
  - TOF-W0-001 before TOF-W0-002
  - source-level validation in the actual execution worktrees
  - independent gates for FitFlow and Tecnotron-ai
  - independent Reviewer before acceptance
acceptance_criteria:
  - explicit ownership and roots
  - conformant active registries
  - reproducible environment injection
  - cross-repo positive and negative conformance
  - compatibility boundaries remain intact
stop_conditions:
  - destructive overwrite or secret access
  - product behavior modification
  - dependency installation
  - unapproved schema or contract design
  - repository slice lacks an isolated worktree
related:
  - "[[milestones/tecnotron-operational-foundation-v1/PLAN]]"
  - "[[tasks/TOF-W0-001/TASK]]"
  - "[[tasks/TOF-W0-002/TASK]]"
accepted_at: 2026-08-29
accepted_by: Developer
---

# WP-000 Plan: Cross-repo Project Profile baseline

## 1. Purpose

WP-000 establishes the portable baseline that later work consumes. It covers:

- the FitFlow Project Profile;
- active registries and their ownership;
- explicit FitFlow, Tecnotron-ai, and environment roots;
- reproducible injection of `FF_PROJECT_ROOT`, `FF_PROJECT_PROFILE`, and
  `FF_AI_CORE_ROOT`;
- source-level FitFlow reading and validation;
- cross-repo conformance and compatibility boundaries;
- independent gates for each repository.

WP-000 does not implement W1, product behavior, new schemas, new contracts,
providers, routing, ranking, telemetry, or namespace migration.

## 2. Current evidence and unresolved execution gates

| Evidence | Status | Observation |
| --- | --- | --- |
| Tecnotron-ai integration | `PASS` | Accepted WP-000 changes integrated in `tools@423714572af5332b2defa7265ff1514d0fd0c81a`. |
| FitFlow integration | `PASS` | Accepted configuration and workspace changes integrated in `develop@0c092b927acc4c46e2059fc91d3606ea41f3c9af`. |
| Prompt-provided Codebase Memory evidence | `PASS` | Indexed evidence is retained as derived evidence, not source authority. |
| Codebase Memory MCP availability and reindex | `PASS` | Developer-confirmed correction: MCP server v0.10.8 is operational and the project is reindexed; direct source remains authoritative. |
| Source-level schema/test execution against current FitFlow | `PASS` | Active configuration loaded in cross-repo conformance; task evidence records positive and negative results. |
| Reproducible environment injection from `orca.yaml` | `PASS` | Fresh-worktree smoke demonstrated all three `FF_*` values through the supported `defaultTabs[].command` surface. |
| FitFlow configuration write | `PASS` | Minimal Profile and configuration documentation alignment integrated with the accepted WP-000 changes. |

The historical `ARCHITECT_REVISION_STATUS: PARTIAL` was superseded for WP-000 by
the completed task reviews and Developer acceptance. The source-level conformance
evidence is recorded in the two TASK `RESULT.md` and `REVIEW.md` files.

## 3. Approved sequence

```text
TOF-W0-001
  FitFlow Project Profile and Active Configuration
        |
        v
TOF-W0-002
  Project Resolution, Environment Injection and Cross-Repo Conformance
```

No third TASK is approved. Both TASK IDs are coordination contracts with
`scope_fit: SPLIT_REQUIRED`; repository-scoped execution slices must be assigned
before implementation without silently broadening either contract.

## 4. Repository execution contract

The following values are planning inputs, not authorization to write from this
bootstrap worktree.

| Repository | Planning baseline | Execution branch/worktree | Scope and paths | Permissions | Validation | Integration | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tecnotron-ai | `41088a413d06ed1d58d63d92320e38d4b44b86ea` / `tools` | Fresh task-scoped branch and worktree pinned by Task Lifecycle | Approved resolver, tests, doctor, and task evidence paths only | AI Core code/tests/docs only under the assigned repository slice | Unit, contract, integration, negative resolution, `git diff --check` | Developer acceptance, then PR to `tools`; promotion to `main` only at milestone gate | Revert only task-owned changes through Task Lifecycle; preserve unrelated work |
| FitFlow | observed `ff71ae28c9b2e33c8e87f5c0b53af88f1d562dfe` on `develop`; fresh baseline required at execution | Fresh task-scoped branch and worktree required | `.ai/config/project-profile.yaml`, config README, approved active registries when evidence requires alignment, and `orca.yaml` only where assigned | Product configuration/docs only; no product functionality, secrets, or `.env` | Source read, schema/load conformance from Tecnotron-ai, injection smoke, `git diff --check` | Independent FitFlow gate and Developer acceptance before its normal integration flow | Restore task-owned config through versioned change; never overwrite unrelated dirty state |

Each repository slice must record baseline, branch, worktree, scope, paths,
permissions, validation, integration, and rollback before writing. A fresh FitFlow
baseline is mandatory because the observed checkout is dirty and is not a
task-scoped worktree.

## 5. Gates

### G0 — Isolation and ownership

- Pin fresh repository heads.
- Create or select one exclusive task worktree per written repository.
- Record and preserve pre-existing changes.
- Assign repository-scoped ownership and Reviewer independence.

### G1 — FitFlow source baseline

- Validate `fitflow-project-profile/v1` from direct source.
- Validate active versions:
  `fitflow-role-registry/v3`, `fitflow-model-registry/v3`,
  `fitflow-finops/v1`, and `fitflow-orchestrator/v2`.
- Reconcile ownership, authority, roots, environment fields, documentation, and
  actual source without using the derived index as authority.
- Preserve `fitflow-*` compatibility and paid API disabled.

### G2 — Reproducible injection

- Demonstrate all three environment values in a newly created task worktree.
- Demonstrate that values identify the active worktrees and profile, not the
  persistent main checkouts or a sibling-directory assumption.
- Add negative cases for missing, conflicting, stale, or unavailable paths.
- Stop if Orca cannot provide a documented deterministic injection surface
  without secrets or dependency installation.

### G3 — Cross-repo conformance

- `resolveProject` remains the sole project/root boundary.
- Profile and all active registries load from the explicit active FitFlow root.
- Positive and negative tests run independently for each repository slice.
- No test contacts a model/provider or enables paid API.

### G4 — Review and acceptance

- Independent Reviewer assesses cross-repo ownership, schemas/contracts if any,
  lifecycle impact, negative tests, and preservation of unrelated work.
- Validation reports `PASS`, `FAIL`, `UNAVAILABLE`, or `NOT_RUN`.
- Developer decides acceptance. `PASS` does not integrate either repository.

## 6. Compatibility boundary

WP-000 consumes the existing Profile and registry schemas. It does not introduce
the candidate `tecnotron-*` contracts. If source conformance requires a schema
or contract change, execution stops for a new Developer ruling and independent
review; no local compatibility patch is permitted.

## 7. Work Package acceptance checklist

- [x] Project identity, authority, product ownership, AI Core ownership, and
      environment ownership are explicit and source-validated.
- [x] Product and AI Core roots resolve without sibling-directory inference.
- [x] Active registry versions and ownership are consistent and validated.
- [x] The three environment variables are injected reproducibly in fresh
      worktrees without reading or modifying secrets.
- [x] Positive and negative cross-repo conformance tests pass or are reported
      accurately as `FAIL`, `UNAVAILABLE`, or `NOT_RUN`.
- [x] FitFlow and Tecnotron-ai have independent validation and integration gates.
- [x] Existing `fitflow-*` contracts remain compatible and no new schema or
      contract was introduced without approval.
- [x] Independent review is complete.
- [x] Developer acceptance is explicit and both repository integrations are complete.

## 8. Materialization decisions

```yaml
materialization_decision:
  subject: current_direct_FitFlow_read
  decision: Record direct source reads as planning evidence while retaining the historical PARTIAL architecture-review status and execution conformance gates.
  basis: Real files were readable, but implementation tests and task-worktree conformance were not run.
  uncertainty: The observed dirty develop checkout is not the future execution baseline.
  future_confirmation_required: true
---
materialization_decision:
  subject: repository_execution_slices
  decision: Keep the two approved TASK IDs as coordination contracts and require separately owned repository slices before writes.
  basis: Repository baselines, worktrees, permissions, gates, integration, and rollback differ.
  uncertainty: Slice identifiers and future exact SHAs are lifecycle inputs not approved here.
  future_confirmation_required: true
```
