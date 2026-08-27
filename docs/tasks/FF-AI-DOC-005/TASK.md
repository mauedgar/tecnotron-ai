---
document_id: FFAI-TASK-DOC-005
status: canonical
machine_context: true
version: 1.0
created: 2026-08-26
owner: fitflow-ai
type: workflow
criticality: low
risk: low
priority: P1
work_package: WP5-research-archive
wave: 3
milestone: document-governance-v1
dependency_gate: WP2_research_destination_materialized
ownership_keys:
  - "doc:docs/tasks/FF-AI-DOC-005/TASK.md"
  - "doc:docs/tasks/FF-AI-DOC-005/PLAN.md"
  - "doc:docs/archive/README.md"
  - "doc:docs/archive/source-material/README.md"
  - "doc:docs/research/README.md"
validation: NOT_RUN
developer_acceptance: PENDING
integration:
  status: NOT_INTEGRATED
lifecycle_status: READY
related:
  - "[[work-packages/research-archive/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
---

# Task FF-AI-DOC-005: Research and Archive Consolidation

## Identification Table

| Dimension | Value |
|---|---|
| `document_id` | FFAI-TASK-DOC-005 |
| `status` | canonical |
| `work_package` | WP5-research-archive |
| `wave` | 3 |
| `validation` | NOT_RUN |
| `developer_acceptance` | PENDING |
| `integration.status` | NOT_INTEGRATED |
| `lifecycle_status` | READY |

## Objetivo

Consolidar y clarificar las carpetas de investigación activa (`docs/research/`), archivo histórico (`docs/archive/`) y material fuente de diseño previo (`docs/archive/source-material/`) mediante la creación de tres archivos `README.md` explicativos que declaren formalmente su estatus de no-canonicidad, criterios de ingreso/egreso y políticas de indexación, sin modificar ni reinterpretar los archivos existentes y sin tocar el Source of Truth.

## Ownership Keys (5 paths exactos)

1. `docs/tasks/FF-AI-DOC-005/TASK.md`
2. `docs/tasks/FF-AI-DOC-005/PLAN.md`
3. `docs/archive/README.md`
4. `docs/archive/source-material/README.md`
5. `docs/research/README.md`

## Frontera (Boundaries)

### In Scope
- Creación de `docs/archive/README.md` declarando el estatus histórico, no canónico, no vinculante y sujeto a curación exclusiva por TASK explícita.
- Creación de `docs/archive/source-material/README.md` inventariando de manera factual los archivos existentes (`roles-and-context-governance-design.md`, `roles-and-context-governance-source-material.md` y `derived-structure/`).
- Creación de `docs/research/README.md` definiendo el propósito de la investigación activa, sus criterios de ingreso y egreso, e inventariando los elementos presentes (`semantic-retrieval.md`, `opencode-orca-agent-operations.md`, `temporary-ox-alpha-free-line.md`), reconociendo la reclasificación ejecutada por WP2.
- Validación determinista con `git diff --check` y verificación de alcance.

### Out of Scope
- **No modificar** el contenido de los archivos de research, archive o source-material (solo se añaden los READMEs).
- **No tocar `docs/SOURCE_OF_TRUTH.md`**: la indexación final y verificación de rutas concretas corresponde a WP6.
- **No ejecutar** movimientos topológicos (WP2 ya ejecutó los movimientos canónicos).
- **No editar** contratos, código, tests, manifiestos ni `.opencode/**`.

## Criterios de Aceptación (ACs)

1. **`docs/archive/README.md`**:
   - Declara explícitamente: histórico; puede curarse únicamente por TASK documental explícita; no canónico; no vinculante para decisiones actuales; no indexado en Source of Truth como autoridad (precedencia 7 según ADR-001).

2. **`docs/archive/source-material/README.md`**:
   - Inventaría con precisión el material de diseño previo existente: `roles-and-context-governance-design.md`, `roles-and-context-governance-source-material.md` y la subcarpeta `derived-structure/`.
   - Reitera el estatus de non-canonical provenance.

3. **`docs/research/README.md`**:
   - Define el propósito de la investigación activa (informar trabajo en curso sin carácter normativo).
   - Establece criterios de ingreso y egreso (promoción a ADR/WP/Task aceptada o degradación a archive).
   - Inventaría los documentos actuales en `docs/research/` (`semantic-retrieval.md`, `opencode-orca-agent-operations.md`, `temporary-ox-alpha-free-line.md`).

4. **Coherencia con WP2 y ADR-001**:
   - Refleja que `docs/research/semantic-retrieval.md` ya se encuentra en su ubicación definitiva tras el movimiento ejecutado por WP2.

5. **Validación determinista**:
   - `git diff --check` PASS.
   - `git status --short` muestra modificaciones limitadas estrictamente a los 5 ownership keys.

## Comandos de Validación

```bash
# 1. Validación de formato y whitespace
git diff --check

# 2. Verificación de scope exacto (solo los 5 ownership keys)
git status --short
```

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Material histórico citado erróneamente como canónico | READMEs explícitos en cada subdirectorio y alineación con la precedencia 7 de ADR-001 |
| Solapamiento de scope con WP4 (System Guide) | Ownership disjunto estricto: WP5 solo administra los 3 READMEs de research/archive |

## Stop Conditions

Detener la ejecución inmediatamente si:
- Se intenta alterar, reinterpretar o mover el contenido de los documentos de investigación o archivo existentes.
- Se intenta modificar `docs/SOURCE_OF_TRUTH.md` o cualquier archivo fuera de los 5 ownership keys.

## Delegación y Roles

- **Architect**: Materializa esta TASK y su PLAN.
- **Coder**: Crea los tres READMEs explicativos e inventarios factuales dentro del ownership asignado.
- **Reviewer**: Realiza la revisión semántica independiente y emite veredicto en `REVIEW.md`.
- **Developer**: Ejerce la autoridad terminal de aceptación en el gate de la task.
