---
document_id: FFAI-WP-ORCA-OPERATIONAL-ADAPTER
status: canonical
machine_context: true
version: 1.1
updated: 2026-08-26
owner: fitflow-ai
type: work-package
lifecycle_status: DONE
related:
  - "[[tasks/FF-AI-ORCA-001/TASK]]"
  - "[[tasks/FF-AI-ORCA-001/PLAN]]"
  - "[[architecture/orca-adapter-contract]]"
  - "[[guides/orca-task-cycle]]"
  - "[[architecture/operational-architecture]]"
  - "[[architecture/task-lifecycle]]"
---

# Work Package Plan: Orca Operational Adapter

## Resultado acotado

Establecer a Orca como implementacion operativa actual y reemplazable para
workspace, terminales y coordinacion supervisada, sin convertir su base de datos,
Runs, Tasks, Dispatches o Gates en source of truth de Tecnotron-ai.

## Decisiones

- Tecnotron-ai conserva autoridad sobre contratos, transiciones, ownership,
  aceptacion y evidencia persistida.
- Orca implementa worktrees, sesiones, Runs, Tasks, Dispatches, workers,
  mensajeria y gates mientras aporte valor.
- OpenCode continua como Agent CLI reemplazable.
- Temporal permanece diferido hasta `FF-AI-VNEXT-011+` y no es prerequisito para
  adoptar las capacidades actuales de Orca.
- La adopcion es incremental para nuevas tasks; no migra ni reescribe historial.

## Wave 1 - FF-AI-ORCA-001

Estado: `ACCEPTED`; AC18 y el segundo `REQUEST_CHANGES` estan resueltos. El
permission baseline permite pipelines read-only bounded sin habilitar
composicion write-capable. Integracion y cleanup permanecen pendientes.

Entregables documentales:

1. Contrato draft del adapter Orca.
2. Guia draft de ejecucion del Task Cycle.
3. Mapeo de Orca a State Machine y RunStore.
4. Patron de captura de informes y evidencia.
5. Secuencia de adopcion y politica de limpieza selectiva.

## Secuencia

1. `FF-AI-ORCA-001` fija el baseline operativo.
2. `FF-AI-AGENT-003` se reconcilia y reanuda usando este boundary.
3. WP2 y WP3 de document-governance continuan sin cancelacion y absorben los
   paths nuevos en su trabajo de topologia/jerarquia.
4. WP4-WP6 continuan segun sus gates existentes.

No se permiten writers concurrentes sobre `SOURCE_OF_TRUTH.md`, roadmap u otros
ownership keys compartidos.
