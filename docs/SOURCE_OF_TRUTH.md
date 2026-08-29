---
status: canonical
owner: fitflow-ai
type: reference
updated: 2026-08-29
related:
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Source Of Truth

This is the deterministic navigation and precedence index for canonical
FitFlow-ai documentation. Derived indexes, generated packages, caches, agent
sessions, workspace metadata, and Obsidian views are not source of truth.

| Document | Authority |
| --- | --- |
| [Architecture](architecture.md) | Stable AI Core architectural invariants and repository boundary. |
| [Operational Architecture](operational-architecture.md) | Operational responsibilities, replaceable implementations, and control-plane boundaries. |
| [Task Lifecycle](task-lifecycle.md) | Logical lifecycle, worktree policy, acceptance, integration, and cleanup contracts. |
| [Context Strategy](context-strategy.md) | Context objective, retrieval policy, telemetry, and evaluation gates. |
| [Current State](current-state.md) | Confirmed implementation reality and validation evidence only. |
| [Implementation Roadmap](implementation-roadmap.md) | Sequencing and planned implementation work. |
| [Milestone tecnotron-operational-foundation-v1](milestones/tecnotron-operational-foundation-v1/PLAN.md) | Accepted milestone planning at baseline `41088a4`; integrates through `tools` and promotes accepted milestones to `main`. |
| [WP-000 Cross-repo Project Profile Baseline](work-packages/wp-000-cross-repo-project-profile-baseline/PLAN.md) | Accepted non-implementation plan for the mandatory Project Profile, environment injection, and cross-repo conformance predecessor. |
| [Task TOF-W0-001](tasks/TOF-W0-001/TASK.md) | Scope contract for FitFlow Project Profile and active configuration planning. |
| [Task TOF-W0-002](tasks/TOF-W0-002/TASK.md) | Scope contract for project resolution, environment injection, and cross-repo conformance planning. |
| [Task FF-AI-VNEXT-008](tasks/FF-AI-VNEXT-008/TASK.md) | Canonical definition, ownership, acceptance criteria, and scope boundary for Explorer and Agent Runtime conformance. |
| [Task FF-AI-VNEXT-009](tasks/FF-AI-VNEXT-009/TASK.md) | Canonical definition, ownership, acceptance criteria, and scope boundary for Agent MVP composition root and documentation sync. |
| [Compatibility Baseline](compatibility-baseline.md) | Observed tool compatibility and reproducible baseline evidence. |
| [Development Pipeline Adapter](development-pipeline-adapter.md) | Canonical adapter boundary and current adapter status. |
| Role registry v3 | Current role IDs and fixed deterministic routing policy. Version v2 is unsupported. The executable schema is [`src/registries/schemas/roles.js`](../src/registries/schemas/roles.js); active `roles.yaml` is owned by FitFlow. |
| Model registry v3 | Explicit model eligibility and deterministic selection metadata. Version v2 is unsupported. The executable schema is [`src/registries/schemas/models.js`](../src/registries/schemas/models.js); active `models.yaml` is owned by FitFlow. |

When documents disagree, resolve by subject authority in this table. Current
State does not promote planned architecture to implementation; Roadmap does not
override architectural invariants; the executable role registry controls
concrete role IDs.

For `tecnotron-operational-foundation-v1`, `tools` is the active integration
target, `main` is the promotion target for an accepted milestone, and `tooling`
is historical. This milestone-specific ruling does not reactivate or rewrite
TASKs before baseline `41088a413d06ed1d58d63d92320e38d4b44b86ea`.
