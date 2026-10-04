---
status: canonical
owner: tecnotron-ai
type: architecture
updated: 2026-10-04
version: 3.0
related:
  - "[[architecture]]"
  - "[[architecture-knowledge-ownership-baseline]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
---

# Operational Architecture

## 1. Purpose

Define Tecnotron's operational capability boundaries without coupling Product
semantics to a workspace provider, LLM harness, Agent Runtime, model/provider,
planning system, repository host or persistence implementation.

## 2. Stable operational boundary

```text
Developer / competent Product authority
        ↓
portable responsibility + subject identity + evidence
        ↓
consumer/action semantic projection
        ↓
authority/effect gates
        ↓
deterministic Recipe / Coordinator when applicable
        ↓
replaceable execution/repository mechanics
        ↓
evidence + Receipt / observation
        ↓
reconciliation
```

Durable attempt/effect memory is required only where the promised effect and
recovery semantics need it. The current State Kernel implementation remains
present, but the adopted evaluation direction is `NARROW` and its final
architectural disposition is `UNDECIDED`.

## 3. Current physical implementation at the 2026-10-04 baseline

The repository still contains State Kernel V0, Operational Spine V0,
Self-Hosting Reconciliation V0, Execution Coordinator/ExecutionSurfacePort and
the earlier reusable context/routing/runtime capabilities.

No physical removal, refactor, storage migration or backend change is authorized
by the architecture/knowledge reconciliation TaskCycle.

Implementation presence does not imply that every operation must traverse every
historical layer.

## 4. State Kernel boundary

Where durable effect memory is required, preserve:

- stable TaskCycle/Operation/ExecutionAttempt responsibility identity;
- explicit authority/evidence linkage;
- `NONE` / `CONFIRMED` / `UNKNOWN`;
- retry blocking while an effect remains unreconciled;
- recovery without inventing a new attempt;
- auditability.

Do not infer from these invariants that the current filesystem implementation,
four aggregates or full-generation history are the permanent universal
architecture. Final disposition requires a later equivalence gate.

## 5. Operational Spine / Coordinator boundary

Operational Spine and the Coordinator remain implementation capabilities for
bounded deterministic mechanics. Their adopted direction is `NARROW`, not
physical removal.

They may compose authorized mechanics, but they cannot expand scope,
manufacture authority, reinterpret `UNKNOWN`, decide semantic sufficiency,
perform Independent Review or grant Developer acceptance.

## 6. Reconciliation boundary

Reconciliation consumes competent observations and authority evidence to
classify effects/obligations. It must not infer acceptance from validation,
review, publication or convenient runtime state.

Derived summaries should share the same competent structured execution identity
or be reconcilable by exact identity.

## 7. Context / continuation boundary

Semantic continuation is responsibility/subject/authority/gate/obligation/
result/evidence/uncertainty projected for a consumer/action.

`ContextBundle` and materialization transport bytes. `ContextPackager` assesses
needed/sufficient/missing context. `SemanticHandoff`/`TaskContextProjection`
project the same semantic subject. Carrier observations are fresh evidence only
when an action depends on mutable local/process state.

No new store is created merely to rename these concepts.

## 8. Execution/workspace/harness boundary

Git owns Git mechanics. Workspace/session providers own their native mechanics.
ChatGPT Web/Work, OpenCode, Orca and Commander are replaceable operating profiles.

Commander is execution/result-only. MAT-XFORM/XForm is a temporary mechanical
transport utility. Neither owns semantic repository exploration, architecture,
Product review, acceptance or canonical state.

The portable transport-integrity contract is closed-envelope + explicit
manifest/IDs/boundaries + deterministic extraction + post-transport hash
verification. The carrier that implements it is replaceable and has no Product
authority.

## 9. Review and Developer authority

Independent semantic review remains separate from implementation and
deterministic validation. Review `PASS` is not Developer acceptance.

Developer acceptance, Phase 2, integration and publication remain separate
future grants.

## 10. Reuse-before-build gate

A new component requires:

1. a precise missing capability;
2. an identified current/external owner;
3. evidence that composition/adaptation is insufficient;
4. a bounded Product-specific invariant that remains unowned;
5. an explicit Developer responsibility for the change.

Current harness limitations, Windows workarounds or one failed experiment are
not permanent architecture evidence.

## 11. Change gate

See
[Architecture, knowledge and capability ownership baseline](architecture-knowledge-ownership-baseline.md)
for current RETAIN/NARROW/ABSORB_CONDITIONALLY/DEFER dispositions and unresolved
gates.
