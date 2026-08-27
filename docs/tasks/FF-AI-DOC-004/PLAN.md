---
document_id: FFAI-PLAN-DOC-004
status: canonical
machine_context: true
version: 1.0
created: 2026-08-26
owner: fitflow-ai
type: workflow
related:
  - "[[tasks/FF-AI-DOC-004/TASK]]"
  - "[[work-packages/system-guide/PLAN]]"
  - "[[architecture/task-lifecycle]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
---

# Plan FF-AI-DOC-004: System Guide

## Fases de Ejecución

### 1. Discover (Lectura y Extracción de Fuentes Canónicas)
- Leer las fuentes canónicas requeridas para la síntesis:
  - `docs/SOURCE_OF_TRUTH.md` (precedencia e índices).
  - `docs/decisions/ADR-001-document-authority-and-layout.md` (jerarquía, reglas de guías).
  - `docs/architecture/system-architecture.md` (invariantes del AI Core).
  - `docs/architecture/operational-architecture.md` (capas operativas, responsabilidades).
  - `docs/architecture/task-lifecycle.md` (estados, 5 dimensiones, gates, dirty types).
  - `docs/guides/orca-task-cycle.md` (procedimiento con Orca y terminal visible).
  - `docs/architecture/agent-role-contracts.md` (contratos y catálogo de roles).
  - Esquemas de contratos en `src/contracts/` y registries en `src/registries/schemas/`.

### 2. Implement (Redacción de `docs/guides/system-guide.md`)
- Redactar el contenido de la guía respetando estrictamente las 8 secciones definidas en AC-1:
  1. Quick Start.
  2. Architecture Overview.
  3. Documentation Map.
  4. Task Lifecycle Cheatsheet.
  5. Contracts Reference.
  6. Tooling & Providers.
  7. Cross-repo Boundaries.
  8. Common Pitfalls.
- Incorporar la explicación clara de la tríada:
  - Máquina de estados (`architecture/task-lifecycle.md`).
  - Procedimiento operativo (`guides/orca-task-cycle.md`).
  - Perfiles de agente (`.opencode/agents/`).
- Verificar que el tono sea estrictamente explicativo, sin introducir nuevo lenguaje normativo (`MUST`, `SHALL`, `REQUIRED`).

### 3. Validate (Verificación Determinista)
- Ejecutar `git diff --check` para asegurar integridad de formato y saltos de línea.
- Ejecutar `git status --short` para confirmar que ningún archivo fuera de los ownership keys ha sido modificado.
- Comprobar que no se modificó `docs/SOURCE_OF_TRUTH.md`.

### 4. Review (Revisión Semántica Independiente)
- El rol `Reviewer` evalúa `docs/guides/system-guide.md` contra los ACs y la política de ADR-001.
- Generar `docs/tasks/FF-AI-DOC-004/REVIEW.md` con el veredicto formal.

### 5. Accept (Gate del Developer)
- Presentar el entregable y el veredicto de revisión al Developer.
- Transicionar a `ACCEPTED` y proceder con la integración y sincronización documental (`DOC_SYNC`).

## Developer Gate Criteria

- `docs/guides/system-guide.md` redactado, coherente y navegable.
- Cero policy inventada o contradictoria con ADR-001 y `task-lifecycle.md`.
- `git diff --check` PASS.
- Ownership estricto (3 paths).
