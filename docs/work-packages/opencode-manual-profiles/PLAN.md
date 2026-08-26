---
document_id: FFAI-WP-OPENCODE-MANUAL-PROFILES
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-26
owner: fitflow-ai
type: work-package
lifecycle_status: ACCEPTED
related:
  - "[[tasks/FF-AI-AGENT-003/TASK]]"
  - "[[tasks/FF-AI-AGENT-003/PLAN]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-conformance]]"
  - "[[research/opencode-orca-agent-operations]]"
  - "[[implementation-roadmap]]"
---

# Work Package Plan: OpenCode Manual Profiles

## Resultado acotado

Materializar como archivos versionados los ocho perfiles manuales derivados de
los contratos de rol ya aceptados, exponerlos globalmente mediante enlaces
individuales administrados desde un checkout estable y verificar discovery e
invocacion manual en OpenCode.

El WP tambien evalua dos perfiles primarios exclusivos del Developer:
`prompt_generator` y `developer_superuser`. Son perfiles operativos de OpenCode,
no roles de AI Core, no son runtime-selectable y no ingresan al Role Registry.

## Rulings del Developer

- Se aplica la linea zero-cost observada mediante invocaciones acotadas y
  aprobada por el Developer el 2026-08-26; el informe no es fuente de verdad.
- Descripciones, prompts y permisos inline actuales se consideran mock y no son
  fuente para los perfiles nuevos.
- Los prompts y limites se derivan de contratos y politicas canonicas.
- Los perfiles deben estar disponibles en cualquier repositorio mediante
  enlaces globales, conservando la fuente versionada en Tecnotron-ai.
- `planner_ai` y `coder_strong_a` quedan habilitados; Coder Strong A se
  materializa solo para escalamiento explicito con ceiling MEDIUM.

## Limites

- Sin cambios a Router, Model Resolver, Agent Runtime, registries o Temporal.
- Perfil manual no implica seleccion runtime ni autoridad terminal.
- `developer_superuser` no usa `--auto`, no convierte `ask`/`deny` en bypass y
  no puede aceptar, integrar o promover trabajo en nombre del Developer humano.
- Los enlaces no apuntan a worktrees efimeros.
- La configuracion global del usuario no se modifica sin gate explicito.

## Wave 1 - FF-AI-AGENT-003

Estado: `ACCEPTED`; integracion y postflight global pendientes.

Entregables:

1. TASK/PLAN y evidencia de capacidades observadas.
2. Ocho perfiles manuales de roles canonicos.
3. Dos perfiles primarios exclusivos del Developer.
4. Instalador determinista de enlaces globales con modo dry-run y fail-closed;
   symlink preferido y hard link por archivo como fallback sin privilegios.
5. Verificacion de discovery e invocacion manual.
6. Plan de retiro de definiciones inline mock sin tocar providers, modelos no
   relacionados ni configuracion de terceros.

## Gate posterior

El protocolo auditable preflight/postflight, guardrails y recuperacion durable
se conserva como investigacion no normativa. Su diseno ejecutable se reconsidera
despues de `FF-AI-VNEXT-011+`, cuando exista evidencia real de Temporal.
