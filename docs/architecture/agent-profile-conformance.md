---
document_id: FFAI-ARCH-AGENT-PROFILE-CONFORMANCE
status: canonical
machine_context: true
version: 1.1
updated: 2026-08-26
owner: fitflow-ai
type: architecture
related:
  - "[[tasks/FF-AI-AGENT-002/TASK]]"
  - "[[tasks/FF-AI-AGENT-002/PLAN]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-matrix]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[SOURCE_OF_TRUTH]]"
---

# Agent Profile Conformance

> **Status**: Canónico. Aceptado y promovido por decisión del Developer (2026-08-25), ampliado por ruling del 2026-08-26. Es una especificación documental; no es schema, registry ni adapter.

## Límites Normativos

1. Role contract, manual profile, runtime selection, model binding, skill/tool binding y task permissions permanecen separados.
2. Los ocho perfiles habilitados estan `MATERIALIZED_UNVERIFIED`; ninguno es runtime-selectable ni demuestra discovery/invocation global.
3. Un binding reemplazable no cambia identidad, autoridad o techo de capacidad del rol.
4. Permisos efectivos siempre son la intersección del contrato del rol, la TASK activa y la disponibilidad observada. Nunca amplían el techo.
5. Sin fallback automático. `UNAVAILABLE` requiere decisión manual del Developer.

## Descriptor Mínimo

| Campo | Regla |
|---|---|
| `role_id` | Debe resolver a uno de los ocho contratos canónicos. |
| `role_contract_ref` | Link a una sección de `agent-role-contracts.md`. |
| `manual_profile_status` | `MATERIALIZED_UNVERIFIED`; existe archivo versionado pero no implica discovery global. |
| `runtime_selectable` | `FALSE` en esta fase. |
| `adapter_descriptor` | Identificador documental `REPLACEABLE/NOT_IMPLEMENTED`; no implementación. |
| `effective_read_scope` | Scope permitido por TASK, excluyendo secretos, env y runtime state. |
| `effective_write_scope` | `NONE` o ownership keys exactos autorizados por TASK. |
| `allowed_tools_skills` | Lista task-scoped; disponibilidad no equivale a autoridad. |
| `denied_tools_skills` | Operaciones que superarían contrato, ownership o stop conditions. |
| `delegation_depth` | `0` para leaf; máximo `1` cuando el contrato permite delegación explícita. |
| `discovery_status` | `DOCUMENTED`, `NOT_VERIFIED`, `VERIFIED` o `UNAVAILABLE`. |
| `invocation_status` | Mismo vocabulario; `VERIFIED` exige comando y evidencia PASS. |
| `handoff_format` | `fitflow-agent-handoff/v1`, definido abajo. |
| `terminal_authority` | `NONE`; Developer conserva aceptación terminal. |

## Proyecciones de los Ocho Roles

| role_id | role_contract_ref | adapter_descriptor | read scope | write scope | allowed | denied | delegation depth | discovery / invocation |
|---|---|---|---|---|---|---|---:|---|
| `planner_ai` | `agent-role-contracts.md#planner_ai` | `REPLACEABLE/NOT_IMPLEMENTED` | roadmap, milestones, SoT, ADRs, evidence pack | WP/milestone docs sólo si TASK los autoriza | planificación documental, delegación focalizada a Explorer | producto, runtime, registries, OpenCode | 1 | `DOCUMENTED / NOT_VERIFIED` |
| `architect` | `agent-role-contracts.md#architect` | `REPLACEABLE/NOT_IMPLEMENTED` | WP, milestone, SoT, ADRs, evidence pack | TASK/PLAN sólo si ownership lo autoriza | arquitectura documental; delegación autorizada a Explorer/Coder/Doc Curator | implementación de producto, selección runtime | 1 | `DOCUMENTED / NOT_VERIFIED` |
| `explorer` | `agent-role-contracts.md#explorer` | `REPLACEABLE/NOT_IMPLEMENTED` | repo dentro del query, sin secretos/env/runtime state | `NONE` | graph/search/read y evidencia mínima | cualquier write, autoridad o dump indiscriminado | 0 | `DOCUMENTED / NOT_VERIFIED` |
| `coder_a` | `agent-role-contracts.md#coder_a` | `REPLACEABLE/NOT_IMPLEMENTED` | TASK, PLAN, evidence y ownership scope | ownership keys exactos | implementación media y validaciones autorizadas | scope expansion, lifecycle terminal, config no autorizada | 0 | `DOCUMENTED / NOT_VERIFIED` |
| `coder_b` | `agent-role-contracts.md#coder_b` | `REPLACEABLE/NOT_IMPLEMENTED` | TASK, PLAN y ownership scope | ownership keys exactos | cambios mecánicos de baja criticidad | decisión semántica, scope expansion, config no autorizada | 0 | `DOCUMENTED / NOT_VERIFIED` |
| `coder_strong_a` | `agent-role-contracts.md#coder_strong_a` | `REPLACEABLE/NOT_IMPLEMENTED` | TASK, PLAN, evidencia de escalamiento y ownership scope | ownership keys exactos | implementacion compleja con autorizacion explicita y ceiling MEDIUM | riesgo HIGH, fallback, decision arquitectonica o scope expansion | 0 | `DOCUMENTED / NOT_VERIFIED` |
| `reviewer` | `agent-role-contracts.md#reviewer` | `REPLACEABLE/NOT_IMPLEMENTED` | TASK, PLAN, fuentes, diff y evidencia | `NONE` | revisión semántica read-only | correcciones, commits, aceptación Developer | 0 | `DOCUMENTED / NOT_VERIFIED` |
| `doc_curator` | `agent-role-contracts.md#doc_curator` | `REPLACEABLE/NOT_IMPLEMENTED` | docs, SoT y ADRs | ownership keys documentales exactos | normalización documental | código, runtime, canonicidad sin gate | 0 | `DOCUMENTED / NOT_VERIFIED` |

Todas las filas conservan `manual_profile_status: MATERIALIZED_UNVERIFIED`, `runtime_selectable: FALSE`, `model_binding: UNSPECIFIED/NON_CANONICAL`, `skill_tool_binding: TASK_SCOPED/REPLACEABLE` y `terminal_authority: NONE`.

## Evidencia de Descubrimiento e Invocación

| Estado | Significado |
|---|---|
| `DOCUMENTED` | Descriptor y contrato existen; no prueba disponibilidad runtime. |
| `NOT_VERIFIED` | No se ejecutó una prueba autorizada. Estado inicial de esta task. |
| `VERIFIED` | Comando reproducible y evidencia PASS prueban discovery o invocation dentro de una TASK autorizada. |
| `UNAVAILABLE` | La capacidad requerida no está disponible; no se intenta fallback automático. |

AGENT002 no tenia ownership sobre OpenCode. AGENT003 materializa los perfiles,
pero discovery/invocacion global permanecen `NOT_VERIFIED` hasta integracion en
checkout estable y gate del Developer.

## Permisos Efectivos

- `effective = role_contract_ceiling ∩ task_permissions ∩ available_capabilities`.
- Un path no incluido en ownership es deny, aunque una herramienta pueda escribirlo.
- `explorer` y `reviewer`: `write = NONE` sin excepciones implícitas.
- Coder y Doc Curator detienen la ejecución ante necesidad de escribir fuera de ownership.
- Secrets, `.env`, runtime state, paid API y riesgos altos permanecen denegados.
- Modelos, skills, MCPs y CLIs son bindings reemplazables; no son arquitectura ni autoridad.

## Delegación

- Profundidad máxima: `1` desde `planner_ai` o `architect`, sólo cuando contrato y TASK lo autorizan.
- `explorer`, `coder_a`, `coder_b`, `coder_strong_a`, `reviewer` y `doc_curator` son leaf por defecto.
- El delegado hereda scope, ownership, prohibiciones, tools permitidas, formato y stop conditions.
- No hay writers concurrentes sobre el mismo ownership key.
- Una delegación no transfiere aceptación, integración ni lifecycle terminal.

## Handoff `fitflow-agent-handoff/v1`

```yaml
schema: fitflow-agent-handoff/v1
task_id: FF-AI-...
from_role: role_id
to_role: role_id
result: COMPLETE | PARTIAL | UNAVAILABLE | BLOCKED
scope:
  read: []
  write: []
evidence:
  commands: []
  paths: []
  findings: []
gaps: []
stop_condition: null
```

El handoff contiene resultados verificables, no razonamiento privado. No puede declarar `PASS`, runtime availability ni aceptación sin evidencia/autoridad correspondiente.

## Deferred y Unknowns

- Al cierre de AGENT002, `coder_strong_a` estaba `DEFERRED`; el ruling Developer
  del 2026-08-26 lo habilita en AGENT003 con contrato y ceiling MEDIUM.
- Datos exactos de `roles.yaml`, discovery runtime y configuración FitFlow: `UNKNOWN` y fuera de scope.
- OpenCode profiles/adapters: `NOT_IMPLEMENTED` por esta task; no se crean archivos.
- Model binding y política de fallback/ranking: no definidos y prohibidos en este scope.

## Follow-up operativo: FF-AI-AGENT-003

`FF-AI-AGENT-003` materializa perfiles manuales OpenCode en un WP separado. Esta
seccion registra el inicio del follow-up y no afirma validacion, aceptacion o
integracion antes de su evidencia:

- ocho perfiles derivados de los contratos habilitados;
- bindings `model` observados preservados como configuracion reemplazable, no
  como ranking o policy;
- `prompt_generator` y `developer_superuser` como perfiles `primary` exclusivos
  del Developer, no roles del registry ni runtime-selectable;
- `planner_ai` y `coder_strong_a` quedan habilitados; Coder Strong A requiere
  escalamiento explicito y no admite trabajo HIGH;
- discovery, invocacion y enlaces globales permanecen `NOT_VERIFIED` hasta los
  comandos y gates de AGENT003.
