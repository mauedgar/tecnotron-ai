# Tecnotron

Tecnotron is a progressively harness-agnostic software-engineering control plane.
It coordinates bounded Product work while keeping Product authority, execution
surfaces, workspace providers, runtimes, models, planning providers, and
consumer repositories as separate concerns.

## Current pre-alpha baseline

The current `tools` baseline is post-bootstrap. The implemented operational
substrate includes State Kernel V0, Operational Spine V0, self-hosting
reconciliation, the thin Execution Coordinator behind `ExecutionSurfacePort`,
and the previously accepted reusable AI-core capabilities recorded in
[Current State](docs/current-state.md).

The active milestone position is Stage-C exit reconciliation. WP003 WU00
through WU03 are `CLOSED_PASS`; WU04 is `NO_IMPLEMENTATION_REQUIRED`. WP003 is
complete subject to the Stage-C exit gate. Stage C is not terminal, and Stage D
and Stage E have not been entered. Historical WP004/WP005 are not mechanically
resumed.

## Start here

- [Source of Truth](docs/SOURCE_OF_TRUTH.md) — active authority/navigation.
- [Current State](docs/current-state.md) — confirmed implementation reality.
- [Implementation Roadmap](docs/implementation-roadmap.md) — current sequence.
- [Active pre-alpha milestone](docs/milestones/tecnotron-prealpha-normalization-and-integral-cycle-v1/PLAN.md).
- [WP003 SPEC](docs/work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md) and
  [WP003 PLAN](docs/work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md).

Historical plans, TASK/PLAN/RESULT/REVIEW trees, and archived material remain in
place as provenance during pre-alpha, but they are not active navigation unless
a current authority explicitly points to them.

## Authority boundary

Discussion, runtime output, chat history, LLM memory, harness configuration,
generated context, derived indexes, caches, workspace state, research material,
and execution-surface selection do not create Product authority. The Developer
retains terminal acceptance authority. Canonical repository sources and explicit
competent rulings control Product state.

## Execution surfaces

Git worktrees, OpenCode, Orca, ChatGPT, other harnesses, model providers, and
planning providers are replaceable capabilities. Their availability or use does
not make them Tecnotron architecture or Product authority.

## Branches

For the current pre-alpha Product work, `tools` is the canonical integration
branch. `main` is outside this Stage-C exit reconciliation and is not promoted
by this documentation change. Historical `tooling` references remain
provenance only.
