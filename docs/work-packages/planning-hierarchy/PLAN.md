---
document_id: FFAI-WP-003
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-25
approved_by: Developer
approved_at: 2026-08-25
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[implementation-roadmap]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
---

# Work Package Plan: WP3 — Planning Hierarchy

## Wave / Task

- **Wave:** 2
- **Task:** `FF-AI-DOC-003` (a crear en Wave 2)
- **Estado inicial task:** `PLANNED`

## Resultado acotado (Definition of Done del WP)

Documentar y materializar la **jerarquía de planificación** declarada en ADR-001:

1. **Roadmap → Milestone → WP → Task** como contrato de navegación y autoridad.
2. Actualizar `docs/implementation-roadmap.md` para:
   - Referenciar explícitamente el Milestone `document-governance-v1`.
   - Mostrar WPs como agrupación intermedia (no solo lista plana de tasks).
   - Mantener evidencias de validación por task, pero estructuradas por WP.
3. Crear/actualizar plantillas canónicas para:
   - Milestone Plan (`docs/milestones/*/PLAN.md`).
   - WP Plan (`docs/work-packages/*/PLAN.md`).
   - Task TASK (`docs/tasks/*/TASK.md`) y PLAN (`docs/tasks/*/PLAN.md`).
   - Incluir en cada plantilla: `document_id`, `status`, `version`, `updated`, `related`, frontmatter canónico, campos obligatorios (baseline, targets, ACs, ownership keys, delegation boundaries, developer gate).
4. Documentar en `task-lifecycle.md` (o ADR-001) la correspondencia entre:
   - `lifecycle_status` de Task y estados de Milestone/WP.
   - Gates de Developer por nivel (Task → WP → Milestone).
5. Validar que `SOURCE_OF_TRUTH.md` indexe la jerarquía completa (WP3 aporta contenido semántico; WP2 actualiza paths tras movimientos).

## Frontera (In Scope / Out of Scope)

### In Scope
- Documentación de la jerarquía en `implementation-roadmap.md`.
- Plantillas canónicas para Milestone, WP, Task (como secciones en los propios PLANs o como apéndice).
- Reglas de gate por nivel (Task gate → WP gate → Milestone gate).

### Out of Scope
- **No mover** archivos (WP2).
- **No crear** System Guide (WP4).
- **No consolidar** research/archive (WP5).
- **No validar** conformancia (WP6).
- **No editar** contratos, código, tests, manifiestos.
- **No tocar** `.opencode/**`, `opencode.json`, source material.
- **No actualizar** `SOURCE_OF_TRUTH.md` (WP2 actualiza paths tras movimientos; WP3 solo contenido semántico).

## Owner y Contexto Cualitativo

- **Owner:** `Coder` (documentación de jerarquía y plantillas).
- **Contexto:** WP3 formaliza la estructura de gobernanza que ADR-001 declara. Sin jerarquía explícita, los gates y la trazabilidad Roadmap→Task son ambiguas.

## Dependencias

- **WP1 (Authority Reconciliation)** — ADR-001 declara la jerarquía; WP1 debe estar aceptado.
- **WP2 (Document Topology)** — Coordinación: WP3 documenta la jerarquía que WP2 materializa en filesystem.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Duplicación de plantillas entre WP2/WP3 | WP2 = movimientos topológicos; WP3 = contenido semántico de planificación (plantillas, gates, jerarquía) |
| Inconsistencia roadmap vs milestone vs WP | Validación cruzada en fase verify; SoT como árbitro único |

## Paralelismo

- **WP2 y WP3 (Wave 2) pueden ejecutarse en paralelo** solo con **ownership disjunto**:
  - WP2: topología/filesystem/links.
  - WP3: jerarquía semántica/plantillas/gates (no toca filesystem más que leer/escribir docs de planificación).

## Task Asociada

- `FF-AI-DOC-003` (a crear en `docs/tasks/FF-AI-DOC-003/{TASK.md,PLAN.md}` en Wave 2).
- `work_package: WP3-planning-hierarchy`
- `wave: 2`
- `milestone: document-governance-v1`

## Developer Gate

- Developer revisa y acepta:
  1. Jerarquía documentada y navegable en `implementation-roadmap.md`.
  2. Plantillas canónicas completas para Milestone, WP, Task.
  3. Gates por nivel definidos y consistentes con `task-lifecycle.md`.
  4. Validación documental PASS.