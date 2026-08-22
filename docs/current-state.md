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
- Doctor y discovery sin installs: implementados con roots portables.
- Contracts Zod y registries loaders: implementados.
- State Machine, eventos JSONL, Run Store y proyeccion SQLite: implementados.
- `resolveProject` concentra la resolucion de FitFlow/FitFlow-ai desde Project
  Profile o roots explicitos; no usa topologia de directorios hermanos.
- Los adapters GitHub y OpenSpec estan implementados como limites acotados:
  GitHub sincroniza referencias/macroestado y consulta PR/checks; OpenSpec solo
  produce evidencia de lectura.
- `repo-packager`: reparado e integrado en `tooling` por PR #2; tests 4/4
  `PASS` en este worktree.

La promocion `002-004` consta en el commit FitFlow `52d729c`. Algunos
run-state/result JSON y el backlog machine-readable de FitFlow conservan
`PENDING_ACCEPTANCE`; son artefactos stale, no una reversa de la decision del
desarrollador. No se modifican sin ownership de FitFlow.

## Siguiente trabajo

- `FF-AI-VNEXT-005`: en implementacion en este worktree; no se promueve su
  estado sin decision del desarrollador.
- `FF-AI-VNEXT-006`: `READY`; reactivada tras reparar `repo-packager`.
- `FF-AI-VNEXT-006` no esta `IN_PROGRESS` ni `DONE`: falta adaptar el resultado
  al contrato ContextPackager v2 y sus consumers.
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
| `node --test scripts/doctor/tests/doctor.test.js tests/adapters/providers.test.js` | 10/10 `PASS` |
| `node src/contracts/validate-package.js` | `PASS`; `npm pack --dry-run` repetido produce el mismo integrity |
| `FF_PROJECT_ROOT="C:/Proyectos Web/FitFlow" node scripts/doctor/bin/ffai-doctor.js` | `PASS`; Project Profile y roots activos resueltos |
| `python tests/repo-packager/pack.test.py` | 4/4 `PASS` |
| `node --test tests/contract/contracts.test.js tests/contract/registries.test.js tests/contracts/package-modes.test.js tests/core/state-machine.test.js` | 20/20 `PASS`; incluye carga CJS/ESM de `@mauedgar/contracts` |

Las dependencias locales `zod` y `yaml` ya estan disponibles; la carga y las
suites que las requieren se revalidaron sin modificar dependencias.
La evidencia historica de `001-004` permanece en TASK, VALIDATION, REVIEW y
RESULT de FitFlow. Doctor requiere `FF_PROJECT_ROOT` o `FF_PROJECT_PROFILE`
cuando no se lo invoca desde el checkout de producto. `repo-packager` se ubica
en el AI Core; su entorno discovery puede reportar `UNREACHABLE` sin alterar
la resolucion de roots.

## Prioridades

Reducir contexto y optimizar calidad/token continua siendo prioridad. Explorer
debe pedir evidencia minima suficiente y `repo-packager` debe empaquetar la
solicitud sin decidir suficiencia. Calidad, privacidad y reduccion de retrabajo
preceden a minimizar tokens de forma aislada.

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
