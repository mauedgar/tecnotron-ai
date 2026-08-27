---
document_id: FFAI-PLAN-DOC-006
status: canonical
machine_context: true
version: 1.0
created: 2026-08-27
owner: fitflow-ai
type: workflow
related:
  - "[[tasks/FF-AI-DOC-006/TASK]]"
  - "[[work-packages/document-conformance/PLAN]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
---

# Plan FF-AI-DOC-006: Validación Conformancia Completa Corpus Canónico

## Fases de Ejecución

### 1. Discover (Verificación de Layout Final)
- **Objetivo**: Confirmar que `docs/architecture/` y `docs/guides/` coinciden exactamente con el layout objetivo de ADR-001 §3
- **Acciones**:
  - Enumerar archivos en `docs/architecture/` → comparar contra lista esperada (ADR-001 líneas 89-94):
    - `system-architecture.md`
    - `operational-architecture.md`
    - `context-strategy.md`
    - `task-lifecycle.md`
    - `development-pipeline-adapter.md`
    - `agent-profile-conformance.md` (adicional, verificar origen)
    - `agent-profile-matrix.md` (adicional, verificar origen)
    - `agent-role-contracts.md` (adicional, verificar origen)
    - `orca-adapter-contract.md` (adicional, verificar origen)
  - Enumerar archivos en `docs/guides/` → comparar contra lista esperada:
    - `system-guide.md`
    - `orca-task-cycle.md` (adicional, verificar origen)
  - Verificar ausencia de archivos huérfanos, directorios vacíos no declarados
  - **Evidencia**: Lista diff (esperado vs. actual) en `docs/conformance/layout-check-<ts>.json`

### 2. Conformance Suite (Ejecución Paralela Determinista)
**Lanzar en paralelo 3 worktrees efímeros:**

#### 2.1 Frontmatter & Metadata Validation
- Verificar 100% documentos canónicos (`status: canonical`) tienen frontmatter completo:
  - Campos obligatorios: `document_id`, `status`, `machine_context`, `version`, `created`, `owner`, `type`, `criticality`, `risk`, `priority`, `work_package`, `wave`, `milestone`, `dependency_gate`, `ownership_keys`, `validation`, `developer_acceptance`, `integration`, `lifecycle_status`, `related`
  - ADRs adicionales: `accepted_by`, `accepted_at`
  - Work Packages: `approved_by`, `approved_at`
- Verificar valores permitidos exactos (enums) para `validation`, `review_verdict`, `developer_acceptance`, `integration`, `lifecycle_status`
- **Comando**: `grep -r "^status: canonical" docs/ --include="*.md" | cut -d: -f1 | xargs -I{} sh -c 'validate-frontmatter.sh "{}"'`
- **Evidencia**: `docs/conformance/frontmatter-check-<ts>.json` (PASS/FAIL por archivo)

#### 2.2 Cross-refs & Links Integrity
- Verificar todos los enlaces relativos (`[[...]]`, `[...](...)`, `![...](...)`) resuelven a archivos existentes
- Verificar cross-refs WikiLink (`[[doc]]`) contra `SOURCE_OF_TRUTH.md` index
- Verificar anchors internos (`#section`) existen en destino
- **Comando**: `markdown-link-check` + custom script para WikiLinks
- **Evidencia**: `docs/conformance/links-check-<ts>.json`

#### 2.3 Naming Conventions
- Verificar kebab-case en nombres de archivo: `^[a-z0-9]+(-[a-z0-9]+)*\.md$`
- Verificar prefijos consistentes: `ADR-`, `FF-AI-`, `FFAI-`
- Verificar sufijos: `.md` (no `.markdown`, `.txt`)
- **Evidencia**: `docs/conformance/naming-check-<ts>.json`

#### 2.4 Duplicates & Semantic Overlap
- Detectar contenido duplicado (>80% similitud) entre documentos canónicos
- Detectar definiciones contradictorias de términos (glosario)
- **Herramienta**: `similarity-check` (determinista, hash-based)
- **Evidencia**: `docs/conformance/duplicates-check-<ts>.json`

#### 2.5 ADR Index Completeness
- Verificar `docs/decisions/` contiene todos los ADRs declarados en SOURCE_OF_TRUTH
- Verificar numeración secuencial sin gaps (ADR-001, ADR-002, ...)
- Verificar cada ADR tiene `accepted_by` y `accepted_at`
- **Evidencia**: `docs/conformance/adr-index-check-<ts>.json`

#### 2.6 Glossary Consistency
- Extraer términos definidos en `docs/architecture/` (buscar patrones `**Término**:` o `### Término`)
- Verificar uso consistente en corpus canónico
- Generar/actualizar `docs/architecture/glossary.md` si no existe
- **Evidencia**: `docs/conformance/glossary-check-<ts>.json`

#### 2.7 SOURCE_OF_TRUTH Coherence
- Verificar cada documento canónico aparece en SOURCE_OF_TRUTH con autoridad correcta
- Verificar precedencia declarada coincide con ADR-001 §1
- Verificar regla de contradicción presente
- Verificar sin entradas stale (archivos borrados/movidos aún indexados)
- **Evidencia**: `docs/conformance/sot-coherence-check-<ts>.json`

#### 2.8 Guides Policy Compliance
- Verificar `docs/guides/*.md` no contienen `MUST`, `SHALL`, `REQUIRED` que creen policy
- Solo `SHOULD`/`MAY` explicativos o referencias a policy canónica
- **Comando**: `grep -n -E "MUST|SHALL|REQUIRED" docs/guides/*.md` → debe ser 0 hits o solo en citas
- **Evidencia**: `docs/conformance/guides-policy-check-<ts>.json`

#### 2.9 Lifecycle Sequence Compliance
- Verificar todas las TASKs canónicas respetan secuencia canónica `task-lifecycle.md`
- No saltos `DISCOVERED`→`DONE`, no `WORKING`→`DONE` sin gates
- Verificar 5 dimensiones separadas (no enum colapsado)
- **Evidencia**: `docs/conformance/lifecycle-check-<ts>.json`

#### 2.10 Git Whitespace & Format
- `git diff --check` PASS en todo el corpus
- Line endings LF consistentes
- No trailing whitespace
- **Evidencia**: `docs/conformance/git-check-<ts>.txt`

### 3. Normalize (Doc_Curator - Solo si Autorizado)
**Solo si TASK autoriza explícitamente y tras Discover PASS:**
- Corregir headers front-matter faltantes/inconsistentes en `docs/architecture/`, `docs/guides/`
- Resolver cross-refs rotadas
- Actualizar/crear `docs/architecture/glossary.md`
- **Evidencia**: `git diff docs/architecture/ docs/guides/` (solo ownership keys)

### 4. Consolidate (Planner_AI)
- Agregar todos los `*_check-<ts>.json` en un **Conformance Report único**
- Formato: `docs/conformance/report-<ISO8601>.md`
- Estructura:
  - Resumen ejecutivo (PASS/FAIL/BLOCKER/WARN counts)
  - Detalle por check (10 checks del WP6 Plan + layout)
  - Hallazgos por archivo (ruta, check, severidad, descripción, evidencia)
  - Recomendaciones (solo WARN)
  - Veredicto global: `PASS` (cero FAIL/BLOCKER) / `FAIL` (algún FAIL/BLOCKER)

### 5. Review (Reviewer)
- Revisión semántica independiente del Conformance Report
- Generar `docs/tasks/FF-AI-DOC-006/REVIEW.md` con veredicto formal
- Verificar que reporte no inventa policy ni afirma canonicidad indebida

### 6. Accept (Developer Gate Final)
- Presentar Conformance Report + Review al Developer
- Gate: `APPROVED` / `REJECTED`
- Si `APPROVED`: proceder a single commit + task closes WP1–WP5 + WP6

## Developer Gate Criteria

- [ ] Layout final verificado: `docs/architecture/`, `docs/guides/` = ADR-001 §3
- [ ] Conformance Report generado en `docs/conformance/report-<ts>.md`
- [ ] **Cero FAIL / cero BLOCKER** en los 10 checks + layout
- [ ] Cualquier WARN documentado con justificación
- [ ] `git diff --check` PASS
- [ ] `git status --short` limitado a ownership keys
- [ ] Developer acceptance: `ACCEPTED`

## Comandos de Validación Consolidados

```bash
# 1. Layout check
ls -1 docs/architecture/ docs/guides/ | sort > /tmp/actual.txt
# comparar contra /tmp/expected.txt (generado desde ADR-001)

# 2. Conformance suite (ejecutar cada check)
./scripts/conformance/frontmatter-check.sh
./scripts/conformance/links-check.sh
./scripts/conformance/naming-check.sh
./scripts/conformance/duplicates-check.sh
./scripts/conformance/adr-index-check.sh
./scripts/conformance/glossary-check.sh
./scripts/conformance/sot-coherence-check.sh
./scripts/conformance/guides-policy-check.sh
./scripts/conformance/lifecycle-check.sh

# 3. Git validation
git diff --check
git status --short
```

## Paralelismo

- **Fase 2 (Conformance Suite)**: 10 checks en **paralelo** via worktrees efímeros
  - `explorer` → Layout (Fase 1)
  - `codebase-memory-scout` → Checks 2.1, 2.2, 2.3, 2.5, 2.7, 2.9 (graph-based)
  - `coder_b` → Checks 2.4, 2.6, 2.8, 2.10 (grep/glob deterministas)
- **Fase 3 (Normalize)**: `doc_curator` secuencial tras Fase 2 PASS
- **Fase 4 (Consolidate)**: `planner_ai` secuencial
- **Fase 5 (Review)**: `reviewer` secuencial
- **Fase 6 (Accept)**: Developer gate final

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| FAIL bloqueante en check crítico | Paralelismo detecta temprano; escalar a Developer + WP dueño |
| Scope creep en normalización | `doc_curator` solo toca ownership keys; diff revisado pre-gate |
| Inconsistencia manual | Checks 1-10 objetivos; automatización determinista donde posible |
| Gate final rechazado | Criterios PASS/FAIL binarios; WARN no bloquea |

## Stop Conditions

Detener inmediatamente si:
- Algún check reporta **BLOCKER** (reportar, no continuar)
- `git diff --check` FAIL (corregir antes de consolidar)
- Se intenta modificar fuera de ownership keys

(End of file - total 163 lines)