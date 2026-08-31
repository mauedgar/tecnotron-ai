---
document_id: TEC-STATE-001
status: canonical
machine_context: true
version: 1.6
updated: 2026-08-30
owner: tecnotron-ai
---

# Estado actual de Tecnotron-ai

Todas las referencias a la rama `tooling` de este documento registran evidencia
histórica anterior al milestone vigente; no le atribuyen autoridad operativa
actual. Para `tecnotron-operational-foundation-v1`, el valor vigente de
`integration_branch` es `tools`.

## Implementacion confirmada

- `FF-AI-VNEXT-001` a `004`: `DONE` por promocion del desarrollador.
- Doctor y discovery sin installs: implementados.
- Contracts Zod y registries loaders: implementados.
- State Machine, eventos JSONL, Run Store y proyeccion SQLite: implementados.
- `repo-packager`: reparado e integrado en `tooling` por PR #2; tests 4/4
  `PASS` en este worktree.
- ContextPackager v2: contrato Zod y core implementados. Orquesta materializers
  inyectados, aplica el budget global, entrega `COMPLETE`/`PARTIAL`/`EMPTY` y
  emite telemetria determinista por entrega. `repo-packager` permanece como
  materializer y no recibe decisiones de suficiencia.
- `FF-AI-VNEXT-005`: Project Profile, resolucion portable de roots y adapters
  implementados y aceptados en el baseline previo.
- `FF-AI-VNEXT-007`: Router, Model Resolver y FinOps v1 implementados como MVP
  determinista y aceptados por el desarrollador (`DONE`). Model Registry v3 y
  Role Registry v3
  son los unicos formatos activos; v2 falla con errores estables. Router deriva
  rol y requisitos desde policy; Resolver solo propone provider/runtime y no
  ejecuta modelos ni runtimes. Paid API permanece deshabilitada.
- `FF-AI-VNEXT-008`: Explorer, Agent Runtime y effective runtime identity
  implementados y validados; review independiente `ACCEPT`, aceptados por el
  Developer (`DONE`). Agent MVP, Observer,
  retrieval, MCP y Temporal permanecen pendientes segun roadmap.
- `FF-AI-VNEXT-009`: **Agent MVP composition root implementado, validado y
  aceptado explicitamente por el Developer como `DONE`** (con gaps documentados
  y orden de integracion registrado). Composition root en `src/agent-mvp/index.js`
  orquesta Router -> ModelResolver/FinOps -> ContextPackager -> Explorer ->
  AgentRuntime con dependencias inyectadas. **Boundary validation M1 (RESOLVED
  tras re-review):** `STAGE.INPUT` con `INVALID_AGENT_MVP_INPUT`,
  `validation_errors` determinista, reutiliza `TaskRoutingInput`/
  `EvidenceRequirement`, sin duplicar registry-policy. Tests unitarios **24/24
  PASS** (10 orchestration + 14 M1 boundary) y test de integracion local (1/1
  PASS) confirman flujo completo con adapters simulados. Test de integracion
  externo requiere `FF_PROJECT_*` (SKIP sin env vars). Regresion completa: **133
  tests, 130 PASS, 3 SKIP, 0 FAIL**. Evidencia registrada en
  `docs/tasks/FF-AI-VNEXT-009/RESULT.md`. Excepcion historica: base real
  `main@ceae62a`, destino de integracion `tooling`. `opencode.json` era cambio
  pre-existente en el feature worktree y `tooling` ya contiene la version canonica
   valida con `$schema`; queda aislado intencionalmente de 009 y no debe ser
   atribuido ni reapicado por el squash merge. Reconciliacion contra `tooling`,
   validacion final de integracion y limpieza del worktree son **pendientes del
   Task Cycle deterministico**, aun no completadas.
- `WP-000`: **DONE** tras aceptacion terminal del Developer. `TOF-W0-001` y
  `TOF-W0-002` integran el Profile y configuracion activa de FitFlow, inyeccion
  reproducible de `FF_PROJECT_ROOT`, `FF_PROJECT_PROFILE` y `FF_AI_CORE_ROOT`,
  y resolucion fail-closed sin inferencia de repositorios hermanos. Las
  integraciones son Tecnotron-ai
  `tools@423714572af5332b2defa7265ff1514d0fd0c81a` y FitFlow
  `develop@0c092b927acc4c46e2059fc91d3606ea41f3c9af`. La evidencia focalizada
  confirma resolver/doctor 15/15 y registries 8/8 `PASS`.

La promocion `002-004` consta en el commit FitFlow `52d729c`. Algunos
run-state/result JSON y el backlog machine-readable de FitFlow conservan
`PENDING_ACCEPTANCE`; son artefactos stale, no una reversa de la decision del
desarrollador. No se modifican sin ownership de FitFlow.

## Siguiente trabajo

- `FF-AI-VNEXT-006`: `DONE`; implementado ContextPackager v2 con contrato
  estructurado y telemetria determinista. No cambia el estado de la TASK,
  que conserva autoridad del desarrollador.
- `FF-AI-VNEXT-007`: `DONE`; aceptado por el desarrollador tras revision
  independiente con veredicto `ACCEPT_WITH_NON_BLOCKING_FINDINGS`.
- `FF-AI-VNEXT-008`: `DONE`; aceptado por el Developer.
- `FF-AI-VNEXT-009`: `DONE`; aceptado explicitamente por el Developer tras review
  independiente `ACCEPT_WITH_NON_BLOCKING_FINDINGS` (M1 `RESOLVED`).
  Reconciliacion contra `tooling`, validacion final de integracion y limpieza del
  worktree pendientes del Task Cycle deterministico (no completadas).

## Plataforma operativa

- Orca controla workspace, sesion, restore e hibernation.
- Git worktree es el isolation boundary.
- El Folder Workspace Tecnotron aporta contexto multi-repo, no aislamiento.
- OpenCode funciona como Agent CLI actual bajo Orca y es intercambiable.
- Otros Agent CLI pueden operar bajo Orca sin cambiar la arquitectura.
- Model Provider aporta inferencia; no gobierna workflow ni estados.

Estas son capacidades de plataforma confirmadas por el desarrollador y por el
runtime Orca; no se presentan como implementaciones propias de Tecnotron-ai.

## Evidencia y limitaciones

Validacion MVP ejecutada el 2026-08-24:

| Comando | Resultado |
| --- | --- |
| `node --test tests/core/routing.test.js` | Router, Resolver, FinOps y evidencia determinista `PASS` |
| `node --test tests/contract/registries.test.js tests/contract/contracts.test.js` | schemas v3, rechazo v2 y contratos discriminados `PASS` |
| `node --test tests/core/state-machine.test.js` | StateMachine y transiciones estrictas `PASS` |
| `node --test tests/integration/routing.test.js tests/integration/runtime-conformance.test.js tests/integration/agent-mvp.test.js` | **5/5 PASS, 0 SKIP** (external integration command across routing.test.js, runtime-conformance.test.js, agent-mvp.test.js) |
| `node --test tests/core/agent-runtime.test.js tests/core/explorer.test.js tests/contract/runtime-identity.test.js` | **PASS** (core 008 components: agent-runtime, explorer, runtime-identity) |
| `node --test tests/core/agent-mvp.test.js` | **24/24 PASS** (10 orchestration + 14 M1 boundary validation) |
| `node --test tests/integration/agent-mvp.test.js` | **1 PASS, 1 SKIP** (local e2e PASS; external SKIP sin FF_PROJECT_*) |
| `node --test` (suite completa / `npm test`) | **133 tests: 130 PASS, 3 SKIP, 0 FAIL** |
| `node src/contracts/validate-package.js` | **PASS** |
| `python tests/repo-packager/pack.test.py` | **4/4 PASS** |
| `git diff --check` | **PASS** (warning LF/CRLF en opencode.json, no errores) |
| `git diff package.json package-lock.json` | **VACÍO** (sin cambios en manifiestos) |
| test de integracion con overrides `FF_PROJECT_*` | Project Profile y configuracion FitFlow activa `PASS`; declared runtime simulation completed with active v3 registries and paid API false |

No se instalaron dependencias nuevas en manifiesto; instalacion de `node_modules` autorizada por Developer sin diff en lockfile.

La evidencia historica de `001-004` permanece en TASK, VALIDATION, REVIEW y
RESULT de FitFlow. Los worktrees coordinados se resuelven por variables de
entorno explicitas; los paths temporales no se persisten en Project Profile.

### Limitaciones conocidas

- El test de integracion externo (`active v3 registries complete a declared simulation with paid API disabled`) queda `SKIP` sin variables `FF_PROJECT_*`; no se reporta `PASS` ni `FAIL` sin evidencia real.
- Cobertura de grafo: archivos nuevos de esta task no indexados al momento de verificacion; evidencia basada en source read directo y ejecucion de comandos.
- Review semantica independiente: `COMPLETED` / veredicto `ACCEPT_WITH_NON_BLOCKING_FINDINGS` (M1 `RESOLVED` tras re-review).
- Divergencia baseline `ceae62a` vs `tooling` owned by Task Lifecycle; no resuelta en esta task. **Baseline de integracion faltante:** commits `e75e930` (package publication), `daae49d` (package.json), `de300da` (.gitignore, compatibility, task-lifecycle baseline policy) — prerequisito de integracion para Task Cycle tras validacion Developer, **no bloquea** validacion worktree actual, **no autoriza** rebase/merge ahora.

## Prioridades

Reducir contexto y optimizar calidad/token continua siendo prioridad. Explorer
debe pedir evidencia minima suficiente y `repo-packager` debe empaquetar la
solicitud sin decidir suficiencia. Calidad, privacidad y reduccion de retrabajo
preceden a minimizar tokens de forma aislada.

ContextPackager v2 registra `budget_tokens`, tokens entregados, paths y evidence
requested/included/omitted/missing, cobertura, fallback y providers. Cuando no
se inyecta un tokenizer exacto, usa `characters_divided_by_4` y declara que es
una aproximacion frente al tokenizer del modelo objetivo. La cobertura se deriva
solo de evidence requirements, nunca del conteo de tokens.

No existian consumidores de ContextPackager en este repositorio para adaptar;
el core exporta el resultado v2 estructurado para los consumidores posteriores.

## Ownership pendiente

FitFlow aun contiene documentacion generica de AI Core y el backlog/config
machine-readable. No mover automaticamente esos artefactos. Permanecen
`PENDING` para una task con ownership explicito:

- backlog vNext y su sincronizacion con GitHub/TASK;
- publicacion o ubicacion de contracts JSON;
- defaults reutilizables frente a configuracion activa de producto;
- links y roots entre repositorios.

El Project Profile, TASK, runs y configuracion especifica del producto
permanecen en FitFlow.
