---
document_id: FFAI-WP-AGENT-PROFILES-MVP
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-25
owner: fitflow-ai
type: work-package
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[operational-architecture]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[tasks/FF-AI-AGENT-001/TASK]]"
  - "[[tasks/FF-AI-AGENT-001/PLAN]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-matrix]]"
---

# Work Package Plan: Agent Profiles MVP

## Resumen

Este Work Package define los contratos normativos de roles y la matriz de perfiles para FitFlow-ai. Es un **follow-up separado** habilitado tras la aceptación e integración en `tooling` de los artefactos de fundación de `FF-AI-DOC-001` (ADR-001, Milestone, 6 WP Plans, TASK/PLAN DOC001, SoT actualizado, task-lifecycle actualizado, cierre 009). **No es WP1–WP6** y **no amplía** el milestone `document-governance-v1`.

## Gate de habilitación

Cumplido por `FF-AI-DOC-001` (foundation artifacts: Developer-accepted + integrated en `tooling` via PR #10, merge `51821e2`; `DOC_SYNC` completado PR #11, merge `c30646f`). Los 6 WP Plans son artefactos creados por DOC001; la ejecución/completación/integración de WP2–WP6 **no es prerrequisito**.

## Waves

### Wave 1 — FF-AI-AGENT-001 (ACCEPTED, pending integration)

**Objetivo**: Contratos de roles normativos (`agent-role-contracts.md`) y matriz de perfiles (`agent-profile-matrix.md`) — **solo documentación**.

**Task asociada**: `FF-AI-AGENT-001` (medium criticality, P1, ACCEPTED; pending integration)

**Entregables**:
- `docs/architecture/agent-role-contracts.md` — 7 contratos de roles normativos (canonical; aceptado por Developer el 2026-08-25)
- `docs/architecture/agent-profile-matrix.md` — Matriz con 7 roles iniciales + tabla deferred (canonical; aceptada por Developer el 2026-08-25)

**Scope exacto**: 5 archivos nuevos + 4 archivos modificados (ver ownership keys en TASK).

### Wave 2 — FF-AI-AGENT-002 (PROPOSED / DISCOVERED)

**Estado**: Propuesta en este WP; **no se crea TASK/PLAN ahora**; sin autorización OpenCode presente.

**Objetivo futuro**: Perfiles mínimos y conformance (adapters, permisos efectivos, verificación descubrimiento/invocación, read-only/ownership, skills permitidas/denegadas, profundidad delegación, formato handoffs).

**Gate**: Serial tras `FF-AI-AGENT-001` `DONE` + `ACCEPTED` + `INTEGRATED`.

**Nota**: Requiere nuevo TASK/PLAN con ownership explícito y Developer gate propio.

## Resultados esperados

- Contratos de 7 roles canónicos con: propósito, inputs requeridos, output mínimo/entregable, fronteras, contexto mínimo suficiente/verificable, techo de capacidades, techo de permisos de task, delegación/handoff, condiciones de stop.
- Matriz que mantiene separadas: role contract, manual profile, runtime selectable, model binding, skill/tool binding, task permissions, terminal authority, lifecycle catalog state.
- `coder_strong_a` y roles post-MVP en tabla **Deferred** separada.
- Sin fallback, ranking, registries ejecutables, perfiles ejecutables, model policy.
- Source material solo provenance (no canónico).

## In Scope

- `docs/work-packages/agent-profiles-mvp/PLAN.md` (este archivo)
- `docs/tasks/FF-AI-AGENT-001/TASK.md`
- `docs/tasks/FF-AI-AGENT-001/PLAN.md`
- `docs/architecture/agent-role-contracts.md`
- `docs/architecture/agent-profile-matrix.md`
- Actualizaciones a: `SOURCE_OF_TRUTH.md`, `current-state.md`, `implementation-roadmap.md`, `milestones/document-governance-v1/PLAN.md`

## Out of Scope

- Cualquier implementación de runtime, adapters, registro ejecutable, selección automática, ranking, fallback, model policy.
- Modificaciones a `src/`, `tests/`, `FitFlow/`, contratos ejecutables, registries.
- Cambios a `opencode.json`, `.opencode/package*.json`.
- Creación de archivos de perfil (`.opencode/profile/*.md` u equivalentes).
- Task `FF-AI-AGENT-002` (solo propuesta en este WP).
- WP2–WP6 del milestone `document-governance-v1` (ejecución no prerrequisito).

## Owner

- **Semantic owner**: `Developer` + `Planner` (definen alcance, criterios, gates)
- **Implementation**: `Coder` (solo implementa las tasks documentales)
- **Review**: `Reviewer` (independiente, read-only, findings + veredicto)

## Dependencias

- Gate habilitación: `FF-AI-DOC-001` foundation artifacts accepted + integrated en `tooling` (CUMPLIDO).
- ADR-001 §9 (gobernanza roles/contexto/capacidades/skills/modelos) — autoridad normativa.
- `task-lifecycle.md` (5 dimensiones, secuencia canónica, `ambient_dirty`).
- `operational-architecture.md` (límites operativos, implementaciones reemplazables).
- `context-strategy.md` (contexto mínimo suficiente/verificable).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Confundir role contract con manual profile o runtime selectable | ADR-001 §9.1 separaciones explícitas; matriz mantiene columnas separadas |
| Asumir que perfiles manuales = runtime selectable | Columna `runtime_selectable` = FALSE para todos los 7 roles iniciales |
| Introducir fallback/ranking/policy de modelos | Prohibido en este WP; ADR-001 §9.4–9.5; matriz `model_binding` = UNSPECIFIED/NON_CANONICAL |
| Ampliar scope a implementation/runtime | Ownership keys exactos en TASK; stop conditions prohíben cambios fuera de 9 paths |
| Conflicto con WP1–WP6 o milestone document-governance-v1 | WP separado; no amplía milestone; follow-up gated post-fundación |

## Ownership keys (exactos, 9 paths)

**Nuevos (5)**:
1. `docs/work-packages/agent-profiles-mvp/PLAN.md`
2. `docs/tasks/FF-AI-AGENT-001/TASK.md`
3. `docs/tasks/FF-AI-AGENT-001/PLAN.md`
4. `docs/architecture/agent-role-contracts.md`
5. `docs/architecture/agent-profile-matrix.md`

**Modificados (4)**:
6. `docs/SOURCE_OF_TRUTH.md`
7. `docs/current-state.md`
8. `docs/implementation-roadmap.md`
9. `docs/milestones/document-governance-v1/PLAN.md`

## Gates

- **Gate Wave 1**: CUMPLIDO; Developer aceptó `agent-role-contracts.md` y `agent-profile-matrix.md` el 2026-08-25 y ambos documentos fueron promovidos de `draft` a `canonical`.
- **Gate Wave 2**: Requiere `FF-AI-AGENT-001` `DONE` + `ACCEPTED` + `INTEGRATED`; ownership explícito; Developer gate propio.

## Stop Conditions (Wave 1)

La task `FF-AI-AGENT-001` debe detenerse inmediatamente si detecta cualquier cambio fuera de los 9 ownership keys, incluyendo:
- Archivos en `src/`, `tests/`, `FitFlow/`
- Cambios a contratos ejecutables (`src/contracts/`, `src/registries/schemas/`)
- Cambios a `opencode.json`, `.opencode/package*.json`
- Creación de perfiles ejecutables o archivos de configuración de runtime
- Modificación de dependencias (package.json, package-lock.json)
- Cambios a OpenCode configuration

---

**Provenance**: Source material aprobado `docs/archive/source-material/roles-and-context-governance-source-material.md` (solo provenance, no canónico). Fundación `DOC001` DONE e integrada (PR10 merge `51821e2`; `DOC_SYNC` PR11 merge `c30646f`).
