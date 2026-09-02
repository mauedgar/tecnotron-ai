---
document_id: TOF-PLAN-W1-001
status: PLANNED
owner: tecnotron-ai
type: task-plan
version: 1.0
updated: 2026-09-01
machine_context: true
task_id: TOF-W1-001
task_base: bb2bfe7892b2e3c87297e445bb16279c4630385c
execution_status: EXECUTED
implementation_authorized: true
complexity: high
criticality: high
scope_fit: FIT
context_budget:
  class: medium
  policy: accepted_SPEC_plus_one_execution_unit
  expansion_limit: 2
dependencies:
  - TASK gates resolved
  - fresh tools task_base
  - dedicated worktree
ownership:
  implementation: Implementer
  validation: deterministic Validator
  independent_review: Reviewer
  terminal_acceptance: Developer
related:
  - "[[tasks/TOF-W1-001/TASK]]"
  - "[[work-packages/wp-001-operational-profile-contracts/SPEC]]"
---

# PLAN TOF-W1-001

## Estrategia

Aplicar TDD para materializar el contrato nuevo sin adaptar consumidores legacy.
Trabajar una slice a la vez: primero schema/fixtures, después registry/loader y
por último compatibilidad/documentación. Ninguna fase amplía la TASK.

## Phase 0: execution gate

1. Confirmar aceptación e integración de la materialización.
2. Resolver `task_base` fresco desde `tools`.
3. Confirmar branch `feat/TOF-W1-001`, worktree exclusivo y status limpio.
4. Leer `AGENTS.md`, Source of Truth, SPEC, TASK y este PLAN.
5. Comparar `implementer_write_scope`, `doc_curator_write_scope` y
   `lifecycle_evidence_scope` con todos los paths previstos.

Gate satisfecho: el Developer emitió el ruling explícito requerido y la
implementación autorizada ya fue ejecutada.

## Phase 1: RED del contrato

1. Crear la fixture válida esperada.
2. Crear casos negativos para conjunto exacto, writers, permisos, web,
   delegation, identidad de modelo, legacy IDs, tools/skills y strictness.
3. Escribir tests para `AC-PROFILE-001` a `AC-PROFILE-017`.
4. Ejecutar el test focalizado y registrar fallos esperados.

Gate: el RED falla por ausencia del contrato o de su enforcement, no por
dependencias, paths externos o configuración de producto.

## Phase 2: GREEN mínimo

1. Implementar `agent-profiles.js` bajo schemas con enums cerrados e invariantes.
2. Materializar `agent-profiles.yaml` con los nueve perfiles exactos.
3. Implementar el loader dedicado reutilizando lectura YAML existente.
4. Exportar únicamente la superficie necesaria desde registries.
5. Mantener allowlists de tools/skills vacías y deny-by-default.

Gate: el test focalizado pasa sin cambiar schemas o consumidores legacy.

## Phase 3: refactor y compatibilidad

1. Eliminar duplicación local solo dentro del write scope.
2. Confirmar errores estables y orden determinista de issues.
3. Ejecutar regresión de registries legacy.
4. Verificar por diff que Router, Model Resolver, Agent MVP, runtime, FinOps y
   configuración OpenCode permanecen sin cambios.

Gate: cero alias, fallback o migración de `coder_*`.

## Phase 4: documentación y evidencia

1. El Developer inicia una ejecución separada de `doc_curator`, sin delegation.
2. `doc_curator` materializa solo la documentación contractual autorizada y
   emite `documentation_report` externo.
3. `implementer` emite `implementation_report` externo; Validator emite sus
   resultados sin filesystem write.
4. Task Lifecycle o un evidence recorder determinista materializa `RESULT.md`
   desde esos reportes.
5. Registrar checks dinámicos de WP-002 y provider/model execution como
   `NOT_RUN`.
6. Validar enlaces, diff allowlist, no staging y `git diff --check`.

Gate: evidencia completa con estados permitidos.

## Phase 5: review y handoff

1. Entregar SPEC, TASK, PLAN, RESULT, registry, schema, fixtures, tests y diff a
   un Reviewer independiente.
2. El Reviewer permanece read-only y emite un external review report con
   findings/verdict fuera del repositorio.
3. Task Lifecycle o el evidence recorder materializa `REVIEW.md` solo después
   del handoff del reporte externo.
4. Un `FAIL` vuelve a corrección y revalidación; un `PASS` habilita solamente el
   gate del Developer.
5. No hacer commit, push, PR, merge, integración, publicación o cleanup sin
   decisión posterior.

## Stop conditions

Aplican todas las stop conditions de la TASK y la SPEC.

Stop if the selected schema cannot express deny-by-default permissions without ambiguity.

## Matriz de validación

| Validación | Tratamiento esperado |
| --- | --- |
| RED focalizado | `PASS` como evidencia de fallo esperado |
| Contract tests positivos y negativos | `PASS` requerido |
| Regresión de registries | `PASS` requerido |
| Suite completa disponible | `PASS`, o `UNAVAILABLE` con causa verificable |
| Diff allowlist | `PASS` requerido |
| Staging | vacío |
| `git diff --check` | `PASS` requerido |
| Runtime web authorization de WP-002 | `NOT_RUN` |
| Provider/model execution | `NOT_RUN` y prohibido |
| Review independiente | requerido antes de aceptación |

## Estado

```text
EXECUTED
READY_FOR_INDEPENDENT_REVIEW
```
