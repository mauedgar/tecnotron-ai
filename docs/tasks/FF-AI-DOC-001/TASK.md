---
document_id: FFAI-TASK-DOC-001
status: canonical
machine_context: true
version: 1.4
updated: 2026-08-25
owner: fitflow-ai
type: workflow
milestone: document-governance-v1
work_package: WP1-authority-reconciliation
wave: 1
dependencies: []
ownership_keys:
  - "doc:docs/decisions/ADR-001-document-authority-and-layout.md"
  - "doc:docs/milestones/document-governance-v1/PLAN.md"
  - "doc:docs/work-packages/authority-reconciliation/PLAN.md"
  - "doc:docs/work-packages/document-topology/PLAN.md"
  - "doc:docs/work-packages/planning-hierarchy/PLAN.md"
  - "doc:docs/work-packages/system-guide/PLAN.md"
  - "doc:docs/work-packages/research-archive/PLAN.md"
  - "doc:docs/work-packages/document-conformance/PLAN.md"
  - "doc:docs/tasks/FF-AI-DOC-001/TASK.md"
  - "doc:docs/tasks/FF-AI-DOC-001/PLAN.md"
  - "doc:docs/SOURCE_OF_TRUTH.md"
  - "doc:docs/task-lifecycle.md"
  - "doc:docs/current-state.md"
  - "doc:docs/implementation-roadmap.md"
  - "doc:docs/tasks/FF-AI-VNEXT-009/TASK.md"
  - "doc:docs/tasks/FF-AI-VNEXT-009/RESULT.md"
validation: PASS
review_verdict: ACCEPT_WITH_NON_BLOCKING_FINDINGS
developer_acceptance: ACCEPTED
accepted_at: 2026-08-25
integration:
  status: INTEGRATED
  target: tooling
  sha: 51821e21be9a63d7aabff9598114a75850b20792
  integrated_at: 2026-08-25
lifecycle_status: DONE
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[work-packages/authority-reconciliation/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
  - "[[tasks/FF-AI-VNEXT-009/TASK]]"
  - "[[tasks/FF-AI-VNEXT-009/RESULT]]"
---

# TASK FF-AI-DOC-001: Document Governance Foundation + Wave 1 + Closure 009

## Identificación

| Campo | Valor |
|---|---|
| Task ID | `FF-AI-DOC-001` |
| Estado | `DONE` |
| Baseline principal (main) | `main@41088a413d06ed1d58d63d92320e38d4b44b86ea` |
| Task base (tooling) | `tooling@c88c17406f603292f0496188fc74c7cd31cc9e0a` |
| Integration target | `tooling` |
| Promotion target | `main` |
| Task type / area / scope | `documentation` / `governance` / `foundation` |
| Lane / risk / priority | `deterministic` / `low` / `P0` |
| Milestone | `document-governance-v1` |
| Work Package | `WP1-authority-reconciliation` |
| Wave | `1` |
| Dependencias | `[]` (ruling Fase 1A explícito: sin dependencias previas) |
| **validation** | `PASS` (`git diff --check`; scope 6 tracked + 10 untracked; REVIEW 009 unchanged) |
| **review_verdict** | `ACCEPT_WITH_NON_BLOCKING_FINDINGS` (review independiente; findings F1-F11 resueltos) |
| **developer_acceptance** | `ACCEPTED` |
| **accepted_at** | `2026-08-25` |
| **integration** | `{status: INTEGRATED, target: tooling, sha: 51821e21be9a63d7aabff9598114a75850b20792, integrated_at: 2026-08-25}` |
| **lifecycle_status** | `DONE` |

Validación y review completados; el Developer aceptó explícitamente la task el 2026-08-25. La fundación se integró en `tooling` mediante PR #10 y este cierre completa `DOC_SYNC`.

La futura materialización machine-readable valida contra `fitflow-task/v2` y conserva estos ownership keys (solo paths permitidos en esta ejecución — 16 archivos):

```text
doc:docs/decisions/ADR-001-document-authority-and-layout.md
doc:docs/milestones/document-governance-v1/PLAN.md
doc:docs/work-packages/authority-reconciliation/PLAN.md
doc:docs/work-packages/document-topology/PLAN.md
doc:docs/work-packages/planning-hierarchy/PLAN.md
doc:docs/work-packages/system-guide/PLAN.md
doc:docs/work-packages/research-archive/PLAN.md
doc:docs/work-packages/document-conformance/PLAN.md
doc:docs/tasks/FF-AI-DOC-001/TASK.md
doc:docs/tasks/FF-AI-DOC-001/PLAN.md
doc:docs/SOURCE_OF_TRUTH.md
doc:docs/task-lifecycle.md
doc:docs/current-state.md
doc:docs/implementation-roadmap.md
doc:docs/tasks/FF-AI-VNEXT-009/TASK.md
doc:docs/tasks/FF-AI-VNEXT-009/RESULT.md
```

## Objetivo

Ejecutar **exclusivamente** la fundación aprobada y Wave 1 documental:

1. **Fundación (ADR-001):** Crear ADR canónico de autoridad, precedencia, layout objetivo, jerarquía Roadmap→Milestone→WP→Task, 5 dimensiones de estado, `opencode.json` historical origin `UNKNOWN/PRE-EXISTING`, `.opencode/package*.json` `ambient_dirty` policy, cross-repo boundary, source-material no canónico, **y gobernanza de roles/contexto/capacidades/skills/modelos** (separaciones role contract, manual OpenCode profile, runtime-selectable role, model binding, skill/tool binding, task-specific permissions; contexto minimum sufficient/verifiable; capacidades como contratos estables; bindings reemplazables; asignaciones LLM como observaciones no ranking; no fallback automático; catálogo inicial y deferred).
2. **Milestone + 6 WPs:** Crear Milestone Plan `document-governance-v1` y 6 WP Plans (WP1–WP6) canónicos, con registro de **Follow-up gated post-fundación** (Agent Profiles MVP, perfiles iniciales/deferred, tasks propuestas `FF-AI-AGENT-001/002` gated).
3. **Task DOC-001:** Crear este TASK.md y PLAN.md con milestone, work_package, wave, dependencies, ownership_keys.
4. **Lifecycle:** Materializar 5 dimensiones de estado, secuencia canónica, clasificación `ambient_dirty` y dos archivos conocidos en `task-lifecycle.md`.
5. **Cierre 009:** Registrar cierre append-only de `FF-AI-VNEXT-009` en TASK, RESULT, current-state, roadmap (sin reinterpretar evidencia técnica ni editar REVIEW).
6. **SoT:** Actualizar `SOURCE_OF_TRUTH.md` para indexar ADR, Milestone, WP1–WP6, Task DOC-001, y registrar precedencia exacta (incluye que ADR gobierna separaciones role/profile/runtime/model/skill/permissions).

**No incluye (explícitamente excluido):**
- Ejecutar los seis movimientos aprobados (corresponden a `FF-AI-DOC-002` Wave 2).
- Crear System Guide, research README, archive README (WP4/WP5).
- Crear RESULT/REVIEW de `FF-AI-DOC-001` (se crean al cierre de la task).
- Crear TASKs `FF-AI-DOC-002` a `FF-AI-DOC-006` (Waves 2–4).
- **Crear `FF-AI-AGENT-*` ni archivos de perfiles/agent profiles** (requieren nuevo TASK/gate post-fundación).
- Editar `docs/tasks/FF-AI-VNEXT-009/REVIEW.md` (conservar veredicto técnico original).
- Editar `.opencode/**`, `opencode.json`, source material, `.cbmignore`, `src/**`, `tests/**`, manifiestos, dependencies, FitFlow, config externa.
- Cambios productivos/contratos/FitFlow.

## Criterios de Aceptación (AC)

| AC | Criterio | Validación |
|---|---|---|
| **AC-1** | ADR-001 canónico con frontmatter `document_id: FFAI-ADR-001`, `accepted_by: Developer`, `accepted_at: 2026-08-25`, precedencia exacta 7 capas, layout, jerarquía, 5 dimensiones, opencode.json UNKNOWN/PRE-EXISTING, ambient_dirty, cross-repo, source-material | Lectura directa del archivo; `grep -c "FFAI-ADR-001"` = 1 |
| **AC-2** | Milestone Plan `document-governance-v1` canónico con baseline main@41088a4, tooling@c88c174, integration target tooling, promotion target main, 6 WPs con waves/tasks/estado, paralelismo, riesgos, Developer gate | Lectura directa; campos obligatorios presentes |
| **AC-3** | 6 WP Plans canónicos en `docs/work-packages/*/PLAN.md` cada uno con: resultado acotado, frontera, owner, contexto, dependencias, riesgos, paralelismo, task, Developer gate | 6 archivos existen; cada uno tiene secciones requeridas |
| **AC-4** | Task `FF-AI-DOC-001` TASK.md y PLAN.md canónicos con milestone, work_package, wave, dependencies, ownership_keys cubriendo solo paths permitidos | Lectura directa; ownership_keys = 16 paths listados arriba |
| **AC-5** | `task-lifecycle.md` actualizado: `updated: 2026-08-25`, secuencia canónica exacta (VALIDATED → PENDING_ACCEPTANCE → Developer ACCEPTED → INTEGRATING → integración verificada → DOC_SYNC → DONE → CLEANUP), 5 dimensiones con valores exactos, `review_verdict` puede estar ausente (no inventar PENDING), merge≠accept, reviewer ACCEPT≠DONE, acceptance sin integración≠DONE, clasificación task_dirty (deliberado), ambient_dirty (automático OpenCode/Orca/tooling), unexpected_dirty (desconocido), dos ambient_dirty conocidos MVP | Lectura directa; búsqueda "ambient_dirty" encuentra clasificación ruling |
| **AC-6** | Cierre append-only de `FF-AI-VNEXT-009` en 4 archivos: TASK.md (frontmatter/tabla dimensiones, `integration` objeto INTEGRATED target tooling SHA/date, ruling opencode.json UNKNOWN/PRE-EXISTING, baseline histórico, nota histórica + cierre), RESULT.md (sección final "Cierre documental append-only" con metadata, normalizar frases colapsadas), current-state.md (eliminar claims activos integración pendiente/divergencia, registrar cierre `integration INTEGRATED`, mantener historial), roadmap.md (eliminar claims activos, registrar cierre `integration INTEGRATED`, mantener historial). **No editar REVIEW.md**. | Frontmatter metadata update + body historical content preserved verbatim + final closure appended; no technical evidence/review changed; REVIEW.md sin cambios; `integration INTEGRATED` no RECONCILED |
| **AC-7** | `SOURCE_OF_TRUTH.md` actualizado: `updated: 2026-08-25`, sección precedencia exacta + regla contradicción, indexa **9 entradas exactas** (ADR-001, Milestone, 6 WPs, Task DOC-001) en categorías correctas; paths arquitectura en `docs/architecture/`, guía en `docs/guides/system-guide.md`, `indexing-pipeline.md` en Reference/Non-Canonical | Lectura directa; tabla de autoridad incluye 9 entradas (ADR + Milestone + 6 WPs + Task); paths movidos correctamente referenciados |
| **AC-8** | **Sin cambios productivos/contratos/FitFlow**: `git status --short` clasifica 16 archivos task_dirty (6 modified + 10 untracked) + 2 staged ambient_dirty (`.opencode/package*.json`). `.opencode/package*.json` y `opencode.json` **no** aparecen en unstaged. | `git diff --name-only` → 6 modified; `git ls-files --others --exclude-standard` → 10 untracked; `git diff --cached --name-only` → 2 ambient_dirty |
| **AC-9** | Validación documental: `git diff --check` PASS (sin whitespace errors). | Ejecución comando |
| **AC-10** | La task recorrió `PENDING_ACCEPTANCE` → `ACCEPTED` → `INTEGRATING` → `DOC_SYNC` → `DONE`; integración verificada en PR #10 / merge SHA `51821e21be9a63d7aabff9598114a75850b20792`. | Frontmatter TASK.md y evidencia GitHub |
| **AC-11** | ADR-001 §9 materializa separaciones exactas: role contract vs manual OpenCode profile vs runtime-selectable role vs model binding vs skill/tool binding vs task-specific permissions; contexto minimum sufficient/verifiable; capacidades contratos estables; bindings reemplazables; asignaciones LLM observaciones no ranking; no fallback automático; catálogo inicial (planner_ai, architect, explorer, coder_a, coder_b, reviewer, doc_curator) y deferred (coder_strong_a post-MVP); Future WP Agent Profiles MVP gated post-fundación; tasks propuestas FF-AI-AGENT-001/002 solo gated; no perfiles/registries/fallback/ranking en esta fase; task 002 sin autorización para modificar OpenCode. | Lectura directa ADR-001 §9; Milestone Follow-up section; no archivos FF-AI-AGENT-* ni perfiles creados. |

## Short-circuit

Si cualquier AC falla, la implementación se detiene y escala al Developer. No hay workaround ni relajación.

## Estrategia de Validación

- Validación por lectura directa de archivos creados/modificados (source read).
- `git diff --check` para whitespace.
- `git diff --name-only` / `--cached --name-only` para verificar scope.
- Búsqueda de claims activos de 009 "integración pendiente" en current-state y roadmap (deben estar eliminados/convertidos a nota histórica).
- Verificar que `REVIEW.md` de 009 no tiene cambios.

## Out of Scope

- Cualquier implementación de código (`src/**`, `tests/**`).
- Cambios a contratos Zod, registries, schemas.
- Instalación de dependencias / modificación `package.json` / `package-lock.json`.
- Sincronización cross-repo, backlog/TaskStore, publicación contratos JSON.
- Movimientos de archivos (Wave 2+).
- Contenido de System Guide, Research README, Archive README (WP4/WP5).
- Conformancia documental completa (WP6).

## Delegation Boundaries

| Rol | Responsabilidad en esta Task |
|---|---|
| **Coder** | Implementar todos los 16 archivos permitidos (ADR, Milestone, 6 WPs, Task DOC-001 TASK/PLAN, SoT, task-lifecycle, current-state, roadmap, cierre 009 en 2 archivos). Validación documental. |
| **Task Lifecycle** | Owns Git worktree, branch, base commit, provider state transitions, PR creation, integration, cleanup. |
| **Reviewer** | Revisión semántica independiente **requerida antes del Developer gate**; no opcional para docs. |
| **Validator** | Ejecución determinista de `git diff --check`, verificación scope, verificación claims 009. |
| **Developer** | Autoridad terminal de aceptación; gate para ADR, Milestone, WPs, Task, lifecycle, cierre 009, SoT. No promueve a `DONE` sin evidencia + aceptación explícita. |

## Stop Conditions

La implementación se detiene y escala al Developer inmediatamente si:

1. Se requiere modificar algún archivo fuera de la lista de 16 ownership keys.
2. Se intenta ejecutar movimientos de archivos (Wave 2).
3. Se intenta editar `REVIEW.md` de `FF-AI-VNEXT-009`.
4. Se intenta modificar `.opencode/**`, `opencode.json`, source material, `.cbmignore`, `src/**`, `tests/**`, manifiestos, FitFlow.
5. Se intenta promover esta task a `DONE` sin aceptación explícita del Developer.
6. Surge ambigüedad en precedencia, dimensiones de estado, o política `ambient_dirty`.

## Referencias

- ADR-001: `docs/decisions/ADR-001-document-authority-and-layout.md`
- Milestone: `docs/milestones/document-governance-v1/PLAN.md`
- WPs: `docs/work-packages/*/PLAN.md`
- Lifecycle: `docs/task-lifecycle.md`
- SoT: `docs/SOURCE_OF_TRUTH.md`
- Cierre 009: `docs/tasks/FF-AI-VNEXT-009/{TASK.md,RESULT.md}`, `docs/current-state.md`, `docs/implementation-roadmap.md`

## Cierre Task Lifecycle

- `validation: PASS`
- `review_verdict: ACCEPT_WITH_NON_BLOCKING_FINDINGS` (findings resueltos; re-review final `ACCEPT`)
- `developer_acceptance: ACCEPTED` (`2026-08-25`)
- `integration: INTEGRATED` en `tooling` mediante PR #10, merge SHA `51821e21be9a63d7aabff9598114a75850b20792`
- `DOC_SYNC`: completado por esta actualización de cierre
- `lifecycle_status: DONE`
- `.opencode/package.json` y `.opencode/package-lock.json`: `ambient_dirty`, excluidos de ambos commits de la task
