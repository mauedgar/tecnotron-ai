---
document_id: FFAI-GUIDE-ORCA-TASK-CYCLE
status: canonical
machine_context: false
version: 1.0
updated: 2026-08-26
owner: fitflow-ai
type: guide
related:
  - "[[architecture/orca-adapter-contract]]"
  - "[[architecture/task-lifecycle]]"
  - "[[tasks/FF-AI-ORCA-001/TASK]]"
---

# Orca Task Cycle Execution Guide

Esta guia explica el adapter actual. No reemplaza TASK, PLAN, State Machine,
RunStore, Git ni la decision del Developer.

## 1. Preflight

```bash
orca status --json
orca worktree current --json
orca orchestration run-current --json
git status --short --branch
```

Confirmar repo, base, worktree, dirty state, ownership y stop conditions antes de
crear recursos. Una task de escritura usa worktree Orca/Git acotado. Usar
`--setup run` salvo razon concreta y registrada para `skip`.

### Preflight de permisos

Antes del dispatch, confirmar que el perfil puede ejecutar sin prompt las
lecturas, logs acotados, checks y mensajes lifecycle requeridos por la task. No
resolver el problema con `bash *`: usar patrones concretos por rol.

- Lectura: `pwd`, `ls`, `git status`, `git diff`, `git log`, `git show` y
  herramientas de busqueda/lectura disponibles.
- Checks: permitir solo comandos declarados y sin `--fix`; tratar caches y build
  outputs como posibles writes sujetos a ownership.
- Logs: consultas read-only acotadas y sanitizadas; no indexar secretos ni logs.
- Lifecycle worker: permitir `heartbeat`, `ask` y `worker_done`; mantener gates,
  task admin, cleanup y acceptance fuera del rol.
- Busquedas: combinar patrones con regex, multiples `-e`, globs y limites
  nativos para evitar llamadas repetidas y output innecesario.
- Pipelines: permitir una accion observacional bounded si cada etapa es
  read-only y allowlisted. Prohibir redirecciones, `tee`, `xargs`, substitutions,
  `eval`, shells anidados y flags de mutacion.
- No usar `&&`, `;` u `||` para agrupar acciones independientes ni wrappers
  `echo`; paralelizar llamadas separadas cuando no dependan entre si.

Un permiso interactivo en un worker unattended es un preflight fallido: ajustar
el perfil o usar fallback visible antes de continuar, no esperar hasta timeout.
El preflight comprueba tambien disponibilidad de herramientas y comandos
multi-patron/pipeline representativos del perfil.

## 2. Crear worktree

```bash
orca worktree create \
  --repo id:<repo-id> \
  --name <task-id> \
  --base-branch <integration-base> \
  --setup run \
  --no-parent \
  --comment "<estado breve>" \
  --json
```

Usar child lineage solo para trabajo realmente apilado. `--no-parent` no elige
la base Git.

## 3. Crear Run y DAG

```bash
orca orchestration run-create --objective "<objetivo>" --json
orca orchestration task-create --task-title "discover" --spec "<spec>" --json
orca orchestration task-create --task-title "implement" --spec "<spec>" --deps '["<discover-id>"]' --json
orca orchestration task-create --task-title "validate" --spec "<spec>" --deps '["<implement-id>"]' --json
orca orchestration task-create --task-title "review" --spec "<spec>" --deps '["<validate-id>"]' --json
```

Una Orca Task representa una fase supervisada, no todo el lifecycle canonico.
Mantener DAGs cortos y ownership disjunto para trabajo paralelo.

### Aliases para operador e informes

No presentar IDs opacos aislados salvo al ejecutar comandos. Usar:

| Recurso | Alias |
|---|---|
| Run | `<task-short>/<purpose>` |
| Task | `<task-short>/<phase>` |
| Dispatch | `<task-short>/<phase>@<agent>#<attempt>` |

Configurar `--objective`, `--task-title` y `--display-name` con esos aliases o
su descripcion. Persistir alias e ID juntos en evidencia:

```text
ORCA001/review (task_abcd1234)
ORCA001/review@reviewer#1 (dispatch_efgh5678)
```

## 4. Iniciar worker

```bash
orca orchestration worker-start \
  --task <task-id> \
  --worktree current \
  --agent <agent> \
  --json
```

Usar una terminal fresca en el worktree actual cuando no se necesita otro
checkout. Crear un nuevo worktree solo por aislamiento real o pedido explicito.

## 5. Esperar sin polling manual

```bash
orca orchestration check \
  --wait \
  --types worker_done,escalation,question \
  --timeout-ms 900000 \
  --json
```

Un timeout es checkpoint, no fallo. Procesar el lote FIFO completo, persistir
evidencia y responder preguntas antes de `ack`.

Workers usan `ask`; el coordinador responde con `reply`. Gates se reservan para
decisiones del DAG:

```bash
orca orchestration gate-create \
  --task <task-id> \
  --question "Task: <canonical-task>; Orca Task: <task-alias> (<task-id>); Review: <review-path>. <decision>" \
  --json
orca orchestration gate-resolve --id <gate-id> --resolution "<ruling>" --json
```

La presentacion del gate muestra Task canonica, alias Orca, ID de la Orca Task y
path de `REVIEW.md`. El ID opaco del gate se añade como metadata una vez creado.

## 6. Informe normalizado

El worker finaliza una vez con outcome explicito y, cuando sea posible,
`report_path`:

```bash
orca orchestration send \
  --type worker_done \
  --subject "<estado>" \
  --body "<resumen breve>" \
  --task-id <task-id> \
  --dispatch-id <dispatch-id> \
  --outcome succeeded \
  --files-modified "path/a,path/b" \
  --report-path "<run-root>/<run>/reports/<task>.md" \
  --json
```

Formato recomendado del informe:

```yaml
result: COMPLETE | PARTIAL | BLOCKED | UNAVAILABLE | FAILED
run_alias: ORCA001/adoption-baseline
task_alias: ORCA001/implementation
dispatch_alias: ORCA001/implementation@coder_a#1
files_modified: []
commands: []
validation: []
findings: []
gaps: []
next_gate: null
```

`run-root` se resuelve desde `orchestrator.artifacts.run_root`; la guia no
hardcodea una ubicacion. `worker-read --dispatch <id>` recupera salida acotada aun despues de release.
El informe local es evidencia de run, no `RESULT.md` canonico. Doc Curator solo
lo promueve tras review y aceptacion.

Para una sesion OpenCode que deba conservarse:

```bash
opencode export <session-id> --sanitize
```

### Review visible y supervisable

Antes del Developer gate, abrir `REVIEW.md`, enfocar una sesion reviewer en el
worktree de la task y abrir sus cambios en el editor Orca:

```bash
orca terminal create \
  --worktree path:<task-worktree> \
  --title "<task-short>/review@reviewer#<attempt>" \
  --command "opencode --agent reviewer" \
  --focus \
  --json
orca file open docs/tasks/<task-id>/REVIEW.md --worktree path:<task-worktree> --json
orca file open-changed --mode diff --worktree path:<task-worktree> --json
```

Cuando `worker-start` haya creado la terminal, usar su handle con
`terminal rename` y `terminal switch` en vez de crear otra. Ejecutar
`worker-retain` al terminar el review y conservar el tab hasta que el Developer
resuelva el gate. `REVIEW.md` es el informe estable y se presenta en una pestana
separada; la sesion y el resumen del chat coordinador son evidencia secundaria.

Si orchestration no puede iniciar el worker, `terminal create` es fallback
visible y debe registrarse como `UNAVAILABLE` para conformance, sin fabricar un
Dispatch exitoso.

Persistir `REVIEW.md` mediante un writer autorizado y validar
deterministicamente frontmatter, verdict, findings, scope, links y referencia a
la salida retenida. No pedir al reviewer que revise su propio review. Delegar un
meta-review independiente solo por trigger de riesgo, confianza baja, evidencia
incompleta, contradiccion, policy floor incumplido o pedido del Developer.

La terminal visible no sustituye un permission baseline correcto. Su funcion es
supervision y recuperacion, no pedir al Developer que apruebe lecturas rutinarias.

## 7. Release

Despues de procesar un `worker_done` aceptado y de resolver cualquier gate que
requiera supervision visual:

```bash
orca orchestration worker-release --dispatch <dispatch-id> --json
```

Usar `worker-retain` para reviews sujetos a inspeccion Developer o por solicitud
explicita de debugging. No cerrar terminales manualmente si Orca posee el worker.

## 8. Validacion y Developer gate

El resultado del worker habilita validacion; no habilita `DONE`.

```text
worker_done
-> persistir evidencia
-> validar ownership/diff/tests
-> review independiente y persistencia autorizada de REVIEW.md
-> meta-review solo si existe trigger explicito
-> abrir REVIEW.md + terminal reviewer visible en el worktree
-> PENDING_ACCEPTANCE
-> gate identificado con Task canonica + Orca Task + review_path
-> decision del Developer
```

## 9. Git post-aceptacion

El ciclo feliz debe automatizarse deterministicamente:

```text
verificar branch/worktree
-> verificar ownership
-> git diff --check
-> ejecutar gates configurados
-> confirmar Developer acceptance
-> stage de paths exactos
-> commit
-> push
-> PR/integration
```

El agente interpreta fallos; no decide acceptance ni incluye cambios ajenos.

## 10. Cleanup selectivo

No hacer limpieza total al adoptar Orca.

1. Inventariar `worktree ps`, Runs, tasks, gates y terminales.
2. Clasificar cada recurso: activo, bloqueado, integrado, historico o unknown.
3. Verificar Git antes de retirar un worktree. Incluir metadata Orca/OpenCode
   correlacionada bajo ownership; conservar cualquier cambio no correlacionado
   hasta clasificarlo, sin restaurarlo ni descartarlo silenciosamente.
4. Liberar workers asentados mediante Orca.
5. Eliminar solo worktrees propios cuya integracion/retencion este resuelta.
6. Mantener Runs historicos; no importarlos artificialmente a RunStore.
7. No usar `orchestration reset` durante coordinacion activa.

## 11. Automatizaciones candidatas

- `operator-doctor`: preflight, estado Orca, dirty state, gates y workers.
- `run-report-collector`: recopilar `worker_done`, report_path y evidencia.
- `git-task-cycle`: validacion, stage exacto, commit/push/PR tras acceptance.
- `session-handoff`: export sanitizado y resumen para una nueva sesion.

Crear primero scripts/commands deterministas. Añadir una skill cuando haga falta
explicar intencion, seleccionar evidencia o coordinar varias primitivas.
