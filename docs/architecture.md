---
document_id: FFAI-ARCH-001
status: canonical
machine_context: true
version: 3.1
updated: 2026-08-21
owner: fitflow-ai
type: architecture
related:
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
  - "[[SOURCE_OF_TRUTH]]"
---

# Arquitectura de FitFlow-ai

## Invariantes

```text
FitFlow y FitFlow-ai son repositorios independientes.
FitFlow-ai opera sobre FitFlow sin crear una dependencia de producto inversa.
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
- `Developer` conserva la autoridad terminal; `Coder` es la familia logica de
  implementacion y no administra el Task Lifecycle.

## Limites del AI Core

FitFlow-ai es source of truth para la arquitectura generica del AI Core,
tooling, contexto y contratos operativos. FitFlow conserva el producto, su
Project Profile, TASK, runs, ADR y configuracion especifica.

Research Knowledge Module queda fuera de la arquitectura de FitFlow-ai. El
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
