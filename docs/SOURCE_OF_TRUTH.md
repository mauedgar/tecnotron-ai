---
status: canonical
owner: tecnotron-ai
type: reference
updated: 2026-09-25
related:
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
  - "[[capability-map]]"
---

# Source of Truth — Tecnotron

This document is the active navigation and precedence index for Tecnotron. It is
intentionally thin. Historical TASK trees and accepted predecessor plans remain
available as provenance but are not active top-level navigation.

## 1. Stable Product and architecture authority

| Source | Responsibility |
| --- | --- |
| [Architecture](architecture.md) | Stable Product boundaries and platform independence. |
| [Operational Architecture](operational-architecture.md) | Current operational capability boundaries and post-bootstrap substrate. |
| [WP003 SDD contract](contracts/tecnotron-sdd-artifacts-v1.md) | Versioned SDD artifact vocabulary/policy within accepted WP003 authority. |
| [WP003 ADR](adr/ADR-WP003-SDD-AUTHORITY.md) | Accepted WP003 authority/contract foundation; subordinate to the accepted SPEC/PLAN. |

## 2. Current implementation reality

| Source | Responsibility |
| --- | --- |
| [Current State](current-state.md) | Confirmed current implementation/state at the named evidence cutoff. |
| [State Kernel V0](state-kernel-v0/README.md) | Durable operational-state substrate documentation. |

Operational Spine V0 and Self-Hosting Reconciliation V0 are implemented source
capabilities under `src/operational-spine-v0/` and
`src/self-hosting-reconciliation-v0/`; their Product meaning is bounded by
[Operational Architecture](operational-architecture.md) and current-state
evidence rather than by execution-surface state.

## 3. Current planning authority

| Source | Responsibility |
| --- | --- |
| [Active pre-alpha milestone](milestones/tecnotron-prealpha-normalization-and-integral-cycle-v1/PLAN.md) | Current milestone sequence and stage boundaries. |
| [Implementation Roadmap](implementation-roadmap.md) | Current implementation ordering derived from accepted Product state. |
| [WP003 SPEC](work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md) | Canonical WHAT for SDD Authority and Artifacts, including RF-201–RF-207. |
| [WP003 PLAN](work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md) | Canonical HOW/decomposition for WP003. |

WP000/WP001/WP002 accepted artifacts remain competent historical Product
results. They are not active future-work navigation. The accepted predecessor
[Operational Foundation v1 plan](milestones/tecnotron-operational-foundation-v1/PLAN.md)
remains immutable provenance and does not mechanically reactivate historical
WP004/WP005/WP006/WP007 sequencing.

## 4. Current execution/process guidance

| Source | Responsibility |
| --- | --- |
| [Task Lifecycle](task-lifecycle.md) | Transitional repository/process policy where still applicable. |
| [Context Strategy](context-strategy.md) | Minimum sufficient verifiable context and retrieval policy. |
| `AGENTS.md` | Subordinate repository/harness guidance; never independent Product authority. |

## 5. Derived/reference material

| Source | Responsibility |
| --- | --- |
| [Capability Map](capability-map.md) | Derived CURRENT/HISTORICAL/DEFERRED reconciliation index. |
| [Compatibility Baseline](compatibility-baseline.md) | Bounded observed compatibility evidence. |
| `docs/guides/**` and `docs/research/**` | Derived or research material only. |

## 6. Historical provenance

`docs/tasks/**`, `docs/archive/**`, predecessor milestone plans, completed
work-package artifacts, and FitFlow-era lineage are preserved during pre-alpha
where useful. Historical presence does not imply current authority or future
work.

## 7. Explicit non-authorities

The following cannot create or refresh Product authority by themselves:

- chat history or LLM memory;
- harness/model/provider configuration;
- runtime output, sessions, workspaces, caches, or local state;
- generated context packages or derived indexes;
- archive or research documents;
- task-management provider state;
- execution-surface selection;
- validation success, semantic review, integration, or publication when the
  competent acceptance/authorization dimension is separate.

When sources disagree, use the source competent for the subject and the most
recent explicit competent ruling. Discussion is not decision; decision is not
authority; authority is not canonical implementation.
