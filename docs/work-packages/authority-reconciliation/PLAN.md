---
document_id: FFAI-WP-001
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-25
approved_by: Developer
approved_at: 2026-08-25
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[tasks/FF-AI-DOC-001/TASK]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
---

# Work Package Plan: WP1 — Authority Reconciliation

## Wave / Task

- **Wave:** 1
- **Task:** `FF-AI-DOC-001` (`docs/tasks/FF-AI-DOC-001/TASK.md`, `PLAN.md`)
- **Estado inicial task:** `WORKING`

## Resultado acotado (Definition of Done del WP)

1. **ADR-001** canónico creado en `docs/decisions/ADR-001-document-authority-and-layout.md` con:
   - Frontmatter canónico (`document_id: FFAI-ADR-001`, `accepted_by: Developer`, `accepted_at: 2026-08-25`, `version: 1.2`).
   - Precedencia exacta aprobada (7 capas, orden estricto; guías en `docs/guides/`).
   - Regla: guías no introducen policy.
   - Layout objetivo documentado con **seis movimientos exactos** (ADR-001 §3); no se ejecutan en esta task.
   - Jerarquía Roadmap → Milestone → WP → Task.
   - 5 dimensiones de estado independientes con valores exactos (validation: PASS|FAIL|UNAVAILABLE|NOT_RUN; review_verdict: ACCEPT|ACCEPT_WITH_NON_BLOCKING_FINDINGS|CHANGES_REQUIRED|ausente; developer_acceptance: PENDING|ACCEPTED|REJECTED; integration: NOT_INTEGRATED|INTEGRATED; lifecycle_status: secuencia canónica).
   - `opencode.json` historical origin `UNKNOWN/PRE-EXISTING`, owner repo Tecnotron-ai, domain agent tooling config, no architecture authority, no auto scope.
   - `.opencode/package*.json` `ambient_dirty` policy (ruling: task_dirry=deliberado, ambient_dirty=automático OpenCode/Orca/tooling, unexpected_dirty=desconocido; dos archivos conocidos MVP).
   - Cross-repo boundary; source-material puede curarse por TASK explícita, sigue no canónico/excluido default.
2. **task-lifecycle.md** actualizado con:
   - `updated: 2026-08-25`.
   - Secuencia canónica exacta: VALIDATED → PENDING_ACCEPTANCE → Developer ACCEPTED → INTEGRATING → integración verificada → DOC_SYNC → DONE → CLEANUP.
   - 5 dimensiones separadas con valores exactos; `review_verdict` puede estar ausente antes de review (no inventar `PENDING`).
   - Explicación: merge ≠ aceptación, reviewer ACCEPT ≠ DONE, aceptación sin integración ≠ DONE.
   - Clasificación `task_dirty` (deliberado), `ambient_dirty` (automático OpenCode/Orca/tooling), `unexpected_dirty` (desconocido); dos `ambient_dirty` conocidos MVP.
3. **Cierre documental append-only de FF-AI-VNEXT-009** en:
   - `docs/tasks/FF-AI-VNEXT-009/TASK.md`: frontmatter/tabla con dimensiones separadas; `integration` objeto `{status: INTEGRATED, target: tooling, sha: ..., integrated_at: ...}`; ruling `opencode.json` = `UNKNOWN/PRE-EXISTING`; baseline histórico `main@ceae62a`; claims "integración pendiente" → nota histórica + cierre append-only.
   - `docs/tasks/FF-AI-VNEXT-009/RESULT.md`: sección final `Cierre documental append-only` con aceptación, target/SHA/date, review verdict, promoción/main y reconciliación como evidencia secundaria, opencode UNKNOWN/PRE-EXISTING; normalizar frases que colapsan estados sin reinterpretar tests.
   - `docs/current-state.md`: eliminar claims activos de integración pendiente/divergencia; registrar cierre con `integration INTEGRATED` (no RECONCILED); mantener historial.
   - `docs/implementation-roadmap.md`: eliminar claims activos; registrar cierre con `integration INTEGRATED`; mantener historial.
   - **No editar** `REVIEW.md`; conservar veredicto técnico original.
4. **SOURCE_OF_TRUTH.md** actualizado con:
   - `updated: 2026-08-25`.
   - Sección breve de precedencia exacta y regla de contradicción.
   - Indexar: ADR-001, Milestone `document-governance-v1`, WP1–WP6, Task `FF-AI-DOC-001`.
   - Mover `indexing-pipeline.md` a sección no-canónica/research con futuro destino `docs/research/semantic-retrieval.md`; paths arquitectura en `docs/architecture/`.
5. **Validación documental**: `git diff --check` PASS, sin cambios fuera de lista permitida, `opencode.json` y `.opencode/package*.json` intocados.

## Frontera (In Scope / Out of Scope)

### In Scope
- Crear ADR-001.
- Actualizar `task-lifecycle.md` (dimensiones, secuencia, ambient_dirty).
- Cierre append-only de 009 en 4 archivos (TASK, RESULT, current-state, roadmap).
- Actualizar `SOURCE_OF_TRUTH.md` (precedencia, índice ADR/Milestone/WPs/Task).
- Crear `FF-AI-DOC-001` TASK.md y PLAN.md.

### Out of Scope
- **No ejecutar** los seis movimientos de archivos (corresponden a `FF-AI-DOC-002`).
- **No crear** System Guide, research README, archive README (WP4/WP5).
- **No crear** RESULT/REVIEW de `FF-AI-DOC-001` (se crean al cierre de la task).
- **No crear** TASKs `FF-AI-DOC-002` a `FF-AI-DOC-006` (Waves 2–4).
- **No editar** `docs/tasks/FF-AI-VNEXT-009/REVIEW.md`.
- **No editar** `.opencode/**`, `opencode.json`, source material, `.cbmignore`, `src/**`, `tests/**`, manifiestos, dependencies, FitFlow, config externa.
- **No cambios productivos/contratos/FitFlow**.

## Owner y Contexto Cualitativo

- **Owner:** `Coder` (implementación documental).
- **Contexto:** Este WP funda la autoridad documental de FitFlow-ai. Sin ADR-001 y lifecycle actualizado, los WPs posteriores no tienen base de precedencia ni estado. El cierre de 009 resuelve una deuda documental pendiente desde la aceptación del Developer.

## Dependencias

- **Ninguna** (WP1 es el primero del milestone; ruling Fase 1A explícito: no hay dependencias previas).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Inconsistencia entre ADR-001, task-lifecycle.md y SoT | Validación cruzada en fase `verify/review` del PLAN de la task; `git diff --check` |
| Cierre 009 reinterpretando evidencia técnica | Instrucción estricta: append-only metadata, no tocar REVIEW, no cambiar comandos/resultados |
| `ambient_dirty` incluido accidentalmente en diff | Verificar `git diff --name-only` y `git diff --cached --name-only` excluyen `.opencode/package*.json` |
| Movimientos ejecutados prematuramente | Prohibición explícita en TASK y WP; validación final lista solo paths permitidos |

## Paralelismo

- **Ninguno** — WP1 es secuencial y prerrequisito para WP2–WP6.

## Task Asociada

- `FF-AI-DOC-001` (`docs/tasks/FF-AI-DOC-001/TASK.md`, `PLAN.md`)
- `lifecycle_status: ACCEPTED` (Developer ruling 2026-08-25; pendiente integración)
- `wave: 1`
- `work_package: WP1-authority-reconciliation`
- `milestone: document-governance-v1`

## Developer Gate

- Developer revisa y acepta explícitamente:
  1. ADR-001 canónico y completo.
  2. `task-lifecycle.md` con 5 dimensiones, secuencia, ambient_dirty.
  3. Cierre 009 append-only correcto en 4 archivos (sin reinterpretación).
  4. `SOURCE_OF_TRUTH.md` con precedencia e índice completo.
  5. Task `FF-AI-DOC-001` TASK/PLAN canónicos.
  6. Validación documental PASS (`git diff --check`, sin cambios fuera de lista).
- Solo tras aceptación Developer → `lifecycle_status: PENDING_ACCEPTANCE` → `ACCEPTED` → `INTEGRATING` → `DONE` (gestión Task Lifecycle).
