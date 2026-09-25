---
document_id: TEC-ARCH-001
status: canonical
machine_context: true
version: 3.3
updated: 2026-09-25
owner: tecnotron-ai
type: architecture
related:
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[SOURCE_OF_TRUTH]]"
---

# Architecture — Tecnotron

## Product identity

Tecnotron is a progressively harness-agnostic software-engineering control
plane. Consumer products remain independent and retain their own Product
authority, domain architecture, configuration, and repository lifecycle.

## Stable invariants

- Explicit portable contracts precede tool-specific integration.
- Product authority, semantic responsibility, execution, validation, review,
  acceptance, integration, publication, and canonical adoption remain distinct
  dimensions unless a competent contract explicitly combines mechanics inside
  an already-valid grant.
- The Developer retains terminal acceptance authority.
- Deterministic mechanisms are preferred when equivalent to semantic reasoning.
- Execution surfaces, workspace/session providers, model providers, planning
  providers, storage implementations, and LLM harnesses are replaceable
  capabilities rather than architecture or source of truth.
- Missing, ambiguous, or unknown authority-relevant facts fail closed rather
  than being inferred from convenience state.
- Historical artifacts remain provenance unless competent authority explicitly
  re-adopts them.

## Product / consumer boundary

Tecnotron owns reusable engineering-control-plane contracts, policies,
coordination capabilities, context boundaries, and implementation state.
A consumer such as FitFlow owns its Product requirements, active project
configuration, domain state, and acceptance decisions for its own Product.
Cross-repository operations use explicit ports/contracts and never infer
ownership from filesystem proximity.

## Execution-surface independence

Git worktrees may provide repository isolation; OpenCode, Orca, ChatGPT, Codex,
or other tools may provide execution/workspace capabilities. None is the
canonical Product role by default. Current work deliberately defers permanent
harness/model optimization until the integral development cycle is stable.

## Canonical knowledge

Versioned canonical repository sources are authoritative for the matters they
own. Obsidian, generated indexes, caches, context packages, chat memory, runtime
state, and task-management views may project or transport knowledge but do not
become independent Product authority.

See [Operational Architecture](operational-architecture.md) for the current
post-bootstrap operational substrate, [Current State](current-state.md) for
confirmed implementation reality, and [Source of Truth](SOURCE_OF_TRUTH.md) for
precedence/navigation.
