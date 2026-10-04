---
document_id: TEC-CAPABILITY-MAP-001
status: reference
machine_context: true
version: 3.1
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

## Narrow — reconciled consumer view

| Component | Direction | Current consumer status | Physical-disposition candidate |
| --- | --- | --- | --- |
| AgentRuntime / AgentMVP | NARROW | PARTIALLY_ACTIVE — internal AgentMVP chain; AgentMVP has no current top-level Product entrypoint found | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| Router | NARROW | PARTIALLY_ACTIVE — AgentMVP + tests | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| ModelResolver / FinOps | NARROW | PARTIALLY_ACTIVE — AgentMVP -> ModelResolver -> FinOps + tests | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| ContextPackager | NARROW | PARTIALLY_ACTIVE — AgentMVP contract + tests | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| repo-packager | NARROW | PARTIALLY_ACTIVE — doctor probe + OpenCode skill binding; installed-harness invocation unresolved | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| Operational Spine / Coordinator | NARROW | ACTIVE — `recipe:invoke`, built-in Recipes and Coordinator | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| State Kernel usage | NARROW | ACTIVE — lifecycle persistence + stable Recipe invocation | NEEDS_EQUIVALENCE_BEFORE_CHANGE |
| named Primitives subsystem | NARROW | NO_ACTIVE_CONSUMER_FOUND — no concrete named subsystem artifact | SAFE_TO_EVALUATE_ABSORPTION |

## Conditional absorption — reconciled consumer view

| Subject | Current consumer status | Physical-disposition candidate |
| --- | --- | --- |
| Explorer | PARTIALLY_ACTIVE — direct AgentMVP consumer; OpenCode explorer profile is distinct | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| duplicate Lifecycle Controller concepts | NO_ACTIVE_CONSUMER_FOUND — no duplicate runtime controller artifact | SAFE_TO_EVALUATE_ABSORPTION |
| context expansion as a separate subsystem | NO_ACTIVE_CONSUMER_FOUND — no separate subsystem artifact | SAFE_TO_EVALUATE_ABSORPTION |
| continuation snapshot parallel concepts | PARTIALLY_ACTIVE — deterministic continuation CLI/module + tests | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| RunStore / parallel state representations | NO_ACTIVE_CONSUMER_FOUND — re-export + tests only; no runtime/script/Recipe/lifecycle caller found | SAFE_TO_EVALUATE_ABSORPTION |

Consumer inventory is complete for the exact anchor
`c7c68f0b0f20b6bc722d2201f7a3ad7adf995736` /
`e0218ac280d4bc4cfdd49d42c24939bc80507521`. Historical references were not
counted as consumers. Dynamic installed-harness use remains a future conformance
question only where a later physical decision actually depends on it.

Absorption/removal is not authorized by this inventory. Active consumers,
equivalence gates and future Developer responsibility still govern physical
change.

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
- physical module disposition without a separately authorized responsibility and the component-specific equivalence/conformance required by the reconciled consumer inventory.

## Context and continuation

One semantic subject may have multiple consumer/action projections. Transport
bytes, operational snapshots and volatile carrier observations are not separate
authoritative state owners.

See the active baseline for the canonical vocabulary and repo-first bootstrap
contract.
