---
document_id: FFAI-PLAN-DOC-005
status: canonical
machine_context: true
version: 1.0
created: 2026-08-26
owner: fitflow-ai
type: workflow
related:
  - "[[tasks/FF-AI-DOC-005/TASK]]"
  - "[[work-packages/research-archive/PLAN]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[architecture/task-lifecycle]]"
---

# Plan FF-AI-DOC-005: Research and Archive Consolidation

## Fases de Ejecución

### 1. Discover (Inventario Factual de Elementos Existentes)
- Inspeccionar el contenido actual de:
  - `docs/archive/` (incluyendo `docs/archive/prompt/` y `docs/archive/source-material/`).
  - `docs/archive/source-material/` (incluyendo `derived-structure/` y los documentos markdown existentes).
  - `docs/research/` (confirmando la presencia de `semantic-retrieval.md`, `opencode-orca-agent-operations.md` y `temporary-ox-alpha-free-line.md`).
- Verificar la política de precedencia establecida en ADR-001 §1 (precedencia 6 para investigación, precedencia 7 para archivo y source material).

### 2. Implement (Redacción de los 3 READMEs)
- **Crear `docs/archive/README.md`**:
  - Declaración explícita de material histórico, no canónico, no vinculante y modificable solo mediante TASK autorizada.
- **Crear `docs/archive/source-material/README.md`**:
  - Inventario formal del material de diseño previo (`roles-and-context-governance-design.md`, `roles-and-context-governance-source-material.md` y `derived-structure/`).
- **Crear `docs/research/README.md`**:
  - Declaración del propósito de investigación activa (no canónica).
  - Criterios claros de ciclo de vida (ingreso como hipótesis/exploración; egreso a capa canónica o degradación a archive).
  - Inventario de los archivos presentes en el directorio.

### 3. Validate (Verificación Determinista)
- Ejecutar `git diff --check` para verificar whitespace y formato.
- Ejecutar `git status --short` para constatar que ningún archivo preexistente en `docs/archive/` o `docs/research/` fue editado.
- Constatar que `docs/SOURCE_OF_TRUTH.md` no fue alterado (su verificación final corresponde a WP6).

### 4. Review (Revisión Semántica Independiente)
- El rol `Reviewer` verifica que los READMEs no introduzcan policy ni afirmen canonicidad.
- Generar `docs/tasks/FF-AI-DOC-005/REVIEW.md` con el veredicto formal.

### 5. Accept (Gate del Developer)
- Presentar los 3 READMEs y el veredicto de revisión al Developer.
- Transicionar a `ACCEPTED` y registrar evidencia formal previa a la integración.

## Developer Gate Criteria

- Tres archivos `README.md` creados con exactitud y completitud en sus respectivos directorios.
- Ningún archivo preexistente modificado o reubicado.
- `git diff --check` PASS.
- Cero alteraciones en SoT, contratos o arquitectura.
