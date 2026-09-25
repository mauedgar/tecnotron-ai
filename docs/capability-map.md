---
document_id: TEC-CAPABILITY-MAP-001
status: reference
machine_context: true
version: 2.0
updated: 2026-09-25
owner: tecnotron-ai
type: capability-reconciliation-reference
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Capability Map — current pre-alpha view

This is a derived reconciliation index, not a second Source of Truth. Authority
remains with the competent canonical source for each capability.

## CURRENT

| Capability | Current boundary | Authority/evidence |
| --- | --- | --- |
| State Kernel V0 | durable TaskCycle/Operation/ExecutionAttempt state; authority/effect facts remain explicit | `docs/state-kernel-v0/README.md`, current source/evidence |
| Operational Spine V0 | deterministic recipe resolution/execution mechanics | `docs/operational-architecture.md`, `src/operational-spine-v0/**` |
| Self-Hosting Reconciliation V0 | bounded post-effect reconciliation; no authority manufacture | `docs/operational-architecture.md`, `src/self-hosting-reconciliation-v0/**` |
| Execution Coordinator | thin dedicated coordinator behind `ExecutionSurfacePort` | Operational Architecture + current source |
| ExecutionSurfacePort | harness-agnostic execution-surface boundary | accepted execution-coordination contract |
| Project Profile | explicit project/root/config resolution; no sibling inference | accepted WP000/current contracts |
| Context Strategy / ContextPackager / Explorer | minimum sufficient verifiable context and deterministic sufficiency boundaries | `docs/context-strategy.md`, current source |
| Router / ModelResolver / FinOps | deterministic decisioning/eligibility; no execution authority | current source/contracts |
| Agent Runtime / Agent MVP | reusable execution/composition capabilities within their accepted boundaries | current source/evidence |
| Operational profiles | bounded role/permission projections; no terminal Product authority | accepted WP001 contract |
| WP003 SDD foundation | accepted SPEC/PLAN + WU00 authority/contract foundation | WP003 SPEC/PLAN/contract/ADR |
| Task Lifecycle | transitional repository/process policy only | `docs/task-lifecycle.md` |

Current does not mean every capability is required for every Operation, nor that
a particular harness/provider is selected as Product architecture.

## HISTORICAL / PROVENANCE

The following remain available but are not active-next-work authority:

- completed WP000/WP001/WP002 plans/results and historical TASK trees;
- accepted `tecnotron-operational-foundation-v1` milestone plan;
- FitFlow/FF-AI-VNEXT lineage and old `tooling` branch narrative;
- OpenCode/Orca-specific adoption history beyond their current replaceable
  capability boundaries;
- repository hygiene/deprecation reconciliation already completed before the
  post-bootstrap baseline.

Historical material is preserved during pre-alpha where useful and may be
removed only by later BETA documentation normalization after competent review.

## CANONICAL REMAINING PRODUCT WORK

```yaml
WP003:
  canonical: true
  WU01: REQUIRED_NOT_INITIALIZED
  WU02: REQUIRED_AFTER_WU01
  WU03: REQUIRED_AFTER_WU02
  WU04: REINTERPRET_AFTER_WU01_WU03
```

Stage-B normalization does not initialize any of these work units.

## DEFERRED / SUCCESSOR CONCERNS

| Concern | Disposition |
| --- | --- |
| documentation baseline cleanup | `DEFERRED_TO_BETA` |
| Phase-1 Context Package Recipe | `DEFERRED_OPERATIONAL_DEBT` |
| reusable Independent Review spec/template | `CANDIDATE_STAGE_D_DEBT` |
| deterministic review-package/result mechanics | `CANDIDATE_STAGE_D_DEBT` |
| Phase 2A recipe hardening/composition | `CANDIDATE_STAGE_D_DEBT` |
| Phase 2B happy-path recipe/composition | `CANDIDATE_STAGE_D_DEBT` |
| Observer / fitness | `DEFERRED` |
| MCP | `DEFERRED` |
| semantic retrieval/embeddings | `DEFERRED` |
| Temporal / scheduler / generalized orchestration | `DEFERRED` |
| task-management provider selection | `DEFERRED_SUCCESSOR_CONCERN` |
| harness/model optimization | `DEFERRED_SUCCESSOR_CONCERN` |
| parallel-development infrastructure | `AFTER_INTEGRAL_CYCLE_PROOF` |

Historical WP004/WP005 do not become current capabilities or debts merely by
existing. Stage D may define a new responsibility only from demonstrated
post-bootstrap residual need.

## Replaceable execution capabilities

OpenCode, Orca, ChatGPT, Codex, other harnesses, model providers, GitHub, and
other planning/workspace systems are replaceable execution capabilities. Their
presence, connection, configuration, or use does not grant Product authority.
