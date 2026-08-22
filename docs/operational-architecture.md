---
status: canonical
owner: fitflow-ai
type: architecture
updated: 2026-08-21
related:
  - "[[architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Operational Architecture

## 1. Purpose

Define the stable operational architecture used to plan, isolate, execute, validate, and integrate work across FitFlow and FitFlow-ai without coupling the system to a specific workspace tool, agent runtime, model provider, code-intelligence implementation, or planning provider.

This document defines responsibilities and boundaries. Tool-specific procedures belong in adapters, implementation documentation, or current-state documentation.

## 2. Governing principles

### Deterministic-first

Prefer deterministic mechanisms whenever the same result can be obtained without LLM reasoning.

An LLM is used when semantic interpretation, synthesis, planning, implementation, or review requires reasoning that deterministic tooling cannot provide with equivalent quality.

### Replaceable ownership

Every operational capability must have:
- one explicit owner;
- a clear input/output boundary;
- a replaceable implementation;
- no hidden ownership over another layer.

### Tool does not define architecture

A tool may implement a capability but must not become the architectural source of truth.

A new tool is accepted only when:
- a reproducible gap exists; or
- it allows an existing implementation to be removed or reduced;
- its ownership fits one existing layer;
- it can remain replaceable;
- its benefit can be measured when appropriate.

### Source remains authoritative

Derived indexes, caches, embeddings, generated context packages, agent sessions, dashboards, and workspace metadata are not source of truth.

## 3. Operational model

```text
Developer
    |
Planning / Task
    |
Task Lifecycle
    |
Workspace / Isolation
    |
Agent Runtime
    |
Context System
    |
Model Provider
    |
Validation / Integration
```

The layers are logically independent. Their current implementations may cooperate but must not collapse into a single runtime.

## 4. Developer

`Developer` is the canonical term for the actor with terminal authority.

The Developer owns:
- acceptance decisions;
- architectural decisions;
- exceptional overrides;
- final approval gates when required;
- promotion of researched or proposed information into canonical project documentation.

Do not use `Human` as an active operational role name.

## 5. Planning / Task

A Task represents the requested unit of work and its acceptance criteria.

Current planning and integration are based on GitHub Issues, Projects, Pull Requests, and Actions where available.

The planning provider is replaceable and is not part of FitFlow product architecture.

## 6. Task Lifecycle

Task Lifecycle owns deterministic orchestration around a task:
- task metadata resolution;
- repository and base resolution;
- branch/worktree preparation;
- task state transitions;
- Git operations;
- GitHub integration;
- post-acceptance commit/push/PR flow;
- cleanup.

Task Lifecycle does not own implementation or semantic review.

The detailed contract is defined in [[task-lifecycle]].

## 7. Workspace and isolation

### Workspace / Session Control Plane

Orca currently owns:
- repository registration;
- workspace creation;
- terminals;
- concurrent sessions;
- restore/hibernation;
- diff and lifecycle-oriented navigation.

Orca is replaceable and is not an architectural source of truth.

### Isolation boundary

Git worktree is the isolation boundary for write tasks.

A task that writes code or canonical documentation uses a task-scoped Git worktree unless an explicit exception is approved.

Orca Folder Workspaces may provide multi-repo context and navigation. They are not an isolation boundary.

### Lifecycle independence

These lifecycles are distinct:

```text
Workspace lifecycle
!= Git lifecycle
!= Agent session lifecycle
!= Code-intelligence lifecycle
```

A workspace may close without deleting a worktree.
A worktree may be removed without defining agent-session behavior.
A code-intelligence index may be rebuilt or cleaned without modifying Git history.

Tool limitations must be solved inside the owning adapter/lifecycle instead of changing unrelated architectural boundaries.

## 8. Agent Runtime

The Agent Runtime executes a task.

OpenCode is the preferred current runtime while it provides value, but it is interchangeable.

The Agent Runtime does not own:
- workspace identity;
- Git isolation;
- Task Lifecycle;
- source of truth;
- model inference;
- code-intelligence indexes.

## 9. Coder role

`Coder` is the logical implementation role family.

The executable role registry keeps its concrete role identifiers, including:
- `coder_b`;
- `coder_a`;
- `coder_strong_a`.

This document does not replace or rename the role registry.

Coder responsibilities:
- inspect task-scoped context;
- implement the requested change;
- execute task-relevant validation available to the role;
- report evidence, limitations, and unresolved gaps.

Coder does not own administrative Task Lifecycle operations.

Coder is a role, not necessarily a specific LLM. The implementation may change while the responsibility remains stable.

## 10. Context System

The Context System owns retrieval and delivery of minimum sufficient and verifiable context.

Its logical components include:
- ContextPackager;
- CodeIntelligencePort;
- deterministic document navigation/retrieval;
- semantic document retrieval when justified;
- repo-packager materialization.

The Context System is independent from the Agent Runtime and Model Provider.

The detailed policy is defined in [[context-strategy]].

## 11. Model Provider

The Model Provider owns inference only.

A provider may be local or cloud.

Changing provider or model must not change:
- repository identity;
- workspace topology;
- Task Lifecycle;
- canonical documentation;
- context contracts.

## 12. Validation and integration

Deterministic validation is preferred whenever possible.

Validation may include:
- tests;
- linting;
- type checks;
- contract checks;
- Git diff checks;
- schema validation;
- reproducible task-specific verification.

The `validator` role remains deterministic according to the role registry.

Developer acceptance gates integration when required by Task Lifecycle.

## 13. Product and AI Core boundary

FitFlow and FitFlow-ai remain independent Git repositories.

FitFlow owns the product, product-domain architecture, product state, and product-specific configuration.

FitFlow-ai owns AI Core architecture, tooling, context policies, adapters, operational contracts, and AI Core implementation state.

FitFlow-ai may operate on FitFlow.

FitFlow must not gain a product dependency on FitFlow-ai merely to simplify tooling.

## 14. Canonical Markdown and Obsidian

Canonical project knowledge is stored as versioned Markdown in Git.

Obsidian is a Developer-facing navigation and knowledge interface over those files. It is not source of truth and must not be required for the files to remain usable.

Canonical Markdown should prefer portable metadata and explicit relationships that are useful both with and without Obsidian.

Recommended metadata:

```yaml
status: canonical
owner: fitflow-ai
type: architecture
updated: YYYY-MM-DD
related:
  - "[[other-document]]"
```

Useful deterministic patterns:
- frontmatter/property filtering;
- explicit links;
- index-to-drill-down navigation;
- backlink inspection;
- canonical/planned/superseded classification;
- documentation linting.

No Obsidian plugin may become an architectural dependency.

## 15. Documentation linting

Documentation maintenance should detect deterministically where practical:
- invalid or missing required metadata;
- broken internal links;
- canonical documents not reachable from the source-of-truth index;
- stale status values;
- contradictory implementation-state declarations;
- orphaned canonical documents;
- references to superseded operational assumptions.

LLM review may supplement these checks but must not replace deterministic checks that can be expressed reliably.

## 16. Architecture change gate

The operational architecture is not reopened merely because a new tool appears.

A change requires at least one of:
- a reproducible capability gap;
- a measurable failure of the current design;
- a clear reduction in implementation or operational complexity;
- a material new requirement that existing boundaries cannot represent.

Implementation details may change without reopening this architecture when the existing contracts remain valid.
