---
document_id: FFAI-ADAPTER-001
status: canonical
machine_context: true
version: 3.0
updated: 2026-08-21
---

# Adapter del pipeline

## Entrada

El core consume configuracion, contracts v2, TASK/Run State y Project Profile
desde `<FitFlow-root>`. No mantiene copias editables. La resolucion portable de
ese root y los adapters de entrada pertenecen a `FF-AI-VNEXT-005`.

## Agent Runtime

`AgentRuntimePort` define discovery, permisos, modelo efectivo, toolset,
timeouts, output validation y abort. Ningun Agent CLI controla transiciones ni
puede emitir `DONE`.

OpenCode funciona como runtime actual bajo Orca y es intercambiable. Otros Agent
CLI pueden ejecutarse bajo el mismo control plane. El adapter y su conformance
suite permanecen pendientes; disponibilidad del CLI no equivale a conformance.

## GitHub adapter

Sincroniza Issue/TASK, Project macrostate, PR summary y Actions checks. Debe ser
idempotente y respetar la autoridad de los artifacts del run en FitFlow. Esta
implementacion forma parte de `FF-AI-VNEXT-005` y no existe aun.

## OpenSpec adapter

Consulta specs/deltas funcionales. No altera TASK, State Machine o ADR.
Tambien permanece pendiente en `FF-AI-VNEXT-005`.

## Conformance

Probar high-risk block, ownership, output invalido, review independiente,
paid-disabled, retry limits, terminal developer gate y ausencia de secretos.

Orca y Git worktree son infraestructura externa: Orca controla workspace,
sesion, restore e hibernation; el worktree aisla la escritura. El adapter no
debe recrear ni asumir esas responsabilidades.
