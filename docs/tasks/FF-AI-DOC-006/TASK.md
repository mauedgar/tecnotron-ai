---
document_id: FFAI-TASK-DOC-006
status: canonical
machine_context: true
version: 1.0
created: 2026-08-27
owner: fitflow-ai
type: workflow
criticality: medium
risk: low
priority: P0
work_package: WP6-document-conformance
wave: 4
milestone: document-governance-v1
dependency_gate: WP5_research_archive_accepted_integrated
ownership_keys:
  - "doc:docs/tasks/FF-AI-DOC-006/TASK.md"
  - "doc:docs/tasks/FF-AI-DOC-006/PLAN.md"
  - "doc:docs/conformance/report-<ts>.md"
  - "doc:docs/architecture/"
  - "doc:docs/guides/"
validation: NOT_RUN
developer_acceptance: PENDING
integration:
  status: NOT_INTEGRATED
lifecycle_status: READY
related:
  - "[[work-packages/document-conformance/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[tasks/FF-AI-DOC-005/TASK]]"
---

# Task FF-AI-DOC-006: Validación Conformancia Completa Corpus Canónico

## Identification Table

| Dimension | Value |
|---|---|
| `document_id` | FFAI-TASK-DOC-006 |
| `status` | canonical |
| `work_package` | WP6-document-conformance |
| `wave` | 4 |
| `validation` | NOT_RUN |
| `developer_acceptance` | PENDING |
| `integration.status` | NOT_INTEGRATED |
| `lifecycle_status` | READY |

## Objetivo

Ejecutar la validación completa de conformancia del corpus canónico (documentos bajo `docs/architecture/` y `docs/guides/`) contra las políticas establecidas en ADR-001, SOURCE_OF_TRUTH.md, y la arquitectura de gobernanza documental. Generar un **Conformance Report** único sin blockers que sirva como evidencia para el **Developer gate final** previo a la promoción a `main`.

## Ownership Keys (5 paths exactos)

1. `docs/tasks/FF-AI-DOC-006/TASK.md`
2. `docs/tasks/FF-AI-DOC-006/PLAN.md`
3. `docs/conformance/report-<ts>.md` (timestamp ISO 8601, ej: `2026-08-27T14-30-00Z`)
4. `docs/architecture/` (scope read-only para verificación de layout)
5. `docs/guides/` (scope read-only para verificación de layout)

## Frontera (Boundaries)

### In Scope
- Verificación exhaustiva de layout final: `docs/architecture/`, `docs/guides/`
- Conformance suite determinista:
  - Estructura de directorios vs. ADR-001 §2
  - Naming conventions (kebab-case, prefijos, sufijos)
  - Integridad de enlaces internos (cross-refs, relative links)
  - Duplicados semánticos y contenido
  - Índice ADR completo y actualizado
  - Glosario de términos canónicos
  - Headers front-matter obligatorios (`document_id`, `status`, `machine_context`, `version`, `created`, `owner`, `type`, `criticality`, `risk`, `priority`, `work_package`, `wave`, `milestone`, `dependency_gate`, `ownership_keys`, `validation`, `developer_acceptance`, `integration`, `lifecycle_status`, `related`)
  - Coherencia con SOURCE_OF_TRUTH.md (rutas, precedencia, indexación)
- Normalización de corpus canónico (headers, cross-refs, glossario) vía `doc_curator` **solo si TASK lo autoriza explícitamente**
- Consolidación de Conformance Report único
- Developer gate final

### Out of Scope
- **No modificar** archivos fuera de `docs/conformance/report-<ts>.md` y normalizaciones autorizadas dentro de `docs/architecture/`, `docs/guides/`
- **No tocar** `docs/archive/`, `docs/research/`, `docs/archive/source-material/` (WP5 ya cerrado)
- **No modificar** `docs/SOURCE_OF_TRUTH.md` (solo lectura para verificación)
- **No ejecutar** movimientos topológicos ni reestructuración de directorios
- **No editar** contratos, código, tests, manifiestos ni `.opencode/**`
- **No promover** docs, runs ni TASK a `DONE` (autoridad exclusiva del Developer)

## Criterios de Aceptación (ACs)

1. **Layout Final Verificado**:
   - `docs/architecture/` contiene exactamente los archivos esperados según ADR-001 §2.1
   - `docs/guides/` contiene exactamente los archivos esperados según ADR-001 §2.2
   - Cero archivos huérfanos, cero directorios vacíos no declarados

2. **Conformance Report Sin Blockers**:
   - Report generado en `docs/conformance/report-<ts>.md`
   - Todas las reglas de conformancia: `PASS`
   - Cero `FAIL` ni `BLOCKER`
   - Cualquier `WARN` documentado con justificación y plan de mitigación

3. **Normalización Completada** (si aplica):
   - Headers front-matter consistentes en 100% del corpus
   - Cross-refs resueltas y válidas
   - Glosario actualizado y referenciado

4. **Developer Gate Final**:
   - Developer revisa y aprueba Conformance Report
   - Gate explícito: `APPROVED` / `REJECTED`

5. **Validación Determinista**:
   - `git diff --check` PASS
   - `git status --short` muestra modificaciones limitadas estrictamente a ownership keys

## Comandos de Validación

```bash
# 1. Validación de formato y whitespace
git diff --check

# 2. Verificación de scope exacto (solo ownership keys)
git status --short

# 3. Verificación de conformancia (ejecutar suite)
# Ver PLAN.md para comandos específicos de la conformance suite
```

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Blockers en conformancia descubiertos tardíamente | Ejecución paralela de suite completa; reporte temprano |
| Inconsistencia entre SOURCE_OF_TRUTH y layout real | Verificación cruzada automatizada (graph + grep) |
| Normalización introduce regresiones | `doc_curator` solo toca lo autorizado; diff revisado antes de gate |
| Gate final rechazado | Criterios objetivos PASS/FAIL; WARN no bloquea |

## Stop Conditions

Detener la ejecución inmediatamente si:
- Se detecta un **BLOCKER** en la conformance suite (reportar y esperar decisión Developer)
- Se intenta modificar archivos fuera de ownership keys
- `git diff --check` FAIL (corregir antes de continuar)

## Delegación y Roles

- **Architect**: Materializa esta TASK y su PLAN.
- **Explorer**: Verificación de layout (`docs/architecture/`, `docs/guides/`) — read-only.
- **Codebase-Memory-Scout**: Ejecución conformance suite determinista (graph + grep).
- **Doc_Curator**: Normalización de corpus canónico (headers, cross-refs, glossario) **solo dentro de ownership autorizado**.
- **Planner_AI**: Consolidación de Conformance Report único.
- **Reviewer**: Revisión semántica independiente del Conformance Report.
- **Developer**: Autoridad terminal de aceptación (gate final + single commit + task closes).

(End of file - total 134 lines)