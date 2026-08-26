---
status: canonical
owner: fitflow-ai
type: reference
updated: 2026-08-25
related:
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[work-packages/authority-reconciliation/PLAN]]"
  - "[[work-packages/document-topology/PLAN]]"
  - "[[work-packages/planning-hierarchy/PLAN]]"
  - "[[work-packages/system-guide/PLAN]]"
  - "[[work-packages/research-archive/PLAN]]"
  - "[[work-packages/document-conformance/PLAN]]"
  - "[[work-packages/agent-profiles-mvp/PLAN]]"
  - "[[tasks/FF-AI-DOC-001/TASK]]"
  - "[[tasks/FF-AI-DOC-001/RESULT]]"
  - "[[tasks/FF-AI-DOC-001/REVIEW]]"
  - "[[tasks/FF-AI-VNEXT-008/TASK]]"
  - "[[tasks/FF-AI-VNEXT-008/RESULT]]"
  - "[[tasks/FF-AI-VNEXT-008/REVIEW]]"
  - "[[tasks/FF-AI-VNEXT-009/TASK]]"
  - "[[tasks/FF-AI-VNEXT-009/RESULT]]"
  - "[[tasks/FF-AI-VNEXT-009/REVIEW]]"
  - "[[tasks/FF-AI-AGENT-001/TASK]]"
  - "[[tasks/FF-AI-AGENT-001/PLAN]]"
  - "[[tasks/FF-AI-AGENT-001/RESULT]]"
  - "[[tasks/FF-AI-AGENT-001/REVIEW]]"
  - "[[tasks/FF-AI-AGENT-002/TASK]]"
  - "[[tasks/FF-AI-AGENT-002/PLAN]]"
  - "[[tasks/FF-AI-AGENT-002/RESULT]]"
  - "[[tasks/FF-AI-AGENT-002/REVIEW]]"
  - "[[tasks/FF-AI-DOC-CLOSURE-001/TASK]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-matrix]]"
  - "[[architecture/agent-profile-conformance]]"
---

# Source Of Truth

This is the deterministic navigation and precedence index for canonical
FitFlow-ai documentation. Derived indexes, generated packages, caches, agent
sessions, workspace metadata, and Obsidian views are not source of truth.

## Precedencia de Autoridad (Exacta)

Cuando dos documentos discrepen, gana el de mayor precedencia en esta lista:

1. **Contratos y schemas ejecutables** (`src/contracts/`, `src/registries/schemas/`) — única fuente vinculante para validación runtime y compile-time.
2. **ADRs y políticas canónicas** (`docs/decisions/ADR-*.md`, `docs/task-lifecycle.md`, `docs/context-strategy.md`, `docs/operational-architecture.md`) — gobiernan decisiones arquitectónicas, lifecycle, contexto, límites operativos.
3. **SOURCE_OF_TRUTH e índices** (`docs/SOURCE_OF_TRUTH.md`) — índice de navegación determinista y regla de contradicción; no introduce policy propia.
4. **TASK/RESULT/REVIEW aceptados** (`docs/tasks/FF-AI-*/TASK.md`, `RESULT.md`, `REVIEW.md` con `status: canonical`) — evidencia y scope vinculante por tarea aceptada.
5. **Guías** (derivadas, p.ej. `docs/guides/system-guide.md` futura) — explicativas, **no introducen policy**; si una guía contradice una capa superior, gana la capa superior.
6. **Investigación** (`docs/research/`) — material de apoyo, no normativo.
7. **Archivo y source-material** (`docs/archive/source-material/`, `docs/archive/`) — histórico; puede curarse por TASK explícita; sigue no canónico y excluido por defecto.

**Regla de contradicción:** El documento de mayor precedencia en esta lista gana. `SOURCE_OF_TRUTH.md` es el árbitro de navegación, no una capa de policy adicional.

## Índice de Documentos Canónicos

| Documento | Autoridad |
|---|---|
| [Architecture](architecture.md) | Stable AI Core architectural invariants and repository boundary. Futuro: `docs/architecture/system-architecture.md` (WP2). |
| [Operational Architecture](operational-architecture.md) | Operational responsibilities, replaceable implementations, and control-plane boundaries. Futuro: `docs/architecture/operational-architecture.md` (WP2). |
| [Task Lifecycle](task-lifecycle.md) | Logical lifecycle, worktree policy, acceptance, integration, and cleanup contracts. Futuro: `docs/architecture/task-lifecycle.md` (WP2). |
| [Context Strategy](context-strategy.md) | Context objective, retrieval policy, telemetry, and evaluation gates. Futuro: `docs/architecture/context-strategy.md` (WP2). |
| [Development Pipeline Adapter](development-pipeline-adapter.md) | Canonical adapter boundary and current adapter status. Futuro: `docs/architecture/development-pipeline-adapter.md` (WP2). |
| [Current State](current-state.md) | Confirmed implementation reality and validation evidence only. |
| [Implementation Roadmap](implementation-roadmap.md) | Sequencing and planned implementation work. |
| [Compatibility Baseline](compatibility-baseline.md) | Observed tool compatibility and reproducible baseline evidence. |
| [Agent Role Contracts](architecture/agent-role-contracts.md) | Contratos canónicos para los 7 roles iniciales; autoridad, inputs, outputs, límites, contexto, capacidades y permisos. No declara perfiles ejecutables. |
| [Agent Profile Matrix](architecture/agent-profile-matrix.md) | Matriz canónica que separa role contract, perfil manual propuesto, runtime selection, model/skill bindings y permisos task-specific. |
| [Agent Profile Conformance](architecture/agent-profile-conformance.md) | Conformance documental canónica para perfiles mínimos; sin perfiles/adapters/runtime ejecutables. Aceptada por el Developer (2026-08-25). |
| [ADR-001: Document Authority and Layout](decisions/ADR-001-document-authority-and-layout.md) | Precedencia, layout objetivo, jerarquía Roadmap→Milestone→WP→Task, 5 dimensiones de estado, opencode.json origin, ambient_dirty policy, cross-repo boundary, source-material, **gobierna separaciones role/profile/runtime/model/skill/permissions**. |
| [Milestone: document-governance-v1](milestones/document-governance-v1/PLAN.md) | Baseline main@41088a4, tooling@c88c174, integration target tooling, promotion target main, 6 WPs (WP1 Wave1, WP2-3 Wave2, WP4-5 Wave3, WP6 Wave4), paralelismo y gates. |
| [WP1: Authority Reconciliation](work-packages/authority-reconciliation/PLAN.md) | ADR-001, task-lifecycle.md 5 dimensiones, cierre 009 append-only, SoT update. Task FF-AI-DOC-001 Wave1. |
| [WP2: Document Topology](work-packages/document-topology/PLAN.md) | 6 movimientos exactos a layout objetivo, links activos, SoT paths movidos. Task FF-AI-DOC-002 Wave2. |
| [WP3: Planning Hierarchy](work-packages/planning-hierarchy/PLAN.md) | Jerarquía Roadmap→Milestone→WP→Task, plantillas canónicas, gates por nivel. Task FF-AI-DOC-003 Wave2. |
| [WP4: System Guide](work-packages/system-guide/PLAN.md) | Guía futura `docs/guides/system-guide.md` explicativo, no policy. Task FF-AI-DOC-004 Wave3. |
| [WP5: Research Archive](work-packages/research-archive/PLAN.md) | Consolidación archive/research con READMEs; policy indexación; reclasificación indexing-pipeline. Task FF-AI-DOC-005 Wave3. |
| [WP6: Document Conformance](work-packages/document-conformance/PLAN.md) | Validación conformancia completa corpus canónico (layout docs/architecture, docs/guides). Task FF-AI-DOC-006 Wave4 (serial tras WP1-5). |
| [WP: Agent Profiles MVP](work-packages/agent-profiles-mvp/PLAN.md) | Follow-up post-fundación; no parte WP1–WP6. `DONE`: AGENT001 y AGENT002 `DONE`, `ACCEPTED` e `INTEGRATED`; WP cerrado por ruling del Developer (2026-08-25). |
| [Task FF-AI-DOC-001](tasks/FF-AI-DOC-001/TASK.md) | Fundación + Wave1 + cierre 009. WP1 `DONE`; integrada en `tooling` por PR #10, merge `51821e21be9a63d7aabff9598114a75850b20792`; `DOC_SYNC` completado. |
| [Result FF-AI-DOC-001](tasks/FF-AI-DOC-001/RESULT.md) | Evidencia de cierre retrospectivo; conserva el resultado aceptado de la task. |
| [Review FF-AI-DOC-001](tasks/FF-AI-DOC-001/REVIEW.md) | Registro retrospectivo del veredicto independiente ya emitido; no es una nueva revisión. |
| [Task FF-AI-VNEXT-008](tasks/FF-AI-VNEXT-008/TASK.md) | Canonical definition, ownership, acceptance criteria, and scope boundary for Explorer and Agent Runtime conformance. |
| [Result FF-AI-VNEXT-008](tasks/FF-AI-VNEXT-008/RESULT.md) | Evidencia de validación aceptada de la task completada. |
| [Review FF-AI-VNEXT-008](tasks/FF-AI-VNEXT-008/REVIEW.md) | Revisión independiente de aceptación registrada. |
| [Task FF-AI-VNEXT-009](tasks/FF-AI-VNEXT-009/TASK.md) | Canonical definition, ownership, acceptance criteria, and scope boundary for Agent MVP composition root and documentation sync. |
| [Result FF-AI-VNEXT-009](tasks/FF-AI-VNEXT-009/RESULT.md) | Evidencia de validación y cierre documental append-only. |
| [Review FF-AI-VNEXT-009](tasks/FF-AI-VNEXT-009/REVIEW.md) | Revisión independiente de aceptación registrada. |
| [Task FF-AI-AGENT-001](tasks/FF-AI-AGENT-001/TASK.md) | Contratos de 7 roles + matriz perfiles (docs-only). `validation PASS`, review completado, `ACCEPTED`, integrada en `tooling` por PR #12, merge `3d5d8b85a316233eae029963a3f5d14400fcd7fc`; `DOC_SYNC` completado y lifecycle `DONE`. |
| [Result FF-AI-AGENT-001](tasks/FF-AI-AGENT-001/RESULT.md) | Evidencia de cierre retrospectivo; conserva el resultado aceptado de la task. |
| [Review FF-AI-AGENT-001](tasks/FF-AI-AGENT-001/REVIEW.md) | Registro retrospectivo del veredicto independiente ya emitido; no es una nueva revisión. |
| [Task FF-AI-AGENT-002](tasks/FF-AI-AGENT-002/TASK.md) | Conformance documental de perfiles mínimos (canonical). Validación PASS y review `ACCEPT_WITH_NON_BLOCKING_FINDINGS`; `ACCEPTED` (2026-08-25), integrada en `tooling` por PR #15, merge `6c1effd9c6cc45d2f802672a124efa4ff15f93f5`; `DOC_SYNC` completado y lifecycle `DONE`. |
| [Result FF-AI-AGENT-002](tasks/FF-AI-AGENT-002/RESULT.md) | Evidencia de cierre retrospectivo; conserva el resultado aceptado de la task. |
| [Review FF-AI-AGENT-002](tasks/FF-AI-AGENT-002/REVIEW.md) | Registro retrospectivo del veredicto independiente ya emitido; no es una nueva revisión. |
| [Task FF-AI-DOC-CLOSURE-001](tasks/FF-AI-DOC-CLOSURE-001/TASK.md) | Cierre documental de evidencia: RESULT/REVIEW retrospectivos, WP Agent Profiles MVP `DONE`, layout ADR pendiente bajo WP2. `DONE`; integrada por PR #17, merge `2f94422a64b7d86edf8abebdc10b13be87c1d10a`. |
| [Result FF-AI-DOC-CLOSURE-001](tasks/FF-AI-DOC-CLOSURE-001/RESULT.md) | Evidencia aceptada del cierre documental. |
| [Review FF-AI-DOC-CLOSURE-001](tasks/FF-AI-DOC-CLOSURE-001/REVIEW.md) | Revisión independiente del cierre; ACCEPT_WITH_NON_BLOCKING_FINDINGS. |

## Reference / Non-Canonical

| Documento | Nota |
|---|---|
| [Indexing Pipeline](indexing-pipeline.md) | Futuro destino: `docs/research/semantic-retrieval.md` (reclasificado research no normativo; movimiento por WP2). |
| [Archive Source Material](archive/source-material/) | Histórico; puede curarse por TASK explícita; no canónico. |

## Registros Activos (Executable Sources)

| Registro | Versión | Autoridad | Ubicación |
|---|---|---|---|
| Role registry | v3 | Current role IDs and fixed deterministic routing policy. v2 unsupported. | [`src/registries/schemas/roles.js`](../src/registries/schemas/roles.js) |
| Model registry | v3 | Explicit model eligibility and deterministic selection metadata. v2 unsupported. | [`src/registries/schemas/models.js`](../src/registries/schemas/models.js) |

When documents disagree, resolve by subject authority in the precedence table above. Current State does not promote planned architecture to implementation; Roadmap does not override architectural invariants; the executable role registry controls concrete role IDs.
