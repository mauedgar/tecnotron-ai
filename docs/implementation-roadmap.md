---
document_id: FFAI-ROADMAP-001
status: canonical
machine_context: true
version: 2.3
updated: 2026-08-22
---

# Secuencia de implementacion

| Orden | Task | Entregable | Estado |
| ---: | --- | --- | --- |
| 0 | `FF-AI-VNEXT-001` | baseline vNext | `DONE` |
| 1 | `FF-AI-VNEXT-002` | doctor y compatibilidad sin installs | `DONE` |
| 2 | `FF-AI-VNEXT-003` | contracts Zod y registries loaders | `DONE` |
| 3 | `FF-AI-VNEXT-004` | State Machine, events JSONL y SQLite | `DONE` |
| 4 | `FF-AI-VNEXT-005` | Project Profile y adapters GitHub/OpenSpec | `DONE` |
| 5 | `FF-AI-VNEXT-006` | ContextPackager v2 | `DONE` |
| 6 | `FF-AI-VNEXT-007` | Router, Model Resolver y FinOps | `DONE` |
| 7 | `FF-AI-VNEXT-008` | Explorer y Agent Runtime conformance | `DONE` |
| 8 | `FF-AI-VNEXT-009` | Agent MVP y documentation sync | `BACKLOG` |
| 9 | `FF-AI-VNEXT-010` | fitness functions y Workflow Observer | `BACKLOG` |
| 10 | `FF-AI-VNEXT-011+` | retrieval, MCP y Temporal tras sus gates | `PLANNED` |

`FF-AI-VNEXT-006` fue implementada: la reparacion de `repo-packager` se integra
en `tooling` y el ContextPackager v2 cumple el contrato de telemetria
determinista. La conformance v2 queda validada en la PR mergeada.

La implementacion de `006` define `ContextPackagerResult` y telemetria
determinista como contrato estructurado. ContextPackager coordina materializers,
presupuesto, suficiencia y fallback hacia una fuente primaria; `repo-packager`
solo materializa la evidencia solicitada y mantiene sus exclusiones sensibles.
El estado `DONE` de la tabla queda confirmado tras la revision y merge del
desarrollador.

`FF-AI-VNEXT-007` implementa un MVP cerrado: Task aporta solo campos
declarativos; Role Registry v3 deriva rol y requisitos; Model Registry v3,
FinOps v1 y un orden fijo producen una propuesta determinista. Los registries
v2 son unsupported. No existe ejecucion de provider/model/runtime en esta task.
Agent Runtime y effective identity permanecen en `FF-AI-VNEXT-008`. El estado
`DONE` queda confirmado por el desarrollador tras la revision independiente;
los hallazgos menores de loader y exports ESM quedan como deuda no bloqueante.

`FF-AI-VNEXT-005` y `FF-AI-VNEXT-006` pueden ejecutarse en paralelo con
ownership de archivos y contratos no superpuesto. `005` posee Project Profile,
descubrimiento y resolucion portable de roots. `006` consume el root resuelto a
traves del contrato correspondiente y no implementa un resolver alternativo ni
hardcodea una topologia cross-repo.

## Autoridad y pendientes cross-repo

Este documento es la Source of Truth del roadmap de AI Core para
desarrolladores. El backlog machine-readable que hoy vive en FitFlow conserva
estados stale para `002-004` y `006`; no se mueve ni se edita desde esta task.
Su ownership y sincronizacion quedan `PENDING` hasta resolver TaskStore,
sin ampliar el scope de Router/Resolver/FinOps.

Tambien quedan `PENDING`:

- mover o publicar contratos JSON desde una unica fuente sin romper callers;
- separar defaults reutilizables de la configuracion activa de FitFlow;
- retirar duplicados de AI Core en FitFlow mediante una task con ownership;
- resolver paths entre repos sin asumir una ubicacion fisica.

`project-profile.yaml`, TASK, runs y configuracion activa permanecen en FitFlow.
