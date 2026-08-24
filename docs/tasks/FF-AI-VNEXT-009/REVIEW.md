---
document_id: FFAI-REVIEW-009
status: canonical
owner: fitflow-ai
type: review
version: 1.0
updated: 2026-08-24
machine_context: true
related:
  - "[[TASK]]"
  - "[[PLAN]]"
  - "[[RESULT]]"
---

# REVIEW FF-AI-VNEXT-009: Agent MVP Composition Root

## Identificacion

| Campo | Valor |
| --- | --- |
| Reviewer | Ox Alpha |
| Tipo | Review independiente de aceptacion |
| Estado revisado | `DONE` |
| Veredicto final | `ACCEPT_WITH_NON_BLOCKING_FINDINGS` |

## Alcance revisado

Se revisaron el composition root `src/agent-mvp/index.js`, tests unitarios (`tests/core/agent-mvp.test.js`), test de integracion (`tests/integration/agent-mvp.test.js`), y la documentacion de la task (TASK, PLAN, RESULT, current-state, roadmap). Router, Model Resolver, FinOps, ContextPackager, Explorer, Agent Runtime, registries v3, configuracion activa de FitFlow y paquetes permanecieron fuera de cambios.

## Review inicial

El review inicial no encontro BLOCKER ni HIGH. Identifico los siguientes findings:

**M1 (MEDIUM): Input validation en composition root**
- El composition root no valida exhaustivamente `TaskRoutingInput` antes de invocar Router; delega validacion al contrato del Router.
- Entradas malformadas del caller producen `ZodError` en Router, no un resultado bloqueado normalizado por Agent MVP.

**M2 (MEDIUM): Cambio en `opencode.json` detectado en diff**
- El diff muestra una adición de `$schema` en `opencode.json`.
- **Actualización:** El cambio era pre-existente; ha sido explícitamente autorizado por el Developer dentro del scope de la task y debe incluirse en el commit eventual del Task Cycle; ya no está excluido.

**L1 (LOW): Defaults relativos en factory**
- `createAgentMvp` inyecta defaults opcionales para router, modelResolver, explorer, agentRuntime usando `require` relativo local.

**L3 (LOW): Fixture path inexistente en test de integracion**
- El test de integracion referenciaba un path de fixture inexistente para el adapter simulado.

**L4 (LOW): Documentos canonicos sin newline final**
- Varios archivos editados en esta task no terminan con newline.

## Disposicion de findings

### M1 — Input validation: **RESOLVED** (tras re-review independiente)

**Rationale inicial (NO CHANGE):** Las entradas malformadas del caller son errores de contrato/precondicion owned by downstream schemas (Router valida `TaskRoutingInput` con Zod). El composition root MVP solo normaliza *resultados bloqueados validos* (short-circuit en etapas con `status !== 'ROUTED'`, `status !== 'SELECTED'`, `ExplorerDecision !== 'PROCEED'`). No es responsabilidad del composition root validar inputs de caller; eso viola separation of concerns y duplicaria validacion contractual.

**Rationale actualizado (RESOLVED tras re-review):** El Developer solicitó validación de frontera explícita en el composition root (`STAGE.INPUT`) con código de error estable `INVALID_AGENT_MVP_INPUT` y array determinista `validation_errors`. Implementación TDD completada: 14 tests M1 (9 boundary implementation + 3 null/root-array gaps + 2 control) **14/14 PASS**, total **24/24 PASS** en `tests/core/agent-mvp.test.js`. La validación:
- Reutiliza contratos existentes: `TaskRoutingInput.safeParse` y `EvidenceRequirement.safeParse` — **sin duplicar registry-policy**
- Fail-closed en `STAGE.INPUT` antes de invocar cualquier dependencia inyectada
- Retorna `stopped_at: 'input'`, `status: 'BLOCKED'`, `reason_code: 'INVALID_AGENT_MVP_INPUT'`, `validation_errors` array determinista
- No valida `schema_version` contra policy (delegado a Router/Resolver downstream)
- Separation of concerns preservada: composition root valida *forma* del input; Router/Resolver validan *contenido semántico* y policy

El veredicto general del reviewer **no cambia**: `ACCEPT_WITH_NON_BLOCKING_FINDINGS`.

### M2 — opencode.json: **NO DEFECT**

**Rationale:** `git status` al inicio de la task confirmó que el cambio en `opencode.json` (adición de `$schema`) era un cambio pre-existente del usuario, no introducido por esta task. El cambio fue restaurado exactamente al estado original. **Actualización:** El cambio ha sido explícitamente autorizado por el Developer dentro del scope de la task y debe incluirse en el commit eventual del Task Cycle; ya no está excluido de los cambios de la task.

### L1 — Defaults relativos: **ACCEPTED**

**Rationale:** Los `require` relativos son el wiring canonico del composition root local. No hay registry ni DI container en este MVP; los defaults inyectados son la implementacion de referencia para tests unitarios y integracion local. Aceptado como diseno intencional.

### L3 — Fixture path: **CORREGIDO**

**Rationale:** El path de fixture inexistente fue corregido a `src/agent-runtime/index.js` en ambos fixtures (unitario e integracion). El test enfocado resultante alcanza **PASS/1 SKIP** (el SKIP es por ausencia de `FF_PROJECT_*`, no por defecto de fixture).

### L4 — Newline final: **CORREGIDO**

**Rationale:** Los documentos canonicos editados (`current-state.md`, `implementation-roadmap.md`, `SOURCE_OF_TRUTH.md`) fueron ajustados para terminar con newline.

## Evidencia final

| Verificacion | Resultado |
| --- | --- |
| `npm test` (suite completa) | 133 tests: 130 PASS, 3 SKIP, 0 FAIL |
| `node --test tests/core/agent-mvp.test.js` | 24/24 PASS (10 orchestration + 14 M1 boundary validation) |
| `node --test tests/integration/agent-mvp.test.js` | 1 PASS, 1 SKIP |
| `node --test tests/integration/routing.test.js tests/integration/runtime-conformance.test.js tests/integration/agent-mvp.test.js` | 5/5 PASS, 0 SKIP (external integration command across routing.test.js, runtime-conformance.test.js, agent-mvp.test.js) |
| `node --test tests/core/agent-runtime.test.js tests/core/explorer.test.js tests/contract/runtime-identity.test.js` | PASS (core 008 components: agent-runtime, explorer, runtime-identity) |
| `node --test tests/contract/contracts.test.js tests/contract/registries.test.js` | PASS (contratos v3, rechazo v2, contratos discriminados) |
| Regresion 007/008 (routing, contracts, registries, state-machine, agent-runtime, explorer, runtime-identity, runtime-conformance) | Todos PASS |
| `git diff --check` | PASS (warning LF/CRLF en opencode.json, no errores) |
| `git diff package.json package-lock.json` | VACIO (sin cambios en manifiestos) |
| `node src/contracts/validate-package.js` | PASS |
| `python tests/repo-packager/pack.test.py` | 4/4 PASS |

La integracion externa con `FF_PROJECT_*` y registries v3 activas completa la simulacion declarada con `paid_api_enabled: false` (validación externa mediante comando explícito alcanzó **5/5 PASS, 0 SKIP** con overrides). Sin `FF_PROJECT_*` el test externo queda `SKIP` por politica de no reportar `PASS` sin evidencia real.

## Veredicto

`ACCEPT_WITH_NON_BLOCKING_FINDINGS` (M1 `RESOLVED` tras re-review independiente)

El Developer acepto explicitamente la task como `DONE` (con gaps documentados y
orden de integracion registrado). El veredicto de review permanece
`ACCEPT_WITH_NON_BLOCKING_FINDINGS`. Las operaciones de reconciliacion contra
`tooling`, validacion final de integracion y limpieza del worktree son
**pendientes del Task Cycle deterministico**, aun no completadas; no se afirma
squash merge, validacion final de tooling, commit ni limpieza.
