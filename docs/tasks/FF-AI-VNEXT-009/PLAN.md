---
document_id: FFAI-PLAN-009
status: canonical
owner: fitflow-ai
type: plan
version: 2.0
updated: 2026-08-24
machine_context: true
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
  - "[[tasks/FF-AI-VNEXT-009/TASK]]"
---

# PLAN FF-AI-VNEXT-009: Plan de Implementación TDD para Agent MVP Composition Root

## 1. Contexto y Objetivos

El objetivo de esta tarea es implementar un **Agent MVP composition root** delgado y determinista en `src/agent-mvp/` que secuencia los componentes ya aceptados y validados:

```
Router -> Model Resolver/FinOps -> ContextPackager -> Explorer -> Agent Runtime
```

Todos los componentes se inyectan como dependencias (constructor injection o factory). El composition root no contiene lógica de decisión propia; solo orquesta el flujo declarativo paso a paso, propagando resultados o deteniéndose con causa estable en cualquier etapa bloqueada.

## 2. Principio Metodológico: TDD Estricto (Red-Green-Refactor-Verify)

Se aplicará la metodología Test-Driven Development sin excepciones, con una fase **VERIFY** explícita de regresión:

1. **RED:** Escribir un test unitario/de contrato focalizado en una sola conducta y verificar que **falla** por la razón esperada antes de implementar.
2. **GREEN:** Implementar el código mínimo y suficiente para hacer pasar el test.
3. **REFACTOR:** Limpiar y optimizar sin modificar la conducta ni los contratos existentes.
4. **VERIFY:** Ejecutar la suite de regresión completa para garantizar `PASS` en todos los componentes estables.

## 3. Scope y Límites de Escritura

### Modificación/creación permitida

- `src/agent-mvp/**` (composition root, types, factory)
- `tests/core/agent-mvp.test.js`
- `tests/integration/agent-mvp.test.js`
- `docs/tasks/FF-AI-VNEXT-009/TASK.md`
- `docs/tasks/FF-AI-VNEXT-009/PLAN.md`
- `docs/tasks/FF-AI-VNEXT-009/RESULT.md`
- `docs/SOURCE_OF_TRUTH.md` (solo fila de índice para la nueva TASK)
- `docs/current-state.md` (solo evidencia posterior, **sin promover a DONE**)
- `docs/implementation-roadmap.md` (solo estado posterior a aceptacion, **sin promover a DONE**)
- `opencode.json`                              (solo cambio de $schema pre-existente, autorizado para commit eventual del Task Cycle; cambio explícitamente autorizado por el Developer dentro del scope de la task)

### Prohibido Modificar

- `src/router/**`
- `src/model-resolver/**`
- `src/finops/**`
- `src/registries/schemas/**`
- `src/contracts/route.js`, `model-resolution.js`, `run-event.js`, `task.js`, `common.js`, `context-packager.js`, `runtime-identity.js`
- `src/core/state-machine.js`, `routing-evidence.js`, `run-store.js`, `context-packager.js`
- `src/agent-runtime/**`
- `src/explorer/**`
- `package.json`, `package-lock.json`
- `FitFlow/.ai/config/**`

---

## 4. Fases de Ejecución TDD

### Fase 0: Preparación y Verificación de Baseline

**Objetivo:** Confirmar que el baseline observado (`ceae62a`) y el baseline de integración (`tooling`) tienen los componentes 007/008 funcionando, y que los tests de regresión pasan.

1. **VERIFY (Baseline):**
   ```bash
   node --test tests/core/routing.test.js
   node --test tests/contract/contracts.test.js tests/contract/registries.test.js
   node --test tests/core/state-machine.test.js
   node --test tests/core/agent-runtime.test.js
   node --test tests/core/explorer.test.js
   node --test tests/contract/runtime-identity.test.js
   node --test tests/integration/runtime-conformance.test.js
   ```
   Todos deben reportar `PASS`. Si alguno falla, **STOP** y escalar al Developer.

2. **Confirmar git status limpio** y baseline `ceae62a` observado.

3. **Baseline de integracion (`tooling`) — divergencia conocida:** faltan commits `e75e930` (package publication), `daae49d` (package.json), `de300da` (.gitignore, compatibility, task-lifecycle baseline policy). **No bloquea** validacion worktree; prerequisito para Task Cycle tras validacion Developer; **no autoriza** rebase/merge ahora.

---

### Fase 1: Composition Root - Estructura y Factory

**Objetivo:** Definir la estructura modular de `src/agent-mvp/` con factory que valida dependencias inyectadas y retorna `{ execute }`.

1. **RED (Test):** Crear `tests/core/agent-mvp.test.js` — primer test: "factory requiere adapter y contextPackager inyectados".
   - Verificar que `createAgentMvp` exige: `contextPackager` con metodo `package`, `adapter` con metodo `execute`.
   - Verificar fallo del test (`node --test tests/core/agent-mvp.test.js --test-name-pattern="factory requires"`).

2. **GREEN (Código):**
   - Crear `src/agent-mvp/index.js` — `createAgentMvp(deps)` que valida presencia de `contextPackager` y `adapter`, inyecta defaults opcionales para router/modelResolver/explorer/agentRuntime, y retorna `{ execute }`.
   - No hay archivos `types.js` ni `factory.js` separados; toda la logica vive en `index.js`.

3. **REFACTOR & VERIFY:**
   - Confirmar `PASS` en el test de factory.
   - Ejecutar suite de regresión completa (Fase 0 VERIFY) — **debe seguir en PASS**.

---

### Fase 2.5: M1 Boundary Validation - Input Validation en Composition Root (TDD Slice)

**Objetivo:** Implementar validación de entrada fail-closed en `STAGE.INPUT` antes de invocar cualquier dependencia, reutilizando contratos existentes sin duplicar registry-policy.

1. **RED (Tests M1 — 14 tests):** Añadir a `tests/core/agent-mvp.test.js`:
   - **Primeros 9 fallos (boundary implementation):**
     - "M1: non-object routingInput fails closed at input without calling any dependency"
     - "M1: routingInput violating TaskRoutingInput schema fails closed at input"
     - "M1: null roleRegistry fails closed at input"
     - "M1: null modelRegistry fails closed at input"
     - "M1: null finops fails closed at input"
     - "M1: budget_tokens as negative integer fails closed at input"
     - "M1: budget_tokens as non-integer fails closed at input"
     - "M1: requested_paths not an array of strings fails closed at input"
     - "M1: requested_evidence violating EvidenceRequirement contract fails closed at input"
   - **Luego 3 fallos (null/root-array gaps):**
     - "M1: execute(null) fails closed at input without throwing (config resolution after validation)"
     - "M1: requested_paths null fails closed at input"
     - "M1: requested_evidence null fails closed at input"
   - **Tests de control (deben pasar tras GREEN):**
     - "M1: valid input without requested_paths/requested_evidence reaches runtime (absence allowed)"
     - "M1: valid but unsupported registry reaches router owner (no full revalidation at boundary)"
    - Verificar fallos en la primera iteración RED: `node --test tests/core/agent-mvp.test.js --test-name-pattern="M1"` — **9 tests fallan** (los primeros 9 de boundary implementation; RED confirmado para esa iteración).
    - Verificar fallos en la segunda iteración RED (gaps null/root-array): `node --test tests/core/agent-mvp.test.js --test-name-pattern="M1"` — **3 tests fallan** (los 3 de null/root-array gaps; RED confirmado para esa iteración).
    - Los 2 tests de control no fallaron en ninguna iteración RED (estaban diseñados para pasar tras GREEN).

2. **GREEN (Código):**
   - Añadir `STAGE.INPUT = 'input'` a objeto `STAGE` en `src/agent-mvp/index.js`.
   - Implementar `validateAgentMvpInput(input)` que:
     - Valida `input` es objeto no-null (`isNonEmptyObject`).
     - Valida `routingInput` con `TaskRoutingInput.safeParse` (reutiliza contrato Zod existente).
     - Valida `roleRegistry`, `modelRegistry`, `finops` como objetos no-null.
     - Valida `budget_tokens` como integer >= 0.
     - Valida `requested_paths` (si presente) como array de strings.
     - Valida `requested_evidence` (si presente) con `EvidenceRequirement.safeParse` por elemento (reutiliza contrato Zod existente).
     - Retorna array `validation_errors` con objetos `{ field, message, details? }` — determinista, orden estable.
   - En `execute(input)`: llamar `validateAgentMvpInput` **antes** de resolver config y invocar router; si `validationErrors.length > 0`, retornar inmediatamente objeto bloqueado con:
     - `stopped_at: STAGE.INPUT`
     - `reachedRuntime: false`
     - `stages: { route: null, model: null, context: null, explorer: null, runtime: null }`
     - `status: 'BLOCKED'`
     - `reason_code: 'INVALID_AGENT_MVP_INPUT'`
     - `identity: null`
     - `runEvent: null`
     - `cause: 'INVALID_AGENT_MVP_INPUT'`
     - `validation_errors: validationErrors`
   - **No validar** registry schema_version contra policy (eso es responsabilidad del Router/Resolver downstream) — sin duplicación registry-policy.

3. **REFACTOR & VERIFY:**
   - Confirmar **14/14 PASS** en tests M1: `node --test tests/core/agent-mvp.test.js --test-name-pattern="M1"`.
   - Confirmar **24/24 PASS** totales en `tests/core/agent-mvp.test.js`.
   - Ejecutar suite de regresión completa (Fase 0 VERIFY + AC-1 a AC-9) — **debe seguir en PASS**.

---

### Fase 3: Composition Root - Orquestación Paso a Paso

**Objetivo:** Implementar `execute(input)` que secuencia el flujo completo con validación de precondiciones en cada etapa.

1. **RED (Tests):** Añadir a `tests/core/agent-mvp.test.js`:
   - Test: "execute con RouteDecision no ROUTED retorna resultado bloqueado con causa".
   - Test: "execute con ModelResolutionResult no SELECTED retorna resultado bloqueado con causa".
   - Test: "execute con ContextPackagerResult EMPTY y Explorer BLOCK retorna resultado bloqueado".
   - Test: "execute con ContextPackagerResult PARTIAL y Explorer ESCALATE retorna resultado bloqueado".
   - Test: "execute flujo completo con adapters simulados produce RUN_EVENT valido con RuntimeIdentity".
   - Test: "execute propaga error de adapter como FAILED con causa estable".
   - Test: "Agent MVP mapea status/reason_code top-level desde runtime result shape `{ identity, event }`".
   - Verificar fallos.

2. **GREEN (Código):**
   - Implementar `execute(input)` en `src/agent-mvp/index.js` que:
     1. Llama `router.route(input)` → valida `status === 'ROUTED'`
     2. Llama `modelResolver.resolve(...)` → valida `status === 'SELECTED'`
     3. Llama `contextPackager.package(...)` → obtiene `ContextPackagerResult`
     4. Llama `explorer.decide(contextResult)` → valida `action === 'PROCEED'`
     5. Llama `agentRuntime.execute(...)` → obtiene `RUN_EVENT` con `RuntimeIdentity`
     6. Retorna `{ stopped_at, reachedRuntime, stages, status, reason_code, identity, runEvent, cause }`
   - Cada etapa validada; si falla, retorna inmediatamente con `stopped_at` y `cause` (no lanza).

3. **REFACTOR & VERIFY:**
   - Confirmar `PASS` en todos los tests de orquestación.
   - Ejecutar suite de regresión completa — **debe seguir en PASS**.

---

### Fase 4: Integración End-to-End con FF_PROJECT_*

**Objetivo:** Validar que el composition root funciona con configuración real de FitFlow (registries v3, Project Profile) y adapters simulados, sin provider real.

1. **RED (Test):** Crear `tests/integration/agent-mvp.test.js`:
   - Test: "integracion local end-to-end con componentes reales y materializer determinista".
   - Test: "integracion con FF_PROJECT_* carga registries v3, respeta paid_api_enabled:false, completa simulacion declarada" (skip si no hay env vars).
   - Verificar fallos/skip.

2. **GREEN (Código):**
   - Ajustes mínimos en `src/agent-mvp/index.js` si hace falta para aceptar `orchestrator`, `identityArtifact`, `eventMetadata` inyectados via input.
   - **No modificar** loaders de registries ni Project Profile.

3. **REFACTOR & VERIFY:**
   - Confirmar `PASS` en `tests/integration/agent-mvp.test.js` (local test siempre PASS; external test SKIP sin env vars).
   - Ejecutar suite completa de verificación (ver sección 5).

---

### Fase 5: Documentación y Evidence Sync

**Objetivo:** Actualizar índices y evidencia sin promover a DONE.

1. **SOURCE_OF_TRUTH.md:** Añadir fila de índice para `FF-AI-VNEXT-009` en la tabla de documentos.
2. **current-state.md:** Añadir evidencia de validación MVP (comandos y resultados observados) en sección "Evidencia y limitaciones" — **sin cambiar estado de la task a DONE**.
3. **implementation-roadmap.md:** Actualizar estado de `FF-AI-VNEXT-009` a `PENDING_ACCEPTANCE` (no `WORKING`, no `DONE`) — añadir párrafo de implementación conciso.
4. **RESULT.md:** Crear con evidencia exacta observada.

---

## 5. Matriz de Criterios de Aceptación (AC) y Comandos de Validación

| AC | Criterio | Comando de Validación | Test Asociado |
|---|---|---|---|
| **AC-1** | `routing.test.js` PASS sin tocar 007 | `node --test tests/core/routing.test.js` | `tests/core/routing.test.js` |
| **AC-2** | `contracts.test.js` + `registries.test.js` PASS sin romper schemas v3 | `node --test tests/contract/contracts.test.js tests/contract/registries.test.js` | `tests/contract/*.test.js` |
| **AC-3** | `state-machine.test.js` PASS | `node --test tests/core/state-machine.test.js` | `tests/core/state-machine.test.js` |
| **AC-4** | Tests 008 (agent-runtime, explorer, runtime-identity) PASS | `node --test tests/core/agent-runtime.test.js tests/core/explorer.test.js tests/contract/runtime-identity.test.js` | Tests 008 |
| **AC-5** | Composition root orquesta flujo completo con adapters simulados | `node --test tests/core/agent-mvp.test.js` | `tests/core/agent-mvp.test.js` |
| **AC-6** | Integración FF_PROJECT_* respeta paid_api_enabled:false, simulación completa | `node --test tests/integration/agent-mvp.test.js` | `tests/integration/agent-mvp.test.js` |
| **AC-7** | package.json y package-lock.json sin cambios | `git diff package.json package-lock.json` (debe estar vacío) | Verificación Git |
| **AC-8** | Evidencia final no promueve a DONE | Revisión manual: `current-state.md` y `roadmap` sin DONE | Reservado al Developer |

**Suite completa de verificación (ejecutar en orden en cada VERIFY):**

```bash
node --test tests/core/routing.test.js
node --test tests/contract/contracts.test.js tests/contract/registries.test.js
node --test tests/core/state-machine.test.js
node --test tests/core/agent-runtime.test.js
node --test tests/core/explorer.test.js
node --test tests/contract/runtime-identity.test.js
node --test tests/integration/runtime-conformance.test.js
node --test tests/core/agent-mvp.test.js
node --test tests/integration/agent-mvp.test.js
```

---

## 6. Condiciones de Parada (Stop Conditions)

La implementación se detendrá y se escalará inmediatamente al Developer si:

1. Se requiere modificar alguna capa estable de 007/008:
   - `src/router/**`, `src/model-resolver/**`, `src/finops/**`
   - `src/agent-runtime/**`, `src/explorer/**`
   - `src/core/context-packer.js`, `src/core/run-store.js`, `src/core/state-machine.js`
2. Se requiere alterar la configuración activa de FitFlow o realizar llamadas de red/paid API.
3. Se requiere instalar dependencias npm o modificar `package.json`/`package-lock.json`.
4. Se requiere escribir en FitFlow, o sincronizar cross-repo.
5. Surge alguna ambigüedad contractual en los esquemas v2/v3 existentes.
6. Se intenta promover la task a `DONE` sin aceptación explícita del Developer.

---

## 7. Delegation Boundaries (Resumen)

| Rol | Responsabilidad en esta Task |
|-----|---|
| **Coder** | `src/agent-mvp/**`, tests, task docs, SoT row, evidence updates (sin DONE) |
| **Task Lifecycle** | Worktree, branch, base commit (`ceae62a` vs `tooling` divergence), PR, integration, cleanup |
| **Reviewer** | Semantic review independiente si task policy lo requiere |
| **Validator** | Ejecución determinista de comandos de validación arriba |
| **Developer** | Terminal acceptance authority; no DONE sin evidencia + aceptación explícita |