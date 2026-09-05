---
status: canonical
owner: tecnotron-ai
type: reference
updated: 2026-09-04
related:
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Source Of Truth de Tecnotron-ai

Este es el índice determinista de navegación y precedencia de la documentación
canónica de Tecnotron-ai, un sistema de desarrollo independiente. Los índices
derivados, paquetes generados, caches, sesiones de agentes, metadata de
workspace y vistas de Obsidian no son source of truth.

| Documento | Autoridad |
| --- | --- |
| [Architecture](architecture.md) | Invariantes arquitectónicos estables del AI Core y frontera del repositorio. |
| [Operational Architecture](operational-architecture.md) | Responsabilidades operativas, implementaciones reemplazables y fronteras del control plane. |
| [Task Lifecycle](task-lifecycle.md) | Lifecycle lógico, política de worktrees y contratos de aceptación, integración y cleanup. |
| [Context Strategy](context-strategy.md) | Objetivo de contexto, política de retrieval, telemetría y gates de evaluación. |
| [Current State](current-state.md) | Solo realidad de implementación confirmada y evidencia de validación. |
| [Implementation Roadmap](implementation-roadmap.md) | Secuencia y trabajo de implementación planificado. |
| [Milestone tecnotron-operational-foundation-v1](milestones/tecnotron-operational-foundation-v1/PLAN.md) | Planificación aceptada del milestone en baseline `41088a4`; su `integration_branch` vigente es `tools` y los milestones aceptados se promueven a `main`. |
| [WP-000 Cross-repo Project Profile Baseline](work-packages/wp-000-cross-repo-project-profile-baseline/PLAN.md) | Predecesor completado de Project Profile obligatorio, inyección de entorno y conformance cross-repo; integrado en FitFlow `develop` y Tecnotron-ai `tools`. |
| [WP-001 Operational Profile Contracts SPEC](work-packages/wp-001-operational-profile-contracts/SPEC.md) | Comportamiento y fronteras aceptadas de `tecnotron-agent-profile/v1`, incluidos nueve perfiles, permisos deny-by-default y separación de modelo. |
| [WP-001 Operational Profile Contracts Plan](work-packages/wp-001-operational-profile-contracts/PLAN.md) | Solución técnica y gates de implementación derivados de la SPEC aceptada. |
| [WP-002 Deterministic OpenCode Launchers SPEC](work-packages/wp-002-deterministic-opencode-launchers/SPEC.md) | Comportamiento y fronteras aceptadas de `tecnotron-agent-launch/v1`; el gate `WP-002_SPEC_ACCEPTANCE` está satisfecho sin crear autoridad de implementación. |
| [WP-002 Deterministic OpenCode Launchers Plan](work-packages/wp-002-deterministic-opencode-launchers/PLAN.md) | Solución técnica y descomposición aceptadas; `TOF-W1-002` está materializada y `READY`, con autoridad de implementación creada y ejecución todavía no iniciada. |
| [Task TOF-W1-002](tasks/TOF-W1-002/TASK.md) | Contrato vigente para `WP002-WU-00` y `WP002-WU-01`; `task_base` resuelto en `tools@03651b806da290ae256dfaa6bf924feef0487327`, rama/worktree resueltos, autoridad creada e implementación no iniciada. |
| [Task TOF-W1-001](tasks/TOF-W1-001/TASK.md) | Contrato de scope histórico de `tecnotron-agent-profile/v1`; validación `PASS` (11/11, 19/19 y 154/154), review independiente `PASS`, aceptación del Developer e integración en `tools@d7e1e7e4784cae455782b38797c199e380173804`. Publicación, promoción a `main` y cleanup: `NOT_RUN`. |
| [Task TOF-W0-001](tasks/TOF-W0-001/TASK.md) | Contrato de scope histórico para Project Profile de FitFlow y planificación de configuración activa. |
| [Task TOF-W0-002](tasks/TOF-W0-002/TASK.md) | Contrato de scope histórico para resolución de proyecto, inyección de entorno y planificación de conformance cross-repo. |
| [Task FF-AI-VNEXT-008](tasks/FF-AI-VNEXT-008/TASK.md) | Definición canónica, ownership, criterios de aceptación y frontera de scope para conformance de `Explorer` y Agent Runtime. |
| [Task FF-AI-VNEXT-009](tasks/FF-AI-VNEXT-009/TASK.md) | Definición canónica, ownership, criterios de aceptación y frontera de scope para composition root del Agent MVP y sincronización documental. |
| [Compatibility Baseline](compatibility-baseline.md) | Compatibilidad observada de herramientas y evidencia reproducible del baseline. |
| [Development Pipeline Adapter](development-pipeline-adapter.md) | Frontera canónica del adapter y su estado vigente. |
| Role registry v3 | IDs de roles vigentes y política de routing determinista fijo. La versión v2 no está soportada. El schema ejecutable es [`src/registries/schemas/roles.js`](../src/registries/schemas/roles.js); el `roles.yaml` activo pertenece a la configuración del proyecto que lo declara. |
| Model registry v3 | Elegibilidad explícita de modelos y metadata de selección determinista. La versión v2 no está soportada. El schema ejecutable es [`src/registries/schemas/models.js`](../src/registries/schemas/models.js); el `models.yaml` activo pertenece a la configuración del proyecto que lo declara. |

Cuando los documentos discrepen, se resuelve por la autoridad de la materia
indicada en esta tabla. Current State no promueve arquitectura planificada a
implementación; Roadmap no reemplaza invariantes arquitectónicos; el role
registry ejecutable controla los IDs concretos de roles. El `Developer` es el
orquestador real y conserva la aceptación terminal.

Las autoridades vigentes de arquitectura, operación, lifecycle, contexto,
estado, roadmap, compatibilidad y adapters describen Tecnotron-ai. Las entradas
de FitFlow identifican exclusivamente un producto consumidor o evidencia
cross-repo/histórica delimitada; no transfieren identidad, ownership ni
autoridad canónica a FitFlow.

Para `tecnotron-operational-foundation-v1`, el parámetro `integration_branch`
tiene el valor vigente `tools`; `main` es el destino de promoción de un
milestone aceptado y `tooling` es histórico. `tools` no es una constante
universal del Task Lifecycle. Este ruling específico del milestone no reactiva
ni reescribe TASKs anteriores al baseline
`41088a413d06ed1d58d63d92320e38d4b44b86ea`.
