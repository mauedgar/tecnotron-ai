---
document_id: FFAI-TASK-DOC-002
status: canonical
machine_context: true
version: 1.0
created: 2026-08-26
owner: fitflow-ai
type: workflow
criticality: low
risk: low
priority: P1
work_package: WP2-document-topology
wave: 2
milestone: document-governance-v1
dependency_gate: WP1_completed
ownership_keys:
  - "doc:docs/tasks/FF-AI-DOC-002/TASK.md"
  - "doc:docs/tasks/FF-AI-DOC-002/PLAN.md"
  - "doc:docs/architecture/system-architecture.md"
  - "doc:docs/architecture/operational-architecture.md"
  - "doc:docs/architecture/context-strategy.md"
  - "doc:docs/architecture/task-lifecycle.md"
  - "doc:docs/architecture/development-pipeline-adapter.md"
  - "doc:docs/research/semantic-retrieval.md"
  - "doc:docs/SOURCE_OF_TRUTH.md"
validation: NOT_RUN
lifecycle_status: READY
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[work-packages/document-topology/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
  - "[[milestones/document-governance-v1/PLAN]]"
---

# Task FF-AI-DOC-002: Document Topology — Seis Movimientos

## Identification Table

| Dimension | Value |
|---|---|
| `document_id` | FFAI-TASK-DOC-002 |
| `status` | canonical |
| `validation` | NOT_RUN |
| `lifecycle_status` | READY |

## Objetivo

Ejecutar los **seis movimientos de archivos** exactos registrados en ADR-001 §3 para alcanzar el layout objetivo. Actualizar referencias internas y SOURCE_OF_TRUTH.md.

## Ownership Keys (9 paths)

**Nuevos (6 — archivos movidos a ubicación objetivo)**:
1. `docs/architecture/system-architecture.md` (movido desde `docs/architecture.md`)
2. `docs/architecture/operational-architecture.md` (movido desde `docs/operational-architecture.md`)
3. `docs/architecture/context-strategy.md` (movido desde `docs/context-strategy.md`)
4. `docs/architecture/task-lifecycle.md` (movido desde `docs/task-lifecycle.md`)
5. `docs/architecture/development-pipeline-adapter.md` (movido desde `docs/development-pipeline-adapter.md`)
6. `docs/research/semantic-retrieval.md` (movido desde `docs/indexing-pipeline.md`)

**Modificados (3)**:
7. `docs/tasks/FF-AI-DOC-002/TASK.md`
8. `docs/tasks/FF-AI-DOC-002/PLAN.md`
9. `docs/SOURCE_OF_TRUTH.md`

## Criterios de Aceptación (ACs)

1. **6 movimientos ejecutados**: cada archivo en su ubicación objetivo exacta.
2. **Links internos actualizados**: referencias relativas en archivos movidos y en archivos que los referencian.
3. **SOURCE_OF_TRUTH.md actualizado**: paths reflejan nuevas ubicaciones.
4. **git diff --check PASS**.
5. **Archivos eliminados de ubicación original**: no queden duplicados en raíz de `docs/`.
6. **Scope exacto**: solo los 9 ownership keys; sin cambios en `src/`, `tests/`, `FitFlow/`, contratos, `.opencode/`.

## Stop Conditions

Detenerse si cualquier comando produce cambios en:
- `src/**`, `tests/**`, `FitFlow/**`
- `src/contracts/**`, `src/registries/schemas/**`
- `opencode.json`, `.opencode/**`
- `package.json`, `package-lock.json`
- Cualquier archivo fuera de los 9 ownership keys

## Autoridad y Entradas

- **ADR-001 §3**: layout objetivo y precedencia declarados.
- **WP1 completado**: ADR-001 aceptado y canónico.
- **WP Plan**: `docs/work-packages/document-topology/PLAN.md`.

## Delegación

- `Coder`: ejecuta los 6 movimientos + actualización de links + SoT.
- `Reviewer`: review independiente read-only (fase posterior).
- `Developer`: gate de aceptación.
