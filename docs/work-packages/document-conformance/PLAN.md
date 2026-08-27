---
document_id: FFAI-WP-006
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-25
approved_by: Developer
approved_at: 2026-08-25
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
  - "[[work-packages/authority-reconciliation/PLAN]]"
  - "[[work-packages/document-topology/PLAN]]"
  - "[[work-packages/planning-hierarchy/PLAN]]"
  - "[[work-packages/system-guide/PLAN]]"
  - "[[work-packages/research-archive/PLAN]]"
---

# Work Package Plan: WP6 — Document Conformance

## Wave / Task

- **Wave:** 4
- **Task:** `FF-AI-DOC-006` (a crear en Wave 4)
- **Estado inicial task:** `PLANNED`

## Resultado acotado (Definition of Done del WP)

Validar **conformancia documental completa** del corpus canónico de FitFlow-ai contra las reglas establecidas en ADR-001, task-lifecycle.md, y los WP Plans 1–5:

1. **Precedencia y autoridad**: Verificar que no hay documentos que contradigan la precedencia declarada (contratos → ADRs/policies → SoT → TASK/RESULT/REVIEW → guías → research → archive). Reportar cualquier conflicto con archivo y línea.

2. **Layout objetivo**: Verificar que la estructura de `docs/` coincide con el layout objetivo de ADR-001 (directorios `decisions/`, `milestones/`, `work-packages/`, `tasks/`, `guides/`, `research/`, `archive/`, `architecture/`; archivos raíz canónicos `SOURCE_OF_TRUTH.md`, `current-state.md`, `implementation-roadmap.md`, `compatibility-baseline.md` en su lugar; guía en `docs/guides/system-guide.md`).

3. **Frontmatter canónico**: Todos los documentos canónicos (`status: canonical`) tienen frontmatter completo: `document_id`, `status`, `version`, `updated`, `related`, y `machine_context: true` donde aplique. ADRs tienen `accepted_by` y `accepted_at`.

4. **Dimensiones de estado en Tasks**: Todas las TASKs canónicas (`docs/tasks/FF-AI-*/TASK.md`) separan las 5 dimensiones (`validation`, `review_verdict`, `developer_acceptance`, `integration`, `lifecycle_status`) con valores permitidos exactos. No hay enum colapsado. `review_verdict` ausente donde no hay review emitido.

5. **Lifecycle sequence**: `task-lifecycle.md` secuencia canónica respetada en todas las tasks (no saltos DISCOVERED→DONE, no WORKING→DONE sin gates).

6. **Ambient dirty policy**: `.opencode/package.json` y `.opencode/package-lock.json` no aparecen en scope de ninguna task canónica; no hay commits que los integren sin decisión Developer explícita.

7. **Cross-repo y source-material**: No hay paths cross-repo hardcodeados en contratos/código canónico. `docs/archive/source-material/` no citado como autoridad en ningún documento canónico.

8. **Guías no introducen policy**: `docs/guides/system-guide.md` (WP4) y cualquier otra guía validada no contienen `MUST`, `SHALL`, `REQUIRED` que creen policy nueva; solo `SHOULD`/`MAY` explicativos o referencias a policy canónica.

9. **Índice SoT completo y exacto**: `SOURCE_OF_TRUTH.md` indexa todos los documentos canónicos con autoridad correcta; precedencia y regla de contradicción presentes; sin entradas stale ni faltantes.

10. **Validación mecánica**: `git diff --check` PASS en todo el corpus; sin whitespace errors; line endings consistentes (LF).

**Entregable:** Informe de conformancia `docs/work-packages/document-conformance/CONFORMANCE_REPORT.md` (generado por la task) con hallazgos PASS/FAIL por cada check arriba. Cero FAIL bloqueantes para gate Developer.

## Frontera (In Scope / Out of Scope)

### In Scope
- Validación automatizada y manual de los 10 checks arriba.
- Generación de `CONFORMANCE_REPORT.md`.
- Corrección de hallazgos **menores** (frontmatter faltante, typo en link, whitespace) **dentro del scope de archivos permitidos del WP6** (solo docs canónicos).
- Indexación final en SoT.

### Out of Scope
- **No crear** contenido nuevo (ADRs, WPs, Tasks, Guides, Research) — eso es WP1–WP5.
- **No mover** archivos (WP2).
- **No editar** contratos, código, tests, manifiestos, FitFlow.
- **No tocar** `.opencode/**`, `opencode.json`, source material.
- **No reinterpretar** evidencia técnica de tasks previas.

## Owner y Contexto Cualitativo

- **Owner:** `Coder` (validación y reporte; correcciones menores).
- **Contexto:** WP6 es el **quality gate final** del milestone. Solo se ejecuta **tras** WP1–WP5 aceptados (serial estricto). Si hay FAIL bloqueantes, se escalan al Developer y a los WPs correspondientes para corrección antes de gate de milestone.

## Dependencias

- **WP1–WP5 completados y aceptados por Developer** (prerequisito duro; WP6 es serial tras todos).
- **ADR-001, task-lifecycle.md, SoT, Milestone, WP1–WP5 Plans, Tasks DOC-001 a DOC-005** — todos canónicos y aceptados.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| FAIL bloqueante descubierto tarde | WP6 serial tras WP1–WP5; si hay FAIL, se devuelve al WP dueño; milestone no cierra hasta cero FAIL |
| Scope creep corrigiendo cosas fuera de WP6 | Solo correcciones menores en docs canónicos; FAIL mayores → escalar al WP dueño + Developer |
| Validación manual inconsistente | Checks 1–10 son objetivos y verificables; automatizar donde posible (frontmatter, layout, dimensions, git diff) |

## Paralelismo

- **Ninguno** — WP6 es **estrictamente serial** tras WP1–WP5. No se inicia hasta que todos los WPs previos tienen gate Developer `ACCEPTED`.

## Task Asociada

- `FF-AI-DOC-006` (a crear en `docs/tasks/FF-AI-DOC-006/{TASK.md,PLAN.md}` en Wave 4).
- `work_package: WP6-document-conformance`
- `wave: 4`
- `milestone: document-governance-v1`

## Developer Gate

- Developer revisa y acepta:
  1. `CONFORMANCE_REPORT.md` con **cero FAIL bloqueantes**.
  2. Cualquier FAIL menor corregido en esta task (docs canónicos only).
  3. SoT final indexando todo el corpus canónico del milestone.
  4. Validación documental PASS.
- Gate de Milestone: Developer acepta milestone `document-governance-v1` completo tras gate WP6.