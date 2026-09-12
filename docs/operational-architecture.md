---
status: canonical
owner: tecnotron-ai
type: architecture
updated: 2026-08-30
related:
  - "[[architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Operational Architecture

## 1. Purpose

Define la arquitectura operativa estable que Tecnotron-ai usa para planificar,
aislar, ejecutar, validar e integrar trabajo sobre cualquier proyecto compatible
sin acoplar el sistema a un producto, herramienta de workspace, Agent Runtime,
Model Provider, implementación de code intelligence, planning provider ni fuente
externa de contexto específicos.

This document defines responsibilities and boundaries. Tool-specific procedures belong in adapters, implementation documentation, or current-state documentation.

## 2. Governing principles

### Deterministic-first

Prefer deterministic mechanisms whenever the same result can be obtained without LLM reasoning.

An LLM is used when semantic interpretation, synthesis, planning, implementation, or review requires reasoning that deterministic tooling cannot provide with equivalent quality.

### Replaceable ownership

Every operational capability must have:
- one explicit owner;
- a clear input/output boundary;
- a replaceable implementation;
- no hidden ownership over another layer.

### Tool does not define architecture

A tool may implement a capability but must not become the architectural source of truth.

A new tool is accepted only when:
- a reproducible gap exists; or
- it allows an existing implementation to be removed or reduced;
- its ownership fits one existing layer;
- it can remain replaceable;
- its benefit can be measured when appropriate.

### Source remains authoritative

Derived indexes, caches, embeddings, generated context packages, agent sessions, dashboards, and workspace metadata are not source of truth.

## 3. Operational model

```text
Developer
    |
Planning / Task
    |
Task Lifecycle
    |
Workspace / Isolation
    |
Agent Runtime
    |
Context System
    |
Model Provider
    |
Validation / Integration
```

The layers are logically independent. Their current implementations may cooperate but must not collapse into a single runtime.

## 4. Developer

`Developer` is the canonical term for the actor with terminal authority.

The Developer owns:
- acceptance decisions;
- architectural decisions;
- exceptional overrides;
- final approval gates when required;
- promotion of researched or proposed information into canonical project documentation.

Do not use `Human` as an active operational role name.

## 5. Planning / Task

A Task represents the requested unit of work and its acceptance criteria.

Current planning and integration are based on GitHub Issues, Projects, Pull Requests, and Actions where available.

El planning provider es reemplazable y no forma parte de la arquitectura de un
producto consumidor.

## 6. Task Lifecycle

Task Lifecycle owns deterministic orchestration around a task:
- task metadata resolution;
- repository and base resolution;
- branch/worktree preparation;
- task state transitions;
- Git operations;
- GitHub integration;
- post-acceptance commit/push/PR flow;
- cleanup.

Task Lifecycle does not own implementation or semantic review.

The detailed contract is defined in [[task-lifecycle]].

## 7. Workspace and isolation

### Workspace / Session Control Plane

Orca currently owns:
- repository registration;
- workspace creation;
- terminals;
- concurrent sessions;
- restore/hibernation;
- diff and lifecycle-oriented navigation.

Orca is replaceable and is not an architectural source of truth.

### Isolation boundary

Git worktree is the isolation boundary for write tasks.

A task that writes code or canonical documentation uses a task-scoped Git worktree unless an explicit exception is approved.

Orca Folder Workspaces may provide multi-repo context and navigation. They are not an isolation boundary.

### Lifecycle independence

These lifecycles are distinct:

```text
Workspace lifecycle
!= Git lifecycle
!= Agent session lifecycle
!= Code-intelligence lifecycle
```

A workspace may close without deleting a worktree.
A worktree may be removed without defining agent-session behavior.
A code-intelligence index may be rebuilt or cleaned without modifying Git history.

Tool limitations must be solved inside the owning adapter/lifecycle instead of changing unrelated architectural boundaries.

## 8. Agent Runtime

The Agent Runtime executes a task.

OpenCode is the preferred current runtime while it provides value, but it is interchangeable.

The Agent Runtime does not own:
- workspace identity;
- Git isolation;
- Task Lifecycle;
- source of truth;
- model inference;
- code-intelligence indexes.

## 9. Coder role

`Coder` is the logical implementation role family.

The executable role registry keeps its concrete role identifiers, including:
- `coder_b`;
- `coder_a`;
- `coder_strong_a`.

This document does not replace or rename the role registry.

Coder responsibilities:
- inspect task-scoped context;
- implement the requested change;
- execute task-relevant validation available to the role;
- report evidence, limitations, and unresolved gaps.

Coder does not own administrative Task Lifecycle operations.

Coder is a role, not necessarily a specific LLM. The implementation may change while the responsibility remains stable.

## 10. Context System

The Context System owns retrieval and delivery of minimum sufficient and verifiable context.

Its logical components include:
- ContextPackager;
- CodeIntelligencePort;
- deterministic document navigation/retrieval;
- semantic document retrieval when justified;
- repo-packager materialization.

The Context System is independent from the Agent Runtime and Model Provider.

The detailed policy is defined in [[context-strategy]].

## 11. Model Provider

The Model Provider owns inference only.

A provider may be local or cloud.

Changing provider or model must not change:
- repository identity;
- workspace topology;
- Task Lifecycle;
- canonical documentation;
- context contracts.

## 12. Validation and integration

Deterministic validation is preferred whenever possible.

Validation may include:
- tests;
- linting;
- type checks;
- contract checks;
- Git diff checks;
- schema validation;
- reproducible task-specific verification.

The `validator` role remains deterministic according to the role registry.

Developer acceptance gates integration when required by Task Lifecycle.

## 13. Product and AI Core boundary

Tecnotron-ai es un sistema de desarrollo independiente y reutilizable. Los
productos consumidores y sus repositorios permanecen independientes de él.

Un producto consumidor conserva su arquitectura de dominio, estado de producto
y configuración específica. FitFlow es un consumidor posible.

Tecnotron-ai posee la arquitectura del AI Core, tooling reutilizable, políticas
de contexto, adapters, contratos operativos y estado de implementación del AI
Core.

Tecnotron-ai puede operar sobre un proyecto consumidor mediante ports y
contratos explícitos.

Un producto consumidor no debe adquirir una dependencia de producto hacia
Tecnotron-ai solo para simplificar tooling.

## 14. Canonical Markdown and Obsidian

Canonical project knowledge is stored as versioned Markdown in Git.

Obsidian is a Developer-facing navigation and knowledge interface over those files. It is not source of truth and must not be required for the files to remain usable.

Canonical Markdown should prefer portable metadata and explicit relationships that are useful both with and without Obsidian.

Recommended metadata:

```yaml
status: canonical
owner: tecnotron-ai
type: architecture
updated: YYYY-MM-DD
related:
  - "[[other-document]]"
```

Useful deterministic patterns:
- frontmatter/property filtering;
- explicit links;
- index-to-drill-down navigation;
- backlink inspection;
- canonical/planned/superseded classification;
- documentation linting.

No Obsidian plugin may become an architectural dependency.

## 15. Documentation linting

Documentation maintenance should detect deterministically where practical:
- invalid or missing required metadata;
- broken internal links;
- canonical documents not reachable from the source-of-truth index;
- stale status values;
- contradictory implementation-state declarations;
- orphaned canonical documents;
- references to superseded operational assumptions.

LLM review may supplement these checks but must not replace deterministic checks that can be expressed reliably.

## 16. Architecture change gate

The operational architecture is not reopened merely because a new tool appears.

A change requires at least one of:
- a reproducible capability gap;
- a measurable failure of the current design;
- a clear reduction in implementation or operational complexity;
- a material new requirement that existing boundaries cannot represent.

Implementation details may change without reopening this architecture when the existing contracts remain valid.

## 17. Semantic Operation boundary

A semantic `Operation` is the target-independent aggregate that carries
Tecnotron control-plane semantic continuity.

Its identity is independent of:

- execution-attempt, run, and session identity;
- repository, branch, and worktree identity;
- actor, model, provider, runtime, and harness identity;
- artifact identity and content hash.

An Operation represents, when applicable:

- objective;
- intended effects;
- bounded scope;
- governance;
- constraints;
- known facts;
- unresolved or `UNKNOWN` facts;
- decisions;
- results where present;
- applicable obligations;
- traceability.

Missing or unknowable values remain explicit and must not be invented.
Relevant historical decisions, evidence, provenance, and results may be
referenced without embedding complete history in every Operation representation.

Validation, review, Developer acceptance, escalation, recovery, materialization,
integration, publication, and closure are conditional obligations. They are not
universal lifecycle stages. No universal scalar status, linear lifecycle, or
finite-state machine may collapse semantic Operation condition together with
execution, target/domain, repository/Git, workspace/session, materialization,
evidence, validation, review, acceptance, integration, publication, or closure
state.

A `next_gate` may be derived only from applicable unresolved obligations. Where
obligation applicability or state is unknown, the next gate remains unknown.

## 18. Governance and effect boundary

An `authority_reference` records the competent authority basis relevant to an
Operation or intended effect. It does not itself establish that the effect is
currently authorized and does not manufacture or refresh authority.

Authorization disposition is assessed separately. Effects that require
established authorization fail closed when that disposition is `UNKNOWN`.

Intended effects are scoped independently. Renewed authorization is required
when an action expands scope or target, changes effect class, requires
additional privilege or capability, crosses into integration, publication, or
canonical adoption, or continues despite an unresolved authority or policy
conflict.

Mechanics may execute atomically inside an already valid grant. Semantic
responsibility separation does not require a separate process, function, or
prompt for every mechanic.

The following relationships remain distinct:

```text
semantic_operation
!= execution_attempt
!= result
!= evidence
!= validation
!= review
!= materialization
!= integration
!= publication
!= canonical_adoption
```

One relationship may reference or condition another, but none automatically
implies the next. In particular, successful execution, validation, review, or
materialization does not itself authorize integration, publication, or
canonical adoption.

Evidence, retrieval, validation, recipes, and materializers do not originate
authority. Hashes may identify or attest materialized bytes or referenced
inputs; they do not define semantic Operation identity and do not confer
authority.

## 19. Decisioning boundary

Decisioning is target-independent and consumes requirements and constraints
associated with a semantic Operation without redefining that Operation.

It may resolve eligible candidates for:

- actor routing;
- model routing;
- provider selection;
- runtime eligibility;
- capability requirements;
- quota, capacity, and availability constraints;
- FinOps constraints;
- deterministic constraint precedence.

Decisioning does not prescribe a Router, ModelResolver, registry serialization,
provider adapter, database, execution coordinator, catalog, or persistence
format.

A resolution does not authorize execution. Technical capability, eligibility,
ranking, availability, authentication, quota, capacity, commercial
accessibility, and FinOps suitability do not create authority.

Mandatory constraints precede optimization. Explicit competent exclusions
cannot be overridden by ranking or preference. An unknown mandatory condition
fails closed for the affected selection; only established eligible candidates
participate in optimization.

Requested, resolved, and observed identities remain distinct:

```text
requested_identity != resolved_identity
resolved_identity != observed_identity
routing != execution
runtime_eligibility != harness_conformance
```

Decisioning owns resolution of a runtime candidate, not observed runtime truth
or harness conformance. Target-product configuration remains under the
competent target authority.

## 20. Execution-coordination capability boundary

Execution coordination is a required semantic capability, but its concrete
architecture remains unselected:

```yaml
execution_coordination:
  capability_required: true
  architecture_selected: false
```

A conforming execution-coordination boundary must be able, where applicable,
to:

- accept an execution-attempt request for an existing semantic Operation;
- preserve a distinct execution-attempt identity;
- consume independently valid decisioning;
- preserve independently established authorization and effect constraints;
- respect required harness conformance established by the competent owner;
- request execution through an eligible conforming surface;
- associate observations and results with the correct execution attempt and
  semantic Operation;
- report no-start, partial result, success, failure, unavailable capability,
  and cancellation explicitly where applicable;
- preserve relevant evidence references.

Execution coordination does not own routing, observed runtime truth, harness
conformance, or authority. It must not silently switch actor, model, provider,
or runtime candidate; weaken mandatory capabilities or authorization; expand
effect scope; bypass conformance; or reinterpret unknown mandatory facts as
satisfied.

A failed or unavailable execution may yield an explicit execution result or a
request for a new competent decision. It must not create a hidden routing
decision.

This boundary does not select Orca, OpenCode, ChatGPT, Agent Runtime, an SDK, a
plugin system, a queue, scheduler, workflow engine, state machine, database,
event store, worker topology, persistence mechanism, workspace mechanism, or
worktree/session architecture.

Execution result remains distinct from validation, review, Developer
acceptance, integration, publication, canonical adoption, and Operation closure.
Failure reporting and cancellation support do not require a universal
execution state machine.
