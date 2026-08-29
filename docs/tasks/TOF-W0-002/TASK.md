---
document_id: TOF-TASK-W0-002
status: planned
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-08-29
machine_context: true
task_id: TOF-W0-002
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
  policy: resolver_injection_and_one_conformance_slice
  expansion_limit: 2
required_capabilities:
  - cross_repo_resolution
  - environment_injection
  - node_testing
  - negative_testing
  - lifecycle_boundary_analysis
  - independent_review
model_suggestions:
  - candidate: opencode/big-pickle
    purpose: cross_repo_failure_mode_reasoning
    binding: false
model_evidence_required:
  - equivalent_resolver_task_result
  - negative_case_coverage
  - deterministic_validation_quality
  - scope_and_permission_adherence
dependencies:
  - TOF-W0-001 accepted
  - source-valid active FitFlow configuration
  - dedicated FitFlow and Tecnotron-ai execution worktrees
ownership:
  terminal_acceptance: Developer
  environment_injection_surface: FitFlow workspace configuration
  resolver_and_conformance: Tecnotron-ai
gates:
  - TOF-W0-001 accepted
  - repository execution slices assigned
  - deterministic injection mechanism demonstrated
  - independent Reviewer
acceptance_criteria:
  - all spec checkboxes are evidenced
  - positive and negative worktree conformance is reproducible
  - repository gates remain independent
stop_conditions:
  - injection requires secrets or undocumented destructive behavior
  - product behavior, new schema, or new contract is required
  - unrelated dirty work would be overwritten
  - dependency installation is required
related:
  - "[[work-packages/wp-000-cross-repo-project-profile-baseline/PLAN]]"
  - "[[tasks/TOF-W0-002/PLAN]]"
---

# TASK TOF-W0-002: Project Resolution, Environment Injection and Cross-Repo Conformance

## 1. Objective

Demonstrate reproducible project resolution in fresh worktrees by injecting:

```text
FF_PROJECT_ROOT
FF_PROJECT_PROFILE
FF_AI_CORE_ROOT
```

The active values must identify the execution worktrees and real FitFlow Profile.
Tecnotron-ai must resolve them through the existing `resolveProject` boundary,
load the active configuration, and pass positive and negative cross-repo
conformance without assuming sibling paths.

## 2. Preconditions

- `TOF-W0-001` is accepted by the Developer.
- FitFlow active configuration is source-valid.
- Each repository has a fresh, exclusive execution worktree and recorded dirty
  state.
- The supported workspace injection surface is verified from real Orca behavior
  or documentation before it is changed; copying `.env` alone is insufficient
  evidence and secrets must not be read.

## 3. In scope

- Existing `resolveProject` behavior for explicit options and environment values.
- A minimal, documented, deterministic injection mechanism owned by the FitFlow
  workspace configuration where supported.
- Positive and negative conformance for explicit root/profile combinations,
  stale/missing paths, and conflicting inputs.
- Loading Profile and active registries from the resolved FitFlow root.
- Independent FitFlow and Tecnotron-ai validation and integration gates.

## 4. Out of scope

- New Project Profile schema, new contracts, lifecycle implementation, W1,
  product functionality, providers, model calls, routing changes, ranking,
  telemetry, global configuration, or dependency installation.
- Reading or changing `.env` or any secret.
- Persisting task-worktree paths in the long-lived Project Profile.
- Parallel active operational policies or namespace migration.

## 5. Repository contracts

### FitFlow execution slice

```yaml
baseline: pin fresh accepted TOF-W0-001 FitFlow head before execution
branch: task-scoped feature branch required
worktree: exclusive task worktree required
scope: reproducible workspace injection and its narrow documentation
paths:
  - orca.yaml
  - .ai/config/README.md
  - .ai/config/project-profile.yaml
permissions: workspace_configuration_and_documentation_only; no_product_code; no_secrets
validation: fresh-worktree injection smoke, missing-input negative smoke, git diff --check
integration: independent FitFlow gate followed by Developer acceptance and normal FitFlow lifecycle
rollback: remove only task-owned injection/config documentation changes through versioned rollback
```

The Profile path is listed only for a narrowly demonstrated coherence update.
Task-worktree paths must not be persisted there.

### Tecnotron-ai execution slice

```yaml
baseline: pin accepted TOF-W0-001 head on tools before execution
branch: task-scoped feature branch required
worktree: exclusive task worktree required
scope: resolver hardening and cross-repo conformance within existing contracts
paths:
  - src/project-profile/**
  - scripts/doctor/lib/**
  - scripts/doctor/tests/**
  - tests/contract/registries.test.js
  - tests/integration/routing.test.js
  - tests/integration/runtime-conformance.test.js
  - tests/integration/agent-mvp.test.js
  - docs/tasks/TOF-W0-002/**
permissions: AI_Core_code_tests_and_task_docs_only; no_schema_or_contract_change
validation: resolver unit/doctor tests, registry contracts, active-config integration, negative cases, git diff --check
integration: explicit Developer acceptance then PR to tools
rollback: revert only task-owned resolver/tests/evidence without changing accepted TOF-W0-001 configuration
```

## 6. Verifiable requirements

These `spec-*` items are TASK requirements, not a separate functional SPEC.

- [ ] spec-1: Record fresh per-repository baseline, branch, worktree, scope,
      paths, permissions, validation, integration, rollback, and pre-existing
      changes before writing.
- [ ] spec-2: Demonstrate deterministic injection of all three variables into a
      newly created task worktree without reading or modifying secrets.
- [ ] spec-3: Demonstrate injected values point to the active FitFlow and
      Tecnotron-ai worktrees and the active FitFlow Profile.
- [ ] spec-4: Demonstrate `resolveProject` uses explicit options/environment and
      does not infer sibling checkout topology.
- [ ] spec-5: Demonstrate Profile and all active registries load from the
      resolved FitFlow config directory with paid API disabled.
- [ ] spec-6: Negative tests cover missing/unavailable roots, missing Profile,
      conflicting root/profile inputs, and stale main-checkout values without
      silent fallback to an unrelated checkout.
- [ ] spec-7: Task-worktree paths are not persisted in the long-lived Profile and
      no global configuration is introduced.
- [ ] spec-8: FitFlow and Tecnotron-ai validation outcomes are reported
      independently as `PASS`, `FAIL`, `UNAVAILABLE`, or `NOT_RUN`.
- [ ] spec-9: Existing `fitflow-*` compatibility, `fitflow-task/v2` immutability,
      and the future single-policy lifecycle boundary remain unchanged.
- [ ] spec-10: Independent Reviewer verifies cross-repo isolation, failure modes,
      lifecycle boundary, and evidence before Developer acceptance.

## 7. Acceptance and evidence

Required evidence includes fresh-worktree creation inputs, sanitized environment
key presence and resolved paths (never secret values), resolver output, registry
load results, positive and negative test commands, per-repository diffs,
`git diff --check`, independent review, and sanitized final result.

No full event log is duplicated in `RESULT.md`. The execution role stops at
`PENDING_ACCEPTANCE`; integration remains a later Developer-authorized lifecycle
operation.

## 8. Stop conditions

Stop and escalate if the real workspace tool cannot inject these values through
a documented deterministic surface, if secrets or `.env` inspection would be
required, if a new schema/contract or product change is needed, if existing work
would be overwritten, or if either repository lacks an isolated write surface.
