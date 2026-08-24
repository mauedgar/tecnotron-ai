---
status: canonical
owner: fitflow-ai
type: workflow
updated: 2026-08-24
related:
  - "[[operational-architecture]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Task Lifecycle

## 1. Purpose

Define the lifecycle of a bounded development or documentation task from planning input to integration and cleanup.

The lifecycle prioritizes deterministic orchestration and removes repetitive Git/GitHub administration from the Coder role.

## 2. Principle

Task administration is deterministic whenever possible.

Semantic work belongs to the appropriate reasoning role.
Mechanical state transitions, Git operations, and provider updates belong to Task Lifecycle.

## 3. Lifecycle

```text
DISCOVERED
    |
READY
    |
STARTED
    |
WORKING
    |
VALIDATED
    |
PENDING_ACCEPTANCE
    |
Developer gate
    |
ACCEPTED
    |
INTEGRATING
    |
DONE
    |
CLEANUP
```

A concrete implementation may use provider-specific status names, but it must preserve the semantic meaning of these transitions.

## 4. Responsibility split

### Deterministic Task Lifecycle

Owns:
- read task metadata;
- resolve repository identity;
- resolve integration base;
- create or select task branch;
- create task-scoped worktree;
- record task/worktree association;
- update provider task state;
- verify Git cleanliness and expected branch;
- execute configured deterministic pre-integration checks;
- commit after acceptance when policy permits;
- push;
- create or update Pull Request;
- link task and Pull Request;
- update GitHub Project fields;
- cleanup task-scoped worktree when integration policy permits.

### Coder

Owns:
- implementation;
- task-scoped reasoning;
- code/document edits;
- implementation-specific validation;
- evidence report.

Coder does not own routine GitHub Project administration or lifecycle bookkeeping.

### Reviewer

Owns independent semantic review when required by task policy.

Reviewer does not write product code.

### Validator

Owns deterministic validation.

The role registry remains authoritative for concrete role identifiers and permissions.

### Developer

Owns:
- terminal acceptance authority;
- architecture decisions;
- exceptional overrides;
- rejection or acceptance of work before integration when a gate is required.

## 5. Worktree policy

A write task owns one task-scoped Git worktree per repository it writes.

Task worktrees are normally ephemeral.

Do not persist task worktrees merely to accommodate cache or indexing limitations of another tool.

A multi-repo task may use paired worktrees, one in each repository, correlated by the same task identity.

An Orca Folder Workspace may be used for read/context coordination across repositories but does not replace the worktrees.

## 6. Task start contract

Conceptual input:

```yaml
task_id: string
repository: logical-repository-id
base_ref: logical-or-git-ref
write_scope:
  - path-or-repository
```

Conceptual output:

```yaml
task_id: string
branch: string
worktree_root: path
base_commit: sha
provider_state: STARTED
```

Project/repository/root resolution must use the portable infrastructure defined by the Project Profile and related contracts. Task Lifecycle must not hardcode workstation-specific sibling paths.

## 7. Work contract

The Coder receives:
- task content;
- acceptance criteria;
- resolved worktree;
- allowed write scope;
- context package or retrieval access;
- validation commands/policy relevant to the task.

The Coder should not be required to reconstruct workspace topology or planning-provider state.

## 8. Validation contract

Validation evidence must distinguish:
- `PASS`;
- `FAIL`;
- `NOT_RUN`;
- `UNAVAILABLE`.

An unavailable tool or dependency must not be reported as PASS.

Task-specific deterministic validation should be executed before acceptance when feasible.

## 9. Acceptance gate

`PENDING_ACCEPTANCE` means implementation and available validation are complete but integration is not yet authorized.

The Developer may:
- accept;
- reject;
- request revision;
- explicitly waive a non-critical unavailable check with rationale.

No automatic merge is implied by Coder completion.

## 10. Integration contract

After acceptance, deterministic operations may perform:

```text
verify expected task/worktree
-> git diff --check / configured gates
-> commit
-> push
-> create/update PR
-> link task
-> update Project state
```

### 10.1 Active integration baseline

`tooling` is the active integration baseline. Feature branches start from
`tooling` and return to `tooling` through Pull Requests using task-scoped
worktrees.

`main` is not a daily integration branch. It receives accepted milestones only
through deliberate `tooling` to `main` Pull Requests merged with merge commits.

Commit messages are written in Spanish.

Task Lifecycle must not silently force-merge unrelated histories or bypass branch protections.

## 11. Cleanup contract

Cleanup may remove:
- task-scoped worktree;
- task-local temporary artifacts;
- derived context packages;
- derived code-intelligence state that explicitly belongs to the removed worktree and is safe to discard.

Cleanup must not delete:
- canonical source;
- accepted Git history;
- reusable source-of-truth documentation;
- unrelated caches or indexes.

Derived-tool cleanup belongs to the adapter that owns the derived state.

## 12. GitHub integration

GitHub is the current planning/integration provider.

Deterministic operations should prefer GitHub API or `gh` CLI adapters for:
- Issues;
- Projects;
- Pull Requests;
- labels/fields;
- links and state transitions.

An LLM or MCP agent is not required for mechanical GitHub operations that can be expressed deterministically.

If a future provider or LLM+MCP implementation replaces part of this workflow, it must preserve the same Task Lifecycle contract.

## 13. Semantic transformation

A model may be used when unstructured input must be transformed semantically, for example:
- draft task title;
- normalize task description;
- infer proposed acceptance criteria.

Model output must be validated against a deterministic schema before provider writes.

The model does not gain ownership of Task Lifecycle by performing this transformation.

## 14. Observability

Each lifecycle run should eventually expose enough structured evidence to reconstruct:
- task id;
- repository;
- branch;
- base commit;
- worktree;
- state transitions;
- validation outcomes;
- acceptance outcome;
- PR/integration reference;
- cleanup result.

The exact persistence mechanism is an implementation concern.

## 15. Implementation status

This document defines the canonical logical lifecycle.

Automation of the lifecycle is planned and should be implemented only after the portable project/root contracts are available.

The implementation should remain small and use existing Git, GitHub, and workspace capabilities rather than replacing them.
