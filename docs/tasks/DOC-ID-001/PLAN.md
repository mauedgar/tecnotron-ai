---
document_id: TEC-PLAN-DOC-ID-001
status: PENDING_REVIEW
owner: tecnotron-ai
type: task-plan
version: 1.2
updated: 2026-08-30
machine_context: true
task_id: DOC-ID-001
repository: tecnotron-ai
integration_branch_parameter: integration_branch
integration_branch: tools
task_branch: feat/DOC-ID-001
task_base: 631679d39499c001fab923da585e665765aad35a
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-DOC-ID-001
execution_status: PENDING_REVIEW
implementation_authorized: true
authorization_source: Developer ruling DOC-ID-001 Correction Cycle 1
task_contract_status: READY
task_contract_execution_status: NOT_STARTED
task_contract_implementation_authorized: false
correction_cycle: 1
correction_authorized: true
current_handoff_state: PENDING_REVIEW
target_terminal_state: PENDING_ACCEPTANCE
primary_targets:
  - AGENTS.md
  - docs/SOURCE_OF_TRUTH.md
  - docs/task-lifecycle.md
discovered_targets:
  - docs/architecture.md
  - docs/operational-architecture.md
  - docs/context-strategy.md
  - docs/current-state.md
  - docs/implementation-roadmap.md
  - docs/compatibility-baseline.md
  - docs/development-pipeline-adapter.md
generated_write_scope: []
execution_resolution:
  model: openai/gpt-5.6-sol
  reasoning_effort: high
  binding: execution_only
  stable_profile_identity: false
ownership:
  terminal_acceptance: Developer
  implementation: Implementer
  independent_review: Reviewer
related:
  - "[[tasks/DOC-ID-001/TASK]]"
---

# PLAN DOC-ID-001

## Estrategia

Aplicar la reparación documental mínima que satisfaga `TASK.md`. Trabajar por
materia: identidad de agente, índice de autoridad y parametrización del
lifecycle. No aprovechar la edición para rediseñar perfiles, formalizar una
política futura ni ampliar el milestone.

La branch, el worktree y `task_base` ya están materializados. La ejecución futura
debe revalidar esa identidad, pero no recrear el entorno ni cambiar la base.

## Correction Cycle 1 — estrategia y discovered targets

El ruling del Developer autoriza corregir exclusivamente
`canonical_identity_chain_inconsistency` y
`task_state_vs_pending_acceptance_contradiction`. El `FAIL` del primer review se
preserva en `REVIEW.md`; esta corrección termina en `PENDING_REVIEW`, término
canónico para una implementación corregida que todavía requiere un nuevo review
independiente.

Antes de editar cualquier target de corrección se cerró este mapa acotado de la
cadena canónica. Los `discovered_targets` reales son exactamente:

```yaml
discovered_targets:
  - docs/architecture.md
  - docs/operational-architecture.md
  - docs/context-strategy.md
  - docs/current-state.md
  - docs/implementation-roadmap.md
  - docs/compatibility-baseline.md
  - docs/development-pipeline-adapter.md
```

| Target | Contradicción que exige corrección mínima |
| --- | --- |
| `docs/architecture.md` | Autoridad citada por F001 con ID, owner, título e identidad de FitFlow-ai. |
| `docs/operational-architecture.md` | Autoridad citada por F001 con owner y ownership del AI Core asignados a FitFlow-ai. |
| `docs/context-strategy.md` | Autoridad citada por F001 con owner e identidad de FitFlow-ai; debe declarar ingreso externo source-agnostic. |
| `docs/current-state.md` | Consumidor canónico enlazado directamente por el índice y Architecture con ID/título de FitFlow-ai. |
| `docs/implementation-roadmap.md` | Consumidor canónico enlazado directamente con ID residual de FitFlow-ai. |
| `docs/compatibility-baseline.md` | Consumidor canónico directo con ID residual y texto que podría presentar `tooling` como baseline vigente, en vez de evidencia histórica. |
| `docs/development-pipeline-adapter.md` | Consumidor canónico directo con ID residual e ingreso externo fijado obligatoriamente a FitFlow. |

No se incorporan documentos históricos, artefactos de TASK anteriores ni
documentos `planned`: sus referencias se conservan cuando están delimitadas como
históricas. La corrección no crea otro índice ni autoridad paralela.

La corrección de estado mantendrá dimensiones ortogonales: contrato TASK,
materialización, implementación, validación, review, aceptación del Developer,
integración, publicación y cierre. `TASK.md` permanece como snapshot contractual
`READY`/`NOT_STARTED`; el ruling posterior autoriza este ciclo sin reescribirlo.
PLAN y RESULT expresarán el estado observado del ciclo, no una aceptación.

## Phase 0: execution gate

1. Confirmar Git top-level, branch `feat/DOC-ID-001`, HEAD y merge-base exactos
   contra `631679d39499c001fab923da585e665765aad35a`.
2. Confirmar que no existen commits posteriores a `task_base` antes de editar.
3. Leer `AGENTS.md`, `docs/SOURCE_OF_TRUTH.md`, `TASK.md`, este PLAN, el Milestone
   Plan y `docs/task-lifecycle.md`.
4. Registrar status previo y hash SHA-256 de `.opencode/package-lock.json`.
5. Confirmar que `implementation_authorized` fue cambiado mediante decisión
   explícita del Developer antes de escribir los primary targets.

Gate: si identidad, autorización o base no coinciden, registrar `FAIL` y detener.

## Phase 1: canonical repair design

1. Derivar de `TASK.md` una matriz de defecto, autoridad competente, texto
   afectado, corrección mínima y requisito verificable.
2. Diseñar `AGENTS.md` como instrucciones propias de Tecnotron-ai, con resolución
   de contexto source-agnostic y sin ownership externo.
3. Diseñar `docs/SOURCE_OF_TRUTH.md` para conservar la tabla de precedencia y
   corregir únicamente identidad, ownership y terminología incompatible.
4. Diseñar `docs/task-lifecycle.md` para que la rama se resuelva mediante
   `integration_branch`; registrar `tools` solo como valor vigente del milestone.
5. Identificar referencias históricas legítimas y evitar convertir una limpieza
   de identidad en reescritura histórica.

Gate: la propuesta cubre `req-1` a `req-12` sin target adicional ni cambio
funcional.

## Phase 2: minimum documentation edit

1. Editar solo los tres primary targets y los siete `discovered_targets`
   registrados antes de su edición.
2. Mantener documentación en español y campos, estados e identificadores en
   inglés.
3. Mantener links relativos y nombres canónicos consistentes.
4. No modificar `docs/tasks/TOF-WO-001/**`.
5. No implementar perfiles, scripts Git, schemas, contratos ejecutables,
   registries ni automatización lifecycle.
6. No incorporar otro target sin registrarlo y verificar primero que satisface
   los criterios acotados del ruling de corrección.

Gate: el diff de implementación contiene únicamente primary targets y
`discovered_targets` declarados.

## Phase 3: deterministic validation and RESULT

1. Inspeccionar los primary targets y la cadena canónica descubierta después de
   la edición.
2. Comparar el diff completo con `task_base` y ejecutar el allowlist de paths.
3. Ejecutar búsquedas deterministas para cada identidad, ownership, branch y
   dependencia prohibida definida por `TASK.md`.
4. Resolver todos los links relativos modificados.
5. Confirmar que `integration_branch` es parametrizable, que `tools` está acotado
   al milestone y que `tooling` no permanece como baseline activa.
6. Confirmar que no cambió `docs/tasks/TOF-WO-001/**`.
7. Ejecutar `git diff --check`.
8. Comparar el hash de `.opencode/package-lock.json` con Phase 0. Si cambió,
   registrar todos los campos de `generated_write_scope` y dejar
   `disposition: PENDING_DEVELOPER_GATE`.
9. Actualizar `RESULT.md` con comandos, salidas, changed paths y matriz
   `req-*`; no convertir una comprobación no ejecutada en `PASS`.

Gate: todas las comprobaciones disponibles tienen estado explícito `PASS`,
`FAIL`, `UNAVAILABLE` o `NOT_RUN`.

## Phase 4: independent review and handoff

1. Entregar al Reviewer independiente `TASK.md`, `PLAN.md`, primary targets,
   `discovered_targets`, `RESULT.md` y el diff completo contra `task_base`.
2. El Reviewer es el único rol autorizado para escribir findings o verdict en
   `REVIEW.md`.
3. Corregir findings bloqueantes solo dentro del scope vigente y repetir la
   validación afectada; cualquier expansión vuelve al Developer gate.
4. Dejar `RESULT.md` en `PENDING_REVIEW` mientras no exista un nuevo review
   independiente `PASS`; solo ese veredicto habilita un handoff posterior
   `PENDING_ACCEPTANCE`.
5. No hacer commit, push, PR, squash, integración, publicación ni cleanup sin
   una decisión posterior y explícita del Developer.

Gate: review independiente `PASS` y evidencia Developer-ready antes de
`PENDING_ACCEPTANCE`, sin inferir aceptación a partir de `PASS`.

## Matriz de validación planificada

| Validación | Tratamiento esperado |
| --- | --- |
| Identidad inequívoca en los tres primary targets | `PASS` requerido |
| Instrucciones residuales y ownership externo | Ausentes dentro del scope |
| Context ingress | Source-agnostic |
| Precedencia documental | Conservada |
| Concepto `integration_branch` | Parametrizable |
| Valor `tools` | Vigente solo para el milestone |
| Baseline activa `tooling` | Ausente |
| Formalización de `audited_task_cycle` | Ausente |
| Diff de `docs/tasks/TOF-WO-001/**` | Vacío |
| Links relativos modificados | Todos resuelven |
| `git diff --check` | `PASS` requerido |
| Generated writes | Registro completo y Developer gate |
| Review independiente | Requerida |
| Tests de producto, build y providers | `NOT_RUN` salvo expansión aprobada |

## Estado de ejecución

```text
PENDING_REVIEW
```

El review independiente del primer ciclo terminó en `FAIL`. El ruling posterior
autoriza Correction Cycle 1, pero no autoriza review, aceptación, commit,
integración, publicación ni cleanup. El resultado corregido queda preparado
para un nuevo review independiente en `PENDING_REVIEW`; no está en
`PENDING_ACCEPTANCE`.
