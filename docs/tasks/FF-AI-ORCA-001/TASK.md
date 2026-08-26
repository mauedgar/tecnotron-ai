---
document_id: FFAI-TASK-ORCA-001
status: canonical
machine_context: true
version: 1.2
updated: 2026-08-26
owner: fitflow-ai
type: workflow
criticality: medium
risk: low
priority: P1
work_package: orca-operational-adapter
wave: 1
validation: PASS
review_verdict: ACCEPT
developer_acceptance: ACCEPTED
integration:
  status: INTEGRATED
  target: tooling
  revision: ae118431712a297447b09fbc9eecde795ea7588b
  pull_request: https://github.com/mauedgar/tecnotron-ai/pull/22
lifecycle_status: DONE
orchestration:
  run_alias: ORCA001/adoption-baseline
  run_id: run_08ee9964ca9d
  task_alias: ORCA001/documentation
  task_id: task_6443fa97d31f
  review_task_alias: ORCA001/review
  review_task_id: task_8d882687805d
  review_dispatch_alias: ORCA001/review@reviewer#2
  review_dispatch_id: ctx_a7916a083b52
  review_terminal: term_ddae75fd-40ea-4f6f-924a-1290685fcde4
  review_session: ses_fc39eff18ffeZEiPf2AEerWYzv
  review_dispatch_conformance: UNAVAILABLE
ownership_keys:
  - "doc:docs/work-packages/orca-operational-adapter/PLAN.md"
  - "doc:docs/tasks/FF-AI-ORCA-001/TASK.md"
  - "doc:docs/tasks/FF-AI-ORCA-001/PLAN.md"
  - "doc:docs/tasks/FF-AI-ORCA-001/REVIEW.md"
  - "doc:docs/tasks/FF-AI-ORCA-001/VALIDATION.md"
  - "doc:docs/tasks/FF-AI-ORCA-001/RESULT.md"
  - "doc:docs/architecture/orca-adapter-contract.md"
  - "doc:docs/guides/orca-task-cycle.md"
  - "doc:docs/SOURCE_OF_TRUTH.md"
  - "doc:docs/current-state.md"
  - "doc:docs/implementation-roadmap.md"
  - "config:.opencode/package.json"
  - "config:.opencode/package-lock.json"
related:
  - "[[tasks/FF-AI-ORCA-001/PLAN]]"
  - "[[work-packages/orca-operational-adapter/PLAN]]"
  - "[[architecture/orca-adapter-contract]]"
  - "[[guides/orca-task-cycle]]"
---

# Task FF-AI-ORCA-001: Orca Operational Adapter Baseline

## Objetivo

Definir el boundary y la guia de ejecucion para usar Orca como control plane
operativo actual, manteniendo la State Machine, RunStore, TASK/PLAN, Git y la
aceptacion del Developer como autoridades independientes.

## Task Start

- Base: `tooling@141174bbef6ae68af37b225714b4f3dafabe66d0`.
- Worktree: `FF-AI-ORCA-001`, administrado por Orca.
- Branch: `mauedgar/FF-AI-ORCA-001`.
- Setup omitido por ser docs-only y no requerir dependencias.
- Orca Run: `ORCA001/adoption-baseline` (`run_08ee9964ca9d`).
- Orca Task: `ORCA001/documentation` (`task_6443fa97d31f`).

## Criterios de aceptacion

1. El contrato separa State Machine/RunStore de Orca y define a Orca como
   adapter reemplazable.
2. Un Run de Tecnotron se correlaciona con un Orca Run, sin adoptar su ID como
   identidad canonica.
3. Cada fase supervisada usa una Orca Task/Dispatch separada; `worker_done` es
   evidencia y no equivale a `DONE`.
4. Preguntas de workers usan `ask/reply`; decisiones del coordinador usan gates;
   la aceptacion terminal permanece en el Developer.
5. La guia documenta preflight, worktree, Run, DAG, dispatch, wait, report,
   validation, gate, integration y cleanup.
6. El consumo de mensajes persiste evidencia antes de `ack` y exige
   idempotencia para replay.
7. Los informes usan `report_path` y un formato normalizado; una salida de
   terminal no se promueve directamente a RESULT canonico.
8. El ciclo Git posterior a aceptacion se reserva a mecanismos deterministas.
9. La adopcion aplica a nuevas tasks; no migra Runs, worktrees ni TASK historicas.
10. La limpieza es selectiva, posterior a inventario y nunca elimina trabajo
    activo, evidencia canonica o recursos de otros repositorios.
11. `FF-AI-AGENT-003` queda serialmente dependiente de este baseline y no se
    descarta; WP2-WP6 permanecen planificados.
12. Los documentos de arquitectura y guia se promueven de `draft` a `canonical`
    solo tras review y aceptacion del Developer.
13. Scope final: ocho documentos nuevos y cinco modificados; ningun cambio en
    codigo, tests, perfiles OpenCode, registries o FitFlow. Los dos manifests
    `.opencode` administrados por Orca forman parte del ownership explicito.
14. `git diff --check` PASS y todos los paths pertenecen a ownership.
15. `REVIEW.md` se presenta en una pestana Orca separada; la terminal reviewer
    permanece visible y retenida dentro del worktree hasta la decision.
16. El gate informa Task canonica, alias e ID de Orca Task y `review_path`.
17. No hay meta-review por defecto; un segundo reviewer requiere trigger
    explicito de riesgo, confianza, evidencia, contradiccion o Developer.
18. El contrato permite lecturas, logs acotados, checks, lifecycle, busquedas
    multi-patron y pipelines observacionales bounded sin prompts; deniega
    mutacion/admin y composicion con capacidad de escritura.

## Stop Conditions

- Se requiere implementar un adapter, plugin, skill o script ejecutable.
- Se intenta limpiar o migrar estado historico.
- Se afirma que Orca reemplaza la State Machine, RunStore o Task Lifecycle.
- Se modifica AGENT003 desde este worktree.
- Aparece un path fuera de ownership.

## Delegacion

- Architect: boundary y contrato documental.
- Doc Curator: guia, metadata y navegacion dentro del ownership.
- Reviewer: revision independiente read-only.
- Developer: aceptacion y promocion de drafts.

## Developer Request Changes

- Gate `ORCA001/acceptance@developer#1` (`gate_fcbdd8ac0979`):
  `REQUEST_CHANGES`.
- Requisito 1: presentar review e informe en una ventana Orca separada dentro
  del worktree para supervision directa antes de aceptar.
- Requisito 2: todo gate debe informar a que Task canonica y Orca Task pertenece.
- El review previo se conserva como evidencia historica; los cambios requieren
  nueva validacion y re-review visible.

## Evidencia del primer Developer gate

- `git diff --check`: PASS.
- Scope antes de persistir REVIEW: cinco nuevos + tres modificados. En ese gate
  historico `.opencode/package*.json` se excluyo bajo la policy anterior; el
  ruling final los incorpora como metadata administrada.
- Review semantico independiente mediante `opencode run --agent reviewer`:
  `ACCEPT_WITH_NON_BLOCKING_FINDINGS`; AC1-AC14 PASS.
- Findings LOW corregidos: alias Run generico y mapeo provider outcome.
- Dispatch Orca de review: `UNAVAILABLE` tras tres `agent_prompt_stalled` y
  circuit breaker; no se reporta como PASS.
- Contrato y guia permanecen `draft` hasta decision del Developer.
- `REVIEW.md` se persiste como `draft`, se abre en Orca y se verifica antes del
  segundo gate mediante checks deterministas; el scope final pasa a seis nuevos
  + tres modificados. Esta task no activa meta-review: riesgo bajo, evidencia
  documental determinista y ausencia de findings bloqueantes.
- Validacion final: `git diff --check` PASS; seis nuevos + tres modificados;
  `REVIEW.md` abierto en Orca y terminal reviewer retenida.
- Developer follow-up: AGENT003 debe materializar allowlists de lectura, checks y
  lifecycle por perfil; no habilitar shell global ni pedir aprobacion para
  observacion rutinaria.
- Revision dirigida: AC17 PASS y AC18 PASS; findings LOW/INFO persistidos en
  `REVIEW.md`, sin meta-review ni nuevos bloqueantes.

## Segundo Developer Request Changes

- Gate `ORCA001/acceptance@developer#2` (`gate_36d28960472f`):
  `REQUEST_CHANGES`.
- La prohibicion absoluta de pipes puede aumentar round-trips, latencia y tokens.
- Permitir multi-pattern search y pipelines read-only bounded cuando cada etapa
  este allowlisted; mantener prohibida toda composicion write-capable.
- Estado historico en gate #2: `WORKING`; validacion y revision dirigida de AC18
  pendientes en ese momento.

## Resolucion final del Developer

- AC18 esta implementado en contrato y guia: multi-pattern y pipelines
  observacionales bounded estan permitidos solo cuando cada etapa es read-only y
  allowlisted; redirecciones y composicion write-capable permanecen denegadas.
- Revision dirigida: `PASS`; review independiente final: `ACCEPT`; validacion
  determinista: `PASS`.
- El Developer acepta la task y autoriza integracion/cleanup el 2026-08-26 en el
  chat coordinador. No se fabrica un Orca gate ni un ID provider para ese ruling.
- Integracion, `DOC_SYNC` y `DONE` permanecen pendientes hasta merge verificable.
