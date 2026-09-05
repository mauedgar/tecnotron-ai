---
document_id: TEC-ROADMAP-001
status: canonical
machine_context: true
version: 3.0
updated: 2026-09-04
owner: tecnotron-ai
---

# Secuencia de implementacion

## Milestone activo: tecnotron-operational-foundation-v1

El Milestone Plan esta `ACCEPTED` para materializacion documental sobre
`41088a413d06ed1d58d63d92320e38d4b44b86ea`. Para este milestone, `tools` es la
rama de integracion y `main` el destino de promocion tras aceptacion; `tooling`
queda como referencia historica sin autoridad operativa sobre este milestone.

| Orden aprobado | Work Package | Estado | Navegacion |
| ---: | --- | --- | --- |
| 0 | `WP-000` | `DONE` | [Plan WP-000](work-packages/wp-000-cross-repo-project-profile-baseline/PLAN.md) |
| 1 | `WP-001` | `ACCEPTED_INTEGRATED` | [SPEC](work-packages/wp-001-operational-profile-contracts/SPEC.md) · [Plan](work-packages/wp-001-operational-profile-contracts/PLAN.md) |
| 2 | `WP-002` | SPEC `ACCEPTED`; WP PLAN `NOT_MATERIALIZED` | [SPEC](work-packages/wp-002-deterministic-opencode-launchers/SPEC.md) · [Milestone Plan](milestones/tecnotron-operational-foundation-v1/PLAN.md#wp-002--deterministic-opencode-launchers) |
| — | `WP-003`–`WP-006` | `PLANNING_PENDING_SPEC` | [Milestone Plan](milestones/tecnotron-operational-foundation-v1/PLAN.md#4-work-packages) |
| — | `WP-007` | `PLANNING_PENDING_CONFIRMATION` | [Milestone Plan](milestones/tecnotron-operational-foundation-v1/PLAN.md#wp-007--non-behavioral-milestone-closeout-boundary) |

`WP-000` precede a `WP-001` y esta `DONE`: el Developer acepto terminalmente
`TOF-W0-001` y `TOF-W0-002`, integradas en Tecnotron-ai
`tools@423714572af5332b2defa7265ff1514d0fd0c81a` y FitFlow
`develop@0c092b927acc4c46e2059fc91d3606ea41f3c9af`. Sus unicas TASKs aprobadas son
[TOF-W0-001](tasks/TOF-W0-001/TASK.md) y
[TOF-W0-002](tasks/TOF-W0-002/TASK.md), en ese orden. Esta seccion registra
la planificacion y el estado de integracion; la promocion del milestone a `main`
permanece sujeta a su gate especifico.

La SPEC de `WP-001` esta aceptada y materializada junto con su Plan y la TASK
[TOF-W1-001](tasks/TOF-W1-001/TASK.md). Un ruling posterior autorizo la
implementacion desde `task_base` `651e84d` en worktree propio. La validacion
paso 11/11 focalizada, 19/19 combinada y 154/154 completa; el review
independiente fue `PASS`, el Developer acepto la TASK y PR #27 la integro en
`tools@d7e1e7e4784cae455782b38797c199e380173804`. Publicacion, promocion a
`main` y cleanup permanecen `NOT_RUN`.

La [SPEC de `WP-002`](work-packages/wp-002-deterministic-opencode-launchers/SPEC.md)
esta `ACCEPTED` por el Developer y el gate `WP-002_SPEC_ACCEPTANCE` esta
`SATISFIED`. El siguiente limite del lifecycle es materializar el WP PLAN por el
Architect y obtener el gate `READY` del Developer antes de materializar TASKs
ejecutables. La autoridad de implementacion permanece `NOT_CREATED`.

Las TASKs de la tabla historica siguiente permanecen como registro anterior al
baseline y no son contexto activo del milestone.

| Orden | Task | Entregable | Estado |
| ---: | --- | --- | --- |
| 0 | `FF-AI-VNEXT-001` | baseline vNext | `DONE` |
| 1 | `FF-AI-VNEXT-002` | doctor y compatibilidad sin installs | `DONE` |
| 2 | `FF-AI-VNEXT-003` | contracts Zod y registries loaders | `DONE` |
| 3 | `FF-AI-VNEXT-004` | State Machine, events JSONL y SQLite | `DONE` |
| 4 | `FF-AI-VNEXT-005` | Project Profile y adapters GitHub/OpenSpec | `DONE` |
| 5 | `FF-AI-VNEXT-006` | ContextPackager v2 | `DONE` |
| 6 | `FF-AI-VNEXT-007` | Router, Model Resolver y FinOps | `DONE` |
| 7 | `FF-AI-VNEXT-008` | Explorer y Agent Runtime conformance | `DONE` |
| 8 | `FF-AI-VNEXT-009` | Agent MVP y documentation sync | `DONE` |
| 9 | `FF-AI-VNEXT-010` | fitness functions y Workflow Observer | `BACKLOG` |
| 10 | `FF-AI-VNEXT-011+` | retrieval, MCP y Temporal tras sus gates | `PLANNED` |

`FF-AI-VNEXT-006` fue implementada: la reparacion de `repo-packager` se integra
en `tooling` y el ContextPackager v2 cumple el contrato de telemetria
determinista. La conformance v2 queda validada en la PR mergeada.

La implementacion de `006` define `ContextPackagerResult` y telemetria
determinista como contrato estructurado. ContextPackager coordina materializers,
presupuesto, suficiencia y fallback hacia una fuente primaria; `repo-packager`
solo materializa la evidencia solicitada y mantiene sus exclusiones sensibles.
El estado `DONE` de la tabla queda confirmado tras la revision y merge del
desarrollador.

`FF-AI-VNEXT-007` implementa un MVP cerrado: Task aporta solo campos
declarativos; Role Registry v3 deriva rol y requisitos; Model Registry v3,
FinOps v1 y un orden fijo producen una propuesta determinista. Los registries
v2 son unsupported. No existe ejecucion de provider/model/runtime en esta task.
Agent Runtime y effective identity permanecen en `FF-AI-VNEXT-008`. El estado
`DONE` queda confirmado por el desarrollador tras la revision independiente;
los hallazgos menores de loader y exports ESM quedan como deuda no bloqueante.

`FF-AI-VNEXT-005` y `FF-AI-VNEXT-006` pueden ejecutarse en paralelo con
ownership de archivos y contratos no superpuesto. `005` posee Project Profile,
descubrimiento y resolucion portable de roots. `006` consume el root resuelto a
traves del contrato correspondiente y no implementa un resolver alternativo ni
hardcodea una topologia cross-repo.

## Implementación FF-AI-VNEXT-009 (Agent MVP)

Implementado composition root determinista en `src/agent-mvp/index.js` con factory
`createAgentMvp(deps)` que valida `contextPackager` y `adapter` inyectados,
inyecta defaults opcionales para router/modelResolver/explorer/agentRuntime, y
expone `execute(input)` que secuencia: Router -> ModelResolver+FinOps ->
ContextPackager -> Explorer -> AgentRuntime. Cada etapa valida precondicion
(`ROUTED`, `SELECTED`, `PROCEED`); short-circuit con `stopped_at` y `cause`
estable si falla. Explorer regla: `PARTIAL` => `ESCALATE` (nunca `PROCEED`);
solo `COMPLETE` con cobertura total permite `PROCEED` y alcanza runtime.

**Boundary validation M1 (RESOLVED tras re-review independiente):**
- `STAGE.INPUT` como primera etapa explícita
- Código de error estable `INVALID_AGENT_MVP_INPUT`
- Array determinista `validation_errors` con detalle por campo
- Reutiliza `TaskRoutingInput.safeParse` y `EvidenceRequirement.safeParse` — **sin duplicar registry-policy**
- Fail-closed en `STAGE.INPUT` sin invocar dependencias inyectadas

Retorna `{ stopped_at, reachedRuntime, stages, status, reason_code, identity,
runEvent, cause }` mapeando `status/reason_code` top-level desde
`runtimeResult.identity` o `runtimeResult` directo.

Tests unitarios: **24/24 PASS** (`tests/core/agent-mvp.test.js`: 10 orchestration + 14 M1 boundary). Integracion local
con componentes reales y materializer determinista: 1/1 PASS
(`tests/integration/agent-mvp.test.js`). Validación externa mediante comando explícito a través de `tests/integration/routing.test.js`, `runtime-conformance.test.js`, y `agent-mvp.test.js`: **5/5 PASS, 0 SKIP** con registries v3 activas y `paid_api_enabled: false`. Integracion externa con `FF_PROJECT_*` sin env vars: SKIP (requiere Project Profile real).
Regresion completa suite: **133 tests, 130 PASS, 3 SKIP, 0 FAIL**. Validaciones
deterministas adicionales: `validate-package.js` PASS, `repo-packager` 4/4 PASS,
`git diff --check` PASS, manifiestos sin cambios. Instalacion de dependencias
autorizada por Developer sin diff en lockfile. **`opencode.json` era un cambio
pre-existente en el feature worktree; `tooling` ya contiene la version canonica
valida con `$schema`, por lo que queda aislado intencionalmente de 009 y no debe
ser atribuido ni reapicado por el squash merge.** Estado: **`DONE`** (aceptado
explicitamente por el Developer; review `ACCEPT_WITH_NON_BLOCKING_FINDINGS`, M1
`RESOLVED`). Reconciliacion contra `tooling`, validacion final de integracion y
limpieza del worktree son **pendientes del Task Cycle deterministico**, aun no
completadas; no se afirma squash merge, validacion final de tooling, commit ni
limpieza.

## Autoridad y pendientes cross-repo

Este documento es la Source of Truth del roadmap de Tecnotron-ai para
desarrolladores. El backlog machine-readable que hoy vive en FitFlow conserva
estados stale para `002-004` y `006`; no se mueve ni se edita desde esta task.
Su ownership y sincronizacion quedan `PENDING` hasta resolver TaskStore,
sin ampliar el scope de Router/Resolver/FinOps.

Tambien quedan `PENDING`:

- mover o publicar contratos JSON desde una unica fuente sin romper callers;
- separar defaults reutilizables de la configuracion activa de FitFlow;
- retirar duplicados de AI Core en FitFlow mediante una task con ownership;
- resolver paths entre repos sin asumir una ubicacion fisica.

`project-profile.yaml`, TASK, runs y configuracion activa permanecen en FitFlow.
