---
document_id: FFAI-ARCH-001
status: accepted_pending_implementation
machine_context: true
version: 2.0
updated: 2026-08-18
---

# Arquitectura de FitFlow-ai

## Modulos objetivo

```text
src/
  core/          # functional core, state machine, policies
  contracts/     # Zod y serializers JSON
  registries/    # Role, Skill, Model, Workflow, Run
  ports/         # interfaces estables
  adapters/      # OpenCode, GitHub, OpenSpec, filesystem, SQLite
  workflows/     # development, bugfix, documentation-sync
  observer/      # runs, context lineage y FinOps
tests/
  unit/
  contract/
  integration/
  evals/
```

## Dependencias

`workflow -> policies/ports/contracts`. Adapters dependen de ports, no al
reves. Project Profile entra como datos versionados. Las LLM resuelven un paso;
TypeScript decide que paso ocurre.

## Puertos iniciales

`AgentRuntimePort`, `TaskStorePort`, `SpecStorePort`, `ContextPackagerPort`,
`RunStorePort`, `ValidatorPort`, `ReviewPort`, `DocumentationPort` y
`QuotaStatePort`.

## Persistencia

FitFlow conserva JSON durable bajo `.ai/runs`. FitFlow-ai puede mantener SQLite
y caches locales bajo `storage/`; son proyecciones regenerables. GitHub solo
publica resumen y checks.

## Feature flags

Semantic retrieval, MCP, Temporal, orchestrator-workers, optimizer automatico
y paid API nacen disabled.
