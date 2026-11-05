---
status: canonical
owner: tecnotron-ai
type: reference
updated: 2026-10-04
related:
  - "[[architecture]]"
  - "[[architecture-knowledge-ownership-baseline]]"
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
  - "[[capability-map]]"
---

# Source of Truth — Tecnotron

This document is the active navigation and precedence index for Tecnotron. It is
intentionally thin. Historical TASK trees, frozen frontmatter, predecessor plans
and completed review/results remain provenance and are not rewritten to simulate
current truth.

## 1. Current decision and architecture layer

Read in this order:

1. [Architecture, knowledge and capability ownership baseline](architecture-knowledge-ownership-baseline.md)
   — current adopted reconciliation direction, ownership, State Kernel status,
   knowledge model, continuation vocabulary, operating profiles and unresolved gates.
2. [Architecture](architecture.md)
   — stable Product boundaries and harness independence.
3. [Operational Architecture](operational-architecture.md)
   — implemented operational boundaries plus the current reconciliation overlay.
4. [Context Strategy](context-strategy.md)
   — context provenance, sufficiency and semantic handoff policy.

When an older active-navigation assertion conflicts with the 2026-10-04
Developer reconciliation ruling materialized in the baseline, the older
assertion is superseded **as active navigation only**. The historical artifact
and its original meaning remain preserved.

## 2. Current implementation and responsibility state

| Source | Responsibility |
| --- | --- |
| [Current State](current-state.md) | Current Product position, evidence cutoff and unresolved gates. |
| [State Kernel V0](state-kernel-v0/README.md) | Implementation documentation/provenance for the current filesystem Kernel; not the final architectural disposition. |
| [Capability Map](capability-map.md) | Derived implementation/ownership projection; never a second authority source. |

Current source code under `src/**` and `src-typescript/**` proves implementation
presence only. It does not by itself establish current ownership, adoption,
conformance, acceptance or future-work priority.

## 3. Current planning navigation

| Source | Responsibility |
| --- | --- |
| [Implementation Roadmap](implementation-roadmap.md) | Current ordering derived from explicit Product authority. |
| [Active pre-alpha milestone](milestones/tecnotron-prealpha-normalization-and-integral-cycle-v1/PLAN.md) | Historical/current milestone contract within its accepted scope; later rulings may supersede active-next-work navigation without rewriting it. |
| WP003 SPEC/PLAN and ADR | Accepted SDD authority foundation within their scope. |

`WP-PB-001` is not current continuation authority in this baseline. Its future
resume is deferred until exact competent WU01 ruling and terminal evidence are
acquired for that action.

## 4. Execution/process guidance

| Source | Responsibility |
| --- | --- |
| [Task Lifecycle](task-lifecycle.md) | Transitional repository/process policy where still applicable. |
| [Context Strategy](context-strategy.md) | Minimum sufficient verifiable context and portable semantic handoff. |
| `AGENTS.md` | Subordinate repository/harness guidance; never independent Product authority. |

Current operating surfaces are profiles, not architecture owners. ChatGPT Web,
ChatGPT Work, OpenCode, Orca and Commander are replaceable. MAT-XFORM/XForm is a
temporary mechanical transport utility. Their authority is `NONE`.

## 5. Knowledge and evidence classes

Durable Product knowledge belongs in versioned repository SOT or competent
accepted Product artifacts. Research, experiments, Work reports, Library copies,
context bundles, generated indexes, runtime state and chats remain evidence or
transport according to their declared class.

Use explicit evidence classes and preserve source, locator, cutoff, authority
scope and uncertainty. Retrieval/materialization does not increase authority.

## 6. Historical provenance

`docs/tasks/**`, `docs/archive/**`, predecessor milestone/work-package plans,
completed TaskCycles, frozen review artifacts and historical consumer lineage are
preserved. Historical presence does not reactivate work.

Frozen frontmatter is not retroactively rewritten. If a later ruling changes the
current interpretation, record that ruling in current navigation/decision
sources and preserve the original artifact.

## 7. Explicit non-authorities

The following cannot create or refresh Product authority by themselves:

- chat history or LLM memory;
- Library or transport copies;
- harness/model/provider configuration;
- runtime output, sessions, workspaces, caches or local state;
- generated context packages or derived indexes;
- research/Work reports;
- task-management provider state;
- execution-surface selection;
- validation success, semantic review, integration or publication when the
  competent acceptance/authorization dimension is separate.

Discussion is not decision; decision is not authority; authority is not
canonical implementation.

## 8. Repo-first bootstrap

For a fresh Product TaskCycle:

```text
exact tools ref/commit/tree
-> SOURCE_OF_TRUTH
-> architecture-knowledge-ownership-baseline
-> current-state
-> responsibility-specific contracts/evidence
-> action-required volatile observation only
-> exact current Developer ruling/responsibility
```

Historical ChatGPT transcripts, Memory and giant Library handoffs are not normal
bootstrap requirements.
