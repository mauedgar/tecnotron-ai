---
document_id: FFAI-PLAN-ORCA-001
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-26
task_ref: FFAI-TASK-ORCA-001
work_package: orca-operational-adapter
wave: 1
criticality: medium
owner: fitflow-ai
related:
  - "[[tasks/FF-AI-ORCA-001/TASK]]"
  - "[[architecture/orca-adapter-contract]]"
  - "[[guides/orca-task-cycle]]"
---

# Plan FF-AI-ORCA-001: Orca Operational Adapter Baseline

## Fases

### Fase 0: Inventario

- Verificar runtime Orca, worktree, Run y task.
- Inventariar worktrees, Runs, gates y automations sin mutarlos.
- Confirmar que AGENT003 permanece bloqueada y separada.

### Fase 1: Boundary

- Definir autoridad, inputs, outputs, eventos normalizados e idempotencia.
- Mapear State Machine/RunStore a primitivas Orca.
- Separar supervised orchestration de full handoff.

### Fase 2: Guia

- Documentar el ciclo feliz y recuperaciones.
- Documentar captura de informes y ciclo Git post-aceptacion.
- Documentar adopcion incremental y limpieza selectiva.

### Fase 3: Navegacion y secuencia

- Registrar WP/TASK/PLAN y drafts en SoT.
- Registrar ORCA001 antes de AGENT003 en roadmap.
- Conservar WP2-WP6 sin cancelacion ni claims de ejecucion.

### Fase 4: Validacion

```bash
git diff --check
git diff --name-only
git ls-files --others --exclude-standard
```

- Esperado final: seis nuevos, tres modificados, cero paths prohibidos; el sexto
  archivo es `docs/tasks/FF-AI-ORCA-001/REVIEW.md`.
- `.opencode/package.json` y `.opencode/package-lock.json` son metadata
  administrada por Orca/OpenCode; el ruling final los incluye en ownership,
  validacion y commit.
- Review semantico independiente obligatorio.

### Fase 5: Developer gate

- Developer acepta, rechaza o solicita cambios.
- El gate presenta Task canonica, alias e ID de la Orca Task antes de preguntar.
- El review permanece visible en una terminal del worktree hasta la decision.
- Solo tras aceptacion se promueven contrato/guia de `draft` a `canonical`.
- Integracion, DOC_SYNC y cleanup se ejecutan en fases separadas.

### Fase 6: Request changes y re-review

- Gate `ORCA001/acceptance@developer#1`: `REQUEST_CHANGES`.
- Documentar superficie visual, retencion del reviewer e identidad del gate.
- Revalidar scope y ejecutar review en tab visible `ORCA001/review@reviewer#2`.
- Persistir el veredicto en `REVIEW.md`, abrirlo en Orca y validar
  deterministicamente estructura, scope y trazabilidad.
- No ejecutar meta-review salvo trigger explicito; esta task no activa ninguno.
- Definir permission baseline: lecturas/logs/checks/lifecycle sin prompts,
  mutaciones y administracion denegadas, un comando logico por llamada.
- Delegar su materializacion por perfil a AGENT003; ORCA001 no edita config.
- Crear un nuevo gate solo despues del veredicto visible.

### Fase 7: Segundo request changes

- Gate `ORCA001/acceptance@developer#2`: `REQUEST_CHANGES`.
- Sustituir prohibicion absoluta de pipes por pipelines observacionales bounded.
- Permitir busqueda multi-patron y filtros nativos para reducir latencia/tokens.
- Denegar redirecciones, `tee`, `xargs`, substitutions y mutaciones.
- Revalidar y ejecutar revision dirigida de AC18 antes del gate #3.

## Evidencia inicial

- Inventario Orca: seis worktrees visibles, cuatro Runs, cero gates y cero
  automations al 2026-08-26.
- `FF-AI-AGENT-003`: Orca Task `blocked`; no configuracion global activada.
- State Machine valida transiciones y reserva `DONE` al actor `developer` desde
  `PENDING_ACCEPTANCE`.
- RunStore valida y persiste eventos JSONL/estado; SQLite es una proyeccion.
- Presentacion operativa: Run `ORCA001/adoption-baseline`; Task
  `ORCA001/documentation`. Los IDs Orca opacos permanecen en metadata.

## Evidencia de validacion y review

- `git diff --check`: PASS.
- Scope revisado antes de REVIEW: cinco nuevos + tres modificados.
- Review independiente final: `ACCEPT_WITH_NON_BLOCKING_FINDINGS`; AC1-AC14 PASS.
- LOW corregidos: agrupamiento SoT, alias Run `<task-short>/<purpose>` y tabla
  provider outcome -> normalizado.
- INFO corregido: metadata `updated` de SoT.
- Orca review dispatch: `UNAVAILABLE` por circuit breaker despues de tres
  `agent_prompt_stalled`; el review final se ejecuto como sesion OpenCode
  independiente, no se atribuye a orchestration.
- Estado previo al primer gate: `PENDING_ACCEPTANCE`; drafts no promovidos.
- Estado tras `REQUEST_CHANGES`: `WORKING`; nueva validacion y review pendientes.
- Re-review visible: `ACCEPT_WITH_NON_BLOCKING_FINDINGS`; AC1-AC16 cubiertos.
- Dispatch conformance: `UNAVAILABLE`; terminal visible retenida como fallback.
- Scope final con REVIEW: seis nuevos + tres modificados; validacion pendiente.
- Checks finales: `git diff --check` PASS y campos obligatorios de REVIEW
  presentes. Estado: `PENDING_ACCEPTANCE`; segundo gate pendiente.
- Revision dirigida AC18: `PASS`; LOW sobre bounded output sin pipes e INFO
  sobre caches/outputs delegados a AGENT003.
- Confirmacion AC17: `PASS`; escalamiento por cinco triggers y sin recursion.
- Segundo gate: `REQUEST_CHANGES`; finding LOW sobre pipes promovido a requisito.
- Estado actual: `WORKING`; AC18 y validacion final pendientes.

### Fase 8: cierre de acceptance

- AC18 revalidado: `PASS`.
- Review final: `ACCEPT`.
- Developer ruling directo: `ACCEPTED`; no se inventa gate Orca.
- Siguiente estado: integracion, `DOC_SYNC` y cleanup deterministas.
