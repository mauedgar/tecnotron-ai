---
document_id: FFAI-ARCH-001
status: canonical
machine_context: true
version: 3.0
updated: 2026-08-21
---

# Arquitectura de FitFlow-ai

## Limites operativos

```text
Orca              -> control de workspace y sesion
Git worktree      -> aislamiento de escritura
Agent CLI         -> ejecucion intercambiable
Model Provider    -> inferencia
AGENTS.md + docs  -> contrato portable
GitHub            -> planificacion, integracion y validacion
FitFlow-ai        -> tooling, contexto y policies
FitFlow           -> producto

FitFlow-ai -> opera sobre -> FitFlow
```

El Folder Workspace de Tecnotron aporta contexto multi-repo. No reemplaza al
Git worktree como isolation boundary. Restore e hibernation pertenecen a Orca,
no al AI Core. OpenCode es el Agent CLI actual, pero puede reemplazarse sin
cambiar los contratos del core.

## Modulos implementados

```text
src/
  core/          # State Machine y Run Store
  contracts/     # Zod y serializers JSON
  registries/    # loaders y schemas registrados
scripts/
  doctor/        # discovery sin installs
.opencode/skills/
  repo-packager/ # empaquetador determinista
tests/
  contract/
  core/
  repo-packager/
```

`ports/`, adapters GitHub/OpenSpec/Agent Runtime, workflows, observer y Agent
MVP permanecen pendientes. La existencia del directorio o de una decision de
arquitectura no se presenta como implementacion.

## Dependencias

La direccion objetivo es `workflow -> policies/ports/contracts`. Adapters
dependen de ports, no al reves. Project Profile entra como datos versionados
desde FitFlow. Un Model Provider resuelve inferencia; TypeScript conserva la
autoridad sobre estados, gates y transiciones.

## Puertos iniciales

`AgentRuntimePort`, `TaskStorePort`, `SpecStorePort`, `ContextPackagerPort`,
`RunStorePort`, `ValidatorPort`, `ReviewPort`, `DocumentationPort` y
`QuotaStatePort`.

Estos puertos forman parte del contrato arquitectonico. Solo `RunStorePort` y
la State Machine tienen hoy implementaciones equivalentes en el core; no existe
aun una capa completa de ports/adapters.

## Persistencia

FitFlow conserva TASK, eventos y JSON durable bajo su `.ai/runs`. El Run Store
de FitFlow-ai implementa eventos JSONL, estado JSON y proyeccion SQLite. SQLite
y caches son regenerables; GitHub no reemplaza la evidencia durable.

## Ownership

FitFlow-ai es Source of Truth de la arquitectura generica del AI Core. FitFlow
conserva arquitectura y configuracion de producto, Project Profile, ADR de
adopcion y contratos de intercambio del consumidor. Las copias genericas aun
presentes en FitFlow quedan pendientes de una migracion con ownership propio.

## Feature flags

Semantic retrieval, MCP, Temporal, orchestrator-workers, optimizer automatico
y paid API nacen disabled.
