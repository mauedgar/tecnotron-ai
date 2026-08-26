---
document_id: FFAI-ARCH-ORCA-ADAPTER-CONTRACT
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-26
owner: fitflow-ai
type: architecture
related:
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[tasks/FF-AI-ORCA-001/TASK]]"
  - "[[guides/orca-task-cycle]]"
---

# Orca Operational Adapter Contract

## Authority

Orca is the current implementation of workspace/session control and supervised
coordination. It is replaceable and is not source of truth.

Tecnotron-ai remains authoritative for:

- task identity and ownership;
- valid state transitions;
- role and permission ceilings;
- evidence schemas and persisted run history;
- Developer acceptance and terminal promotion.

Orca may implement:

- worktree and terminal lifecycle;
- orchestration Run namespaces;
- phase Tasks and dependency DAGs;
- Dispatch/worker supervision;
- ask/reply messaging and decision gates;
- bounded output retrieval and worker release.

## Correlation Model

| Tecnotron-ai | Orca | Rule |
|---|---|---|
| `task_id` | task title/spec metadata | Tecnotron ID remains canonical |
| `run_id` | Orca Run ID | correlation only |
| lifecycle phase | Orca Task | one phase per Task |
| execution attempt | Dispatch | one active writer per ownership key |
| evidence event | message/worker receipt | normalize before transition |
| Developer decision | resolved gate + persisted ruling | gate alone is not acceptance |

Orca Task status is operational. It must not be copied directly into
`lifecycle_status`.

## Technical Aliases

Los IDs Orca son opacos y se reservan para comandos, correlacion y auditoria.
Informes y handoffs usan aliases tecnicos deterministas:

```text
Run:      <task-short>/<purpose>
Task:     <task-short>/<phase>
Dispatch: <task-short>/<phase>@<agent>#<attempt>
```

Ejemplos:

```text
ORCA001/adoption-baseline
ORCA001/review
ORCA001/review@reviewer#1
```

Un informe puede añadir el ID opaco entre parentesis. `adoption-baseline` es el
purpose de ORCA001, no un sufijo universal. El alias mejora
legibilidad pero no reemplaza identidad canonica ni provider ID.

## Normalized Events

The future adapter should emit a provider-neutral envelope:

```yaml
schema: fitflow-orchestration-event/v1
event_id: stable-idempotency-key
task_id: FF-AI-...
run_id: fitflow-run-id
phase: EXECUTING
attempt: 1
kind: WORKER_DONE | QUESTION | ESCALATION | GATE_RESOLVED | WORKER_FAILED
outcome: COMPLETE | PARTIAL | BLOCKED | UNAVAILABLE | FAILED
provider:
  type: orca
  run_alias: ORCA001/adoption-baseline
  run_id: run_...
  task_alias: ORCA001/implementation
  task_id: task_...
  dispatch_alias: ORCA001/implementation@coder_a#1
  dispatch_id: null
evidence:
  report_path: null
  files_modified: []
  commands: []
```

Provider IDs remain evidence metadata. Replacement of Orca must not change the
canonical task or run identity.

Provider outcomes se normalizan antes de entrar a la State Machine:

| Orca/provider | Normalizado |
|---|---|
| `succeeded` con evidencia completa | `COMPLETE` |
| `succeeded` con gaps declarados | `PARTIAL` |
| pregunta/gate pendiente | `BLOCKED` |
| capability no disponible | `UNAVAILABLE` |
| `failed` | `FAILED` |

El adapter decide `COMPLETE` frente a `PARTIAL` mediante evidencia validada, no
solo a partir del string `succeeded`.

## Transition Rule

1. Receive or poll Orca delivery.
2. Persist the raw receipt/event in RunStore.
3. Deduplicate by stable event/delivery identity.
4. Normalize and validate the event schema.
5. Evaluate `StateMachine.canTransition`.
6. Persist the new state and projection.
7. Acknowledge the Orca delivery.

Crash before acknowledgment causes replay, not duplicate effects. A
`worker_done` never grants `DONE`; final transition still requires Developer as
actor from `PENDING_ACCEPTANCE`.

## Handoff Versus Supervision

- Full handoff transfers ownership and is not monitored through an Orca DAG.
- Supervised orchestration creates Run, Task, Dispatch and lifecycle messages.
- Task Cycle phases use supervision when coordinator state and evidence matter.
- Lightweight prompts use terminal/worktree handoff without fabricated
  orchestration provenance.

## Visual Supervision And Gate Identity

El review que precede al Developer gate produce un `REVIEW.md` y lo abre en una
pestana visible del worktree. Una terminal dedicada muestra el proceso del
reviewer: su titulo usa el dispatch alias, por ejemplo
`ORCA001/review@reviewer#2`, y se retiene hasta resolver el gate. El archivo es
el informe estable; la terminal permite inspeccionar proceso y conversacion. El
Developer debe acceder a ambos desde Orca sin depender del chat coordinador.

Orca Desktop aporta sidebar por worktree, tabs/panes persistentes, sesiones de
agente y editor de diff. `orchestration inbox` agrega mensajes operativos, pero
no se trata como chat canonico unificado ni sustituye RunStore.

Toda presentacion de gate incluye identidad suficiente antes de la pregunta:

```yaml
canonical_task: FF-AI-ORCA-001
orca_task_alias: ORCA001/acceptance
orca_task_id: task_...
gate_alias: ORCA001/acceptance@developer#2
gate_id: gate_...
review_path: docs/tasks/FF-AI-ORCA-001/REVIEW.md
decision: ACCEPT | REQUEST_CHANGES
```

El alias es la etiqueta principal para el operador; los IDs opacos permanecen
como metadata. Una resolucion visual o CLI sigue sin equivaler por si sola a
promocion canonica: la decision se persiste y valida antes de transicionar.

### Meta-review condicionado

No se ejecuta un review del reviewer por defecto. La persistencia de
`REVIEW.md` se valida con schema, campos obligatorios, links, scope y trazabilidad
contra la salida retenida. Un segundo reviewer se activa solo cuando exista al
menos uno de estos triggers:

- task de riesgo alto o criticidad alta;
- reviewer declara confianza baja o evidencia/coverage incompleta;
- findings contradictorios, verdict inconsistente o disputa entre roles;
- el modelo no satisface el policy floor futuro del Model Registry;
- solicitud explicita del Developer.

El segundo reviewer emite una decision de escalamiento acotada; no inicia una
cadena recursiva de reviews. El Developer decide sobre findings y gaps visibles,
pero no debe repetir la auditoria tecnica.

## Agent Permission Baseline

Los perfiles de agentes aplican deny-by-default a mutaciones, no a observacion.
El baseline minimo separa cuatro clases:

| Clase | Regla |
|---|---|
| Lectura/discovery | Permitir comandos acotados como `pwd`, `ls`, `git status`, `git diff`, `git log`, `git show`, busqueda y lectura de archivos. |
| Logs/diagnostico | Permitir consultas read-only acotadas, por ejemplo `docker ps` y `docker compose logs`; sanitizar secretos y no persistir/indexar logs completos. |
| Checks | Permitir por task los comandos declarados de test, lint, typecheck y build sin flags de fix; reconocer que pueden crear caches/outputs y validarlos contra ownership. |
| Mutacion | Denegar por defecto install/update, fix, write, delete, reset, push, publish y cambios fuera de ownership. |

Un worker supervisado recibe ademas la capability minima para `heartbeat`,
`ask` y `worker_done`. No recibe `gate-resolve`, `task-update`, cleanup ni
aceptacion Developer. Si la capability esta revocada, reporta una vez en la
terminal retenida y deja conformance `UNAVAILABLE` sin retry loop.

Cada invocacion shell conserva un solo proposito logico. Busquedas multi-patron
y pipelines de observacion bounded pertenecen a una misma accion y estan
permitidos cuando todas sus etapas son read-only y allowlisted. Preferir filtros
nativos (`--limit`, `-n`, `--glob`, multiples `-e`) y herramientas dedicadas
`Read`/`Grep`/`Glob` para reducir round-trips, output y tokens.

Una pipeline observacional:

- acota su output y no accede a secretos ni logs completos;
- no usa redireccion `>`/`>>`, `tee`, `xargs`, substitutions, backticks,
  `eval`, `sh -c` ni flags de mutacion;
- no mezcla etapas que el perfil no permita por separado.

`&&`, `;` y `||` siguen prohibidos para encadenar acciones independientes; los
wrappers `echo` no deben convertir una lectura simple en un compound command.
El permission matcher evalua todas las etapas y una no permitida bloquea la
accion completa. `FF-AI-AGENT-003` debe materializar y probar este baseline por
perfil con allowlists concretas, sin conceder `bash *`.

## Deferred Implementation

This document defines a boundary only. Adapter code, event ingestion, skills,
Git automation and Temporal integration require separate tasks and ownership.
