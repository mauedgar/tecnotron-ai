---
document_id: FFAI-ADAPTER-001
status: canonical
machine_context: true
version: 3.1
updated: 2026-08-22
---

# Adapter del pipeline

## Entrada

El core consume configuracion, contracts v2, TASK/Run State y Project Profile
desde `<FitFlow-root>`. No mantiene copias editables. `resolveProject` es el
unico boundary cross-repo: recibe `FF_PROJECT_PROFILE` o `FF_PROJECT_ROOT` y
opcionalmente `FF_AI_CORE_ROOT`; nunca deduce un checkout por directorios
hermanos. El Profile permanece propiedad de FitFlow.

## Distribucion de contratos

`src/contracts` es la unica fuente editable de `@mauedgar/contracts`. El
paquete declara version fija, exports publicos para `require` e `import`, y no
se replica en consumidores. `node src/contracts/validate-package.js` ejecuta
dos `npm pack --dry-run` y falla si su metadata no es determinista. El smoke de
carga CJS/ESM se ejecuta cuando las dependencias declaradas estan disponibles.

## Agent Runtime

`AgentRuntimePort` define discovery, permisos, modelo efectivo, toolset,
timeouts, output validation y abort. Ningun Agent CLI controla transiciones ni
puede emitir `DONE`.

OpenCode funciona como runtime actual bajo Orca y es intercambiable. Otros Agent
CLI pueden ejecutarse bajo el mismo control plane. El adapter y su conformance
suite permanecen pendientes; disponibilidad del CLI no equivale a conformance.

## GitHub adapter

Sincroniza de forma mecanica e idempotente la referencia Issue/TASK, macrostate
de Project, resumen de PR y checks de Actions. Respeta la autoridad de los
artifacts del run en FitFlow, no acepta estados terminales y no hace merge.

## OpenSpec adapter

Consulta specs/deltas funcionales como evidencia de solo lectura. No altera
TASK, RunState, State Machine, ADR ni decisiones del desarrollador.

## Conformance

Probar high-risk block, ownership, output invalido, review independiente,
paid-disabled, retry limits, terminal developer gate y ausencia de secretos.

Orca y Git worktree son infraestructura externa: Orca controla workspace,
sesion, restore e hibernation; el worktree aisla la escritura. El adapter no
debe recrear ni asumir esas responsabilidades.
