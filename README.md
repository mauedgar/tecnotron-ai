# FitFlow-ai

AI Core reutilizable para workflows de desarrollo asistido. FitFlow es el
primer Project Profile consumidor.

## Estado

Baseline vNext aceptada. `FF-AI-VNEXT-001` a `004` estan `DONE` por decision del
desarrollador. Contracts, registries loaders, State Machine y Run Store estan
implementados. El Agent MVP y los adapters GitHub/OpenSpec no lo estan.

La reparacion de `repo-packager` esta integrada en `tooling` mediante el PR #2.
`FF-AI-VNEXT-005` es el siguiente bloque y `FF-AI-VNEXT-006` esta `READY`; no se
declaran `IN_PROGRESS` ni `DONE`.

## Frontera

- FitFlow-ai posee arquitectura, roadmap, estado de implementacion, tooling,
  contexto, ports, policies, adapters y compatibility baseline del AI Core.
- FitFlow posee producto, doctrina, Project Profile, configuracion activa,
  TASK, runs y contratos de intercambio del consumidor.
- `project-profile.yaml` describe FitFlow y permanece en FitFlow.
- FitFlow-ai opera sobre FitFlow. FitFlow no depende del runtime de FitFlow-ai.

Los repositorios son hermanos e independientes. `<FitFlow-ai-root>` y
`<FitFlow-root>` designan roots logicos del modelo y sus contratos; no existe un
resolver cross-repo portable implementado. Su resolucion queda pendiente de
`FF-AI-VNEXT-005` y no debe reemplazarse por paths fisicos hardcodeados.

## Arquitectura operativa

- Orca: Workspace / Session Control Plane.
- Git worktree: isolation boundary.
- Agent CLI: execution runtime intercambiable.
- Model Provider: inferencia.
- `AGENTS.md` y documentacion canonica: contrato portable.
- GitHub: planificacion, integracion y validacion.
- FitFlow-ai: tooling, contexto y policies.
- FitFlow: producto.

OpenCode funciona como Agent CLI actual, no como dependencia arquitectonica.
Orca puede alojar otros Agent CLI. GitHub y OpenSpec son adapters separados.
`repo-packager` empaqueta contexto de forma determinista; Explorer decide que
evidencia necesita.

## Secuencia

Documentacion canonica del AI Core:

- `docs/architecture.md`;
- `docs/current-state.md`;
- `docs/implementation-roadmap.md`;
- `docs/compatibility-baseline.md`;
- `docs/development-pipeline-adapter.md`.

`docs/indexing-pipeline.md` conserva estado `planned`. Embeddings, MCP y
Temporal permanecen posteriores a sus gates.

## Branches

`tooling` es la branch de integracion, `origin/tooling` es el Base Ref de tasks
nuevas, `main` conserva milestones estables y `feat/*` contiene trabajo. La
branch `master` es transitoria y no pertenece al modelo objetivo.
