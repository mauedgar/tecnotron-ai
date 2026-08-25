---
document_id: FFAI-WP-002
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-25
approved_by: Developer
approved_at: 2026-08-25
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
---

# Work Package Plan: WP2 — Document Topology

## Wave / Task

- **Wave:** 2
- **Task:** `FF-AI-DOC-002` (a crear en Wave 2)
- **Estado inicial task:** `PLANNED`

## Resultado acotado (Definition of Done del WP)

Ejecutar los **seis movimientos de archivos** exactos registrados en ADR-001 §3 para alcanzar el layout objetivo:

1. `docs/architecture.md` → `docs/architecture/system-architecture.md`
2. `docs/operational-architecture.md` → `docs/architecture/operational-architecture.md`
3. `docs/context-strategy.md` → `docs/architecture/context-strategy.md`
4. `docs/task-lifecycle.md` → `docs/architecture/task-lifecycle.md`
5. `docs/development-pipeline-adapter.md` → `docs/architecture/development-pipeline-adapter.md`
6. `docs/indexing-pipeline.md` → `docs/research/semantic-retrieval.md`

Además:
- Actualizar referencias internas (links relativos) en documentos movidos.
- Actualizar `SOURCE_OF_TRUTH.md` con nuevas rutas (archivos movidos a `docs/architecture/` y `docs/research/`, guía en `docs/guides/system-guide.md`).
- Validar `git diff --check` PASS.

**Nota:** Los archivos que permanecen en raíz: `SOURCE_OF_TRUTH.md`, `current-state.md`, `implementation-roadmap.md`, `compatibility-baseline.md`. La guía se crea en `docs/guides/system-guide.md` (WP4), no en `docs/system-guide.md`.

## Frontera (In Scope / Out of Scope)

### In Scope
- **Exactamente los seis movimientos** listados arriba + actualización de links activos asociados + actualización SoT para paths movidos.
- Validar `git diff --check` PASS.

### Out of Scope
- **No crear** contenido de System Guide (WP4).
- **No consolidar** research/archive (WP5).
- **No validar** conformancia documental completa (WP6).
- **No editar** contratos, código, tests, manifiestos, FitFlow.
- **No tocar** `.opencode/**`, `opencode.json`, source material.

## Owner y Contexto Cualitativo

- **Owner:** `Coder` (ejecución mecánica de movimientos y fijación de links).
- **Contexto:** WP2 es puramente topológico — mueve archivos a sus ubicaciones objetivo declaradas en ADR-001. No decide contenido ni policy.

## Dependencias

- **WP1 (Authority Reconciliation)** — ADR-001 debe estar aceptado y canónico; layout objetivo y precedencia declarados.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Links rotos tras movimientos | Reescritura sistemática de links relativos; validación con `grep -r "docs/"` |
| Ejecución antes de gate WP1 | Gate Developer de WP1 es prerequisito duro; task `FF-AI-DOC-002` no inicia sin él |

## Paralelismo

- **WP2 y WP3 (Wave 2) pueden ejecutarse en paralelo** solo con **ownership disjunto**:
  - WP2: topología, **seis movimientos exactos + links activos asociados (SoT/README/docs afectados)**.
  - WP3: jerarquía de planificación (documentos de Roadmap/Milestone/WP/Task), no toca topología de archivos.

## Task Asociada

- `FF-AI-DOC-002` (a crear en `docs/tasks/FF-AI-DOC-002/{TASK.md,PLAN.md}` en Wave 2).
- `work_package: WP2-document-topology`
- `wave: 2`
- `milestone: document-governance-v1`

## Developer Gate

- Developer revisa y acepta:
  1. Layout objetivo alcanzado (estructura de directorios y archivos en sus ubicaciones finales).
  2. Links internos funcionales (sin referencias rotas).
  3. `SOURCE_OF_TRUTH.md` actualizado con rutas correctas.
  4. Validación documental PASS.
- Gate requerido antes de integración a `tooling`.