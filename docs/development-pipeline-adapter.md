---
document_id: FFAI-ADAPTER-001
status: accepted_pending_implementation
machine_context: true
version: 2.0
updated: 2026-08-18
---

# Adapter del pipeline

## Entrada

El core lee `FitFlow/.ai/config/`, contracts v2, TASK/Run State y Project
Profile. No mantiene copias editables.

## OpenCode adapter

Implementa `AgentRuntimePort`: discovery, permisos, modelo efectivo, toolset,
timeouts, output validation y abort. No controla transiciones ni puede emitir
`DONE`.

La superficie automatizada es OpenCode CLI/headless (`run --format json` o
`serve`); Desktop es solo interfaz manual. GitHub Copilot queda deferred y no
se invoca por codigo. Si se usa, el desarrollador transmite la orden y registra
la intervencion.

## GitHub adapter

Sincroniza Issue/TASK, Project macrostate, PR summary y Actions checks. Debe ser
idempotente y respetar la autoridad local de artifacts del run.

## OpenSpec adapter

Consulta specs/deltas funcionales. No altera TASK, State Machine o ADR.

## Conformance

Probar high-risk block, ownership, output invalido, review independiente,
paid-disabled, retry limits, terminal developer gate y ausencia de secretos.
