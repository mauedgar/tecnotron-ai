---
document_id: FFAI-TASK-DOC-003
status: canonical
machine_context: true
version: 1.0
created: 2026-08-26
owner: fitflow-ai
type: workflow
criticality: low
risk: low
priority: P1
work_package: WP3-planning-hierarchy
wave: 2
milestone: document-governance-v1
dependency_gate: WP1_completed
ownership_keys:
  - "doc:docs/tasks/FF-AI-DOC-003/TASK.md"
  - "doc:docs/tasks/FF-AI-DOC-003/PLAN.md"
  - "doc:docs/implementation-roadmap.md"
  - "doc:docs/milestones/document-governance-v1/PLAN.md"
  - "doc:docs/SOURCE_OF_TRUTH.md"
  - "doc:docs/architecture/task-lifecycle.md"
validation: NOT_RUN
lifecycle_status: READY
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[work-packages/planning-hierarchy/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
  - "[[implementation-roadmap]]"
  - "[[milestones/document-governance-v1/PLAN]]"
---

# Task FF-AI-DOC-003: Planning Hierarchy — Plantillas y Gates

## Identification Table

| Dimension | Value |
|---|---|
| `document_id` | FFAI-TASK-DOC-003 |
| `status` | canonical |
| `validation` | NOT_RUN |
| `lifecycle_status` | READY |

## Objetivo

Documentar y materializar la **jerarquía de planificación** declarada en ADR-001: Roadmap → Milestone → WP → Task. Crear plantillas canónicas y documentar gates por nivel.

## Ownership Keys (5 paths)

**Modificados (3)**:
1. `docs/implementation-roadmap.md` — referenciar milestone, mostrar WPs como agrupación intermedia.
2. `docs/milestones/document-governance-v1/PLAN.md` — asegurar que refleja la jerarquía completa.
3. `docs/SOURCE_OF_TRUTH.md` — indexar la jerarquía.

**Nuevos (2)**:
4. `docs/tasks/FF-AI-DOC-003/TASK.md`
5. `docs/tasks/FF-AI-DOC-003/PLAN.md`

## Criterios de Aceptación (ACs)

1. **Jerarquía documentada** en `implementation-roadmap.md`: Roadmap → Milestone → WP → Task como contrato de navegación.
2. **Milestone referenciado**: `implementation-roadmap.md` referencia explícitamente `document-governance-v1`.
3. **WPs como agrupación intermedia**: no solo lista plana de tasks.
4. **Plantillas canónicas**: frontmatter y campos obligatorios documentados para Milestone, WP y Task (en los propios PLANs o como sección en `task-lifecycle.md`).
5. **Gates por nivel documentados**: Task gate → WP gate → Milestone gate, consistente con `task-lifecycle.md`.
6. **SOURCE_OF_TRUTH.md**: indexa la jerarquía completa.
7. **git diff --check PASS**.
8. **Scope exacto**: solo los 5 ownership keys; sin cambios en `src/`, `tests/`, `FitFlow/`, contratos, `.opencode/`.

## Stop Conditions

Detenerse si cualquier comando produce cambios en:
- `src/**`, `tests/**`, `FitFlow/**`
- `src/contracts/**`, `src/registries/schemas/**`
- `opencode.json`, `.opencode/**`
- `package.json`, `package-lock.json`
- Cualquier archivo fuera de los 5 ownership keys

## Autoridad y Entradas

- **ADR-001**: jerarquía declarada (Roadmap → Milestone → WP → Task).
- **WP1 completado**: ADR-001 aceptado y canónico.
- **task-lifecycle.md**: dimensiones de estado y secuencia canónica.
- **WP Plan**: `docs/work-packages/planning-hierarchy/PLAN.md`.

## Delegación

- `Coder`: documenta jerarquía, crea plantillas, documenta gates.
- `Reviewer`: review independiente read-only (fase posterior).
- `Developer`: gate de aceptación.
