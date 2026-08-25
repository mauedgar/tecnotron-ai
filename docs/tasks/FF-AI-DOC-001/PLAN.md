---
document_id: FFAI-PLAN-DOC-001
status: canonical
machine_context: true
version: 1.1
updated: 2026-08-25
owner: fitflow-ai
type: plan
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[work-packages/authority-reconciliation/PLAN]]"
  - "[[tasks/FF-AI-DOC-001/TASK]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
---

# PLAN FF-AI-DOC-001: Plan de Ejecución - Fundación Documental + Wave 1 + Cierre 009

## 1. Contexto y Objetivos

Ejecutar **exclusivamente** la fundación aprobada (ADR-001, Milestone, 6 WPs) y Wave 1 (task-lifecycle.md actualizado, cierre 009 append-only, SoT actualizado, Task DOC-001 TASK/PLAN). Sin movimientos de archivos, sin código, sin cambios productivos.

## 2. Scope y Límites de Escritura (Permitidos - Solo Estos 16 Archivos)

```text
1. docs/decisions/ADR-001-document-authority-and-layout.md
2. docs/milestones/document-governance-v1/PLAN.md
3. docs/work-packages/authority-reconciliation/PLAN.md
4. docs/work-packages/document-topology/PLAN.md
5. docs/work-packages/planning-hierarchy/PLAN.md
6. docs/work-packages/system-guide/PLAN.md
7. docs/work-packages/research-archive/PLAN.md
8. docs/work-packages/document-conformance/PLAN.md
9. docs/tasks/FF-AI-DOC-001/TASK.md
10. docs/tasks/FF-AI-DOC-001/PLAN.md
11. docs/SOURCE_OF_TRUTH.md
12. docs/task-lifecycle.md
13. docs/current-state.md
14. docs/implementation-roadmap.md
15. docs/tasks/FF-AI-VNEXT-009/TASK.md
16. docs/tasks/FF-AI-VNEXT-009/RESULT.md
```

**Prohibido modificar:** `.opencode/**`, `opencode.json`, `src/**`, `tests/**`, `package.json`, `package-lock.json`, `FitFlow/**`, `.cbmignore`, source material, `docs/tasks/FF-AI-VNEXT-009/REVIEW.md`.

## 3. Fases de Ejecución

### Fase 0: Preflight (Verificación de Baseline)

**Objetivo:** Confirmar estado inicial limpio y baseline correcto.

1. **Verificar git status:**
   ```bash
   git status --short
   git diff --name-only
   git diff --cached --name-only
   ```
   - Confirmar que `.opencode/package.json` y `.opencode/package-lock.json` están staged (ambient_dirty).
   - Confirmar que no hay otros cambios staged/unstaged en scope productivo.

2. **Verificar baseline:**
   - `main` apunta a `41088a413d06ed1d58d63d92320e38d4b44b86ea`.
   - `tooling` apunta a `c88c17406f603292f0496188fc74c7cd31cc9e0a`.
   - Worktree actual en `feat-current-state-2` basado en `tooling`.

3. **Verificar archivos existentes a modificar:**
   - `docs/SOURCE_OF_TRUTH.md` (existe, v2026-08-21)
   - `docs/task-lifecycle.md` (existe, v2026-08-24)
   - `docs/current-state.md` (existe, v2026-08-24)
   - `docs/implementation-roadmap.md` (existe, v2026-08-24)
   - `docs/tasks/FF-AI-VNEXT-009/TASK.md` (existe, v2026-08-24)
   - `docs/tasks/FF-AI-VNEXT-009/RESULT.md` (existe, v2026-08-24)
   - `docs/tasks/FF-AI-VNEXT-009/REVIEW.md` (existe, **no tocar**)

### Fase 1: Fundación (ADR + Milestone + 6 WPs + Task DOC-001)

**Objetivo:** Crear los 9 archivos nuevos de fundación + materialización del ruling Developer en ADR-001 §9 y registro Follow-up en Milestone.

**Orden de creación (dependencias internas):**
1. `docs/decisions/ADR-001-document-authority-and-layout.md` (base para todos; incluye §9 gobierno roles/contexto/capacidades + Follow-up post-fundación)
2. `docs/milestones/document-governance-v1/PLAN.md` (referencia ADR-001; incluye sección Follow-up gated post-fundación)
3. `docs/work-packages/authority-reconciliation/PLAN.md` (WP1 - esta task)
4. `docs/work-packages/document-topology/PLAN.md` (WP2)
5. `docs/work-packages/planning-hierarchy/PLAN.md` (WP3)
6. `docs/work-packages/system-guide/PLAN.md` (WP4)
7. `docs/work-packages/research-archive/PLAN.md` (WP5)
8. `docs/work-packages/document-conformance/PLAN.md` (WP6)
9. `docs/tasks/FF-AI-DOC-001/TASK.md` (referencia ADR, Milestone, WP1)
10. `docs/tasks/FF-AI-DOC-001/PLAN.md` (este archivo)

**Validación por archivo:** Lectura directa tras escritura; verificar frontmatter canónico, `document_id` correcto, secciones requeridas presentes.

### Fase 2: Lifecycle + Cierre 009 (Archivos Existentes)

**Objetivo:** Actualizar 6 archivos existentes con cambios precisos.

#### 2.1 `docs/task-lifecycle.md`
- Actualizar `updated: 2026-08-25`.
- Añadir/separar **5 dimensiones de estado** con valores exactos (validation: PASS|FAIL|UNAVAILABLE|NOT_RUN; review_verdict: ACCEPT|ACCEPT_WITH_NON_BLOCKING_FINDINGS|CHANGES_REQUIRED|ausente; developer_acceptance: PENDING|ACCEPTED|REJECTED; integration: NOT_INTEGRATED|INTEGRATED; lifecycle_status: secuencia canónica).
- Documentar que `review_verdict` puede estar **ausente** antes de review (no inventar `PENDING`).
- Añadir explicaciones: merge ≠ aceptación, reviewer ACCEPT ≠ DONE, aceptación sin integración ≠ DONE.
- Añadir clasificación `task_dirty` (deliberado), `ambient_dirty` (automático OpenCode/Orca/tooling), `unexpected_dirty` (desconocido).
- Listar los dos `ambient_dirty` conocidos MVP: `.opencode/package.json`, `.opencode/package-lock.json`.
- Secuencia canónica exacta: VALIDATED → PENDING_ACCEPTANCE → Developer ACCEPTED → INTEGRATING → integración verificada → DOC_SYNC → DONE → CLEANUP.

#### 2.2 `docs/tasks/FF-AI-VNEXT-009/TASK.md`
- Frontmatter: `updated: 2026-08-25`.
- Tabla Identificación: separar dimensiones (validation, review_verdict, developer_acceptance, integration, lifecycle_status) con valores:
  - `validation: PASS` (UNAVAILABLE/SKIP históricos conservados por prueba)
  - `review_verdict: ACCEPT_WITH_NON_BLOCKING_FINDINGS`
  - `developer_acceptance: ACCEPTED`
  - `accepted_at: 2026-08-24`
  - `integration: {status: INTEGRATED, target: tooling, sha: 590ecfe58d27e8c95b2d80ee1c9d3287313a7093, integrated_at: 2026-08-24}`
  - `lifecycle_status: DONE`
- Ruling `opencode.json`: `UNKNOWN/PRE-EXISTING`, no atribuible, fuera de scope automático.
- Baseline histórico: mantener `main@ceae62a` como historical base.
- Claims "integración pendiente" → transformar en **nota histórica** seguida por **cierre append-only actual**.
- Evidence Git: integration target `tooling`, integration SHA `590ecfe58d27e8c95b2d80ee1c9d3287313a7093`, integrated_at `2026-08-24`. Promotion main SHA `8b946906800eab3dbb9c6e407f691beea4b2af0e`, reconciliation SHA `41088a413d06ed1d58d63d92320e38d4b44b86ea` como evidencia secundaria separada (no colapsar con integración en tooling). NO `RECONCILED`, NO `PENDING` promotion.

#### 2.3 `docs/tasks/FF-AI-VNEXT-009/RESULT.md`
- **No cambiar** comandos, resultados, findings, veredicto original.
- Añadir metadata frontmatter: `updated: 2026-08-25`.
- Añadir sección final: `## Cierre documental append-only` con:
  - Aceptación Developer explícita (`ACCEPTED`, `2026-08-24`).
  - Integration object `{status: INTEGRATED, target: tooling, sha: 590ecfe58d27e8c95b2d80ee1c9d3287313a7093, integrated_at: 2026-08-24}`.
  - Review verdict `ACCEPT_WITH_NON_BLOCKING_FINDINGS` (M1 `RESOLVED`).
  - Promotion main SHA `8b946906800eab3dbb9c6e407f691beea4b2af0e`, reconciliation SHA `41088a413d06ed1d58d63d92320e38d4b44b86ea` (evidencia secundaria separada).
  - `opencode.json` ruling `UNKNOWN/PRE-EXISTING`.
  - Normalizar cualquier frase de resumen que colapse estados (ej. "integración completada" → "integración en `tooling` completada (SHA/date); promoción `main` y reconciliación registradas como evidencia secundaria") sin reinterpretar tests.

#### 2.4 `docs/current-state.md`
- `updated: 2026-08-25`.
- Sección `FF-AI-VNEXT-009`: **eliminar claims activos** de "integración pendiente", "reconciliación pendiente", "limpieza pendiente", "divergencia baseline faltante/no resuelta" como estado actual.
- Registrar **cierre documental**: estado `DONE` confirmado, `integration INTEGRATED` (target `tooling`, SHA/date), promotion/reconciliación registradas como evidencia secundaria.
- Reemplazar línea equivalente a antigua 116 (divergencia baseline) por evidencia de resolución.
- Mantener **historial** (evidencia de validación, gaps, M1 RESOLVED, review verdict, Developer acceptance).
- No afirmar cleanup del worktree histórico si no hay evidencia; cleanup es posterior y separado.

#### 2.5 `docs/implementation-roadmap.md`
- `updated: 2026-08-25`.
- Tabla/estado `FF-AI-VNEXT-009`: **eliminar claims activos** de integración pendiente, reconciliación pendiente, limpieza pendiente, baseline faltante.
- Registrar cierre: `DONE` aceptado, `integration INTEGRATED` (target `tooling`, SHA/date), promotion/main y reconciliación como evidencia secundaria.
- Mantener párrafo de implementación y evidencia técnica (tests, M1, etc.) intactos.
- No anticipar movimientos de archivos.

#### 2.6 `docs/SOURCE_OF_TRUTH.md`
- `updated: 2026-08-25`.
- Añadir **sección breve de precedencia exacta y regla de contradicción** (resumen de ADR-001 §1–2).
- **Indexar** en tabla de autoridad:
  - ADR-001 (`docs/decisions/ADR-001-document-authority-and-layout.md`)
  - Milestone `document-governance-v1` (`docs/milestones/document-governance-v1/PLAN.md`)
  - WP1–WP6 (`docs/work-packages/*/PLAN.md`)
  - Task `FF-AI-DOC-001` (`docs/tasks/FF-AI-DOC-001/TASK.md`)
- Paths arquitectura en `docs/architecture/` (system-architecture, operational-architecture, context-strategy, task-lifecycle, development-pipeline-adapter).
- Guía en `docs/guides/system-guide.md`.
- Mover `indexing-pipeline.md` a sección Reference/Non-Canonical con futuro destino `docs/research/semantic-retrieval.md`.

### Fase 3: Indexación y Verificación Final

**Objetivo:** Verificar que todo está correcto y consistente.

1. **Leer todos los 16 archivos modificados/creados** y verificar:
   - Frontmatter canónico en todos.
   - `document_id` únicos y correctos.
   - Cross-references (`related`) consistentes.
   - No hay referencias a archivos que no existen.
   - Ownership keys en TASK DOC-001 coinciden exactamente con los 16 paths.

2. **Validación documental:**
   ```bash
   git diff --check
   git diff --name-only
   git ls-files --others --exclude-standard
   git diff --cached --name-only
   git status --short
   ```
   - `git diff --check` → PASS (sin whitespace errors).
   - `git diff --name-only` → 6 paths tracked modificados.
   - `git ls-files --others --exclude-standard` → 10 paths untracked; la unión exacta es 16 `task_dirty` (sin `.opencode/**`, `opencode.json`, `src/**`, `tests/**` ni manifiestos).
   - `git diff --cached --name-only` → solo `.opencode/package.json` y `.opencode/package-lock.json` (ambient_dirty, sin cambios).

3. **Búsqueda de claims activos 009 "integración pendiente":**
   ```bash
   grep -n "integración pendiente\|reconciliación pendiente\|limpieza pendiente\|divergencia baseline\|baseline faltante\|pending integration\|pending reconciliation" docs/current-state.md docs/implementation-roadmap.md
   ```
   - Debe retornar **0 resultados** (claims activos eliminados).
   - Notas históricas con "pendientes del Task Cycle determinístico, aun no completadas" son aceptables si van precedidas de "NOTA HISTÓRICA:" o similar y seguidas de cierre actual.

4. **Verificar REVIEW.md de 009 sin cambios:**
   ```bash
   git diff docs/tasks/FF-AI-VNEXT-009/REVIEW.md
   ```
   - Debe estar **vacío** (sin cambios).

5. **Verificar ambient_dirty solo staged:**
   ```bash
   git diff --name-only | grep "^\.opencode/"
   ```
   - Debe retornar **0 resultados** (no en unstaged).
   ```bash
   git diff --cached --name-only | grep "^\.opencode/"
   ```
   - Debe retornar 2 resultados (ambient_dirty conocido staged).

## 4. Condiciones de Parada (Stop Conditions)

Detener y escalar al Developer inmediatamente si:

1. Cualquier archivo fuera de la lista de 16 requiere modificación.
2. `git diff --check` reporta errores (no warnings).
3. `git diff --name-only` incluye paths no permitidos.
4. `REVIEW.md` de 009 muestra cambios.
5. Ambiguedad en precedencia, dimensiones, o ambient_dirty policy.
6. Intento de promover task a `DONE` sin gate Developer.

## 5. Matriz de Validación (AC → Comando/Evidencia)

| AC | Comando / Evidencia |
|---|---|
| AC-1 | `cat docs/decisions/ADR-001-document-authority-and-layout.md` → verificar frontmatter version 1.2, 7 capas precedencia, 6 movimientos exactos, 5 dimensiones, opencode UNKNOWN, ambient_dirty ruling |
| AC-2 | `cat docs/milestones/document-governance-v1/PLAN.md` → baseline main@41088a4, tooling@c88c174, 6 WPs, waves, paralelismo, Owner Developer+Planner, guide paths |
| AC-3 | `ls docs/work-packages/*/PLAN.md` → 6 archivos; cada uno con secciones: resultado, frontera, owner, dependencias, riesgos, paralelismo, task, Developer gate |
| AC-4 | `cat docs/tasks/FF-AI-DOC-001/TASK.md` → milestone, work_package, wave, dependencies, ownership_keys (16 paths), frontmatter validation/developer_acceptance/integration/lifecycle_status |
| AC-5 | `cat docs/task-lifecycle.md` → 5 dimensiones, review_verdict ausente permitida, secuencia exacta, 3 dirty types ruling, 2 ambient MVP |
| AC-6 | `git diff docs/tasks/FF-AI-VNEXT-009/TASK.md docs/tasks/FF-AI-VNEXT-009/RESULT.md docs/current-state.md docs/implementation-roadmap.md` → frontmatter metadata update + body historical content preserved verbatim + final closure appended; no technical evidence/review changed; `integration INTEGRATED` no RECONCILED; `git diff docs/tasks/FF-AI-VNEXT-009/REVIEW.md` → vacío |
| AC-7 | `cat docs/SOURCE_OF_TRUTH.md` → precedencia exacta, **9 entradas exactas** indexadas (ADR-001, Milestone, 6 WPs, Task DOC-001) en categorías correctas; paths arquitectura en docs/architecture/, guía en docs/guides/, indexing-pipeline en Reference/Non-Canonical |
| AC-8 | `git diff --name-only` → 6 modified; `git ls-files --others --exclude-standard` → 10 untracked; `git diff --cached --name-only` → 2 ambient_dirty |
| AC-9 | `git diff --check` → PASS |
| AC-10 | Frontmatter TASK.md → `lifecycle_status: DONE`, `validation: PASS`, `review_verdict: ACCEPT_WITH_NON_BLOCKING_FINDINGS`, `developer_acceptance: ACCEPTED`, `accepted_at: 2026-08-25`, `integration.status: INTEGRATED`, target `tooling`, merge SHA `51821e21be9a63d7aabff9598114a75850b20792`, `DOC_SYNC` completado |
| AC-11 | ADR-001 §9: separaciones role contract/manual OpenCode profile/runtime-selectable role/model binding/skill binding/task-specific permissions; contexto minimum sufficient; capacidades contratos estables; bindings reemplazables; LLM observaciones; no fallback; catálogo inicial (planner_ai, architect, explorer, coder_a, coder_b, reviewer, doc_curator) + deferred (coder_strong_a post-MVP); Future WP Agent Profiles MVP gated post-fundación; tasks FF-AI-AGENT-001/002 solo gated; no perfiles/registries/fallback/ranking; task 002 sin autorización OpenCode. | `grep -c "Gobierno de roles" docs/decisions/ADR-001-...`; Milestone Follow-up section presente; no archivos FF-AI-AGENT-* |

## 6. Referencias

- ADR-001: `docs/decisions/ADR-001-document-authority-and-layout.md`
- Milestone: `docs/milestones/document-governance-v1/PLAN.md`
- WP1: `docs/work-packages/authority-reconciliation/PLAN.md`
- Lifecycle: `docs/task-lifecycle.md`
- SoT: `docs/SOURCE_OF_TRUTH.md`
- Cierre 009 fuente: `docs/tasks/FF-AI-VNEXT-009/{TASK.md,RESULT.md,REVIEW.md}`, `docs/current-state.md`, `docs/implementation-roadmap.md`
