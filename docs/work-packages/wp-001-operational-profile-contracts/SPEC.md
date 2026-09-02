---
document_id: TOF-WP-001-SPEC-001
status: accepted
materialization_status: ACCEPTED
owner: tecnotron-ai
type: work-package-spec
version: 1.1
updated: 2026-09-01
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-001
contract: tecnotron-agent-profile/v1
accepted_at: 2026-08-31
accepted_by: Developer
acceptance_source_sha256: 467dac4e797358c483db3dd2f60e3194ade65f2e86164778f55c5ac8a43befa0
accepted_decisions:
  - D-WP001-01
  - D-WP001-02
  - D-WP001-03
  - D-WP001-04
  - D-WP001-05
  - D-WP001-06
  - D-WP001-07
  - D-WP001-08
  - D-WP001-09
  - D-WP001-10
  - D-WP001-11
  - D-WP001-12
related:
  - "[[milestones/tecnotron-operational-foundation-v1/PLAN]]"
  - "[[work-packages/wp-001-operational-profile-contracts/PLAN]]"
  - "[[tasks/TOF-W1-001/TASK]]"
---

# SPEC WP-001: Operational Profile Contracts

## 1. Autoridad y secuencia

Esta SPEC materializa sin expansión semántica las decisiones `D-WP001-01` a
`D-WP001-12`, aceptadas por el Developer sobre el Decision Brief cuyo SHA-256 es
`467dac4e797358c483db3dd2f60e3194ade65f2e86164778f55c5ac8a43befa0`.

La secuencia autoritativa es:

```text
SPEC aceptada
-> WP PLAN
-> TASK TOF-W1-001 y task PLAN
-> implementación autorizada posterior
-> validación determinista
-> review independiente
-> aceptación del Developer
-> integración mediante Task Lifecycle
```

`TOF-W1-001` implementa esta SPEC. No puede producirla, redefinirla ni aceptar
sus propios requisitos.

## 2. Problema y resultado único

Tecnotron-ai carece de un contrato portable que identifique perfiles operativos
por responsabilidad, limite entradas y salidas y niegue capacidades no
autorizadas sin ligar la identidad del perfil a OpenCode, un modelo, provider,
workspace o producto consumidor.

El resultado único de WP-001 es definir y validar estáticamente
`tecnotron-agent-profile/v1`: un registry portable con exactamente nueve
perfiles, responsabilidades mutuamente delimitadas, inputs y outputs
contractuales y permisos deny-by-default. WP-001 no implementa perfiles ni
launchers.

## 3. Contrato normativo

### 3.1 Conjunto exacto

El registry contiene exactamente estas keys, sin faltantes, extras ni aliases:

```text
spec_analyst
planner
architect
explorer
implementer
doc_curator
reviewer
researcher
auditor
```

`validator`, `coder_b`, `coder_a`, `coder_strong_a` y cualquier `coder_*` no son
profile IDs válidos.

### 3.2 Responsabilidades, inputs y outputs

Los IDs de responsabilidad son cerrados y exclusivos. Los inputs representan
requisitos portables, no un payload de lanzamiento.

Todos los perfiles reciben los siguientes inputs comunes, además de los inputs
específicos de la matriz:

```yaml
common_required_inputs:
  - accepted_authority_ref
  - resolved_project_profile_ref
  - resolved_repository_ref
  - read_scope
  - context_ref_or_evidence_requirements
  - context_budget
conditional_required_inputs:
  execution_profiles:
    - task_authorization_ref
    - write_scope_if_writer
  researcher:
    - research_authorization_ref
  reviewer:
    - change_snapshot_ref
    - validation_evidence_ref
  auditor:
    - evidence_snapshot_ref
    - evidence_matrix_ref
```

`execution_profiles` comprende `implementer` y `doc_curator`. Los inputs
condicionales se suman solo al perfil aplicable. `required_inputs` es la unión
sin duplicados de `common_required_inputs`, los conditional inputs aplicables y
los inputs específicos de la matriz. Estos IDs son vocabulario contractual; no
son payloads de runtime, routing ni launch.

| Perfil | Responsibility ID y responsabilidad exclusiva | Inputs requeridos | Outputs permitidos | Escritura |
| --- | --- | --- | --- | --- |
| `spec_analyst` | `specification`: convertir una necesidad aceptada en comportamiento, requisitos y controles verificables | `problem`, `accepted_authorities`, `constraints`, `gaps` | `spec_proposal` | denegada |
| `planner` | `execution_planning`: derivar solución de ejecución y unidades acotadas desde una SPEC aceptada, sin expandirla | `accepted_spec`, `milestone`, `dependencies`, `ownership` | `wp_plan_proposal`, `task_decomposition_proposal` | denegada |
| `architect` | `technical_architecture`: proponer diseño técnico, contratos, fronteras, riesgos y decisiones de arquitectura | `accepted_spec`, `existing_contracts`, `architecture`, `consumers` | `architecture_proposal`, `adr_proposal` | denegada |
| `explorer` | `evidence_exploration`: recuperar evidencia mínima suficiente y declarar cobertura, contradicciones y gaps | `evidence_requirements`, `project_profile`, `context_budget` | `context_report` | denegada |
| `implementer` | `source_implementation`: modificar source, tests y configuración dentro de una TASK autorizada | `authorized_task`, `task_plan`, `task_worktree`, `write_scope`, `context_reference` | `implementation_report`; el cambio source es el efecto task-owned autorizado | solo source/tests/config task-owned |
| `doc_curator` | `documentation_materialization`: materializar documentación autorizada sin inventar política ni arquitectura | `authorized_documentation_task`, `accepted_authorities`, `documentation_write_scope` | `documentation_report`; el cambio documental es el efecto task-owned autorizado | solo documentación task-owned |
| `reviewer` | `independent_review`: revisar semánticamente un cambio versionado e independiente de su autor | `accepted_spec_or_task`, `change_snapshot`, `validation_result` | `external_review_report` con `PASS` o `FAIL` y findings | denegada |
| `researcher` | `authorized_research`: obtener evidencia externa atribuida para una Research TASK autorizada | `research_question`, `authorized_research_task`, `source_policy` | `research_report` con hechos, inferencias y gaps separados | denegada; web condicional |
| `auditor` | `conformance_audit`: auditar conformance, trazabilidad, controles negativos y evidencia dentro de scope declarado | `contracts`, `audit_scope`, `evidence_matrix`, `artifacts` | `audit_report` | denegada |

Ningún output implica aceptación, integración, publicación o cambio de estado
del lifecycle.

### 3.3 Permisos completos

Cada perfil declara todas estas dimensiones. No existen defaults permisivos ni
capacidades implícitas.

```yaml
permissions:
  default: deny
  repository_read: declared_scope
  filesystem_write: denied | task_owned_source | task_owned_docs
  command_execution: denied | read_only_deterministic | task_validation
  web: denied | authorized_research_task_only
  delegation: denied
  git_mutation: denied
  planning_provider_mutation: denied
  workspace_lifecycle: denied
  dependency_mutation: denied
  secret_access: denied
  paid_api: denied
```

Invariantes por perfil:

- `implementer` es el único con `filesystem_write: task_owned_source`.
- `doc_curator` es el único con `filesystem_write: task_owned_docs`.
- Los otros siete perfiles usan `filesystem_write: denied`.
- Los writers pueden usar `command_execution: task_validation`; los perfiles
  read-only pueden usar como máximo `read_only_deterministic`.
- Todos usan `delegation: denied` y todas las mutaciones de Git, provider,
  workspace, dependencias, secretos y paid API permanecen denegadas.
- Solo `researcher` usa `web: authorized_research_task_only`; los demás usan
  `web: denied`.
- WP-001 valida la condición web estáticamente. WP-002 deberá comprobar la
  Research TASK autorizada y el cierre transitivo de shell, MCP, skills y
  adapters antes de habilitar web en runtime.
- Los writers no adquieren autoridad sobre aceptación ni lifecycle.

Asignación exacta para el registry inicial:

| Perfiles | `repository_read` | `filesystem_write` | `command_execution` | `web` |
| --- | --- | --- | --- | --- |
| `implementer` | `declared_scope` | `task_owned_source` | `task_validation` | `denied` |
| `doc_curator` | `declared_scope` | `task_owned_docs` | `task_validation` | `denied` |
| `researcher` | `declared_scope` | `denied` | `read_only_deterministic` | `authorized_research_task_only` |
| Los otros seis perfiles | `declared_scope` | `denied` | `read_only_deterministic` | `denied` |

Todos usan `default: deny`; en las otras siete dimensiones todos usan
exactamente `denied`.

### 3.4 Reportes y persistencia de evidencia

Los reportes emitidos por perfiles no otorgan permiso para persistir
bookkeeping del lifecycle:

- `implementer` escribe únicamente source, schemas, registries, fixtures, tests
  o configuración dentro de `task_owned_source` y emite
  `implementation_report`.
- `doc_curator` escribe únicamente documentación dentro de `task_owned_docs` y
  emite `documentation_report`.
- `reviewer` permanece read-only y emite `external_review_report`.
- Validator es un componente determinista externo y read-only; solo puede usar
  un evidence sink explícito si otro contrato lo define y autoriza.
- Task Lifecycle o un evidence recorder determinista posee la persistencia de
  estado, la materialización de `RESULT.md` desde reportes existentes y la
  materialización de `REVIEW.md` después del handoff del review externo.

Ningún perfil recibe filesystem permission solo para persistir evidencia o
estado. Las fases son controladas por el Developer y delegation permanece
denegada.

### 3.5 Tools y skills

Tools y skills son allowlists explícitas de IDs portables, no nombres de
herramientas OpenCode.

```yaml
tools:
  default: deny
  allow: []
skills:
  default: deny
  allow: []
```

La ausencia de una allowlist equivale a lista vacía y debe fallar cerrada. Una
skill puede reducir o especializar operaciones, nunca ampliar permisos. Skills
personales, heredadas o globales no adquieren autoridad canónica. El registry
inicial usa listas vacías hasta que una autoridad posterior acepte IDs concretos.

### 3.6 Separación de modelo y runtime

`tecnotron-agent-profile/v1` prohíbe los campos `model`, `model_id`, `provider`,
`runtime`, `runtime_id`, `reasoning_effort`, `resource_pool`, `preference` y
`fallback`.

La secuencia futura permanece separada:

```text
profile identity
-> task-scoped model request opcional
-> Model Resolver
-> requested/resolved/observed identities
```

Cambiar el modelo no cambia responsabilidad, permisos ni profile ID.

### 3.7 Forma portable mínima

```yaml
schema_version: tecnotron-agent-profile/v1
common_required_inputs:
  - <closed-portable-common-input-id>
conditional_required_inputs:
  <profile-or-execution-class>:
    - <closed-portable-conditional-input-id>
profiles:
  <exact-profile-id>:
    responsibility: <closed-responsibility-id>
    required_inputs: [<closed-portable-profile-specific-input-id>]
    allowed_outputs: [<closed-portable-output-id>]
    permissions: <complete-deny-by-default-object>
    tools:
      default: deny
      allow: [<portable-capability-id>]
    skills:
      default: deny
      allow: [<project-declared-skill-id>]
```

El schema es strict en todos los niveles, usa enums cerrados, exige exactamente
las nueve keys, rechaza unknown fields y produce errores estables para fixtures
inválidas. Debe ser serializable en YAML/JSON y validable sin OpenCode. No admite
paths absolutos, repositorios hermanos, providers, productos requeridos, aliases
ni namespaces `fitflow-*`.

## 4. Validator determinista

Validator permanece fuera del conjunto de perfiles y no es una identidad LLM.
Puede ejecutar schemas, contract tests, lint, type checks, diff checks y comandos
reproducibles; produce exclusivamente `PASS`, `FAIL`, `NOT_RUN` o `UNAVAILABLE`.

Validator no interpreta requisitos ambiguos, selecciona perfiles/modelos,
realiza review semántico, escribe implementación, acepta ni integra trabajo. No
posee filesystem write; un evidence sink requiere definición contractual
explícita y pertenece a la persistencia determinista de evidencia. La
validación específica ejecutada por un writer no sustituye al Validator ni al
Reviewer independiente.

## 5. Scope y non-goals

Incluido:

- contrato `tecnotron-agent-profile/v1`;
- registry portable y schema estricto;
- fixtures y contract tests positivos y negativos;
- inventario de consumidores y frontera de compatibilidad;
- documentación contractual mínima.

Excluido:

- `.opencode/agents`, perfiles ejecutables y configuración OpenCode global;
- launcher, `tecnotron-agent-launch/v1` y ejecución real de perfiles;
- Router, Model Resolver, FinOps, runtime y telemetría;
- selección o cambio de modelos/providers;
- Task Lifecycle, Git/GitHub automation y cleanup;
- FitFlow y migración de consumidores legacy;
- WP-002 y posteriores;
- perfiles personales del Developer.

## 6. Compatibilidad y consumidores

`tecnotron-agent-profile/v1` es un contrato nuevo y separado de
`fitflow-role-registry/v3`. Los IDs `coder_*` fallan cerrados como profile IDs;
no existen aliases, mapping automático ni fallback a `implementer`.

Router, Model Resolver, Agent MVP, Actor y contratos `fitflow-*` existentes no se
modifican y no son consumidores del nuevo registry durante WP-001. El uso legacy
permanece encapsulado como compatibilidad existente.

Consumidores conocidos del nuevo contrato:

- schema loader y contract tests de Tecnotron-ai;
- registry portable implementado por `TOF-W1-001`;
- WP-002 para perfiles y launcher;
- WP-003 para responsabilidades SDD;
- WP-004 para asignación TASK/profile;
- WP-006 para navegación derivada.

## 7. Acceptance criteria

| ID | Criterio determinista |
| --- | --- |
| `AC-PROFILE-001` | `schema_version` acepta exclusivamente `tecnotron-agent-profile/v1`. |
| `AC-PROFILE-002` | El registry contiene exactamente los nueve IDs aprobados. |
| `AC-PROFILE-003` | Cada perfil posee una única responsabilidad, inputs y outputs enumerados. |
| `AC-PROFILE-004` | Solo `implementer` admite `task_owned_source`. |
| `AC-PROFILE-005` | Solo `doc_curator` admite `task_owned_docs`. |
| `AC-PROFILE-006` | Los otros siete perfiles son read-only. |
| `AC-PROFILE-007` | Todos declaran `delegation: denied`. |
| `AC-PROFILE-008` | Solo `researcher` declara web condicional a Research TASK autorizada. |
| `AC-PROFILE-009` | Todas las dimensiones aplican default deny y no existen permisos implícitos. |
| `AC-PROFILE-010` | Modelo, provider, runtime y preferencias no forman parte del contrato. |
| `AC-PROFILE-011` | Validator no aparece en el conjunto de perfiles. |
| `AC-PROFILE-012` | `coder_b`, `coder_a` y `coder_strong_a` son rechazados. |
| `AC-PROFILE-013` | Unknown fields, perfiles extras y permission values desconocidos fallan cerrados. |
| `AC-PROFILE-014` | El registry no contiene paths absolutos ni dependencia de FitFlow/OpenCode. |
| `AC-PROFILE-015` | Skills y tools no pueden ampliar los permisos del perfil. |
| `AC-PROFILE-016` | Contratos y tests no modifican Router, Model Resolver, FinOps, runtime ni launchers. |
| `AC-PROFILE-017` | Contract tests positivos y negativos finalizan `PASS` reproducible. |
| `AC-PROFILE-018` | Review independiente de contrato y security boundaries produce `PASS` antes del gate del Developer. |

## 8. Controles negativos obligatorios

Las fixtures deben rechazar:

- perfil faltante o décimo perfil;
- cualquier ID `coder_*`;
- segundo source writer;
- source write para `doc_curator`;
- doc write para otro perfil;
- write para un perfil read-only;
- delegation distinta de `denied`;
- web en cualquier perfil no `researcher`;
- web incondicional para `researcher`;
- permiso omitido o valor desconocido;
- model/provider/runtime binding;
- skill o tool que implique una capacidad denegada;
- Validator como perfil;
- unknown field;
- schema version legacy;
- dependencia, namespace o path específico de FitFlow;
- configuración global o launcher incluido por error.

La prueba dinámica de `researcher` sin Research TASK pertenece a WP-002 y no es
evidencia atribuible a WP-001.

## 9. Stop conditions y contexto

Detener WP-001 si se requiere modificar Router o Model Resolver, añadir otro
source writer, introducir model/provider/runtime binding, depender de FitFlow,
cambiar configuración OpenCode global, migrar consumidores legacy, habilitar
delegation, ampliar web fuera de la condición aceptada, resolver un conflicto
con contrato/ADR canónico o escribir otro repositorio/ownership.

Stop if the selected schema cannot express deny-by-default permissions without ambiguity.

```yaml
context_budget:
  class: medium
  policy: accepted_SPEC_plus_one_execution_unit
  expansion_limit: 2
```

El contexto usa esta SPEC y una slice de schema/registry/tests o un consumidor
por vez. Ante contradicción se consulta source directo; no se cargan research,
historia, conocimiento privado ni scans amplios por defecto.

## 10. Estado de materialización

La materialización fue revisada independientemente con `PASS` y aceptada por el
Developer. Esa aceptación no inició por sí sola `TOF-W1-001`; un ruling posterior
autorizó la ejecución desde `task_base`
`651e84de6524972cae925c067209705560b43f6d` y en worktree propio. La
implementación y la validación disponible están completas, con estado
`PENDING_REVIEW`; aceptación terminal, integración y publicación permanecen
pendientes.
