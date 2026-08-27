---
document_id: FFAI-TASK-008
status: canonical
owner: fitflow-ai
type: workflow
version: 1.0
updated: 2026-08-22
machine_context: true
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[implementation-roadmap]]"
  - "[[current-state]]"
  - "[[architecture/task-lifecycle]]"
  - "[[architecture/operational-architecture]]"
  - "[[architecture/context-strategy]]"
---

# TASK FF-AI-VNEXT-008: Explorer y Agent Runtime conformance

## Identificacion

| Campo | Valor |
| --- | --- |
| Task ID | `FF-AI-VNEXT-008` |
| Estado | `DONE` |
| Baseline | `tooling` en `4a10ebd` |
| Task type / area / scope | `feature` / `ai_tooling` / `backend` |
| Lane / risk / priority | `ai_orchestrated` / `low` / `P1` |
| Dependencia | `FF-AI-VNEXT-007` |

La futura materializacion machine-readable valida contra `fitflow-task/v2` y conserva estos ownership keys:

```text
path:src/agent-runtime/**
path:src/explorer/**
path:src/contracts/runtime-identity.js
doc:docs/tasks/FF-AI-VNEXT-008/TASK.md
```

## Objetivo

Implementar la conformance minima y determinista de Explorer y Agent Runtime. El Runtime consume una `RouteDecision` ya routed y un `ModelResolutionResult` ya selected, ejecuta mediante un adapter controlado o una simulacion explicitamente declarada, y produce evidencia de resultado con identidad efectiva confirmada o `UNAVAILABLE`.

No vuelve a decidir role, requirements, provider, model, pool ni elegibilidad economica.

## Ownership y limites

| Componente | Entrada | Salida | No es responsable de |
| --- | --- | --- | --- |
| Router | `TaskRoutingInput` y Role Registry v3 | `RouteDecision`: role canonico y `ExecutionRequirements` | Elegir modelo/provider/runtime, evaluar FinOps o ejecutar |
| Model Resolver | role, requirements, registries v3 y FinOps | `ModelResolutionResult`: propuesta o `NO_ELIGIBLE_MODEL` | Ejecutar, confirmar identidad efectiva o cambiar routing |
| FinOps | modelo candidato, requirements y policy/resource state | Elegibilidad dura del provider/pool | Seleccionar modelo, ejecutar o facturar |
| Explorer | resultado estructurado de contexto, evidence requirements y cobertura | Decision determinista de proceder, escalar contexto o bloquear | Materializar contexto, seleccionar runtime, ejecutar modelos o aceptar la task |
| Agent Runtime | route routed, proposal selected y adapter configurado | Ejecucion real o simulada declarada, `RUN_EVENT` de resultado e identidad efectiva confirmada o unavailable | Re-elegir provider/model/pool, relajar FinOps, derivar role/requirements, decidir suficiencia o aceptar la task |

Explorer decide la suficiencia de evidencia; ContextPackager y `repo-packager` conservan retrieval y materializacion. Agent Runtime es intercambiable y no se acopla a OpenCode ni a un provider concreto.

## Flujo minimo

```text
RouteDecision + ModelResolutionResult
    -> AgentRuntimePort
    -> ejecucion controlada o simulacion explicitamente declarada
    -> evidencia de resultado
    -> identidad efectiva confirmada o UNAVAILABLE
```

El flujo solo inicia con `RouteDecision.status === 'ROUTED'` y `ModelResolutionResult.status === 'SELECTED'`. Un resultado bloqueado no se convierte en ejecucion ni en identidad inventada.

## Definiciones operativas

- **Propuesta de runtime:** seleccion pre-ejecucion del Resolver: `registry_id`, `provider`, `runtime_id`, `pool_id`, `resource_class` y `access_mode`; no acredita uso efectivo.
- **Runtime efectivo:** identidad observada tras ejecucion real o simulacion declarada, con modo, provider y runtime usados, o causa de indisponibilidad.
- **Ejecucion simulada:** adapter determinista inyectado que no contacta provider ni modelo; declara `simulated` y nunca se presenta como inferencia real.
- **Ejecucion real:** invocacion de un runtime por un adapter correspondiente a la propuesta; sigue sujeta a FinOps y paid API permanece deshabilitada.
- **Identidad unavailable:** estado normalizado `UNAVAILABLE` cuando no puede confirmarse una identidad efectiva; registra causa estable y no se sustituye por la propuesta.

## Contratos y reason codes

Los contratos existentes ya expresan el flujo: `RUN_EVENT` v2 contiene `EXECUTION_COMPLETED` y `outputs: ArtifactRef[]`; `ArtifactRef` acepta `schema_version`; `RUN_STATE` v2 conserva route y los eventos reconstruyen ejecucion; `Actor` ya incluye `explorer`; `State` ya incluye `EXPLORING` y `EXECUTING`; y `NormalizedStatus` incluye `UNAVAILABLE`.

No se autorizan nuevos estados ni cambios a `RouteDecision`, `ModelResolutionResult`, `RUN_EVENT` o `Task`. Si hace falta, se crea el contrato aditivo `fitflow-runtime-identity/v1`, referenciado como `ArtifactRef` en el evento de ejecucion. Sus reason codes se limitan a `IDENTITY_CONFIRMED`, `SIMULATION_DECLARED`, `PROPOSAL_MISMATCH`, `RUNTIME_UNAVAILABLE`, `ADAPTER_UNAVAILABLE` y `EXECUTION_FAILED`.

Solo si la proyeccion de estado resulta imprescindible se permite agregar a `RUN_STATE` un historial de ejecucion opcional y backward-compatible, con justificacion. Los eventos existentes son el mecanismo por defecto.

## Criterios de aceptacion

1. **AC-1:** `node --test tests/core/routing.test.js` termina en `PASS` sin modificar `src/router/`, `src/model-resolver/` ni `src/finops/`.
2. **AC-2:** `node --test tests/contract/contracts.test.js tests/contract/registries.test.js` termina en `PASS` sin cambios a schemas v3 ni contratos existentes, salvo la extension opcional de `RUN_STATE` autorizada.
3. **AC-3:** `node --test tests/core/state-machine.test.js` termina en `PASS`.
4. **AC-4:** un test de Agent Runtime demuestra que route routed y proposal selected, con adapter simulado inyectado, producen evidencia declarada e identidad efectiva valida.
5. **AC-5:** sin ejecucion ni simulacion declarada no se emite identidad efectiva; el resultado registra causa estable.
6. **AC-6:** una identidad efectiva distinta de la propuesta conserva ambas y registra `PROPOSAL_MISMATCH`.
7. **AC-7:** un adapter no disponible produce identidad `UNAVAILABLE` con causa estable, sin red ni provider real.
8. **AC-8:** Explorer transforma resultados `COMPLETE`, `PARTIAL` y `EMPTY` de contexto en decisiones deterministas sin invocar modelos.
9. **AC-9:** una integracion con `FF_PROJECT_*` carga registries v3 activos, mantiene `paid_api_enabled: false` y completa una simulacion declarada sin provider real.
10. **AC-10:** todo `EXECUTION_COMPLETED` emitido valida contra `RUN_EVENT` v2 y referencia artifacts validos.
11. **AC-11:** `package.json` y `package-lock.json` no cambian; no se instalan dependencias.
12. **AC-12:** la evidencia final registra `PASS`, `FAIL`, `NOT_RUN` o `UNAVAILABLE`; `DONE` permanece reservado al Developer.

## Estrategia de prueba

La conformance se prueba con adapters falsos inyectados y simulaciones declaradas. Ningun test contacta OpenCode, provider, modelo, MCP, retrieval, Temporal o API paid. La integracion solo resuelve Project Profile y registries v3 mediante `FF_PROJECT_*`; no modifica configuracion activa de FitFlow.

## Out of scope

- Integracion especifica con OpenCode u otro Agent CLI.
- Ejecucion de providers/modelos reales, cloud o paid.
- MCP, retrieval, Temporal, ranking, pricing, billing o accounting.
- Cambios a Router, Model Resolver, FinOps, registries v3 o configuracion activa de FitFlow.
- Redisenar contratos Run/Event/Task, State Machine o Task Lifecycle.
- Sincronizacion del backlog/TaskStore, publicacion de contratos JSON, separacion de defaults/configuracion activa, retiro de duplicados AI Core y deuda no bloqueante de 007.

## Dependencias y precondiciones externas

- `FF-AI-VNEXT-007` permanece aceptada en `4a10ebd`.
- Project Profile y registries activos (`roles.yaml`, `models.yaml`, `finops.yaml`, `orchestrator.yaml`) pertenecen a FitFlow y se consumen sin modificarlos.
- Los tests de integracion requieren root explicito mediante `FF_PROJECT_*`.
- Paid API sigue deshabilitada por policy y configuracion.
- La aceptacion y promocion final corresponden al Developer.

## Archivos previstos para la implementacion posterior

Permitidos:

```text
src/agent-runtime/**
src/explorer/**
src/contracts/runtime-identity.js
src/contracts/index.js                       (solo export aditivo)
src/contracts/index.mjs                      (solo export aditivo)
src/contracts/run-state.js                   (solo extension opcional justificada)
tests/core/agent-runtime.test.js
tests/core/explorer.test.js
tests/contract/runtime-identity.test.js
tests/integration/runtime-conformance.test.js
docs/tasks/FF-AI-VNEXT-008/TASK.md
docs/current-state.md                        (solo evidencia posterior)
docs/implementation-roadmap.md               (solo estado posterior a aceptacion)
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
src/core/state-machine.js
src/core/routing-evidence.js
src/core/run-store.js
src/core/context-packager.js
package.json
package-lock.json
FitFlow/.ai/config/**
```

## Tests futuros obligatorios

```text
node --test tests/core/routing.test.js
node --test tests/core/state-machine.test.js
node --test tests/contract/contracts.test.js tests/contract/registries.test.js
node --test tests/core/agent-runtime.test.js
node --test tests/core/explorer.test.js
node --test tests/contract/runtime-identity.test.js
node --test tests/integration/runtime-conformance.test.js
```

La ultima integracion se ejecuta solo con `FF_PROJECT_*` explicitos y adapters simulados. Un test no disponible se reporta `UNAVAILABLE`, nunca `PASS`.

## Stop conditions

La implementacion se detiene y escala al Developer si requiere modificar una capa estable de 007, configuracion de FitFlow, provider real, API paid o rediseno contractual no autorizado. La task no se promueve a `DONE` sin evidencia aplicable y aceptacion explicita del Developer.
