---
document_id: TEC-CAPABILITY-MAP-001
status: reference
machine_context: true
version: 3.0
updated: 2026-10-04
owner: tecnotron-ai
type: capability-reconciliation-reference
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture-knowledge-ownership-baseline]]"
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[current-state]]"
---

# Capability Map — reconciled current view

This is a derived projection, not a second Source of Truth. Current
implementation presence and future ownership disposition are deliberately
separate.

## Retained Product semantics

| Capability | Current ownership/disposition |
| --- | --- |
| Product authority and grants | RETAIN — explicit Developer/competent Product authority |
| responsibility/subject/effect identity | RETAIN — portable Tecnotron semantics |
| independent review semantics | RETAIN — provider/harness neutral |
| NONE/CONFIRMED/UNKNOWN reconciliation | RETAIN |
| code identity/history/remote refs | Git owns mechanics; Tecnotron retains authorization/guards |
| repository SOT | RETAIN as durable Product knowledge owner |
| useful deterministic Recipes | RETAIN within evidenced scope |
| Git execution qualification | RETAIN |
| frozen review contract | RETAIN; transport implementation replaceable |
| environment/project bindings | RETAIN as explicit profiles/bindings |

## Narrow / hold pending consumer inventory

| Component | Direction | Physical status |
| --- | --- | --- |
| AgentRuntime / AgentMVP | NARROW | present; no removal authorized |
| Router | NARROW | present; no removal authorized |
| ModelResolver / FinOps | NARROW | present; no removal authorized |
| ContextPackager | NARROW | present; no removal authorized |
| repo-packager | NARROW | present; no removal authorized |
| Operational Spine / Coordinator | NARROW | present; no rewrite authorized |
| State Kernel usage | NARROW | present; final disposition UNDECIDED |
| named Primitives subsystem | NARROW | do not expand without repeated need |

## Conditional absorption

- Explorer;
- duplicate Lifecycle Controller concepts;
- context expansion as a separate subsystem;
- continuation snapshot parallel concepts;
- RunStore / parallel state representations.

Absorption is not deletion authority. It first requires consumer inventory and
equivalence evidence.

## Replaceable operating profiles

| Surface | Classification | Product authority |
| --- | --- | --- |
| ChatGPT Web | ACTIVE_OPERATING_PROFILE | NONE |
| ChatGPT Work | ACTIVE_OPERATING_PROFILE | NONE |
| OpenCode | ACTIVE_OPERATING_PROFILE | NONE |
| Orca | ACTIVE_OPERATING_PROFILE | NONE |
| Commander | ACTIVE_OPERATING_PROFILE | NONE |
| MAT-XFORM / XForm | TEMPORARY_EXECUTION_MECHANIC | NONE |
| closed-envelope/manifest/hash transport discipline | PORTABLE_PRODUCT_CONTRACT | NONE |

Workspace/session/transport mechanics do not become Product architecture.

## Deferred

- final State Kernel backend/disposition;
- Temporal/generalized durable orchestration;
- devBrain/embeddings;
- broad historical cleanup;
- new Feedback Recipe or universal Observer;
- WP-PB continuation;
- FitFlow repair;
- physical module removal before consumer/equivalence inventory.

## Context and continuation

One semantic subject may have multiple consumer/action projections. Transport
bytes, operational snapshots and volatile carrier observations are not separate
authoritative state owners.

See the active baseline for the canonical vocabulary and repo-first bootstrap
contract.
