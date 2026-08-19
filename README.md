# FitFlow-ai

AI Core reutilizable para workflows de desarrollo asistido. FitFlow es el
primer Project Profile consumidor.

## Estado

`BASELINE_PROPOSED_PENDING_ACCEPTANCE`.

Este repositorio contiene arquitectura y seeds; no contiene todavia State
Machine, adapters, registries loaders, Run Store ni Agent MVP funcional. No se
instalaron dependencias durante la adopcion vNext.

## Frontera

- AI Core posee workflow generico, ports, policies y adapters.
- `../FitFlow/.ai/config/` posee Project Profile, registries y policy activa.
- `../FitFlow/.ai/contracts/v2/` posee contratos de intercambio.
- `../FitFlow/AGENTS.md` y docs canonicos gobiernan el producto.
- `.agents/skills` permanece junto a FitFlow para facilitar su consumo por el
  runtime y evitar una copia divergente.

OpenCode es el adapter preferido, no una dependencia arquitectonica. GitHub y
OpenSpec son adapters separados. `repo-packager` es un ContextPackager
determinista; Explorer es un rol.

## Secuencia

El roadmap activo esta en `../FitFlow/docs/ai/roadmap-vnext.md`. La primera
implementacion debe comenzar con doctor/compatibilidad, contracts/registries y
State Machine. Embeddings, MCP y Temporal permanecen posteriores.
