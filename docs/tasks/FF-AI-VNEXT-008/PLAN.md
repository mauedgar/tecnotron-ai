---
document_id: FFAI-PLAN-008
status: canonical
owner: fitflow-ai
type: plan
version: 1.0
updated: 2026-08-22
machine_context: true
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[tasks/FF-AI-VNEXT-008/TASK]]"
---

# PLAN FF-AI-VNEXT-008: Plan de Implementación TDD para Explorer y Agent Runtime Conformance

## 1. Contexto y Objetivos

El objetivo de esta tarea es implementar la conformance mínima y determinista de **Explorer** y **Agent Runtime** en `FitFlow-ai`.
El runtime consume una `RouteDecision` con estado `'ROUTED'` y un `ModelResolutionResult` con estado `'SELECTED'`, ejecuta mediante un adapter controlado o una simulación explícitamente declarada, y emite evidencia de resultado con identidad efectiva confirmada (`IDENTITY_CONFIRMED`, `SIMULATION_DECLARED`) o indisponibilidad normalizada (`UNAVAILABLE`).

## 2. Principio Metodológico: TDD Estricto (Red-Green-Refactor)

Se aplicará la metodología Test-Driven Development sin excepciones:
1. **RED:** Escribir un test unitario/de contrato focalizado en una sola conducta y verificar que **falla** por la razón esperada antes de implementar.
2. **GREEN:** Implementar el código mínimo y suficiente para hacer pasar el test.
3. **REFACTOR:** Limpiar y optimizar sin modificar la conducta ni los contratos existentes.
4. **VERIFY:** Ejecutar la suite de regresión previa para garantizar `PASS` en los componentes estables (`routing.test.js`, `contracts.test.js`, `registries.test.js`, `state-machine.test.js`).

## 3. Scope y Límites de Escritura

### Modificación/creación permitida
- `src/agent-runtime/**`
- `src/explorer/**`
- `src/contracts/runtime-identity.js`
- `src/contracts/index.js` (solo export aditivo de `runtimeIdentity`)
- `src/contracts/index.mjs` (solo export aditivo)
- `src/contracts/run-state.js` (solo extensión opcional backward-compatible de historial si resulta imprescindible)
- `tests/core/agent-runtime.test.js`
- `tests/core/explorer.test.js`
- `tests/contract/runtime-identity.test.js`
- `tests/integration/runtime-conformance.test.js`
- `docs/tasks/FF-AI-VNEXT-008/PLAN.md`
- `docs/tasks/FF-AI-VNEXT-008/RESULT.md` (fase posterior)
- `docs/tasks/FF-AI-VNEXT-008/REVIEW.md` (fase posterior)

### Prohibido Modificar
- `src/router/**`
- `src/model-resolver/**`
- `src/finops/**`
- `src/registries/schemas/**`
- `src/contracts/route.js`, `model-resolution.js`, `run-event.js`, `task.js`, `common.js`
- `src/core/state-machine.js`, `routing-evidence.js`, `run-store.js`, `context-packager.js`
- `package.json`, `package-lock.json`
- `FitFlow/.ai/config/**`

---

## 4. Fases de Ejecución TDD

### Fase 1: Contrato Aditivo `fitflow-runtime-identity/v1`

**Objetivo:** Definir el esquema Zod y validadores para la identidad efectiva observada tras ejecución o simulación declarada.

1. **RED (Test):** Crear `tests/contract/runtime-identity.test.js`.
   - Validar estructura de `RuntimeIdentity` (`schema_version`, `status`, `reason_code`, `simulated`, `proposal`, `effective`, `details`).
   - Validar reason codes autorizados: `IDENTITY_CONFIRMED`, `SIMULATION_DECLARED`, `PROPOSAL_MISMATCH`, `RUNTIME_UNAVAILABLE`, `ADAPTER_UNAVAILABLE`, `EXECUTION_FAILED`.
   - Verificar fallo del test (`node --test tests/contract/runtime-identity.test.js`).
2. **GREEN (Código):**
   - Crear `src/contracts/runtime-identity.js`.
   - Registrar export aditivo en `src/contracts/index.js` e `index.mjs`.
3. **VERIFY & REFACTOR:**
   - Confirmar `PASS` en `tests/contract/runtime-identity.test.js` y `tests/contract/contracts.test.js`.

---

### Fase 2: Explorer Conformance (Decisión Determinista de Contexto)

**Objetivo:** Implementar la lógica determinista de Explorer para evaluar la suficiencia del contexto empaquetado (`COMPLETE`, `PARTIAL`, `EMPTY`) y decidir si proceder, escalar o bloquear sin invocar modelos.

1. **RED (Test):** Crear `tests/core/explorer.test.js`.
   - Casos: `COMPLETE` → evaluar suficiencia y proceder; `PARTIAL` → escalar/bloquear deterministamente según reglas de cobertura; `EMPTY` → bloquear deterministamente sin invocar modelos (AC-8).
   - Verificar fallo del test.
2. **GREEN (Código):**
   - Implementar `src/explorer/index.js` (u orquestador interno de Explorer).
3. **VERIFY & REFACTOR:**
   - Confirmar `PASS` en `tests/core/explorer.test.js`.

---

### Fase 3: Agent Runtime Port & Adapter Inyectado (Simulado / Controlado)

**Objetivo:** Consumir `RouteDecision` (`status === 'ROUTED'`) y `ModelResolutionResult` (`status === 'SELECTED'`), ejecutar mediante adapter inyectado y generar `RUN_EVENT` con `EXECUTION_COMPLETED` e identidad efectiva (`RuntimeIdentity`).

Corrección post-review: el Runtime recibe un Orchestrator v2 explícitamente inyectado, valida la transición con el StateMachine canónico antes de ejecutar y normaliza fallos del adapter de forma fail-closed.

1. **RED (Test):** Crear `tests/core/agent-runtime.test.js`.
   - Pruebas unitarias para:
     - Entrada no calificada (p.ej. `ROUTED` faltante o `NO_ELIGIBLE_MODEL`) → no ejecuta, registra causa (AC-5).
      - Ejecución simulada inyectada → emite `SIMULATION_DECLARED` y nunca reporta inferencia real (AC-4, AC-9).
     - Identidad observada distinta de propuesta → mantiene ambas y emite `PROPOSAL_MISMATCH` (AC-6).
     - Adapter no disponible → produce identidad `UNAVAILABLE` con causa estable (AC-7).
     - Evidencia producida valida contra schema `RUN_EVENT` v2 y referencia artifacts válidos (AC-10).
2. **GREEN (Código):**
   - Implementar `src/agent-runtime/index.js` (o estructura modular en `src/agent-runtime/`).
3. **VERIFY & REFACTOR:**
   - Confirmar `PASS` en `tests/core/agent-runtime.test.js`.

---

### Fase 4: Integración Conformance

**Objetivo:** Validar la simulación declarada en integración sin provider real ni paid API.

1. **RED (Test):** Crear `tests/integration/runtime-conformance.test.js`.
   - Cargar registries v3 activos únicamente mediante `FF_PROJECT_ROOT`, `FF_PROJECT_PROFILE`, `FF_AI_CORE_ROOT` o un `configDir` explícitamente inyectado por el test.
   - Verificar que `paid_api_enabled: false` se respeta.
   - Completar simulación declarada sin dependencias externas (AC-9).
   - Reportar `UNAVAILABLE`/`SKIP`, nunca `PASS`, cuando no exista una entrada de resolución explícita.
2. **GREEN (Código):**
   - Ajustes mínimos necesarios en adapters/loaders si aplica.
3. **VERIFY & REFACTOR:**
   - Ejecutar la suite completa de verificación:
     ```bash
     node --test tests/core/routing.test.js
     node --test tests/contract/contracts.test.js tests/contract/registries.test.js
     node --test tests/core/state-machine.test.js
     node --test tests/core/agent-runtime.test.js
     node --test tests/core/explorer.test.js
     node --test tests/contract/runtime-identity.test.js
     node --test tests/integration/runtime-conformance.test.js
     ```

---

## 5. Matriz de Criterios de Aceptación (AC)

| AC | Criterio | Test asociado |
|---|---|---|
| **AC-1** | `routing.test.js` `PASS` sin cambiar Router/Resolver/FinOps | `tests/core/routing.test.js` |
| **AC-2** | `contracts.test.js` y `registries.test.js` `PASS` sin romper schemas v3 | `tests/contract/contracts.test.js` |
| **AC-3** | `state-machine.test.js` `PASS` | `tests/core/state-machine.test.js` |
| **AC-4** | Route routed + proposal selected con adapter simulado produce identidad válida | `tests/core/agent-runtime.test.js` |
| **AC-5** | Sin ejecución ni simulación no se emite identidad efectiva | `tests/core/agent-runtime.test.js` |
| **AC-6** | Propuesta !== Efectiva registra ambas y `PROPOSAL_MISMATCH` | `tests/core/agent-runtime.test.js` |
| **AC-7** | Adapter no disponible produce `UNAVAILABLE` con causa estable | `tests/core/agent-runtime.test.js` |
| **AC-8** | Explorer decide deterministamente sobre COMPLETE/PARTIAL/EMPTY sin llamar modelos | `tests/core/explorer.test.js` |
| **AC-9** | Integración con `FF_PROJECT_*` respeta `paid_api_enabled: false` y completa simulación | `tests/integration/runtime-conformance.test.js` |
| **AC-10** | Todo `EXECUTION_COMPLETED` emite evento v2 válido y artifact refs | `tests/core/agent-runtime.test.js` |
| **AC-11** | `package.json` y `package-lock.json` no sufren modificaciones | Verificación de Git status |
| **AC-12** | La evidencia final no promueve a `DONE` | Reservado al Developer |

---

## 6. Condiciones de Parada (Stop Conditions)

La implementación se detendrá y se escalará inmediatamente al Developer si:
1. Se requiere modificar alguna capa estable de 007 (`src/router/`, `src/model-resolver/`, `src/finops/`).
2. Se requiere alterar la configuración activa de FitFlow o realizar llamadas de red/paid API.
3. Se requiere instalar dependencias npm o modificar `package.json`.
4. Surge alguna ambigüedad contractual en los esquemas v2/v3 existentes.
