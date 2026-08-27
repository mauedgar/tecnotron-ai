---
document_id: FFAI-WP-004
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
  - "[[architecture/system-architecture]]"
  - "[[architecture/operational-architecture]]"
  - "[[architecture/context-strategy]]"
  - "[[architecture/task-lifecycle]]"
---

# Work Package Plan: WP4 — System Guide

## Wave / Task

- **Wave:** 3
- **Task:** `FF-AI-DOC-004` (a materializar por Architect en Wave 3)
- **Estado inicial task propuesto:** `READY`

## Resultado acotado (Definition of Done del WP)

Crear **`docs/guides/system-guide.md`** como guía canónica de navegación y operación para desarrolladores y agentes que trabajan en FitFlow-ai:

1. **Propósito:** Un punto de entrada único ("front door") que explica:
   - Qué es FitFlow-ai (AI Core orchestration layer).
   - Cómo navegar la documentación canónica (SoT, ADRs, Milestones, WPs, Tasks).
   - Cómo operar el lifecycle (`architecture/task-lifecycle.md`) — crear task, validar, review, accept, integrar, cleanup.
   - Cómo se relacionan el lifecycle lógico, el adapter operativo Orca y los perfiles de agente sin colapsar sus responsabilidades.
   - Qué contratos son vinculantes (Zod schemas, registries v3).
   - Qué herramientas son intercambiables (OpenCode, Orca, Git worktree, MCP, providers).
2. **Estructura objetivo:**
   - Quick Start (5 min read).
   - Architecture Overview (invariantes, boundaries).
   - Documentation Map (SoT, precedencia, cómo encontrar cosas).
   - Task Lifecycle Cheatsheet (estados, gates, roles).
   - Contracts Reference (qué schemas validan qué).
   - Tooling & Providers (qué es fijo vs intercambiable).
   - Cross-repo Boundaries (Project Profile, `FF_PROJECT_*`, no paths hardcodeados).
   - Common Pitfalls (ambient_dirty, no promover DONE sin gate, guías ≠ policy).
3. **Regla de oro (reforzada de ADR-001):** **Guías no introducen policy**. `docs/guides/system-guide.md` es explicativo; si contradice ADR-001, task-lifecycle.md, o contratos, gana la capa superior.
4. **WP6 hace indexación final en SoT** (no este WP).

## Frontera (In Scope / Out of Scope)

### In Scope
- Crear `docs/guides/system-guide.md` con contenido explicativo.
- Validar `git diff --check` PASS.

### Out of Scope
- **No crear** policy nueva (policy vive en ADRs, task-lifecycle.md, contratos).
- **No mover** archivos (WP2).
- **No consolidar** research/archive (WP5).
- **No validar** conformancia (WP6).
- **No editar** contratos, código, tests, manifiestos.
- **No tocar** `.opencode/**`, `opencode.json`, source material.
- **No indexar/modificar** `SOURCE_OF_TRUTH.md` (WP6 hace indexación final).

## Owner y Contexto Cualitativo

- **Owner:** `Coder` (redacción de guía explicativa en `docs/guides/system-guide.md`).
- **Contexto:** `docs/guides/system-guide.md` reduce fricción de onboarding y navegación. Es la guía de entrada al sistema; coexiste con `docs/guides/orca-task-cycle.md`, que explica el adapter operativo Orca. Su autoridad es **explicativa únicamente**.

## Dependencias

- **WP1 (Authority Reconciliation)** — ADR-001 y task-lifecycle.md deben estar aceptados (la guía los referencia, no los define).
- **WP2 (Document Topology)** — Coordinación: WP2 asegura que `docs/guides/` existe; WP4 escribe el contenido en `docs/guides/system-guide.md`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Guía introduce policy implícita | Revisión explícita contra ADR-001: "Guías no introducen policy"; Developer gate valida |
| Contenido duplicado con architecture.md / operational-architecture.md | Guía = navegación + operación; architecture/operational = invariantes vinculantes; guía linkea, no duplica |

## Paralelismo

- **WP4 y WP5 (Wave 3) pueden ejecutarse en paralelo** solo con **ownership disjunto**:
  - WP4: `docs/guides/system-guide.md`.
  - WP5: consolidación `research/` y `archive/` (contenido archivo/investigación).
  - No hay overlap de archivos ni temas.

## Task Asociada

- `FF-AI-DOC-004` a materializar por Architect en `docs/tasks/FF-AI-DOC-004/{TASK.md,PLAN.md}`.
- `work_package: WP4-system-guide`
- `wave: 3`
- `milestone: document-governance-v1`
- **Path objetivo:** `docs/guides/system-guide.md`

## Developer Gate

- Developer revisa y acepta:
  1. `docs/guides/system-guide.md` completo, navegable, sin policy propia.
  2. Regla "guías no introducen policy" respetada (validación cruzada con ADR-001).
  3. Validación documental PASS.
