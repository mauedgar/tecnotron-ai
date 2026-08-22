---
document_id: FFAI-ROADMAP-001
status: canonical
machine_context: true
version: 2.1
updated: 2026-08-21
owner: fitflow-ai
type: roadmap
related:
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
---

# Secuencia de implementacion

| Orden | Task | Entregable | Estado |
| ---: | --- | --- | --- |
| 0 | `FF-AI-VNEXT-001` | baseline vNext | `DONE` |
| 1 | `FF-AI-VNEXT-002` | doctor y compatibilidad sin installs | `DONE` |
| 2 | `FF-AI-VNEXT-003` | contracts Zod y registries loaders | `DONE` |
| 3 | `FF-AI-VNEXT-004` | State Machine, events JSONL y SQLite | `DONE` |
| 4 | `FF-AI-VNEXT-005` | Project Profile y adapters GitHub/OpenSpec | `NEXT`; implementacion en worktree, pendiente aceptacion |
| 5 | `FF-AI-VNEXT-006` | ContextPackager v2 | `READY` |
| 6 | `FF-AI-VNEXT-007` | Router, Model Resolver y FinOps | `BACKLOG` |
| 7 | `FF-AI-VNEXT-008` | Explorer y Agent Runtime conformance | `BACKLOG` |
| 8 | `FF-AI-VNEXT-009` | Agent MVP y documentation sync | `BACKLOG` |
| 9 | `FF-AI-VNEXT-010` | fitness functions y Workflow Observer | `BACKLOG` |
| 10 | `FF-AI-VNEXT-011+` | retrieval, MCP y Temporal tras sus gates | `PLANNED` |

`FF-AI-VNEXT-006` fue reactivada: la pausa causada por los defectos de
`repo-packager` dejo de aplicar al integrarse la reparacion en `tooling`. Esto no
declara la conformance ContextPackager v2 implementada.

`FF-AI-VNEXT-005` posee Project Profile, descubrimiento y resolucion portable de
roots. `FF-AI-VNEXT-006` consume el root resuelto a traves del contrato
correspondiente y no implementa un resolver alternativo ni hardcodea una
topologia cross-repo; por ello su trabajo de conformance sigue a la entrega de
ese contrato.

## Orden futuro por gates

Los IDs existentes `FF-AI-VNEXT-007+` no se renumeran desde esta documentacion.
La asignacion de esos IDs y cualquier cambio de scope requiere decision del
`Developer`. La colocacion propuesta para trabajo futuro es:

1. Infraestructura y contratos portables de proyecto, repositorio y root
   (`FF-AI-VNEXT-005`).
2. Telemetria minima determinista de contexto: tokens delivered/budget, paths y
   evidence requested/included/omitted, coverage, fallback y provider.
3. ContextPackager v2 (`FF-AI-VNEXT-006`).
4. Piloto de Code Intelligence adapter y benchmark A/B contra la seleccion
   actual graph/PageRank de `repo-packager`.
5. Simplificacion de `repo-packager` solo si el benchmark demuestra que procede.
6. Adopcion de Ragas, Promptfoo u otro framework solo si persiste un gap medido;
   preferir comparacion determinista cuando existan evidence IDs o scope
   esperado.
7. Automatizacion determinista de Task Lifecycle despues de los contratos
   portables y en el stage que el Developer asigne al backlog.

Codebase-Memory es un candidato de piloto, no source of truth. La existencia
del graph/PageRank actual no autoriza su retiro antes del benchmark.

## Autoridad y pendientes cross-repo

Este documento es la Source of Truth del roadmap de AI Core para
desarrolladores. El backlog machine-readable que hoy vive en FitFlow conserva
estados stale para `002-004` y `006`; no se mueve ni se edita desde esta task.
Su ownership y sincronizacion quedan `PENDING` hasta resolver TaskStore,
Project Profile y roots en `FF-AI-VNEXT-005`.

Tambien quedan `PENDING`:

- mover o publicar contratos JSON desde una unica fuente sin romper callers;
- separar defaults reutilizables de la configuracion activa de FitFlow;
- retirar duplicados de AI Core en FitFlow mediante una task con ownership;
- resolver paths entre repos sin asumir una ubicacion fisica.

`project-profile.yaml`, TASK, runs y configuracion activa permanecen en FitFlow.
