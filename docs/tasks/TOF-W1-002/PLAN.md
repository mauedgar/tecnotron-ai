---
document_id: TOF-PLAN-W1-002
status: DONE
materialization_status: MATERIALIZED
owner: tecnotron-ai
type: task-plan
version: 1.3
updated: 2026-09-05
machine_context: true
operation_id: TOF-W1-002-TASK-MATERIALIZATION-01
task_id: TOF-W1-002
task_base: 03651b806da290ae256dfaa6bf924feef0487327
integration_branch: tools
branch_management: TASK_LIFECYCLE
requested_branch: feat/TOF-W1-002
effective_branch: mauedgar/feat-TOF-W1-002
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-TOF-W1-002
execution_status: IMPLEMENTED
implementation_status: IMPLEMENTED
validation_status: PASS
review_status: PASS
review_handoff_status: COMPLETE
developer_acceptance: ACCEPTED
integration_status: INTEGRATED
closure_status: DONE
cleanup_status: NOT_RUN
integration_pr: 28
integration_commit: 5b9cf94116d66dd09143d0b5a458c4babfc89cf4
implementation_authorized: true
implementation_started: true
immutable_implementation_commit: a744d0746c50f4d411006cf99923c2f64e467797
immutable_implementation_tree: 9bd7ab9db4bbe35425139e9c7e41c32ade3ee268
review_operation_id: TOF-W1-002-INDEPENDENT-REVIEW-01
lifecycle_operation_id: TOF-W1-002-REVIEW-EVIDENCE-01
developer_acceptance_operation_id: TOF-W1-002-DEVELOPER-ACCEPTANCE-01
complexity: high
criticality: high
scope_fit: FIT
context_budget:
  class: large
  policy: accepted_SPEC_plus_one_launcher_slice
  expansion_limit: 2
ownership:
  lifecycle: Task Lifecycle
  competent_owner: Implementer
  implementation: Implementer
  environment_validation: deterministic Validator
  validation: deterministic Validator
  independent_review: Reviewer
  terminal_acceptance: Developer
related:
  - "[[tasks/TOF-W1-002/TASK]]"
  - "[[work-packages/wp-002-deterministic-opencode-launchers/SPEC]]"
  - "[[work-packages/wp-002-deterministic-opencode-launchers/PLAN]]"
---

# PLAN TOF-W1-002

## Estrategia

Ejecutar dos unidades secuenciales. WU-00 establece una precondicion ambiental
reproducible sin escribir. Solo su `PASS`, incluido el cierre verificable de la
limitacion `yaml`, habilita TDD para WU-01. WU-01 deriva la representacion
OpenCode project-scoped desde el contrato portable y prueba estaticamente que no
amplia permisos.

## Phase 0: materializacion operativa

1. Confirmar TASK `READY`, `implementation_authorized: true` y parent artifacts.
2. Confirmar `tools@03651b806da290ae256dfaa6bf924feef0487327`
   como `task_base` resuelto por el contrato canonico de inicio.
3. Confirmar la rama `mauedgar/feat-TOF-W1-002` y el unico worktree exclusivo
   resuelto en `C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-TOF-W1-002`.
4. Confirmar worktree limpio, staging vacio y ownership del Implementer.
5. Leer `AGENTS.md`, Project Profile activo, Source of Truth, SPEC, WP PLAN,
   TASK y este PLAN.
6. Comparar todos los paths previstos con el write scope exacto.

Gate: cualquier coordenada pendiente, drift o write fuera de scope detiene antes
de WU-00. La existencia de esta TASK no sustituye el worktree task-scoped.
El worktree representa el snapshot de implementacion; Task Lifecycle transporta
por separado la autoridad TASK vigente desde el estado competente de integracion.

## Phase 1: WU-00 environment preflight

1. Resolver y registrar paths/versions exactos de Node, npm/package manager,
   Git y OpenCode, sin actor invocation.
2. Inspeccionar `package.json`, lockfile y reglas de compatibilidad aplicables.
3. Comparar dependencias directas y lockfile; ejecutar probes locales read-only
   de resolucion, incluidos `yaml`, sin install ni network assumption.
4. Identificar tests baseline y WP-001 relevantes y trazar su aplicabilidad.
5. Ejecutar los tests utilizables; preservar `UNAVAILABLE` donde corresponda.
6. Clasificar cada causa exactamente como `DECLARED_NOT_BOOTSTRAPPED`,
   `UNDECLARED_DEPENDENCY`, `MANIFEST_LOCKFILE_INCONSISTENCY`,
   `OBSOLETE_OR_NON_APPLICABLE_TEST`, `RUNTIME_OR_TOOL_INCOMPATIBILITY` u
   `OTHER_BLOCKING_ENVIRONMENT_DRIFT`.
7. Inventariar solo el command/config surface de OpenCode necesario para la
   proyeccion estatica, sin declarar soporte runtime.
8. Verificar cero mutacion de source, tests, config, manifest, lockfile y Git.

Gate: si la causa exclusiva es `DECLARED_NOT_BOOTSTRAPPED` y se prueban todas
las condiciones de bootstrap de la TASK, ejecutar mediante el mecanismo de
ambiente autorizado el bootstrap canonico reproducible desde el lockfile,
confirmar diff vacio de manifest/lockfile y reejecutar tests afectados. Para
cualquier otra causa o duda, detener para disposition del Developer.

## Phase 2: WU-01 RED

1. Cargar el registry mediante `loadAgentProfiles` y obtener los nueve IDs,
   required inputs y permisos aceptados.
2. Crear fixtures de discovery/proyeccion esperadas por cada ID.
3. Escribir el test focalizado que exige una correspondencia uno a uno entre
   registry y `.opencode/agents`.
4. Añadir casos negativos para unknown/legacy/tenth profile, model/role binding,
   write broadening, shell, delegation/subagents, tools/skills/MCP/plugins,
   paid API, global config y unknown permission mappings.
5. Ejecutar RED y demostrar que falla por ausencia de la proyeccion o su
   enforcement, no por ambiente ni dependencia.

Gate: RED esperado y WU-00 en `PASS`; de lo contrario no implementar perfiles.

## Phase 3: WU-01 GREEN minimo

1. Crear un artefacto project-scoped por cada ID aceptado y ningun otro.
2. Derivar identidad, responsabilidad, inputs y techo de permisos solo desde
   `tecnotron-agent-profile/v1`.
3. Proyectar explicitamente deny-by-default, shell denied, delegation/subagents
   denied, `subagent_depth: 0`, paid API disabled y cero capacidades adicionales
   para allowlists vacias.
4. Preservar las dos clases writer y los siete perfiles read-only sin incorporar
   autoridad dinamica ni scope efectivo de una futura invocacion.
5. Excluir role/model/provider/runtime fields y cualquier implicit model binding.
6. Ejecutar el test focalizado hasta GREEN sin tocar config global/personal.

Gate: nueve perfiles exactos, proyeccion monotonicamente restrictiva y cero
default permisivo.

## Phase 4: refactor y validacion

1. Reducir duplicacion solo cuando no convierta los artefactos en una segunda
   fuente semantica ni expanda el write scope.
2. Ejecutar tests focalizados positivos y negativos.
3. Reejecutar contratos WP-001 relevantes y baseline regression aplicable.
4. Producir la matriz de nueve perfiles y cada dimension estatica de permiso.
5. Verificar diff allowlist, staging vacio, ausencia de config global/personal
   mutada y `git diff --check`.
6. Registrar cada resultado como `PASS`, `FAIL`, `NOT_RUN` o `UNAVAILABLE`; un
   mandatory `UNAVAILABLE` no habilita handoff final.

Gate: todos los acceptance criteria obligatorios de la TASK en `PASS` y ninguna
mutacion fuera de scope.

## Phase 5: review independiente y handoff

1. Task Lifecycle fija un snapshot inmutable posterior a implementacion y
   validacion.
2. Entregar SPEC, WP PLAN, TASK, task PLAN, source profile contract, los nueve
   artefactos, fixtures, tests, matrices, evidencia ambiental y diff a un
   Reviewer independiente.
3. El Reviewer permanece read-only, no es el Implementer y emite un external
   review report versionado con `PASS` o `FAIL`.
4. Task Lifecycle o evidence recorder puede materializar `RESULT.md` y luego
   `REVIEW.md` desde reportes existentes.
5. Un `FAIL` vuelve a correccion y revalidacion; un `PASS` habilita solamente el
   gate del Developer.
6. No aceptar, integrar, publicar, promover a `DONE` ni ejecutar cleanup por
   inferencia.

## Matriz de validacion

| Validacion | Resultado requerido |
| --- | --- |
| Parent SPEC y WP PLAN identities | `PASS` |
| Task base, branch y worktree | `PASS` antes de WU-00 |
| Tool versions observed | `PASS` |
| Manifest/lockfile consistency | `PASS` |
| Dependency-state classification | `PASS` |
| `yaml` limitation | resuelta y tests reejecutados, o stop competente |
| Baseline y WP-001 contracts relevantes | `PASS` |
| Exactly nine accepted IDs | `PASS` |
| Static deny-by-default projection | `PASS` |
| No shell/delegation/subagents/model binding/paid API | `PASS` |
| Global/personal config untouched | `PASS` |
| WU-02+ absent from diff | `PASS` |
| Diff allowlist y staging vacio | `PASS` |
| `git diff --check` | `PASS` |
| Independent review | requerido despues del snapshot validado |

## Stop conditions

Aplican todas las stop conditions de la TASK. En particular, detener ante un
bootstrap no demostrablemente elegible, una proyeccion OpenCode permisiva o no
demostrable, cualquier necesidad de WU-02+, cambio de contrato, config global,
model research/replacement, otro repositorio o path no autorizado.

## Estado

```text
ACCEPTED
MATERIALIZED
IMPLEMENTATION_IMPLEMENTED
VALIDATION_PASS
REVIEW_PASS
REVIEW_HANDOFF_COMPLETE
DEVELOPER_ACCEPTANCE_ACCEPTED
INTEGRATION_INTEGRATED
CLOSURE_DONE
CLEANUP_NOT_RUN
NEXT_ACTION_CLEANUP_TOF_W1_002
NEXT_OWNER_TASK_LIFECYCLE
```
