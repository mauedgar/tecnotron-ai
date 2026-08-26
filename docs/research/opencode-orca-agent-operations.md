---
document_id: FFAI-RESEARCH-OPENCODE-ORCA-AGENT-OPERATIONS
status: research
machine_context: false
version: 1.0
updated: 2026-08-26
owner: fitflow-ai
type: research
related:
  - "[[tasks/FF-AI-AGENT-003/TASK]]"
  - "[[implementation-roadmap]]"
---

# OpenCode and Orca Agent Operations

Este documento conserva observaciones para evaluacion. No introduce
arquitectura, estado funcional ni compromisos de roadmap.

## OpenCode observado

Version local: `1.18.23`.

Capacidades actualmente subutilizadas:

- `opencode export <session> --sanitize` e `import`: conservar o trasladar una
  charla sin leer directamente la base SQLite.
- `--fork`: continuar una sesion sin contaminar el hilo original.
- `opencode run`: tareas no interactivas y automatizables.
- `serve`, `web` y `attach`: separar UI y proceso del agente.
- `acp` y `mcp`: superficies de integracion estandar.
- `agent create/list`: discovery y administracion de perfiles.
- `stats --models --tools --project`: evidencia de uso, costo y herramientas.
- `github` y `pr`: flujo GitHub/PR desde el CLI.
- agentes, commands, skills, plugins y references globales/proyecto.
- compaction y export sanitizado para cambios de sesion controlados.

## Orca observado

Capacidades actualmente subutilizadas:

- `orca worktree create/current/set/rm`: ownership de worktrees; debe preferirse
  sobre `git worktree` directo cuando Orca administra el workspace.
- `orca agent-context --json`: schema machine-readable para agentes.
- Skills versionadas: `orca skills list/get/install --dry-run`.
- Orchestration Runs, tasks, dispatch, workers, inbox y decision gates.
- Automations programadas; al inicio de AGENT-003 no habia ninguna.
- Terminales supervisadas, lectura incremental y espera `tui-idle`.
- Project host setups y environments remotos.
- Browser, computer use y emuladores como capacidades de plataforma, no de AI
  Core.

## Perfiles exclusivos del Developer

`prompt_generator` reduce improvisacion al producir prompts con objetivo,
inputs, scope, prohibiciones, evidencia, stop conditions y formato de salida.
Debe ser read-only y no ejecutar el prompt generado.

`developer_superuser` centraliza coordinacion y delegacion manual. "Superuser"
no significa auto-aprobacion: conserva asks, denies, Task Lifecycle, worktrees y
aceptacion humana. OpenCode no aporta autenticacion por perfil; `mode: primary`
solo evita su uso como subagente y expresa la intencion operativa.

## Protocolo auditable diferido

La charla sobre preflight/postflight, guardrails, evidencia append-only y
recuperacion de fallas queda aqui como input de investigacion. No se agrega a
current-state ni se implementa durante AGENT-003. Se reevalua despues de
`FF-AI-VNEXT-011+`, con Temporal disponible o descartado mediante evidencia.
