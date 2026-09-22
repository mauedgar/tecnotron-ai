---
document_id: TEC-CAPABILITY-MAP-001
status: reference
machine_context: true
version: 1.0
updated: 2026-09-22
owner: tecnotron-ai
type: capability-reconciliation-reference
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Capability Map de Tecnotron-ai

Este documento agrega el estado reconciliado de capacidades y conceptos relevantes
para continuidad. **No crea una segunda Source of Truth.** Cada concepto conserva la
autoridad de la materia indicada por `docs/SOURCE_OF_TRUTH.md`, los contratos,
ADRs, SPECs, planes, TASKs y evidencia terminal competente.

La clasificación distingue:

- `CURRENT`: existe y gobierna/participa actualmente dentro de su boundary;
- `HISTORICAL_RECONCILED`: evidencia previa preservada con disposición actual;
- `DEFERRED`: responsabilidad futura aceptada o seleccionada pero no inicializada;
- `UNRESOLVED`: evidencia insuficiente para una afirmación más fuerte.

`KEEP` significa preservar el concepto dentro de su boundary actual; no significa
crear una nueva implementación. `ADAPT` preserva una responsabilidad estrechada.
`UNRESOLVED` bloquea inferencias adicionales, no la continuidad de capacidades ya
probadas.

## CURRENT

### Doc_Curator

```yaml
concept: Doc_Curator
historical_presence: true
historical_role: documentation writer under explicit task ownership
historical_owner: Developer/Architect assigned documentation responsibilities
current_equivalent: doc_curator operational profile and documentation ownership term
current_implementation: tecnotron-agent-profile/v1 profile plus task-scoped documentation workflow
current_authority: accepted profile contract, applicable TASK/WP ownership, Developer terminal authority
current_operational_use: documentation writes only when explicitly assigned; no autonomous synchronization authority
related_current_work_packages: [WP-001, WP-003, WP-006]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/contracts/tecnotron-agent-profile-v1.md
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
  - docs/tasks/TOF-W1-001/RESULT.md
unresolved_gap: generalized executable documentation synchronization capability is not established
product_effect_required: false
research_needed: false
```

### Architect

```yaml
concept: Architect
historical_presence: true
historical_role: architecture and planning semantics
historical_owner: Developer plus Architect where assigned
current_equivalent: architect operational profile and planning responsibility
current_implementation: profile contract plus accepted planning workflow
current_authority: Architecture, Operational Architecture, accepted plans/SPECs, Developer rulings
current_operational_use: semantic design and bounded planning; no terminal acceptance
related_current_work_packages: [WP-001, WP-002, WP-003]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/architecture.md
  - docs/operational-architecture.md
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### Implementer

```yaml
concept: Implementer
historical_presence: true
historical_role: source implementation under TASK ownership
historical_owner: Implementer
current_equivalent: implementer operational profile
current_implementation: tecnotron-agent-profile/v1 plus Task Lifecycle bounded implementation role
current_authority: applicable TASK, Task Lifecycle, accepted SPEC/PLAN
current_operational_use: product/source writes inside exact assigned scope; no lifecycle bookkeeping or acceptance ownership
related_current_work_packages: [WP-001, WP-002]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - AGENTS.md
  - docs/task-lifecycle.md
  - docs/contracts/tecnotron-agent-profile-v1.md
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### Validator

```yaml
concept: Validator
historical_presence: true
historical_role: deterministic validation external to profiles
historical_owner: lifecycle/contract-defined validation responsibility
current_equivalent: deterministic Validator responsibility
current_implementation: task-specific deterministic commands and validation contracts
current_authority: Task Lifecycle, accepted SPEC/TASK validation criteria
current_operational_use: always deterministic where required; never accepts work
related_current_work_packages: [WP-001, WP-002, WP-003, WP-004]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/task-lifecycle.md
  - docs/contracts/tecnotron-agent-profile-v1.md
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
unresolved_gap: generalized executable Validator port/integration is not established
product_effect_required: false
research_needed: false
```

### Reviewer

```yaml
concept: Reviewer
historical_presence: true
historical_role: independent semantic review according to risk triggers
historical_owner: independent Reviewer
current_equivalent: reviewer operational profile plus independent review responsibility
current_implementation: profile contract and REVIEW.md lifecycle boundary
current_authority: Task Lifecycle and accepted SPEC/TASK review triggers
current_operational_use: read-only independent semantic review; no fixes or terminal acceptance
related_current_work_packages: [WP-001, WP-002, WP-003, WP-004]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/task-lifecycle.md
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
  - docs/tasks/TOF-W1-002/REVIEW.md
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### Explorer

```yaml
concept: Explorer
historical_presence: true
historical_role: evidence/context sufficiency decision
historical_owner: AI Core
current_equivalent: Explorer
current_implementation: src/explorer/index.js
current_authority: Context Strategy and accepted FF-AI-VNEXT-008 boundary
current_operational_use: deterministic COMPLETE/PARTIAL/EMPTY evidence sufficiency decision without model invocation
related_current_work_packages: []
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/current-state.md
  - docs/context-strategy.md
  - docs/tasks/FF-AI-VNEXT-008/RESULT.md
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### Agent_Runtime

```yaml
concept: Agent_Runtime
historical_presence: true
historical_role: execute an already-resolved proposal through a replaceable adapter
historical_owner: AI Core
current_equivalent: Agent Runtime
current_implementation: src/agent-runtime/index.js
current_authority: Operational Architecture and accepted runtime contracts
current_operational_use: adapter execution/simulation plus observed identity/result evidence; does not reroute or accept work
related_current_work_packages: [WP-002]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/operational-architecture.md
  - docs/current-state.md
  - docs/tasks/FF-AI-VNEXT-008/RESULT.md
unresolved_gap: real provider execution remains operation-specific and separately authorized
product_effect_required: false
research_needed: false
```

### Execution_Coordinator

```yaml
concept: Execution_Coordinator
historical_presence: true
historical_role: generic execution coordination concern separated from TOF-W1-003 OpenCode surface ownership
historical_owner: architecture/Developer ruling
current_equivalent: thin dedicated Execution Coordinator
current_implementation: src/execution-coordinator/index.js
current_authority: Operational Architecture
current_operational_use: consumes resolved decisioning and coordinates through ExecutionSurfacePort without absorbing lifecycle or authority
related_current_work_packages: [WP-002]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/operational-architecture.md
  - docs/current-state.md
  - src/execution-coordinator/index.js
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### ExecutionSurfacePort

```yaml
concept: ExecutionSurfacePort
historical_presence: true
historical_role: harness-agnostic execution-surface boundary
historical_owner: Operational Architecture
current_equivalent: ExecutionSurfacePort
current_implementation: src/contracts/execution-coordination.js plus injected execution surfaces
current_authority: Operational Architecture
current_operational_use: replaceable execute(request) surface behind the Execution Coordinator
related_current_work_packages: [WP-002]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/operational-architecture.md
  - docs/current-state.md
  - src/contracts/execution-coordination.js
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### Project_Profile

```yaml
concept: Project_Profile
historical_presence: true
historical_role: project identity, roots and active product configuration
historical_owner: consumer project plus Tecnotron contracts
current_equivalent: Project Profile
current_implementation: portable project resolution/contracts and active consumer-owned profile
current_authority: Project Profile contract, WP-000, consumer product ownership
current_operational_use: explicit source-validated roots/configuration; no sibling inference
related_current_work_packages: [WP-000, WP-004]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/current-state.md
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
  - docs/work-packages/wp-000-cross-repo-project-profile-baseline/PLAN.md
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### Context_Strategy

```yaml
concept: Context_Strategy
historical_presence: true
historical_role: retrieval, evidence sufficiency, budget and telemetry policy
historical_owner: Tecnotron-ai
current_equivalent: Context Strategy
current_implementation: canonical policy plus ContextPackager/Explorer implementation boundaries
current_authority: docs/context-strategy.md
current_operational_use: minimum sufficient verifiable evidence; deterministic retrieval preferred when equivalent
related_current_work_packages: [WP-003, WP-004]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/context-strategy.md
  - docs/operational-architecture.md
  - docs/current-state.md
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### Router

```yaml
concept: Router
historical_presence: true
historical_role: derive canonical role and execution requirements from policy
historical_owner: AI Core
current_equivalent: Router
current_implementation: current routing core and Role Registry v3 consumers
current_authority: executable registries/contracts plus accepted routing boundaries
current_operational_use: deterministic decisioning only; no execution
related_current_work_packages: []
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/current-state.md
  - docs/implementation-roadmap.md
  - docs/tasks/FF-AI-VNEXT-008/TASK.md
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### ModelResolver

```yaml
concept: ModelResolver
historical_presence: true
historical_role: propose eligible model/provider/runtime coordinates
historical_owner: AI Core
current_equivalent: Model Resolver
current_implementation: src/model-resolver/index.js
current_authority: current contracts/registries and accepted routing architecture
current_operational_use: selection proposal from resolved requirements; does not execute or establish effective identity
related_current_work_packages: []
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/current-state.md
  - docs/operational-architecture.md
  - src/model-resolver/index.js
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### FinOps

```yaml
concept: FinOps
historical_presence: true
historical_role: hard eligibility/resource constraints
historical_owner: AI Core
current_equivalent: FinOps v1
current_implementation: deterministic eligibility integrated with model resolution
current_authority: current routing/model contracts and accepted FF-AI-VNEXT-007 state
current_operational_use: hard eligibility constraints; advanced FinOps/ranking remains outside current milestone
related_current_work_packages: []
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/current-state.md
  - docs/implementation-roadmap.md
  - docs/operational-architecture.md
unresolved_gap: advanced FinOps remains deferred/out of scope
product_effect_required: false
research_needed: false
```

### Task_Lifecycle

```yaml
concept: Task_Lifecycle
historical_presence: true
historical_role: task states, ownership, worktree isolation, validation/review/acceptance/integration dimensions
historical_owner: Tecnotron-ai plus Developer gates
current_equivalent: Task Lifecycle
current_implementation: canonical lifecycle policy and deterministic coordination mechanisms
current_authority: docs/task-lifecycle.md
current_operational_use: governs current bounded TaskCycles; substrate V0 does not replace it
related_current_work_packages: [WP-004]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/task-lifecycle.md
  - docs/current-state.md
  - docs/operational-architecture.md
unresolved_gap: WP-004 formalization/migration to tecnotron-task-lifecycle/v1 remains deferred
product_effect_required: false
research_needed: false
```

### Run_Store

```yaml
concept: Run_Store
historical_presence: true
historical_role: event/artifact persistence and projection
historical_owner: AI Core
current_equivalent: Run Store
current_implementation: src/core/run-store.js plus SQLite projection
current_authority: existing contracts/implementation; future observation semantics remain WP-005-owned
current_operational_use: structured runtime evidence storage; not policy or documentary truth
related_current_work_packages: [WP-005]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/current-state.md
  - src/core/run-store.js
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
unresolved_gap: WP-005 correlation/observation contract is not yet initialized
product_effect_required: false
research_needed: false
```

### Run_Event

```yaml
concept: Run_Event
historical_presence: true
historical_role: structured execution event contract
historical_owner: AI Core contracts
current_equivalent: RunEvent
current_implementation: src/contracts/run-event.js and current producers/consumers
current_authority: executable contract plus accepted current implementation
current_operational_use: records execution events; future observation correlation remains separate
related_current_work_packages: [WP-005]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - src/contracts/run-event.js
  - src/agent-runtime/index.js
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
unresolved_gap: WP-005 observation schema/correlation is deferred
product_effect_required: false
research_needed: false
```

### OpenCode_surface

```yaml
concept: OpenCode_surface
historical_presence: true
historical_role: Agent CLI and execution surface
historical_owner: WP-002 / TOF-W1-003 narrowed surface responsibility
current_equivalent: OpenCode execution surface
current_implementation: OpenCode adapter/execution-surface implementation completed by narrowed TOF-W1-003
current_authority: accepted WP-002 semantics, narrowed TOF-W1-003 completion, Operational Architecture
current_operational_use: replaceable execution surface behind ExecutionSurfacePort
related_current_work_packages: [WP-002]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/current-state.md
  - docs/operational-architecture.md
  - docs/tasks/TOF-W1-003/TASK.md
unresolved_gap: reusable compatibility certification is not proven by this reconciliation
product_effect_required: false
research_needed: false
```

### Orca_workspace_role

```yaml
concept: Orca_workspace_role
historical_presence: true
historical_role: workspace/session control plane
historical_owner: external platform capability
current_equivalent: Orca workspace/session surface
current_implementation: external replaceable platform capability
current_authority: Operational Architecture boundary; not Tecnotron product authority
current_operational_use: workspace/session/restore/terminal hosting; other Agent CLIs may replace OpenCode without changing product architecture
related_current_work_packages: []
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - README.md
  - docs/architecture.md
  - docs/compatibility-baseline.md
unresolved_gap: full Orca adapter productization is not established here
product_effect_required: false
research_needed: false
```

### AGENTS.md

```yaml
concept: AGENTS.md
historical_presence: true
historical_role: repository/harness operating instructions
historical_owner: repository documentation/operational guidance
current_equivalent: AGENTS.md
current_implementation: repository-root AGENTS.md plus profile/contract references
current_authority: subordinate operational guidance; canonical product authority remains in SOURCE_OF_TRUTH-indexed sources
current_operational_use: bounded harness guidance and responsibility constraints; does not create architecture, lifecycle or acceptance authority
related_current_work_packages: [WP-001, WP-003, WP-006]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - AGENTS.md
  - README.md
  - docs/task-lifecycle.md
unresolved_gap: broader harness adoption/evaluation continues empirically without changing canonical authority by implication
product_effect_required: false
research_needed: false
```

### Skills

```yaml
concept: Skills
historical_presence: true
historical_role: bounded harness capabilities
historical_owner: profile/skill configuration under product permission boundaries
current_equivalent: OpenCode skills and repository-packager skill
current_implementation: .opencode/skills plus deny-by-default profile projections
current_authority: profile contracts and explicit harness configuration
current_operational_use: may narrow/specialize operations but cannot broaden profile permissions
related_current_work_packages: [WP-001, WP-002]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - .opencode/skills/repo-packager/SKILL.md
  - docs/work-packages/wp-001-operational-profile-contracts/SPEC.md
  - .opencode/agents
unresolved_gap: null
product_effect_required: false
research_needed: false
```

### compatibility_baseline

```yaml
concept: compatibility_baseline
historical_presence: true
historical_role: observed reproducible tool/runtime compatibility evidence
historical_owner: Tecnotron-ai reference documentation
current_equivalent: Compatibility Baseline
current_implementation: docs/compatibility-baseline.md plus doctor probes
current_authority: bounded compatibility observations only
current_operational_use: reference evidence; not automatic certification of every current execution surface/version
related_current_work_packages: [WP-002, WP-004]
lifecycle_status: CURRENT
disposition: KEEP
evidence:
  - docs/compatibility-baseline.md
  - scripts/doctor
unresolved_gap: exact reusable OpenCode compatibility baseline is NOT_PROVEN by this reconciliation
product_effect_required: false
research_needed: false
```

## HISTORICAL_RECONCILED

### capability_discovery

```yaml
concept: capability_discovery
historical_presence: true
historical_role: runtime/version/capability observation during compatibility and OpenCode work
historical_owner: bounded task/adapter concerns
current_equivalent: task-scoped capability/version observation
current_implementation: bounded probes and execution-surface conformance evidence
current_authority: applicable TASK/adapter contract only
current_operational_use: triggered discovery, not a generalized autonomous subsystem
related_current_work_packages: [WP-002]
lifecycle_status: HISTORICAL_RECONCILED
disposition: ADAPT
evidence:
  - docs/tasks/TOF-W1-003/TASK.md
  - scripts/doctor
unresolved_gap: generalized capability-discovery subsystem is not established
product_effect_required: false
research_needed: false
```

## DEFERRED

### MCP

```yaml
concept: MCP
historical_presence: true
historical_role: candidate/future tool integration mechanism
historical_owner: future scoped work
current_equivalent: none operationally established
current_implementation: NONE
current_authority: milestone exclusion/deferred roadmap only
current_operational_use: NONE
related_current_work_packages: []
lifecycle_status: DEFERRED
disposition: KEEP
evidence:
  - docs/current-state.md
  - docs/implementation-roadmap.md
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
unresolved_gap: implementation requires a future explicit gate
product_effect_required: false
research_needed: false
```

### deferred_objectives

```yaml
concept: deferred_objectives
historical_presence: true
historical_role: future responsibilities preserved without current adoption
historical_owner: milestone/roadmap planning
current_equivalent: explicit DEFERRED program-view section
current_implementation: documentation classification only
current_authority: accepted milestone/roadmap plus explicit Developer rulings
current_operational_use: preserves future work without promoting it to current behavior
related_current_work_packages: [WP-003, WP-004, WP-005, WP-006, WP-007]
lifecycle_status: DEFERRED
disposition: ADAPT
evidence:
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
  - docs/implementation-roadmap.md
unresolved_gap: none for classification; each deferred objective retains its own future gate
product_effect_required: false
research_needed: false
```

### Repository hygiene and deprecation reconciliation

```yaml
concept: repository_hygiene_and_deprecation
historical_presence: false
historical_role: null
historical_owner: null
current_equivalent: bounded repository hygiene/deprecation responsibility selected by Developer
current_implementation: NONE
current_authority: Developer ruling selecting this responsibility before WP-003 SPEC authorization
current_operational_use: NONE until separately authorized
related_current_work_packages: []
lifecycle_status: DEFERRED
disposition: KEEP
evidence:
  - current post-WP002 program-state reconciliation
unresolved_gap: exact tracked-file consumer/reference inventory and per-file dispositions are not yet produced
product_effect_required: false
research_needed: false
```

This responsibility must classify tracked configuration/schema/YAML/compatibility/
fixture/historical surfaces before deletion:

```text
ACTIVE
COMPATIBILITY_REQUIRED
HISTORICAL_EVIDENCE
TEST_FIXTURE
GENERATED
ORPHANED
UNKNOWN
```

Allowed later dispositions are `KEEP`, `MIGRATE`, `ARCHIVE`, `DELETE`, or
`INVESTIGATE`. No deletion is authorized by this capability map.

## UNRESOLVED

### documentation_synchronization

```yaml
concept: documentation_synchronization
historical_presence: UNPROVEN
historical_role: task-specific documentation updates exist, but no generalized capability is established
historical_owner: mixed task/documentation ownership
current_equivalent: task-scoped documentation updates
current_implementation: no generalized executable synchronization capability proven
current_authority: applicable TASK/WP documentation ownership only
current_operational_use: task-scoped only
related_current_work_packages: [WP-003, WP-006]
lifecycle_status: UNRESOLVED
disposition: UNRESOLVED
evidence:
  - docs/tasks/TOF-W1-001/RESULT.md
  - docs/tasks/FF-AI-VNEXT-009/TASK.md
unresolved_gap: trigger ownership, executable mechanism and lifecycle integration for generalized synchronization
product_effect_required: UNPROVEN
research_needed: false
```

### milestone_reporting

```yaml
concept: milestone_reporting
historical_presence: UNPROVEN
historical_role: no competent generalized capability established
historical_owner: UNPROVEN
current_equivalent: manual/canonical milestone state documentation
current_implementation: NONE as a generalized capability
current_authority: Milestone Plan and Current State remain documentary authorities
current_operational_use: no generalized reporting subsystem established
related_current_work_packages: [WP-007]
lifecycle_status: UNRESOLVED
disposition: UNRESOLVED
evidence:
  - docs/milestones/tecnotron-operational-foundation-v1/PLAN.md
  - docs/current-state.md
unresolved_gap: generalized reporting mechanism, ownership and evidence contract
product_effect_required: UNPROVEN
research_needed: false
```

## OpenCode compatibility lifecycle

This reconciliation does **not** certify a reusable OpenCode compatibility baseline.

```yaml
OpenCode_reusable_compatibility_baseline:
  state: NOT_PROVEN
  exact_identity: UNPROVEN_FOR_REUSABLE_BASELINE
  reusable_without_rediscovery: false
```

Ordinary TaskCycles do not require full rediscovery when nothing relevant changed.
Rediscovery is triggered by:

- OpenCode version outside a certified set;
- executable/runtime identity change;
- relevant configuration schema change;
- material adapter implementation change;
- execution-surface conformance contract change;
- observed incompatibility;
- explicit Developer change to the supported boundary.

OpenCode remains a replaceable execution surface and owns neither generic execution
coordination, product authority, routing, lifecycle, context sufficiency nor
model/provider selection.

## Program frontier

Current ordering after post-WP002 reconciliation:

```text
WP-002 complete / milestone dependency satisfied
→ bounded repository hygiene/deprecation reconciliation (Developer-selected,
  separately authorized responsibility; no new WP)
→ WP-003 remains PLANNING_PENDING_SPEC and NOT_INITIALIZED
→ subsequent accepted milestone dependency graph remains unchanged
```

The hygiene responsibility exists to make physical repository state correspond more
closely to canonical semantic state before the next development frontier. It does not
authorize deletion or migration by itself.
