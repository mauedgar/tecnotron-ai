---
document_id: FFAI-PLAN-DOC-003
status: canonical
machine_context: true
version: 1.0
created: 2026-08-26
owner: fitflow-ai
type: workflow
related:
  - "[[tasks/FF-AI-DOC-003/TASK]]"
  - "[[work-packages/planning-hierarchy/PLAN]]"
  - "[[architecture/task-lifecycle]]"
  - "[[implementation-roadmap]]"
---

# Plan FF-AI-DOC-003: Planning Hierarchy

## Fases

### 1. Discover
- Leer `task-lifecycle.md` para entender las dimensiones de estado y transiciones.
- Leer `implementation-roadmap.md` actual para entender la estructura existente.
- Leer `milestones/document-governance-v1/PLAN.md` para ver cómo se referencia hoy.

### 2. Implement
- **Actualizar `implementation-roadmap.md`**:
  - Referenciar explícitamente el milestone `document-governance-v1`.
  - Mostrar WPs como agrupación intermedia (no solo lista plana).
  - Mantener evidencias de validación por task, estructuradas por WP.
- **Documentar plantillas canónicas** (en `task-lifecycle.md` o como sección nueva):
  - Milestone Plan: campos obligatorios, frontmatter.
  - WP Plan: campos obligatorios, frontmatter.
  - Task TASK: campos obligatorios, frontmatter.
  - Task PLAN: campos obligatorios, frontmatter.
- **Documentar gates por nivel**:
  - Task gate: validación + review + developer acceptance.
  - WP gate: todas las tasks del WP en DONE.
  - Milestone gate: todos los WPs completados.
- **Actualizar SOURCE_OF_TRUTH.md**: indexar la jerarquía.

### 3. Validate
- `git diff --check` PASS.
- Verificar que la jerarquía es navegable: Roadmap → Milestone → WP → Task.
- Verificar que las plantillas son consistentes con el frontmatter existente.

### 4. Review
- Review independiente (fase posterior).

### 5. Accept
- Developer gate.
