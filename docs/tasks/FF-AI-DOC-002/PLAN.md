---
document_id: FFAI-PLAN-DOC-002
status: canonical
machine_context: true
version: 1.0
created: 2026-08-26
owner: fitflow-ai
type: workflow
related:
  - "[[tasks/FF-AI-DOC-002/TASK]]"
  - "[[work-packages/document-topology/PLAN]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
---

# Plan FF-AI-DOC-002: Document Topology

## Fases

### 1. Discover
- Leer ADR-001 §3 para confirmar los 6 movimientos exactos.
- Verificar que los archivos origen existen en `docs/`.
- Verificar que `docs/architecture/` y `docs/research/` existen (o crearlos).

### 2. Implement
- Ejecutar `git mv` para cada uno de los 6 movimientos:
  1. `docs/architecture.md` → `docs/architecture/system-architecture.md`
  2. `docs/operational-architecture.md` → `docs/architecture/operational-architecture.md`
  3. `docs/context-strategy.md` → `docs/architecture/context-strategy.md`
  4. `docs/task-lifecycle.md` → `docs/architecture/task-lifecycle.md`
  5. `docs/development-pipeline-adapter.md` → `docs/architecture/development-pipeline-adapter.md`
  6. `docs/indexing-pipeline.md` → `docs/research/semantic-retrieval.md`
- Buscar y actualizar referencias rotas: `grep -r "docs/architecture.md\|docs/operational-architecture.md\|..." docs/`
- Actualizar `SOURCE_OF_TRUTH.md` con las nuevas rutas.

### 3. Validate
- `git diff --check` PASS.
- Verificar que no quedan archivos en ubicación original.
- Verificar que los links internos apuntan a las nuevas rutas.

### 4. Review
- Review independiente (fase posterior).

### 5. Accept
- Developer gate.
