---
document_id: FFAI-ROADMAP-001
status: canonical
machine_context: true
version: 2.5
updated: 2026-08-25
---

# Secuencia de implementacion

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
autorizada por Developer sin diff en lockfile. **Nota historica al 2026-08-24:**
**`opencode.json` era un cambio
pre-existente en el feature worktree; `tooling` ya contiene la version canonica
valida con `$schema`, por lo que queda aislado intencionalmente de 009 y no debe
ser atribuido ni reapicado por el squash merge.** Estado: **`DONE`** (aceptado
explicitamente por el Developer; review `ACCEPT_WITH_NON_BLOCKING_FINDINGS`, M1
`RESOLVED`). **Nota historica al 2026-08-24:** Reconciliacion contra `tooling`, validacion final de integracion y
limpieza del worktree son **pendientes del Task Cycle deterministico**, aun no
completadas; no se afirma squash merge, validacion final de tooling, commit ni
limpieza.

## Autoridad y pendientes cross-repo

Este documento es la Source of Truth del roadmap de AI Core para
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

---

## Follow-up: Agent Profiles MVP (Post-Foundation)

Habilitado tras **aceptación e integración en `tooling` de los artefactos de fundación de `FF-AI-DOC-001`** (ADR-001, Milestone, 6 WP Plans, TASK/PLAN DOC001, SoT actualizado, task-lifecycle actualizado, cierre 009). La ejecución/completación/integración de WP2–WP6 **NO es prerrequisito**.

| Task | Entregable | Estado | Gate |
|---|---|---|---|
| `FF-AI-AGENT-001` | Contratos 7 roles + matriz perfiles (docs-only) | `DONE` | `ACCEPTED` e `INTEGRATED` en `tooling` por PR #12, merge `3d5d8b85a316233eae029963a3f5d14400fcd7fc`; `DOC_SYNC` completado |
| `FF-AI-AGENT-002` | Conformance documental de perfiles mínimos (adapter descriptors, permisos, verificación, delegación y handoff) | `PENDING_ACCEPTANCE` | Validación PASS; review `ACCEPT_WITH_NON_BLOCKING_FINDINGS`; pendiente aceptación Developer/integración; **sin autorización OpenCode presente** |

**Scope AGENT001**: 5 nuevos + 4 modificados = 9 paths exactos (ver TASK ownership keys). Solo documentación. Sin implementación, runtime, adapters, registros ejecutables, selección automática, ranking, fallback, model policy.

**Scope AGENT002**: 3 nuevos + 5 modificados = 8 paths exactos. Docs-only; no perfiles/adapters ejecutables, runtime, registries, model bindings, fallback o ranking.

---

### Nota histórica al 2026-08-24 / Ruling posterior / Cierre documental append-only (2026-08-25)

El párrafo anterior "Reconciliacion contra `tooling`, validacion final de integracion y limpieza del worktree son **pendientes del Task Cycle deterministico**, aun no completadas..." conserva el estado **histórico al 2026-08-24** (snapshot previo al cierre). El cierre documental append-only resuelve lo pendiente:

- **Integración en `tooling` completada**: `integration {status: INTEGRATED, target: tooling, sha: 590ecfe58d27e8c95b2d80ee1c9d3287313a7093, integrated_at: 2026-08-24}`.
- **Promoción `main`** SHA `8b946906800eab3dbb9c6e407f691beea4b2af0e` y **reconciliación** SHA `41088a413d06ed1d58d63d92320e38d4b44b86ea` registradas como evidencia secundaria (no colapsadas con integración en tooling).
- **Dimensiones finales**: `validation PASS` (UNAVAILABLE/SKIP históricos conservados), `review_verdict ACCEPT_WITH_NON_BLOCKING_FINDINGS` (M1 RESOLVED), `developer_acceptance ACCEPTED` (2026-08-24), `integration INTEGRATED`, `lifecycle_status DONE`.
- **`opencode.json` ruling**: `UNKNOWN/PRE-EXISTING` (no atribuible, fuera de scope automático).
- **Baseline histórico** `main@ceae62a` mantenido.
- **Cleanup worktree** posterior y separado; no se afirma que haya ocurrido.
- Los claims "pendientes del Task Cycle" arriba son **snapshot histórico**; resueltos por este cierre.
