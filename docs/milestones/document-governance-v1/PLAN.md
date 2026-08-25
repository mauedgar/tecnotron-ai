---
document_id: FFAI-MILESTONE-001
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-25
approved_by: Developer
approved_at: 2026-08-25
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[implementation-roadmap]]"
  - "[[current-state]]"
  - "[[work-packages/agent-profiles-mvp/PLAN]]"
  - "[[tasks/FF-AI-AGENT-001/TASK]]"
  - "[[tasks/FF-AI-AGENT-001/PLAN]]"
  - "[[tasks/FF-AI-AGENT-002/TASK]]"
  - "[[tasks/FF-AI-AGENT-002/PLAN]]"
  - "[[architecture/agent-profile-conformance]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-matrix]]"
---

# Milestone Plan: document-governance-v1

## Resumen

Establecer la autoridad documental, precedencia, layout objetivo, jerarquía de planificación (Roadmap → Milestone → WP → Task), dimensiones de estado independientes, y política `ambient_dirty` para FitFlow-ai. Este milestone funda la gobernanza documental y ejecuta Wave 1 (fundación + lifecycle + cierre documental de FF-AI-VNEXT-009).

## Baseline y Targets

| Campo | Valor |
|---|---|
| **Baseline principal (main)** | `main@41088a413d06ed1d58d63d92320e38d4b44b86ea` |
| **Task base (tooling)** | `tooling@c88c17406f603292f0496188fc74c7cd31cc9e0a` |
| **Integration target** | `tooling` (rama de integración activa) |
| **Promotion target** | `main` (recibe milestones aceptados vía PR deliberado `tooling` → `main` con merge commit) |

## Work Packages

| WP | Nombre | Wave | Task asociada | Estado inicial |
|---|---|---|---|---|
| **WP1** | Authority Reconciliation | 1 | `FF-AI-DOC-001` | `DONE` (PR #10, tooling@51821e2) |
| **WP2** | Document Topology | 2 | `FF-AI-DOC-002` | `PLANNED` |
| **WP3** | Planning Hierarchy | 2 | `FF-AI-DOC-003` | `PLANNED` |
| **WP4** | System Guide | 3 | `FF-AI-DOC-004` | `PLANNED` |
| **WP5** | Research Archive | 3 | `FF-AI-DOC-005` | `PLANNED` |
| **WP6** | Document Conformance | 4 | `FF-AI-DOC-006` | `PLANNED` |

## Paralelismo y dependencias

- **WP1** es prerrequisito para todos (establece ADR, precedencia, lifecycle, SoT).
- **WP2** y **WP3** (Wave 2) pueden ejecutarse en paralelo **solo con ownership disjunto** (WP2: topology/movimientos; WP3: planning hierarchy docs).
- **WP4** y **WP5** (Wave 3) pueden ejecutarse en paralelo **solo con ownership disjunto** (WP4: system-guide.md; WP5: research/archive consolidación).
- **WP6** (Wave 4) es **estrictamente serial** tras **WP1–WP5** (valida conformancia de todo el corpus documental).
- Cada WP tiene su **Developer gate** (aceptación explícita) antes de integración.

## Criterios de fundación y Wave 1 (WP1)

1. ADR-001 canónico, aceptado por Developer, indexado en SoT.
2. 6 WP Plans canónicos, aceptados por Developer, indexados en SoT.
3. Task `FF-AI-DOC-001` (TASK.md + PLAN.md) canónica, `lifecycle_status: DONE` tras aceptación, integración en `tooling` (PR #10, merge `51821e2`) y `DOC_SYNC`, indexada en SoT.
4. `task-lifecycle.md` actualizado con 5 dimensiones, secuencia canónica, clasificación `ambient_dirty`, y los dos archivos conocidos MVP.
5. Cierre documental append-only de `FF-AI-VNEXT-009` registrado en TASK, RESULT, current-state, roadmap (sin reinterpretar evidencia técnica ni editar REVIEW).
6. `SOURCE_OF_TRUTH.md` actualizado con precedencia exacta, ADR, Milestone, 6 WPs, Task DOC-001.
7. **Sin cambios productivos/contratos/FitFlow**; **sin ejecutar los 6 movimientos**; **`opencode.json` y `.opencode/package*.json` intocados**.
8. Validación documental: `git diff --check` PASS, sin cambios fuera de lista permitida.

## Criterios de cierre del Milestone (WP1–WP6)

1. WP1–WP6 accepted + integrated en `tooling` (cada WP con Developer gate).
2. Seis movimientos exactos ejecutados (WP2) con links activos y SoT actualizado a paths movidos.
3. Guía en `docs/guides/system-guide.md` (WP4) sin policy propia.
4. Research/archive con READMEs y policy de indexación/no-canonicidad (WP5); source material curatable bajo TASK explícita.
5. Conformance report sin blockers (WP6); layout final verificado (`docs/architecture/`, `docs/guides/`).
6. Developer gate final antes de promoción a `main`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Ambigüedad de precedencia en docs existentes | ADR-001 declara precedencia exacta; SoT la indexa y la hace navegable |
| Colapso de dimensiones de estado en enum único | ADR-001 y task-lifecycle.md separan explícitamente validation, review_verdict, developer_acceptance, integration, lifecycle_status |
| `ambient_dirty` commiteado accidentalmente | Policy explícita en ADR-001 y task-lifecycle.md: no commitear automáticamente; requiere decisión Developer |
| Movimientos de archivos ejecutados prematuramente | Prohibido en esta task; movimientos registrados en ADR-001 pero ejecución en FF-AI-DOC-002+ |
| Reinterpretación de evidencia técnica de 009 | Cierre append-only: solo metadata y nota de cierre; no tocar REVIEW, no cambiar comandos/resultados/findings |

## Owner y Gate

- **Owner semántico del Milestone:** `Developer` + `Planner` (definen alcance, criterios, gates); `Coder` solo implementa las tasks.
- **Gate de Milestone:** Developer acepta el milestone completo tras validación de que **todos los WPs 1–6** han pasado su gate individual y la documentación de cierre de 009 es correcta. El criterio de fundación/Wave 1 (WP1) es distinto del criterio de cierre total del milestone (WP1–WP6).
- **Paths guide/layout exactos:** `docs/guides/system-guide.md` (WP4), movimientos WP2 según ADR-001 §3.

## Follow-up gated post-fundación (Materialized)

Tras la **aceptación e integración en `tooling` de los artefactos de fundación de `FF-AI-DOC-001`** (ADR-001, Milestone, 6 WP Plans, TASK/PLAN DOC001, SoT actualizado, task-lifecycle actualizado, cierre 009), se habilita el **Work Package `Agent Profiles MVP`** (materialized, active) con gate separado:

- **WP Plan**: `docs/work-packages/agent-profiles-mvp/PLAN.md` (canonical, follow-up post-fundación, **no parte WP1–WP6**).
- **Gate exacto**: solo después de que los artefactos de fundación de `FF-AI-DOC-001` estén **Developer-accepted y integrados en `tooling`**. Los 6 WP Plans son artefactos creados por DOC001; la **ejecución/completación/integración de WP2–WP6 NO es prerrequisito**. Evitar implicar que el milestone completo deba cerrarse.
- **Owner/gate**: Requiere ownership explícito y Developer gate propio; **no** es WP1–WP6.
- **No fallback/ranking/registries ejecutables**: Esta fase solo define contratos y matriz; no implementa selección automática ni ranking de modelos.
- **Perfiles iniciales** (según ADR-001 §9.5): `planner_ai`, `architect`, `explorer`, `coder_a`, `coder_b`, `reviewer`, `doc_curator`.
- **Diferidos post-MVP**: `coder_strong_a` y demás roles post-MVP marcados **DEFERRED**.
- **Tasks**:
  - `FF-AI-AGENT-001`: Contratos y matriz de perfiles (docs-only) — **DONE / ACCEPTED / INTEGRATED**; PR #12, merge `3d5d8b85a316233eae029963a3f5d14400fcd7fc`; `DOC_SYNC` completado.
  - `FF-AI-AGENT-002`: Conformance documental de perfiles mínimos — **PENDING_ACCEPTANCE**; validación PASS y review `ACCEPT_WITH_NON_BLOCKING_FINDINGS`, pendiente aceptación Developer/integración; **sin autorización OpenCode presente**.

## Referencias

- ADR: `docs/decisions/ADR-001-document-authority-and-layout.md`
- WPs: `docs/work-packages/*/PLAN.md`
- Task Wave 1: `docs/tasks/FF-AI-DOC-001/TASK.md` y `PLAN.md`
- Lifecycle actualizado: `docs/task-lifecycle.md`
- SoT actualizado: `docs/SOURCE_OF_TRUTH.md`
- Cierre 009: `docs/tasks/FF-AI-VNEXT-009/TASK.md`, `RESULT.md`, `current-state.md`, `implementation-roadmap.md`
