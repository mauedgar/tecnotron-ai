---
document_id: FFAI-TASK-009
status: canonical
owner: fitflow-ai
type: workflow
version: 2.0
updated: 2026-08-24
machine_context: true
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[implementation-roadmap]]"
  - "[[current-state]]"
  - "[[task-lifecycle]]"
  - "[[operational-architecture]]"
  - "[[context-strategy]]"
---

# TASK FF-AI-VNEXT-009: Agent MVP y documentation sync

## Identificacion

| Campo | Valor |
| --- | --- |
| Task ID | `FF-AI-VNEXT-009` |
| Estado | `DONE` |
| Baseline observado (historical exception) | `main@ceae62a` (real base) |
| Baseline de integracion esperado | `tooling` (destino de integracion) |
| Task type / area / scope | `feature` / `ai_orchestration` / `backend` |
| Lane / risk / priority | `ai_orchestrated` / `low` / `P1` |
| Dependencia | `FF-AI-VNEXT-008` |

La futura materializacion machine-readable valida contra `fitflow-task/v2` y conserva estos ownership keys:

```text
path:src/agent-mvp/**
path:tests/core/agent-mvp.test.js
path:tests/integration/agent-mvp.test.js
doc:docs/tasks/FF-AI-VNEXT-009/TASK.md
doc:docs/tasks/FF-AI-VNEXT-009/PLAN.md
```

## Objetivo

Implementar un **Agent MVP composition root** delgado y determinista que secuencia los componentes existentes ya aceptados:

```
Router -> Model Resolver/FinOps -> ContextPackager -> Explorer -> Agent Runtime
```

Todos los componentes se inyectan como dependencias; el composition root no contiene logica de decision propia, solo orquesta el flujo declarativo.

**Boundary validation (M1 - RESOLVED tras re-review independiente):**
- `STAGE.INPUT` como primera etapa explícita en el composition root
- Código de error estable `INVALID_AGENT_MVP_INPUT` para fallos de validación de entrada
- Array determinista `validation_errors` con detalle por campo (`field`, `message`, `details?`)
- Reutiliza contratos existentes: `TaskRoutingInput` (Zod) y `EvidenceRequirement` (Zod) — **sin duplicar validación de registry-policy**
- Fail-closed: entrada inválida detiene en `STAGE.INPUT` sin invocar ninguna dependencia inyectada (router, modelResolver, contextPackager, explorer, agentRuntime)
- Short-circuit con `stopped_at: 'input'`, `reachedRuntime: false`, `status: 'BLOCKED'`, `reason_code: 'INVALID_AGENT_MVP_INPUT'`, `identity: null`, `runEvent: null`, `cause: 'INVALID_AGENT_MVP_INPUT'`, `stages` todos `null`

**No incluye** (explicitamente excluido):
- RunStore persistence
- Task Lifecycle administration
- Observer/fitness functions
- Retrieval, MCP, Temporal
- Provider/model calls reales
- Paid API
- Cambios de schema o contratos existentes
- Cambios de dependencias (package.json)
- Escrituras en FitFlow
- Sincronizacion cross-repo pendiente

**Autorizado para commit eventual del Task Cycle:**
- `opencode.json` (cambio de `$schema` pre-existente) — debe incluirse en el commit final; cambio explícitamente autorizado por el Developer dentro del scope de la task; ya no está excluido del commit eventual

## Ownership y limites

| Componente | Entrada | Salida | No es responsable de |
| --- | --- | --- | --- |
| AgentMVP (composition root) | `TaskRoutingInput` + configuracion inyectada | Ejecucion orquestada completa, `RUN_EVENT` final con identidad efectiva | Decidir routing, resolver modelo, evaluar FinOps, empaquetar contexto, explorar, ejecutar runtime |
| Router | `TaskRoutingInput` + Role Registry v3 | `RouteDecision` (ROUTED) | Ejecucion, FinOps, contexto, identidad efectiva |
| Model Resolver | route, requirements, registries v3, FinOps | `ModelResolutionResult` (SELECTED) | Ejecucion, identidad efectiva, routing |
| FinOps | modelo candidato, requirements, policy | Elegibilidad dura | Seleccionar modelo, ejecutar, facturar |
| ContextPackager | evidence requirements + budget | `ContextPackagerResult` (COMPLETE/PARTIAL/EMPTY) | Decidir suficiencia, ejecutar, routing |
| Explorer | ContextPackagerResult + evidence requirements | Decision determinista (PROCEED/ESCALATE/BLOCK) | Materializar contexto, ejecutar, aceptar task |
| Agent Runtime | route routed + proposal selected + adapter | Ejecucion/simulacion + `RUN_EVENT` + identidad efectiva | Re-elegir provider/model, relajar FinOps, derivar role |

## Flujo minimo determinista

```text
TaskRoutingInput
    -> Router (inyectado)
    -> ModelResolver + FinOps (inyectados)
    -> ContextPackager (inyectado)
    -> Explorer (inyectado)
    -> AgentRuntime (inyectado, adapter simulado inyectado)
    -> RUN_EVENT v2 con EXECUTION_COMPLETED + RuntimeIdentity
```

El flujo solo inicia si:
- `RouteDecision.status === 'ROUTED'`
- `ModelResolutionResult.status === 'SELECTED'`
- `ContextPackagerResult.status !== 'EMPTY'` (o Explorer decide proceder con PARTIAL segun reglas)
- `ExplorerDecision === 'PROCEED'`

Un resultado bloqueado en cualquier etapa no avanza y registra causa estable.

**Regla Explorer:** `PARTIAL` siempre produce `ESCALATE` (nunca `PROCEED`); solo `COMPLETE` con cobertura total permite `PROCEED` y alcanza runtime.

## Contratos

Reutiliza exclusivamente contratos existentes:
- `TaskRoutingInput`, `RouteDecision` — `src/contracts/route.js`
- `ModelResolutionResult` — `src/contracts/model-resolution.js`
- `ContextPackagerResult` — `src/contracts/context-packager.js` (v2)
- `ExplorerDecision` — `src/explorer/` (implementado en 008)
- `AgentRuntimePort`, `RuntimeIdentity` — `src/contracts/runtime-identity.js` (v1, de 008)
- `RUN_EVENT` v2, `RUN_STATE` v2 — `src/contracts/run-event.js`, `run-state.js`
- `NormalizedStatus` con `UNAVAILABLE` — `src/contracts/common.js`

**No se autorizan** nuevos estados, cambios a contratos existentes, ni extensiones contractuales.

## Criterios de aceptacion (short-circuit)

1. **AC-1:** `node --test tests/core/routing.test.js` termina en `PASS` sin modificar `src/router/`, `src/model-resolver/`, `src/finops/`.
2. **AC-2:** `node --test tests/contract/contracts.test.js tests/contract/registries.test.js` termina en `PASS` sin cambios a schemas v3 ni contratos existentes.
3. **AC-3:** `node --test tests/core/state-machine.test.js` termina en `PASS`.
4. **AC-4:** `node --test tests/core/agent-runtime.test.js tests/core/explorer.test.js tests/contract/runtime-identity.test.js` termina en `PASS` (componentes de 008 intactos).
5. **AC-5:** `node --test tests/core/agent-mvp.test.js` demuestra que el composition root orquesta el flujo completo con adapters simulados inyectados y produce `RUN_EVENT` valido con identidad efectiva. **Core Agent MVP: 24/24 PASS** (10 orchestration + 14 boundary validation M1).
6. **AC-6:** `node --test tests/integration/agent-mvp.test.js` con `FF_PROJECT_*` carga registries v3 activos, respeta `paid_api_enabled: false` y completa simulacion declarada sin provider real.
7. **AC-7:** `package.json` y `package-lock.json` no cambian; no se instalan dependencias.
8. **AC-8:** La evidencia final registra `PASS`, `FAIL`, `NOT_RUN` o `UNAVAILABLE`; `DONE` permanece reservado al Developer.
9. **AC-9 (M1 Boundary Validation):** `node --test tests/core/agent-mvp.test.js --test-name-pattern="M1"` — **14/14 PASS**; validación `STAGE.INPUT` con `INVALID_AGENT_MVP_INPUT`, `validation_errors` determinista, reutiliza `TaskRoutingInput`/`EvidenceRequirement`, sin duplicar registry-policy.

**Short-circuit:** Si cualquier AC falla, la implementacion se detiene y escala al Developer. No hay workaround ni relajacion.

## Estrategia de prueba

- Unit tests del composition root: `tests/core/agent-mvp.test.js` (adapters simulados inyectados en cada etapa).
- Integracion: `tests/integration/agent-mvp.test.js` (end-to-end con `FF_PROJECT_*`, simulacion declarada).
- **Ningun test** contacta OpenCode, provider, modelo, MCP, retrieval, Temporal o API paid.
- La integracion solo resuelve Project Profile y registries v3 mediante `FF_PROJECT_*`.
- Un test no disponible se reporta `UNAVAILABLE`, nunca `PASS`.

## Out of scope

- RunStore persistence / Task Lifecycle
- Observer / fitness functions
- Retrieval, MCP, Temporal
- Provider/model calls reales, cloud o paid
- Cambios a Router, Model Resolver, FinOps, ContextPackager, Explorer, Agent Runtime, registries v3, configuracion activa de FitFlow
- Redisenar contratos Run/Event/Task, State Machine, Task Lifecycle, Context Strategy
- Sincronizacion del backlog/TaskStore, publicacion de contratos JSON, separacion de defaults/configuracion activa, retiro de duplicados AI Core
- Cross-repo pending sync

## Dependencias y precondiciones externas

- `FF-AI-VNEXT-008` permanece aceptada en `tooling` (baseline de integracion).
- Baseline observado actual: `ceae62a`.
- Project Profile y registries activos (`roles.yaml`, `models.yaml`, `finops.yaml`, `orchestrator.yaml`) pertenecen a FitFlow y se consumen sin modificarlos.
- Los tests de integracion requieren root explicito mediante `FF_PROJECT_*`.
- Paid API sigue deshabilitada por policy y configuracion.
- La aceptacion y promocion final corresponden al Developer.

## Archivos previstos para la implementacion

Permitidos (solo estos):

```text
src/agent-mvp/**
tests/core/agent-mvp.test.js
tests/integration/agent-mvp.test.js
docs/tasks/FF-AI-VNEXT-009/TASK.md
docs/tasks/FF-AI-VNEXT-009/PLAN.md
docs/tasks/FF-AI-VNEXT-009/RESULT.md
docs/SOURCE_OF_TRUTH.md                    (solo fila de indice)
docs/current-state.md                      (solo evidencia posterior, sin DONE)
docs/implementation-roadmap.md             (solo estado posterior a aceptacion, sin DONE)
opencode.json                              (solo cambio de $schema pre-existente, autorizado para commit eventual)
```

No permitidos:

```text
src/router/**
src/model-resolver/**
src/finops/**
src/registries/schemas/**
src/contracts/route.js
src/contracts/model-resolution.js
src/contracts/run-event.js
src/contracts/task.js
src/contracts/common.js
src/contracts/context-packager.js
src/contracts/runtime-identity.js
src/core/state-machine.js
src/core/routing-evidence.js
src/core/run-store.js
src/core/context-packager.js
src/agent-runtime/**
src/explorer/**
package.json
package-lock.json
FitFlow/.ai/config/**
```

## Tests futuros obligatorios

```text
node --test tests/core/routing.test.js
node --test tests/contract/contracts.test.js tests/contract/registries.test.js
node --test tests/core/state-machine.test.js
node --test tests/core/agent-runtime.test.js
node --test tests/core/explorer.test.js
node --test tests/contract/runtime-identity.test.js
node --test tests/core/agent-mvp.test.js
node --test tests/integration/agent-mvp.test.js
```

La ultima integracion se ejecuta solo con `FF_PROJECT_*` explicitos y adapters simulados.

## Delegation boundaries

- **Coder (esta task):** Implementa `src/agent-mvp/**`, tests unitarios y de integracion, documentacion de task, fila SoT, actualizaciones de evidencia en `current-state.md` y `implementation-roadmap.md` (sin promover a DONE).
- **Task Lifecycle:** Owns Git worktree, branch, base commit, provider state transitions, PR creation, integration, cleanup. Divergencia `tooling` vs `ceae62a` es owned by Task Lifecycle. **Baseline de integracion faltante:** commits `e75e930` (package publication), `daae49d` (package.json), `de300da` (.gitignore, compatibility, task-lifecycle baseline policy) — requisito previo de integracion para Task Cycle tras validacion del Developer, **no bloquea** validacion del worktree actual, **no autoriza** rebase/merge ahora.
- **Reviewer:** Revision semantica independiente cuando lo requiera task policy.
- **Validator:** Validacion determinista de los comandos de aceptacion.
- **Developer:** Autoridad terminal de aceptacion; no promueve a `DONE` sin evidencia y aceptacion explicita.

## Aceptacion del Developer (DONE)

El Developer acepto explicitamente `FF-AI-VNEXT-009` como **`DONE`** con gaps
documentados y orden de integracion registrado. La aceptacion es terminal y
explicita; no se infiere.

- Veredicto de review independiente: **`ACCEPT_WITH_NON_BLOCKING_FINDINGS`** (se
  mantiene; no cambia). **M1 RESOLVED** tras re-review independiente.
- Excepcion historica: base real `main@ceae62a`; destino de integracion
  `tooling`.
- `opencode.json` era un cambio pre-existente en el feature worktree y `tooling`
  ya contiene la version canonica valida con `$schema`; por tanto queda
  **aislado intencionalmente de 009** y no debe ser atribuido ni reapicado por el
  squash merge. No se contabiliza como entrega de 009.
- Reconciliacion contra `tooling`, validacion de integracion final y limpieza del
  worktree son **operaciones pendientes del Task Cycle deterministico**, aun no
  completadas. No se afirma que el squash merge, la validacion final de tooling,
  el commit ni la limpieza hayan ocurrido.

## Stop conditions

La implementacion se detiene y escala al Developer inmediatamente si:

1. Se requiere modificar alguna capa estable de 007/008 (`src/router/`, `src/model-resolver/`, `src/finops/`, `src/agent-runtime/`, `src/explorer/`, `src/core/context-packager.js`, `src/core/run-store.js`, `src/core/state-machine.js`).
2. Se requiere alterar la configuracion activa de FitFlow o realizar llamadas de red/paid API.
3. Se requiere instalar dependencias npm o modificar `package.json`/`package-lock.json`.
4. Se requiere escribir en FitFlow, o sincronizar cross-repo.
5. Surge alguna ambigüedad contractual en los esquemas v2/v3 existentes.
6. Se intenta promover la task a `DONE` sin aceptacion explicita del Developer.
