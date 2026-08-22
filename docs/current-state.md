---
document_id: FFAI-STATE-001
status: canonical
machine_context: true
version: 1.1
updated: 2026-08-22
---

# Estado actual de FitFlow-ai

## Implementacion confirmada

- `FF-AI-VNEXT-001` a `004`: `DONE` por promocion del desarrollador.
- Doctor y discovery sin installs: implementados.
- Contracts Zod y registries loaders: implementados.
- State Machine, eventos JSONL, Run Store y proyeccion SQLite: implementados.
- `repo-packager`: reparado e integrado en `tooling` por PR #2; tests 4/4
  `PASS` en este worktree.
- ContextPackager v2: contrato Zod y core implementados. Orquesta materializers
  inyectados, aplica el budget global, entrega `COMPLETE`/`PARTIAL`/`EMPTY` y
  emite telemetria determinista por entrega. `repo-packager` permanece como
  materializer y no recibe decisiones de suficiencia.

La promocion `002-004` consta en el commit FitFlow `52d729c`. Algunos
run-state/result JSON y el backlog machine-readable de FitFlow conservan
`PENDING_ACCEPTANCE`; son artefactos stale, no una reversa de la decision del
desarrollador. No se modifican sin ownership de FitFlow.

## Siguiente trabajo

- `FF-AI-VNEXT-005`: `NEXT`; debe resolver Project Profile, roots portables y
  adapters GitHub/OpenSpec.
- `FF-AI-VNEXT-006`: `DONE`; implementado ContextPackager v2 con contrato
  estructurado y telemetria determinista. No cambia el estado de la TASK,
  que conserva autoridad del desarrollador.
- Agent Runtime adapter, Router, Model Resolver, Explorer, Agent MVP, Observer,
  retrieval, MCP y Temporal permanecen pendientes segun roadmap.

## Plataforma operativa

- Orca controla workspace, sesion, restore e hibernation.
- Git worktree es el isolation boundary.
- El Folder Workspace Tecnotron aporta contexto multi-repo, no aislamiento.
- OpenCode funciona como Agent CLI actual bajo Orca y es intercambiable.
- Otros Agent CLI pueden operar bajo Orca sin cambiar la arquitectura.
- Model Provider aporta inferencia; no gobierna workflow ni estados.

Estas son capacidades de plataforma confirmadas por el desarrollador y por el
runtime Orca; no se presentan como implementaciones de FitFlow-ai.

## Evidencia y limitaciones

Validacion ejecutada el 2026-08-22:

| Comando | Resultado |
| --- | --- |
| `node --test scripts/doctor/tests/doctor.test.js` | 6/6 `PASS` |
| `python tests/repo-packager/pack.test.py` | 4/4 `PASS` |
| `node --test tests/core/context-packager.test.js` | `NOT_RUN`: falta la dependencia declarada `zod`; no se instalaron dependencias |
| contracts/registries/core Node tests | `NOT_RUN`: el reviewer no produjo una nueva ejecucion reproducible; dependencias no instaladas |
| `node scripts/doctor/bin/ffai-doctor.js` | tools externos disponibles; roots cross-repo incorrectos |

No se instalaron dependencias ni se promovieron las suites `NOT_RUN` a `PASS`.
La evidencia historica de `001-004` permanece en TASK, VALIDATION, REVIEW y
RESULT de FitFlow. El doctor actual deriva un root que no representa al
worktree FitFlow activo y aun busca `repo-packager` en su ubicacion anterior;
esta limitacion queda para `FF-AI-VNEXT-005`.

## Prioridades

Reducir contexto y optimizar calidad/token continua siendo prioridad. Explorer
debe pedir evidencia minima suficiente y `repo-packager` debe empaquetar la
solicitud sin decidir suficiencia. Calidad, privacidad y reduccion de retrabajo
preceden a minimizar tokens de forma aislada.

ContextPackager v2 registra `budget_tokens`, tokens entregados, paths y evidence
requested/included/omitted/missing, cobertura, fallback y providers. Cuando no
se inyecta un tokenizer exacto, usa `characters_divided_by_4` y declara que es
una aproximacion frente al tokenizer del modelo objetivo. La cobertura se deriva
solo de evidence requirements, nunca del conteo de tokens.

No existian consumidores de ContextPackager en este repositorio para adaptar;
el core exporta el resultado v2 estructurado para los consumidores posteriores.

## Ownership pendiente

FitFlow aun contiene documentacion generica de AI Core y el backlog/config
machine-readable. No mover automaticamente esos artefactos. Permanecen
`PENDING` hasta identificar y adaptar consumers en `FF-AI-VNEXT-005`:

- backlog vNext y su sincronizacion con GitHub/TASK;
- publicacion o ubicacion de contracts JSON;
- defaults reutilizables frente a configuracion activa de producto;
- links y roots entre repositorios.

El Project Profile, TASK, runs, ADR y configuracion especifica del producto
permanecen en FitFlow.
