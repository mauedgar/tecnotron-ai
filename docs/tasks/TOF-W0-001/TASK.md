---
document_id: TOF-TASK-W0-001
status: planned
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-08-29
machine_context: true
task_id: TOF-W0-001
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-000
execution_readiness: NOT_READY
baseline: 41088a413d06ed1d58d63d92320e38d4b44b86ea
integration_target: tools
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget:
  class: large
  policy: FitFlow_source_plus_Tecnotron_schema_and_test_boundary
  expansion_limit: 2
required_capabilities:
  - cross_repo_configuration_analysis
  - yaml_and_schema_validation
  - ownership_reasoning
  - deterministic_testing
  - documentation
  - independent_review
model_suggestions:
  - candidate: opencode/big-pickle
    purpose: configuration_and_compatibility_reasoning
    binding: false
model_evidence_required:
  - equivalent_configuration_task_result
  - source_citation_accuracy
  - negative_validation_cases
  - scope_containment
dependencies:
  - WP-000 planning accepted
  - dedicated FitFlow and Tecnotron-ai execution worktrees
ownership:
  terminal_acceptance: Developer
  FitFlow_configuration: FitFlow
  conformance_and_task_evidence: Tecnotron-ai
gates:
  - repository execution slices assigned
  - fresh baselines pinned
  - source-level validation
  - independent Reviewer
acceptance_criteria:
  - all spec checkboxes are evidenced
  - active configuration remains compatible
  - repository gates are independently reported
stop_conditions:
  - product behavior or secret access is required
  - unrelated dirty work would be overwritten
  - a schema or contract change becomes necessary
  - dependency installation is required
related:
  - "[[work-packages/wp-000-cross-repo-project-profile-baseline/PLAN]]"
  - "[[tasks/TOF-W0-001/PLAN]]"
---

# TASK TOF-W0-001: FitFlow Project Profile and Active Configuration

## 1. Objective

Establish a source-validated FitFlow Project Profile and coherent active
configuration baseline that explicitly identifies roots, authority, ownership,
operational locations, specification state, feature flags, and environment
inputs consumed by Tecnotron-ai.

This TASK is a coordination contract. Because it crosses repository ownership
and evidence boundaries, implementation must first assign repository-scoped
execution slices. This document does not authorize implementation from the
planning bootstrap worktree.

## 2. In scope

- Directly read and validate the active FitFlow Profile and registries.
- Reconcile source with `fitflow-project-profile/v1` and existing registry
  schemas without creating a new schema.
- Make ownership for FitFlow, Tecnotron-ai, and environment injection explicit
  using only fields supported by approved contracts.
- Confirm explicit product and AI Core roots and the profile path.
- Align narrowly related active configuration or documentation only when source
  evidence demonstrates a mismatch within the assigned execution slice.
- Validate compatibility of active `fitflow-*` namespaces and paid API disabled.
- Produce independent validation and review evidence per repository.

## 3. Out of scope

- W1, Agent Profiles, launcher, runtime, Router, providers, ranking, telemetry,
  product functionality, or global configuration.
- New fields that require an unapproved schema or contract.
- Namespace migration, contract publication, or `fitflow-task/v2` changes.
- Secrets, `.env` content, dependency installation, historical TASK repair, or
  unrelated cleanup.

## 4. Repository contracts

### FitFlow execution slice

```yaml
baseline: observed develop@ff71ae28c9b2e33c8e87f5c0b53af88f1d562dfe; pin fresh SHA before execution
branch: task-scoped feature branch required
worktree: exclusive task worktree required
scope: active Project Profile, active registry coherence, and narrow config documentation
paths:
  - .ai/config/project-profile.yaml
  - .ai/config/README.md
  - .ai/config/roles.yaml
  - .ai/config/models.yaml
  - .ai/config/finops.yaml
  - .ai/config/orchestrator.yaml
permissions: configuration_and_documentation_only; no_product_code; no_secrets
validation: direct source read, existing schema/load checks, compatibility checks, git diff --check
integration: independent FitFlow gate followed by explicit Developer acceptance and normal FitFlow lifecycle
rollback: revert only task-owned versioned changes; preserve pre-existing work
```

Registry edits are not automatic. They are permitted only when a demonstrated
source mismatch is inside this TASK and can be corrected without changing an
approved schema, contract, routing behavior, model binding, or FinOps policy.

### Tecnotron-ai execution slice

```yaml
baseline: tools@41088a413d06ed1d58d63d92320e38d4b44b86ea
branch: task-scoped feature branch required
worktree: exclusive task worktree required
scope: conformance tests and task evidence; no resolver behavior change
paths:
  - tests/contract/registries.test.js
  - tests/integration/routing.test.js
  - tests/integration/runtime-conformance.test.js
  - docs/tasks/TOF-W0-001/**
permissions: tests_and_documentation_only
validation: contract tests, active-config integration test, negative cases, git diff --check
integration: explicit Developer acceptance then PR to tools
rollback: revert only task-owned tests/evidence; preserve planning and unrelated work
```

If implementation needs a Tecnotron-ai schema or loader change, stop and request
a Developer ruling rather than expanding these paths.

## 5. Verifiable requirements

These `spec-*` items are TASK requirements, not a separate functional SPEC.

- [ ] spec-1: Record fresh branch, HEAD, status, worktree, pre-existing changes,
      and assigned ownership for each repository before writing.
- [ ] spec-2: Validate the real Profile as `fitflow-project-profile/v1` and cite
      the source path and execution baseline.
- [ ] spec-3: Validate the real active registry versions as role v3, model v3,
      FinOps v1, and orchestrator v2 using existing loaders/schemas.
- [ ] spec-4: Demonstrate explicit FitFlow root, Tecnotron-ai root, Project
      Profile path, and ownership without sibling-directory inference.
- [ ] spec-5: Confirm active configuration preserves `paid_api_enabled: false`,
      existing `fitflow-*` compatibility, and immutable `fitflow-task/v2`.
- [ ] spec-6: Any configuration edit is minimal, source-justified, inside the
      assigned paths, and does not overwrite pre-existing work.
- [ ] spec-7: Positive and negative validation results use `PASS`, `FAIL`,
      `UNAVAILABLE`, or `NOT_RUN` and are separated by repository.
- [ ] spec-8: Independent Reviewer verifies cross-repo ownership, compatibility,
      scope containment, and evidence before Developer acceptance.

## 6. Acceptance and evidence

Required evidence:

- exact baselines and clean ownership diff per repository;
- schema/loader command, inputs, and output summary;
- source citations for each Profile/registry assertion;
- negative cases for malformed or unsupported versions;
- `git diff --check` per written repository;
- independent `REVIEW.md` findings and verdict;
- sanitized `RESULT.md` without a duplicated event log.

`PASS` does not imply acceptance or integration. The terminal state available to
the execution role is `PENDING_ACCEPTANCE`.

## 7. Stop conditions

Stop and escalate to the Developer if any continuation requires product code,
secrets, dependency installation, destructive overwrite, an unapproved schema
or contract, expanded paths, a non-isolated write, or a compatibility break.
