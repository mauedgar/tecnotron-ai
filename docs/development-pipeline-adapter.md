---
document_id: TEC-ADAPTER-001
status: canonical
machine_context: true
version: 3.2
updated: 2026-08-30
owner: tecnotron-ai
---

# Adapter del pipeline

## Entrada

El core consume configuración, contracts v2, TASK/Run State y Project Profile
desde referencias y ports explícitos del proyecto que declara esos recursos. No
mantiene copias editables ni exige FitFlow como fuente. `resolveProject` es el
boundary cross-repo vigente para configuraciones compatibles: recibe una
referencia explícita de Profile o root y, opcionalmente, la referencia del AI
Core; nunca deduce un checkout por directorios hermanos. El Profile permanece
propiedad del proyecto que lo declara. Los nombres `FF_PROJECT_PROFILE`,
`FF_PROJECT_ROOT` y `FF_AI_CORE_ROOT` son compatibilidad de la implementación
vigente, no identidad ni dependencia canónica de Tecnotron-ai.

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
artefactos del run en el proyecto activo, no acepta estados terminales y no hace
merge.

## OpenSpec adapter

Consulta specs/deltas funcionales como evidencia de solo lectura. No altera
TASK, RunState, State Machine, ADR ni decisiones del desarrollador.

## Conformance

Probar high-risk block, ownership, output invalido, review independiente,
paid-disabled, retry limits, terminal developer gate y ausencia de secretos.

Orca y Git worktree son infraestructura externa: Orca controla workspace,
sesion, restore e hibernation; el worktree aisla la escritura. El adapter no
debe recrear ni asumir esas responsabilidades.
