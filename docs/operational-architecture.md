---
status: canonical
owner: tecnotron-ai
type: architecture
updated: 2026-09-25
version: 2.0
related:
  - "[[architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Operational Architecture

## 1. Purpose

Define Tecnotron's operational capability boundaries without coupling Product
semantics to a workspace provider, LLM harness, Agent Runtime, model/provider,
planning system, repository host, or persistence implementation.

## 2. Post-bootstrap substrate

The current operational substrate is layered as follows:

```text
Developer / competent Product authority
        ↓
semantic Product responsibility / Operation
        ↓
State Kernel V0
  durable TaskCycle / Operation / ExecutionAttempt state and authority/effect facts
        ↓
Operational Spine V0
  recipe resolution + deterministic mechanics + evidence-bearing attempts
        ↓
replaceable execution surfaces / repository mechanisms
        ↓
Self-Hosting Reconciliation V0
  bounded post-effect reconciliation without manufacturing authority
```

The thin dedicated Execution Coordinator remains behind a harness-agnostic
`ExecutionSurfacePort` for execution coordination where applicable. It does not
absorb routing, authority, lifecycle, context sufficiency, validation, review,
or acceptance.

## 3. State Kernel boundary

State Kernel owns durable operational state needed for bounded continuation.
TaskCycle, semantic Operation, and ExecutionAttempt identities remain distinct.
State does not create semantic authority; it records established facts,
references, effects, obligations, and unresolved/UNKNOWN conditions.

No universal scalar status or universal state machine may collapse Product,
execution, validation, review, acceptance, integration, publication, or closure
into one implicit transition.

## 4. Operational Spine boundary

Operational Spine owns deterministic recipe/mechanic resolution and execution
against explicit inputs and authority/effect constraints. A recipe may combine
mechanics inside an already-valid authorization but cannot expand scope,
manufacture authority, reinterpret UNKNOWN as satisfied, or silently replace a
semantic decision.

Current deterministic mechanics include accepted-candidate integration support;
Stage D may harden/combine Phase 2A/2B happy-path mechanics only when real cycle
evidence demonstrates the need.

## 5. Reconciliation boundary

Self-Hosting Reconciliation consumes verified observations and competent
authority evidence to classify post-effect state and remaining obligations. It
cannot treat fixture/convenience authority as Product authority, infer Developer
acceptance from validation/review, or choose future roadmap work automatically.

## 6. Semantic Operation and effect boundaries

A semantic Operation may carry objective, intended effects, scope, constraints,
known/UNKNOWN facts, authority references, decisions, results, obligations, and
traceability. Its identity is independent from run/session/worktree/model/harness
identity.

These relationships remain distinct:

```text
semantic_operation
!= execution_attempt
!= result
!= evidence
!= validation
!= review
!= developer_acceptance
!= integration
!= publication
!= canonical_adoption
!= closure
```

Successful execution or validation does not grant a later effect. Review PASS
does not grant Developer acceptance. Publication does not retroactively create
Product authority.

## 7. Decisioning and execution coordination

Routing/model/provider/runtime eligibility is target-independent decisioning.
Mandatory constraints precede optimization. Unknown mandatory conditions fail
closed. Requested, resolved, and observed identities remain distinct.

Execution coordination consumes independently resolved decisioning and
established authorization/effect constraints. It may report no-start, partial,
success, failure, unavailable capability, or cancellation while preserving the
correct Operation/ExecutionAttempt relationship. It may not silently reroute or
weaken constraints.

## 8. Context boundary

Context systems provide minimum sufficient verifiable context through explicit
sources/references. ContextPackager, retrieval, repository packaging, or a
future Context Package Recipe do not originate Product authority. A reusable
Phase-1 context-materialization Recipe is deferred and is not required to make
Stage B valid.

## 9. Workspace, isolation, runtime, provider and planning boundaries

Git worktrees may provide task write isolation. Orca or another workspace/session
system may host work. OpenCode, ChatGPT, Codex, or another harness/runtime may
execute bounded work. Model providers supply inference. GitHub or another
planning provider may host coordination views.

All are replaceable. Connected capability is not authorization. Tool selection,
configuration, account state, and provider metadata are not Product source of
truth.

## 10. Validation, review and Developer authority

Deterministic validation is preferred where equivalent and reports only covered
behavior. Independent semantic review remains separate from implementation and
Developer acceptance. The Developer owns terminal acceptance and exceptional
Product/architecture rulings.

## 11. Transitional Task Lifecycle relation

`docs/task-lifecycle.md` remains canonical transitionally for repository/process
policy where still applicable. State Kernel owns durable operational state;
Operational Spine owns deterministic recipe/mechanic execution. Keeping the
Task Lifecycle document does not reactivate historical WP004 or establish a new
`tecnotron-task-lifecycle/v1` contract.

## 12. Change gate

A tool or framework does not reopen this architecture merely by existing. A
Product architecture change requires a demonstrated gap, material requirement,
measurable failure, or justified simplification under competent authority.
