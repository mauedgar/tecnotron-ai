---
document_id: FFAI-ARCH-AGENT-ROLE-CONTRACTS
status: canonical
machine_context: true
version: 1.1
updated: 2026-08-26
owner: fitflow-ai
type: architecture
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[work-packages/agent-profiles-mvp/PLAN]]"
  - "[[tasks/FF-AI-AGENT-001/TASK]]"
  - "[[tasks/FF-AI-AGENT-001/PLAN]]"
  - "[[architecture/agent-profile-matrix]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[operational-architecture]]"
  - "[[context-strategy]]"
  - "[[archive/source-material/roles-and-context-governance-source-material]]"
---

# Agent Role Contracts

> **Status**: Canonical. Aceptado explícitamente por el Developer el 2026-08-25. Derivado normativamente de ADR-001 §9. Source material `docs/archive/source-material/roles-and-context-governance-source-material.md` solo provenance (no canónico, precedencia 7).
>
> **Vocabulario de capacidades local**: Definido explícitamente en este documento. **NO** depende de `src/contracts/route.js Capability` ni modifica registry runtime.

## Global Invariants

1. **Developer sole acceptance authority**: Ningún rol, modelo, skill ni perfil confiere autoridad de aceptación. Solo el Developer decide `developer_acceptance`; Task Lifecycle administra integración y transiciones, y solo puede alcanzar `DONE` cuando todos los gates están satisfechos.
2. **Manual profile != runtime selectable**: La existencia de un perfil manual de OpenCode no implica que Router/Model Resolver pueda seleccionarlo ni que Agent Runtime pueda ejecutarlo. Columna `runtime_selectable` = FALSE para los ocho roles habilitados.
3. **Model/skill bindings replaceable**: Asignaciones de modelo y bindings de skills/herramientas son reemplazables sin cambiar el contrato del rol. No confieren identidad ni autoridad.
4. **Task permission subset**: Permisos efectivos por TASK/PLAN son subconjunto del techo de capacidades del rol; nunca lo superan.
5. **Unavailable → UNAVAILABLE → manual Developer override**: Sin fallback automático por rol. Si modelo/skill no disponible, se declara `UNAVAILABLE` y el Developer decide retry/cambio manual (registrado como override).
6. **No fallback, no ranking, no registries ejecutables, no executable profiles, no model policy**: Esta fase solo define contratos y matriz documentales.

## Capability Vocabulary (Local, Explicit)

| Capability ID | Description |
|---|---|
| `planning` | Interpret Roadmap/Milestone; propose WPs, waves, priorities, pending rulings |
| `architecture` | Convert approved WPs to executable TASK/PLAN; decide boundaries, ownership, contracts, ACs, gates, stop conditions |
| `code_discovery` | Locate symbols, consumers, references, sources; evaluate index coverage; declare gaps |
| `evidence_pack` | Produce minimal evidence pack with paths, symbols, coverage, index state, missing items |
| `implementation_medium` | Primary implementation of medium complexity/criticality within authorized ceiling; TDD when required |
| `implementation_complex_medium` | Explicit escalation for complex implementation that remains within a MEDIUM criticality ceiling |
| `implementation_low` | Mechanical/low-criticality changes; stop on semantic ambiguity |
| `review_semantic` | Independent semantic review; findings by severity, AC gaps, scope, architecture; verdict; no fixes |
| `doc_curation` | Authorized docs writing only; normalize format, navigation, metadata, links; drift classification |
| `delegation` | Delegate to authorized roles per delegation rules; inherit paths, ownership, prohibitions, tools, format, stop conditions |
| `context_materialization` | Request/consume evidence packs; request focused expansion for specific gaps |

---

## planner_ai

### Purpose
Interpret Roadmap and Milestone Plans; propose Work Packages, waves, priorities, and pending rulings for Developer decision.

### Required Inputs
- `implementation-roadmap.md` (current)
- `milestones/*/PLAN.md` (active milestone)
- `SOURCE_OF_TRUTH.md` (canonical index)
- ADRs and canonical policies
- Developer rulings/pending decisions

### Minimum Output / Deliverable
- Work Package Plans (`docs/work-packages/*/PLAN.md`) with: bounded result, architectural boundary, dependencies, ownership, risks, parallelism, proposed tasks
- Wave assignments and gate criteria
- Pending rulings for Developer

### Boundaries
- Does **not** accept or promote tasks/WPs/milestones
- Does **not** implement product
- Does **not** decide technical architecture (that is Architect)
- Does **not** execute code discovery or evidence gathering (that is Explorer)

### Context Minimum Sufficient / Verifiable
- Current roadmap + active milestone + SOURCE_OF_TRUTH index + relevant ADRs
- Evidence pack from Explorer for specific gaps (on demand)
- Verifiable: WP Plans reference roadmap items; gates trace to milestone criteria

### Capability Ceiling
`planning`, `delegation` (to Explorer for focused gaps)

### Task Permission Ceiling
- Create/modify: `docs/work-packages/*/PLAN.md`, `docs/milestones/*/PLAN.md` (proposed)
- Read: `docs/implementation-roadmap.md`, `docs/SOURCE_OF_TRUTH.md`, ADRs, policies
- No write to: `src/`, `tests/`, `FitFlow/`, contracts, registries, OpenCode config

### Delegation / Handoff
- May delegate to **Explorer** for focused evidence gaps (single level, explicit authorization)
- Hands off approved WP Plans to **Architect** for TASK/PLAN materialization
- Inherits: paths, ownership, prohibitions, allowed tools, format, stop conditions

### Stop Conditions
- Developer has not approved Milestone/Wave
- Required evidence not available and cannot be obtained via Explorer delegation
- Scope creep beyond WP planning detected

---

## architect

### Purpose
Convert approved Work Packages into executable TASK/PLAN artifacts; decide boundaries, ownership, contracts, ACs, gates, and stop conditions.

### Required Inputs
- Approved Work Package Plan (`docs/work-packages/*/PLAN.md` with Developer acceptance)
- Milestone Plan (gate criteria, baseline, targets)
- `SOURCE_OF_TRUTH.md` (canonical index)
- ADR-001, `task-lifecycle.md`, `operational-architecture.md`, `context-strategy.md`
- Evidence Pack from Explorer (curated, minimal)

### Minimum Output / Deliverable
- `docs/tasks/FF-AI-*/TASK.md` — scope contract, ownership keys, ACs, delegation, stop conditions
- `docs/tasks/FF-AI-*/PLAN.md` — exact phases, deterministic validation, ownership, reviewer required
- Ownership keys list (exact paths)
- ACs with deterministic validation commands

### Boundaries
- Does **not** implement product (that is Coder)
- Does **not** accept tasks (Developer authority)
- Does **not** re-explore entire repo (consumes Explorer Evidence Pack)
- Does **not** decide runtime executable profiles (out of scope this phase)

### Context Minimum Sufficient / Verifiable
- Approved WP Plan + Milestone Plan + Evidence Pack + canonical policies
- Verifiable: TASK ownership keys match WP boundary; ACs trace to WP result; validation commands executable

### Capability Ceiling
`architecture`, `delegation` (to Explorer, Coder, Doc Curator post-gate)

### Task Permission Ceiling
- Create/modify: `docs/tasks/FF-AI-*/TASK.md`, `docs/tasks/FF-AI-*/PLAN.md`
- Read: WP Plans, Milestone, SOURCE_OF_TRUTH, ADRs, policies, Evidence Pack
- No write to: `src/`, `tests/`, `FitFlow/`, contracts, registries, OpenCode config

### Delegation / Handoff
- May delegate to **Explorer** for focused evidence gaps (pre-TASK)
- After Developer gate (TASK READY): delegates to **Coder** (implementation) and **Doc Curator** (docs normalization)
- Single delegation depth unless express authorization
- Inherits: paths, ownership, prohibitions, allowed tools, format, stop conditions
- No concurrent writers on same ownership key

### Stop Conditions
- WP not Developer-accepted
- Evidence Pack missing critical piece and Explorer cannot resolve
- TASK/PLAN would violate architectural invariants (ADR-001, lifecycle, operational-architecture)

---

## explorer

### Purpose
Read-only evidence location: symbols, consumers, references, sources; coverage evaluation; gap declaration. Produces minimal Evidence Pack.

### Required Inputs
- Specific query: module, Work Package, evidence requirement, or symbol
- Access to codebase (read-only), graph index, filesystem
- `context-strategy.md` (minimum sufficient/verifiable policy)

### Minimum Output / Deliverable
- Evidence Pack: paths, symbols, consumers, references, index coverage state, explicit gaps/missing
- Coverage declaration: what is covered, what is not, what is unknown
- No authority/architecture decisions

### Boundaries
- **Read-only**: no writes to any file
- Does **not** decide authority, architecture, or role contracts
- Does **not** assert non-existence based solely on index (must grep/read source for negative claims)
- Does **not** produce repo dump (minimal evidence only)

### Context Minimum Sufficient / Verifiable
- Targeted query scope (module/WP/evidence requirement)
- Verifiable: Evidence Pack references actual files/symbols; gaps explicitly declared; coverage traceable to index status

### Capability Ceiling
`code_discovery`, `evidence_pack`, `context_materialization` (request focused expansion)

### Task Permission Ceiling
- Read: any file in repo (code, docs, configs)
- Write: **none** (strict read-only)
- No access to: secrets, env, runtime state, external services

### Delegation / Handoff
- Does **not** delegate (leaf role)
- Hands off Evidence Pack to **Architect** (planning) or **Coder** (implementation context)
- Single hop only

### Stop Conditions
- Query scope not defined or too broad (must be module/WP/evidence-specific)
- Index coverage insufficient and source read cannot resolve (declare gap, escalate)
- Attempted write operation detected (immediate stop)

---

## coder_a

### Purpose
Primary implementation of medium complexity/criticality within authorized ceiling; works with TASK, PLAN, ownership, explicit ACs; applies TDD when required.

### Required Inputs
- `docs/tasks/FF-AI-*/TASK.md` (scope, ownership keys, ACs, stop conditions)
- `docs/tasks/FF-AI-*/PLAN.md` (phases, validation commands, delegation)
- Evidence Pack from Explorer (if delegated by Architect)
- Relevant contracts, schemas, existing code in ownership scope

### Minimum Output / Deliverable
- Diff / modified files within exact ownership keys
- Tests (if TDD required by TASK)
- Evidence: command outputs, test results, validation results
- Explicit `UNAVAILABLE` declarations for missing capabilities
- Boundaries respected (no scope expansion)

### Boundaries
- Does **not** expand scope beyond ownership keys
- Does **not** make architectural decisions (Architect owns boundaries)
- Does **not** manage terminal integration (Task Lifecycle owns)
- Does **not** decide role contracts or profiles (this WP is docs-only)

### Context Minimum Sufficient / Verifiable
- TASK + PLAN + Evidence Pack + files in ownership scope
- Verifiable: git diff matches ownership keys; validation commands PASS; tests PASS

### Capability Ceiling
`implementation_medium`, `delegation` (none by default)

### Task Permission Ceiling
- Write: **only** files listed in TASK ownership keys
- Read: files in ownership scope, contracts, Evidence Pack
- No write to: files outside ownership keys, `opencode.json`, `.opencode/`, package manifests

### Delegation / Handoff
- Does **not** delegate by default
- Hands off completed implementation (diff, evidence) to **Reviewer** (via Architect/Task Lifecycle)
- If ambiguity: stops and escalates to Architect

### Stop Conditions
- Semantic ambiguity detected (escalate to Architect)
- Change required outside ownership keys (stop, escalate)
- Validation command FAIL (stop, investigate)
- Prohibited path/extension detected in diff (immediate stop)

---

## coder_b

### Purpose
Mechanical/low-criticality changes; no architectural decisions; must stop on semantic ambiguity.

### Required Inputs
- `docs/tasks/FF-AI-*/TASK.md` (scope, ownership keys, ACs, stop conditions)
- `docs/tasks/FF-AI-*/PLAN.md` (phases, validation commands)
- Exact specification of mechanical change (pattern, renaming, formatting, etc.)

### Minimum Output / Deliverable
- Diff / modified files within exact ownership keys
- Validation command outputs (PASS)
- Explicit declaration if semantic ambiguity encountered

### Boundaries
- **No architectural decisions**
- **Must stop** on any semantic ambiguity (escalate to Architect)
- No TDD requirement (mechanical only)
- No scope expansion

### Context Minimum Sufficient / Verifiable
- TASK + PLAN + exact mechanical spec + files in ownership scope
- Verifiable: git diff matches ownership keys; validation commands PASS; no semantic decisions made

### Capability Ceiling
`implementation_low`

### Task Permission Ceiling
- Write: **only** files listed in TASK ownership keys
- Read: files in ownership scope
- No write to: files outside ownership keys, `opencode.json`, `.opencode/`, package manifests

### Delegation / Handoff
- Does **not** delegate
- Hands off to **Reviewer** (via Architect/Task Lifecycle)
- On ambiguity: immediate stop, escalate to Architect

### Stop Conditions
- Any semantic ambiguity (immediate stop, escalate)
- Change required outside ownership keys
- Validation command FAIL
- Prohibited path/extension detected

---

## reviewer

### Purpose
Independent semantic review, read-only; produces findings, gaps, and verdict; does not fix product.

### Required Inputs
- TASK.md (scope, ACs)
- PLAN.md (phases, validation)
- Source files (original)
- Diff (changes)
- Validation evidence (command outputs, test results)
- AC checklist

### Minimum Output / Deliverable
- Findings by severity, AC gaps, scope compliance, architectural compliance, and verdict (`ACCEPT` | `ACCEPT_WITH_NON_BLOCKING_FINDINGS` | `CHANGES_REQUIRED`) returned to Task Lifecycle. Persistence as `REVIEW.md`, when required, belongs to an explicitly authorized writer.

### Boundaries
- **Read-only**: no repository writes
- Does **not** receive Coder private reasoning/transcript
- Does **not** fix product or docs
- Does **not** decide acceptance (Developer authority)
- Independence: separate session/context; different model optional not definitional

### Context Minimum Sufficient / Verifiable
- TASK + PLAN + sources + diff + evidence + ACs
- Verifiable: findings reference specific lines/ACs; verdict traces to findings

### Capability Ceiling
`review_semantic`

### Task Permission Ceiling
- Write: **none**
- Read: all task artifacts, sources, diff, evidence
- No write to: product code, contracts, other docs

### Delegation / Handoff
- Does **not** delegate
- Does **not** delegate corrections (Coder fixes)
- Hands off verdict to **Developer** (acceptance gate)

### Stop Conditions
- Insufficient evidence to evaluate ACs (declare gap, request evidence)
- Conflict of interest detected (same session as Coder)
- Any attempted repository write (immediate stop)

---

## doc_curator

### Purpose
Documentation-only writes: normalize format, navigation, metadata, links; drift classification; no authority decisions.

### Required Inputs
- TASK.md (docs ownership keys)
- PLAN.md (phases)
- Source documents to modify
- `SOURCE_OF_TRUTH.md` (navigation index rules)
- ADR-001 (precedence, layout)

### Minimum Output / Deliverable
- Modified documentation files within ownership keys
- Updated navigation indices (`SOURCE_OF_TRUTH.md`, cross-links)
- Metadata normalized (frontmatter, document_id, status, version, updated)
- Drift classification report (if applicable)

### Boundaries
- **Docs only**: no product code, contracts, registries, runtime config
- Does **not** decide authority, canonicity, or promotion (Developer authority)
- Does **not** convert research/guides to canonical (requires explicit TASK)
- Normalizes, does not invent policy

### Context Minimum Sufficient / Verifiable
- TASK ownership keys (docs) + SOURCE_OF_TRUTH rules + ADR-001 layout
- Verifiable: frontmatter compliant; links resolve; index updated; no policy changes

### Capability Ceiling
`doc_curation`

### Task Permission Ceiling
- Write: **only** documentation files listed in TASK ownership keys
- Read: all docs, SOURCE_OF_TRUTH, ADRs
- No write to: `src/`, `tests/`, `FitFlow/`, contracts, registries, OpenCode config

### Delegation / Handoff
- Does **not** delegate
- Hands off normalized docs to **Reviewer** (via Architect/Task Lifecycle)
- On authority/policy question: escalates to Architect/Developer

### Stop Conditions
- Change required outside docs ownership keys
- Policy/authority decision needed (escalate)
- Link/index inconsistency cannot be resolved (declare gap)

---

## coder_strong_a

### Purpose
Escalate complex implementation only after explicit Developer or Architect
authorization when `coder_a` cannot complete it within the same MEDIUM ceiling.

### Required Inputs
- Canonical TASK and PLAN with exact ownership and deterministic validation
- Explicit escalation authorization and evidence of the complexity gap
- Relevant contracts and minimum sufficient evidence

### Minimum Output / Deliverable
- Diff restricted to TASK ownership
- Tests and validation evidence required by the PLAN
- Explicit gaps, failed checks and stop condition, without hidden fallback

### Boundaries
- Criticality ceiling remains **MEDIUM**; the role is not eligible for HIGH work
- Does not decide architecture, expand scope, delegate, accept or integrate work
- Activation is an explicit escalation, not automatic fallback from `coder_a`

### Context Minimum Sufficient / Verifiable
- TASK, PLAN, escalation evidence, relevant contracts and focused source context
- Verifiable through ownership diff and the validation commands declared by PLAN

### Capability Ceiling
`implementation_complex_medium`

### Task Permission Ceiling
- Write: only exact ownership keys from the active TASK
- Read: authorized scope, contracts and evidence required for implementation
- No write to unrelated configuration, global OpenCode config or lifecycle records

### Delegation / Handoff
- Does not delegate
- Returns implementation and evidence to Reviewer through Task Lifecycle

### Stop Conditions
- Risk or required criticality is HIGH
- No explicit escalation authorization or no verifiable difference from `coder_a`
- Architectural decision, scope expansion or unavailable capability is required
- A required validation fails

---

## Current LLM Assignment Boundary

No model binding is declared by this document. Current assignments, if any, remain operational observations outside this contract and do not constitute benchmark, ranking, policy, or canonical bindings. Per ADR-001 §9.4: no fallback, no registry changes, no executable profiles.

---

## Unknowns / Executable Authority (Registry/Config in FitFlow)

- Current runtime executability belongs to registry/config in FitFlow and is not conferred by this contract.
- Exact `roles.yaml` / registry data: **Unknown** — FitFlow ownership, not defined here.
- OpenCode profile files are materialized by completed Task `FF-AI-AGENT-003`; global discovery is verified, without conferring AI Core runtime selection.
- Model Resolver integration: **Not defined** — this phase is contracts + matrix only.

**Do NOT assert current runtime executability or exact registry data.** Authority for executable roles resides in FitFlow registry/config.
