---
document_id: FFAI-WP-005
status: canonical
machine_context: true
version: 1.1
updated: 2026-08-26
approved_by: Developer
approved_at: 2026-08-25
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[archive/source-material/roles-and-context-governance-design]]"
  - "[[archive/source-material/roles-and-context-governance-source-material]]"
---

# Work Package Plan: WP5 — Research Archive Consolidation

## Wave / Task

- **Wave:** 3
- **Task:** `FF-AI-DOC-005` (a materializar por Architect en Wave 3)
- **Estado inicial task propuesto:** `READY`

## Resultado acotado (Definition of Done del WP)

Consolidar y clarificar las carpetas `docs/research/` (investigación activa) y `docs/archive/` (histórico; puede curarse por TASK explícita):

1. **`docs/archive/source-material/`**: 
   - Inventariar el material de diseño previo no canónico existente: `roles-and-context-governance-design.md`, `roles-and-context-governance-source-material.md` y `derived-structure/`.
   - Añadir `README.md` en `docs/archive/` que declare explícitamente: **"Histórico; puede curarse por TASK documental explícita. No canónico. No vinculante para decisiones actuales. No se indexa en Source of Truth como autoridad."**
   - Añadir `README.md` en `docs/archive/source-material/` con la misma declaración + lista de archivos y su origen/fecha.

2. **`docs/research/`** (si existe o se crea):
   - Definir criterio de ingreso: investigación **activa** que informa trabajo en curso (WPs, tasks), pero **no canónica**.
   - Criterio de egreso: cuando la investigación se convierte en ADR, WP, o Task aceptada → mover resultado a capa canónica; lo residual va a `archive/`.
   - Añadir `README.md` en `docs/research/` con: propósito, criterio ingreso/egreso, "No canónico", "No indexado en SoT como autoridad".

3. **Reclasificación ejecutada por WP2 (ADR-001)**: `docs/research/semantic-retrieval.md` ya es el destino de `docs/indexing-pipeline.md`; WP5 documenta su clasificación no canónica, sin repetir el movimiento.

4. **Validación**: `git diff --check` PASS, sin cambios fuera de lista.

**WP6 hace indexación final en SoT** (no este WP).

## Frontera (In Scope / Out of Scope)

### In Scope
- `README.md` en `docs/archive/`, `docs/archive/source-material/`, `docs/research/` (si existe).
- Policy de indexación/no-canonicidad para research/archive (incluye reclasificación `indexing-pipeline.md` decidida).
- Validación documental.
- **Source material puede curarse bajo TASK documental explícita** (sin promoción a canónico).

### Out of Scope
- **No crear** policy contradictoria (ADR-001 define precedencia).
- **No mover** archivos canónicos a archive (solo material ya allí).
- **No crear** System Guide (WP4).
- **No ejecutar** movimientos topológicos (WP2 ejecuta movimiento de `indexing-pipeline.md`).
- **No validar** conformancia (WP6).
- **No editar** contratos, código, tests, manifiestos.
- **No tocar** `.opencode/**`, `opencode.json`.
- **No indexar/modificar** `SOURCE_OF_TRUTH.md` (WP6 hace indexación final).

## Owner y Contexto Cualitativo

- **Owner:** `Coder` (consolidación documental de investigación/archivo; policy de indexación y `.cbmignore` según futura TASK).
- **Contexto:** ADR-001 declara que `archive/source-material` es no canónico (precedencia 7) y puede curarse por TASK explícita. La sección Reference/Non-Canonical en SoT **ya fue creada por Foundation** (WP1); WP5 no escribe SoT. **WP6 finaliza la verificación e indexación de rutas concretas**. La reclasificación a `docs/research/semantic-retrieval.md` ya fue ejecutada por WP2.

## Dependencias

- **WP1 (Authority Reconciliation)** — ADR-001 define precedencia 6–7; WP1 aceptado.
- **WP2 (Document Topology)** — Coordinación si WP2 mueve/crea `docs/research/` o `docs/archive/`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Material de archive citado como canónico | READMEs explícitos + SoT en sección "Reference/Non-Canonical" + ADR-001 precedencia 7 |
| Duplicación con WP4 (System Guide) | Ownership disjunto: WP4 = guía operativa; WP5 = clasificación research/archive |

## Paralelismo

- **WP4 y WP5 (Wave 3) pueden ejecutarse en paralelo** solo con **ownership disjunto**:
  - WP4: `docs/guides/system-guide.md`.
  - WP5: `docs/archive/README.md`, `docs/archive/source-material/README.md`, `docs/research/README.md` (si aplica).
  - Archivos y temas distintos.

## Task Asociada

- `FF-AI-DOC-005` a materializar por Architect en `docs/tasks/FF-AI-DOC-005/{TASK.md,PLAN.md}`.
- `work_package: WP5-research-archive`
- `wave: 3`
- `milestone: document-governance-v1`

## Developer Gate

- Developer revisa y acepta:
  1. READMEs en `docs/archive/`, `docs/archive/source-material/`, `docs/research/` con declaraciones explícitas de no-canonicidad.
  2. Validación documental PASS.
