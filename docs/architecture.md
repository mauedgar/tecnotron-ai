---
document_id: TEC-ARCH-001
status: canonical
machine_context: true
version: 3.2
updated: 2026-08-30
owner: tecnotron-ai
type: architecture
related:
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[SOURCE_OF_TRUTH]]"
---

# Arquitectura de Tecnotron-ai

## Invariantes

```text
Tecnotron-ai es un sistema de desarrollo independiente y reutilizable.
Los productos consumidores, como FitFlow, permanecen independientes y no
adquieren una dependencia de producto hacia Tecnotron-ai.
```

- Los contratos portables de proyecto, repositorio y root preceden a cualquier
  integracion especifica de herramienta.
- Git worktree es el limite de aislamiento para tareas de escritura; los
  worktrees de task son normalmente efimeros.
- Orca es el control plane actual de workspace y sesion, y es reemplazable.
- OpenCode es el Agent Runtime preferido actual, y es intercambiable.
- Los providers de modelo solo aportan inferencia.
- Las implementaciones de tooling no definen arquitectura ni source of truth.
- Las decisiones y validaciones usan deterministic-first cuando sea posible.
- `Developer` conserva la autoridad terminal; `Implementer` realiza la
  implementación acotada y no administra el Task Lifecycle.

## Limites del AI Core

Tecnotron-ai es source of truth para la arquitectura genérica del AI Core,
tooling, contexto y contratos operativos reutilizables. Cada producto consumidor
conserva su producto, Project Profile, TASK, runs, ADR y configuración
específica; FitFlow es un consumidor posible, no la identidad de Tecnotron-ai.

Research Knowledge Module queda fuera de la arquitectura de Tecnotron-ai. El
Markdown canonico puede usar frontmatter portable, links explicitos,
navegacion de indice a detalle, backlinks y lint determinista. Obsidian es una
proyeccion para Developer, no source of truth ni dependencia runtime.

## Documentos de detalle

- [Operational Architecture](operational-architecture.md): responsabilidades y
  limites operativos.
- [Task Lifecycle](task-lifecycle.md): estados, ownership y worktrees.
- [Context Strategy](context-strategy.md): retrieval, telemetria y evaluacion.
- [Source of Truth](SOURCE_OF_TRUTH.md): precedencia y navegacion canonica.

El estado de implementacion pertenece a [Current State](current-state.md) y la
secuencia de trabajo a [Implementation Roadmap](implementation-roadmap.md).
