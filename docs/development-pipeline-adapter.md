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

## Proyecciones semánticas y conformance

Las proyecciones de target, repositorio y harness son dimensiones ortogonales
asociadas a una Operation o a un intento de ejecución:

```text
target_projection != repository_projection
target_projection != harness_projection
repository_projection != harness_projection
```

Una proyección puede transportar identificadores, restricciones, capacidades,
referencias u observaciones sin convertirse por ello en identidad de la
Operation ni adquirir autoridad.

### Target projection

Una target projection representa información específica del target requerida
para aplicar semántica de Tecnotron a una autoridad competente. Puede consumir o
referenciar requisitos, restricciones, capacidades esperadas y estado propiedad
del target.

La relación gobernante es:

```text
target_projection != target_domain_authority
```

Tecnotron no adquiere autoridad sobre verdad mutable del producto por consumirla
o proyectarla. Si un hecho requerido del target no puede establecerse de forma
competente, permanece `UNKNOWN`.

### Repository projection

Una repository projection representa identidad, localización, revisión, estado,
capacidad de acceso o restricciones de repositorio requeridas por una actividad
autorizada.

Las siguientes relaciones permanecen separadas:

```text
repository_projection != repository_authority
repository_identity != Operation_identity
repository_access_capability != repository_write_authority
```

Referenciar, inspeccionar, observar o disponer de capacidad técnica de acceso a
un repositorio no concede autoridad de escritura, integración, publicación ni
adopción canónica. Este boundary no define un workflow Git, estrategia de
branches/worktrees ni mecanismo de integración universal.

### Harness projection e identidad observada

Una harness projection representa información de la superficie de ejecución
necesaria para observación y evaluación de conformance. Puede incluir identidad
y versión observadas, runtime observado, evidencia de capability profile,
tested support y relaciones con adapters, SDKs o plugins.

Las identidades permanecen distinguibles:

```text
harness_identity != runtime_identity
harness_identity != SDK_identity
harness_identity != plugin_identity
harness_identity != adapter_identity
```

Decisioning puede resolver un runtime candidato, pero eso no establece el
runtime observado:

```text
resolved_runtime_candidate != observed_runtime_truth
runtime_eligibility != harness_conformance
```

La identidad observada requiere evidencia del runtime o superficie de ejecución.
Cuando una identidad observada requerida no pueda establecerse de forma
competente, permanece `UNKNOWN`; la identidad configurada, solicitada o resuelta
no puede sustituirla silenciosamente.

### Capability profile, tested support y fail-closed conformance

Un capability profile expresa capacidades establecidas para un sujeto de
conformance identificado. Es distinto de la identidad observada:

```text
capability_profile != observed_harness_identity
```

Conocer la identidad del harness no demuestra automáticamente sus capacidades.
Una capacidad obligatoria no establecida permanece `UNKNOWN` y falla cerrada
para el claim de conformance afectado.

El soporte probado debe estar respaldado por un conjunto explícito y acotado de
versiones, builds, revisiones o identidades equivalentes. No se infiere soporte
por similitud de versión, nombre de producto, instalación, autenticación,
configuración o una invocación exitosa que no haya demostrado el capability set
requerido.

La conformance del harness requiere, para el claim aplicable:

1. capability profile requerido;
2. identidad observada relevante;
3. tested-version allowlist o evidencia equivalente de soporte probado.

Deben poder representarse resultados semánticamente equivalentes a:

```text
CONFORMANT
NON_CONFORMANT
UNKNOWN_OR_UNTESTED
```

`NON_CONFORMANT` y `UNKNOWN_OR_UNTESTED` fallan cerrados para el claim afectado.
Ese resultado no crea ni revoca por sí mismo autoridad de ejecución,
repositorio, integración, publicación o adopción.

Versiones concretas de OpenCode, Orca u otras superficies pueden aparecer como
fixtures empíricos o evidencia de soporte probado. Ninguna versión observada,
fixture, SDK, plugin, adapter o harness se convierte por ese hecho en
arquitectura permanente o requisito universal de Tecnotron.
