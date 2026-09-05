---
document_id: TOF-WP-002-SPEC-001
status: accepted
materialization_status: ACCEPTED
owner: tecnotron-ai
type: work-package-spec
version: 1.0
updated: 2026-09-04
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-002
contract: tecnotron-agent-launch/v1
authority_operation_id: TOF-WP002-DEVELOPER-DISPOSITION-01
materialization_operation_id: TOF-WP002-SPEC-MATERIALIZATION-01
accepted_decision_brief: TOF-WP002-PRE-SPEC-DECISION-BRIEF-01
developer_ruling: WP002_PRE_SPEC_DECISIONS_ACCEPTED
accepted_at: 2026-09-04
accepted_by: Developer
acceptance_operation_id: TOF-WP002-SPEC-ACCEPTANCE-01
acceptance_source_sha256: 4733259d18b3f64f58f31127b1de4ba1b2ee6ca2a09a9046d95fced04aaaf202
acceptance_evidence:
  - TOF-WP002-PRE-SPEC-DECISION-BRIEF-01
  - TOF-WP002-SPEC-REVIEW-01
  - TOF-WP002-SPEC-TARGETED-REREVIEW-01
  - TOF-WP002-SPEC-FINAL-VERIFICATION-01
  - TOF-WP002-SPEC-RUNTIME-ONLY-VERIFY-01
developer_dispositions:
  - OD-WP002-01
  - OD-WP002-02
  - OD-WP002-03
  - OD-WP002-04
  - OD-WP002-05
  - OD-WP002-06
related:
  - "[[milestones/tecnotron-operational-foundation-v1/PLAN]]"
  - "[[work-packages/wp-001-operational-profile-contracts/SPEC]]"
  - "[[contracts/tecnotron-agent-profile-v1]]"
  - "[[task-lifecycle]]"
  - "[[context-strategy]]"
---

# SPEC WP-002: Deterministic OpenCode Launchers

## 1. Estado, autoridad y lenguaje normativo

Esta SPEC fue aceptada por el Developer mediante
`TOF-WP002-SPEC-ACCEPTANCE-01` y satisface el gate
`WP-002_SPEC_ACCEPTANCE`. No crea autoridad de implementacion, no autoriza
TASKs y no demuestra conformance de OpenCode.

La precedencia aplicada es:

1. ruling del Developer `WP002_PRE_SPEC_DECISIONS_ACCEPTED` y disposiciones
   `OD-WP002-01` a `OD-WP002-06`;
2. Decision Brief aceptado `TOF-WP002-PRE-SPEC-DECISION-BRIEF-01`;
3. Milestone Plan aceptado de `tecnotron-operational-foundation-v1`;
4. SPEC y contrato aceptados de WP-001, incluido
   `tecnotron-agent-profile/v1`;
5. arquitectura, operacion, lifecycle, contexto, compatibilidad y estado
   canonicos de Tecnotron-ai.

Este documento distingue dos clases de afirmacion:

- **DESIGN REQUIREMENT (`DR`)**: comportamiento obligatorio que una futura
  implementacion debe satisfacer.
- **IMPLEMENTATION-TIME EVIDENCE (`ITE`)**: evidencia reproducible que debe
  producirse durante implementacion o conformance. Una exigencia `ITE` no afirma
  que el resultado exista o sea `PASS` hoy.

## 2. Problema, objetivo y resultado unico

### 2.1 Problema

Tecnotron-ai dispone de nueve contratos de perfil portables y de fronteras
existentes para proyecto, contexto, routing, resolucion de modelo y Agent
Runtime, pero no dispone de una operacion aceptada que proyecte esos contratos a
una invocacion OpenCode project-scoped, compruebe su autoridad y permisos antes
de ejecutar y normalice el resultado sin apropiarse del Task Lifecycle.

### 2.2 Objetivo

**DR-WP002-001.** WP-002 debe entregar una sola operacion de launch generica,
parametrizada por uno de los nueve profile IDs aceptados, y el contrato
`tecnotron-agent-launch/v1` para su request, preflight y resultado.

**DR-WP002-002.** La implementacion debe materializar exactamente nueve perfiles
OpenCode project-scoped, correspondientes uno a uno con:

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

Los perfiles OpenCode son una proyeccion ejecutable del registry aceptado, no
una segunda fuente semantica.

**DR-WP002-003.** Existe un launcher generico y un adapter OpenCode. Nueve
launchers, nueve adapters o aliases `coder_*` estan prohibidos.

### 2.3 Resultado unico

El resultado de WP-002 es una frontera reproducible:

```text
accepted authority + explicit profile + resolved project/worktree + bounded context
-> deterministic preflight
-> deny-by-default OpenCode invocation
-> normalized tecnotron-agent-launch/v1 result
```

## 3. Non-goals

WP-002 no incluye:

- devBrain, Developer Advisory ni dependencia operacional de devBrain;
- Developer role substitution general o nuevos contratos de invocacion del
  Developer;
- generalized Recipes, replacement Task Cycle ni rediseño de lifecycle;
- SDD authority/artifacts de WP-003;
- migracion o automatizacion general del Task Lifecycle de WP-004;
- persistencia general de observaciones de WP-005;
- reconstruccion documental de WP-006 ni cierre/promocion de WP-007;
- RAG, embeddings, vector retrieval o automatizacion de conocimiento cross-repo;
- provider benchmarking, ranking, fitness routing o model experiments;
- advanced FinOps;
- integracion de producto FitFlow;
- mutacion Git/GitHub, planning provider, workspace o configuracion OpenCode
  global;
- instalacion o actualizacion de dependencias;
- plugin o SDK de OpenCode salvo evidencia de implementacion que demuestre que
  el CLI adapter no puede cumplir una capacidad obligatoria;
- command broker futuro o native actor shell en v1;
- lifecycle persistence, gate transitions, aceptacion, integracion, publicacion
  o estado `DONE`.

## 4. Responsabilidades y fronteras

### 4.1 Launcher generico

**DR-WP002-004.** El launcher posee exclusivamente:

- validacion strict del request;
- correlacion de `operation_id` y `accepted_authority_ref`;
- carga y validacion del profile ID explicito;
- resolucion o comprobacion de proyecto, repositorio, cwd y worktree mediante la
  frontera existente;
- comprobacion de autorizaciones condicionales;
- comprobacion de contexto y referencias de modelo ya resueltas por sus owners;
- proyeccion determinista de permisos;
- construccion de entorno y configuracion de invocacion sanitizados;
- preflight de compatibilidad OpenCode;
- una invocacion mediante el adapter;
- validacion del output y normalizacion del resultado;
- emision de evidencia sanitizada hacia un sink inyectado cuando otro contrato
  lo autorice.

**DR-WP002-005.** El launcher no crea worktrees, no selecciona implicitamente un
perfil, no recupera autoridad desde contexto derivado, no acepta trabajo, no
ejecuta validacion de repositorio dentro del actor, no persiste lifecycle y no
realiza retry o fallback silencioso.

### 4.2 Reuse before invention

**DR-WP002-006.** La implementacion debe consumir antes de extender:

- `tecnotron-agent-profile/v1` como unica fuente de profile semantics;
- el Project Profile y `resolveProject` como frontera vigente de proyecto/root;
- ContextPackager y sus ports para contexto;
- Router y Model Resolver solo dentro de su ownership existente;
- Agent Runtime/adapter ports para la invocacion reemplazable;
- Validator externo para checks deterministas.

Una extension debe ser acotada y compatible. Si alguna frontera existente no
puede representar un requisito sin cambiar un contrato aceptado, la
implementacion se detiene para decision del Developer; no crea un resolver,
lifecycle, registry o sistema de recetas paralelo.

### 4.3 Frontera del Developer y del lifecycle

**DR-WP002-007.** El Developer conserva terminal, decisiones, overrides y
aceptacion. Su terminal manual y mecanismos ya autorizados no quedan gobernados
ni reemplazados por el launcher.

**DR-WP002-008.** Task Lifecycle o un recorder determinista autorizado puede
consumir el resultado. Debe usar `status` y `reason_code`; no puede inferir
aceptacion, integracion o gate transition desde exit code o `COMPLETED`.

## 5. Contrato `tecnotron-agent-launch/v1`

### 5.1 Request

**DR-WP002-009.** El request es strict, serializable como YAML/JSON, rechaza
unknown fields y tiene como forma conceptual minima:

```yaml
schema_version: tecnotron-agent-launch/v1
operation_id: stable-operation-id
accepted_authority_ref: immutable-or-versioned-authority-ref
profile_id: one-of-the-nine-accepted-profile-ids

project:
  project_profile_ref: explicit-ref
  repository_ref: explicit-ref
  cwd: explicit-path
  worktree_ref: explicit-ref-or-null

scope:
  read_scope: [declared-path-or-scope-ref]
  write_scope: [declared-path-or-scope-ref]

profile_inputs:
  <profile-specific-required-input-id>: explicit-ref

authorization:
  task_authorization_ref: null
  research_authorization_ref: null
  change_snapshot_ref: null
  validation_evidence_ref: null
  evidence_snapshot_ref: null
  evidence_matrix_ref: null

context:
  context_ref: explicit-ref-or-null
  evidence_requirements_ref: explicit-ref-or-null
  context_budget_ref: explicit-ref

model:
  request:
    state: EXPLICIT_CONSTRAINTS | AUTHORIZED_DETERMINISTIC_SELECTION
    request_ref: null
    model_ref: null
    provider_ref: null
    runtime_constraints_ref: null
  routing_decision_ref: null
  resolution_ref: null

environment:
  inherit: false
  task_scoped_inputs_ref: null

execution:
  adapter_id: opencode-cli
  timeout_ms: positive-integer
```

`operation_id + accepted_authority_ref` son coordenadas universales y
obligatorias. La referencia de autoridad debe ser resoluble, competente para la
operacion y compatible con el profile solicitado. La existencia de un documento
o la ausencia de TASK no constituyen por si mismas autoridad de ejecucion.

El request contiene referencias, no secretos ni blobs arbitrarios. Los schemas
de implementacion pueden estructurar mas estos campos sin cambiar su semantica,
pero no pueden eliminar las coordenadas universales, permitir defaults
permisivos ni introducir identidad de modelo dentro del perfil.

En `EXPLICIT_CONSTRAINTS`, el caller aporta una o mas constraints explicitas
sobre model, provider o runtime mediante al menos uno de `model_ref`,
`provider_ref` o `runtime_constraints_ref`; `model_ref` puede omitirse. Son
formas validas a nivel de schema, entre otras, model solamente, model + provider,
provider solamente, runtime solamente y provider + runtime. Esta validez permite
el preflight, no autoriza actor invocation ni deja una identidad sin resolver.
En `AUTHORIZED_DETERMINISTIC_SELECTION`, el caller no aporta ninguna de esas
tres constraints y una autoridad Tecnotron existente y competente permite que
Router/Model Resolver seleccione deterministicamente las coordenadas concretas.

Los common inputs de WP-001 se satisfacen desde los campos canonicos de
authority, project, scope y context; los conditional inputs se satisfacen desde
`authorization`; y `profile_inputs` transporta exactamente las keys especificas
de `required_inputs` del perfil seleccionado. Cada valor es una referencia
validable o un valor estructurado permitido por su contrato, nunca contexto
implicito. Faltantes, extras o inputs incompatibles bloquean el launch.

### 5.2 Resolucion canonica de autoridad

**DR-WP002-010A.** Antes de interpretar cualquier coordenada duplicada como
permiso, el launcher debe resolver `accepted_authority_ref` mediante su owner
existente y producir un unico envelope canonico de preflight. Este envelope es
un resultado runtime interno de `tecnotron-agent-launch/v1`; no es una nueva
fuente de autoridad, no crea lifecycle y no sustituye los contratos
competentes:

```yaml
resolved_authority:
  authority_kind: closed-v1-kind
  authority_id: stable-id-from-competent-source
  operation_id: stable-operation-id
  profile_id: one-of-the-nine-accepted-profile-ids

  project:
    project_id: resolved-project-id
    project_profile_ref: immutable-or-versioned-ref
    repository_root: canonical-path

  repository:
    repository_identity: stable-repository-ref
    worktree_path: canonical-path-or-null
    cwd: canonical-contained-path
    branch: exact-branch
    head_or_baseline: immutable-revision

  authorization:
    task_authorization_ref: ref-or-null
    research_authorization_ref: ref-or-null
    change_snapshot_ref: ref-or-null
    validation_evidence_ref: ref-or-null
    evidence_snapshot_ref: ref-or-null
    evidence_matrix_ref: ref-or-null

  scope:
    read_scope: [canonical-contained-scope]
    write_scope: [canonical-contained-scope]

  context:
    context_ref: ref-or-null
    evidence_requirements_ref: ref-or-null
    context_budget_ref: immutable-or-versioned-ref

  provenance:
    accepted_authority_ref: immutable-or-versioned-authority-ref
```

`authority_id` identifica el objeto competente resuelto;
`accepted_authority_ref` conserva la referencia aportada y su provenance. Los
campos universales requeridos para los cinco kinds son `authority_kind`,
`authority_id`, `operation_id`, `profile_id`, todas las coordenadas `project`,
`repository_identity`, `cwd`, `branch`, `head_or_baseline`, `read_scope`,
exactamente uno de `context_ref` o `evidence_requirements_ref`,
`context_budget_ref` y
`provenance.accepted_authority_ref`. `worktree_path` y las referencias de
autorizacion son condicionales segun la tabla; `write_scope` siempre se
materializa y es una lista vacia cuando la escritura esta prohibida.

El conjunto v1 de kinds y formas de autorizacion es cerrado:

| `authority_kind` / tipo de operacion | Profiles admitidos | `REQUIRED` adicional | `CONDITIONAL` | `FORBIDDEN` |
| --- | --- | --- | --- | --- |
| `READ_ONLY_ANALYSIS` | `spec_analyst`, `planner`, `architect`, `explorer` | `write_scope: []` | `worktree_path`, solo cuando la autoridad fija un worktree de lectura | TASK, research, change y evidence refs; `write_scope` no vacio |
| `TASK_OWNED_WRITE` | `implementer`, `doc_curator` | `task_authorization_ref`, `worktree_path`, `write_scope` no vacio | ninguna referencia adicional en v1 | research, change y evidence refs; worktree o scope no task-owned |
| `AUTHORIZED_RESEARCH` | `researcher` | `research_authorization_ref`, `write_scope: []` | `worktree_path`, solo cuando la autoridad fija un worktree de lectura | TASK, change y evidence refs; `write_scope` no vacio |
| `CHANGE_REVIEW` | `reviewer` | `change_snapshot_ref`, `validation_evidence_ref`, `write_scope: []` | `worktree_path`, solo si la autoridad competente fija la review a ese worktree | TASK, research y audit evidence refs; `write_scope` no vacio |
| `CONFORMANCE_AUDIT` | `auditor` | `evidence_snapshot_ref`, `evidence_matrix_ref`, `write_scope: []` | `worktree_path`, solo si la autoridad competente fija la auditoria a ese worktree | TASK, research y change refs; `write_scope` no vacio |

`FORBIDDEN` exige ausencia o `null`, segun la representacion strict; nunca
significa ignorar un valor aportado. Un kind desconocido, una combinacion
kind/profile no enumerada o un campo required/conditional/forbidden
incongruente bloquea antes del actor. La ausencia de TASK en
`READ_ONLY_ANALYSIS` sigue siendo valida cuando la autoridad competente no la
exige; no se generaliza a writers ni crea autoridad por ausencia.

**DR-WP002-010B.** Toda coordenada security-relevant que aparezca tanto en el
envelope como en request, required inputs del perfil, coordenadas de contexto o
worktree, scopes o referencias change/evidence debe quedar en exactamente uno
de estos estados:

```text
DERIVED
  generada deterministicamente desde resolved_authority

ASSERTED_AND_EQUAL
  aportada por separado y comparada por igualdad canonica con
  resolved_authority
```

No existe una tercera fuente independientemente autoritativa. Los aliases
portables de `profile_inputs` se derivan o se comparan con su coordenada
canonica; nunca pueden ampliarla. Paths se comparan despues de canonicalizacion
segura; refs, IDs, revisions y scopes se comparan con reglas typed y exactas de
sus owners. Cualquier mismatch bloquea antes de actor invocation:

| Mismatch | Reason code `BLOCKED` |
| --- | --- |
| La referencia no resuelve un envelope competente y completo | `AUTHORITY_RESOLUTION_FAILED` |
| Kind ausente, desconocido o incompatible con profile/operacion | `AUTHORITY_KIND_UNSUPPORTED` |
| `operation_id`, `profile_id`, authorization o required input difiere | `AUTHORITY_INPUT_MISMATCH` |
| Repository, root, cwd, branch, revision o worktree difiere | `WORKTREE_AUTHORITY_MISMATCH` |
| Read/write scope difiere o amplia autoridad | `SCOPE_AUTHORITY_MISMATCH` |
| Context ref, evidence requirements o budget difiere | `CONTEXT_AUTHORITY_MISMATCH` |

### 5.3 Autorizaciones condicionales

**DR-WP002-010.** Las condiciones de WP-001 se aplican aditivamente y se
resuelven dentro del envelope anterior:

| Condicion | Referencias obligatorias | Regla |
| --- | --- | --- |
| Cualquier launch | `operation_id`, `accepted_authority_ref` | La autoridad competente debe autorizar la operacion acotada. |
| `implementer` o `doc_curator` | `task_authorization_ref`, `worktree_ref`, `write_scope` no vacio | TASK y scope deben autorizar ese writer, repositorio y worktree. |
| `researcher` | `research_authorization_ref` | Debe autorizar pregunta y source policy; web solo se habilita si tambien esta autorizada para esa operacion. |
| `reviewer` | `change_snapshot_ref`, `validation_evidence_ref` | Review se fija a evidencia versionada y permanece read-only. |
| `auditor` | `evidence_snapshot_ref`, `evidence_matrix_ref` | Auditoria se fija al snapshot y scope declarados. |

Un launch read-only pre-SPEC puede ser valido sin implementation TASK cuando su
perfil y autoridad competente no la requieren. Esto no crea una excepcion para
writers ni convierte la ausencia de TASK en permiso.

### 5.4 Scope, contexto y entorno

**DR-WP002-011.** `read_scope` es obligatorio y debe estar contenido en el
repositorio resuelto. `write_scope` es una allowlist concreta de paths/scopes:
debe ser vacia para siete perfiles read-only y no vacia para los writers. La
clase semantica de permiso permanece separada:
`filesystem_write: task_owned_source` para `implementer` y
`filesystem_write: task_owned_docs` para `doc_curator`. La allowlist efectiva
siempre es interseccion, nunca union ampliada, de Profile, autoridad, TASK,
repositorio y worktree.

**DR-WP002-012.** `context_ref` y `evidence_requirements_ref` forman un one-of
segun el input portable `context_ref_or_evidence_requirements`. El launcher
valida referencias, integridad, budget y resultado del Context System, pero no
convierte un paquete derivado en autoridad ni reimplementa retrieval,
suficiencia o materializacion. Un estado de contexto que el owner existente no
autorice para ejecucion bloquea antes del actor.

**DR-WP002-013.** `environment.inherit` debe ser literalmente `false` en v1. Un
snapshot task-scoped opcional se resuelve desde una fuente autorizada y se
reduce a una allowlist de nombres no sensibles. El request y la evidencia nunca
incluyen valores secretos.

### 5.5 Resultado normalizado

**DR-WP002-014.** Todo intento que supera el parse minimo devuelve, cuando sea
posible, un resultado strict con esta forma conceptual:

```yaml
schema_version: tecnotron-agent-launch/v1
operation_id: stable-operation-id
accepted_authority_ref: immutable-or-versioned-authority-ref
profile_id: accepted-profile-id-or-null
status: COMPLETED | BLOCKED | FAILED | UNAVAILABLE
reason_code: stable-closed-code
phase: REQUEST | PREFLIGHT | ADAPTER | OUTPUT_NORMALIZATION | COMPLETED

resolved:
  project_profile_ref: ref-or-null
  repository_ref: ref-or-null
  worktree_ref: ref-or-null
  cwd: path-or-null

authority:
  authority_kind: closed-v1-kind-or-null
  authority_id: stable-id-or-null
  envelope_digest: sha256-or-null
  congruence_status: DERIVED | ASSERTED_AND_EQUAL | MIXED_CONGRUENT | MISMATCH | NOT_EVALUATED

identity:
  request_state: EXPLICIT_CONSTRAINTS | AUTHORIZED_DETERMINISTIC_SELECTION | null
  requested_model_ref: ref-or-null
  requested_provider_ref: ref-or-null
  model_request_ref: ref-or-null
  resolved_model_ref: ref-or-null
  resolved_provider_ref: ref-or-null
  resolved_runtime_ref: ref-or-null
  model_resolution_ref: ref-or-null
  observed_model_ref: ref-or-null
  observed_provider_ref: ref-or-null
  observed_runtime_ref: ref-or-null
  observed_runtime_version: exact-version-or-null

configuration:
  projected_config_digest: sha256-or-null
  effective_config_digest: sha256-or-null
  effective_permission_digest: sha256-or-null
  proof_mechanism: INVOCATION_ISOLATION | EFFECTIVE_CONFIG_PROBE | BOTH | null
  conformance_status: CONFORMANT | SAFELY_NARROWER | UNPROVABLE | MISMATCH | BROADER | NOT_EVALUATED
  capability_evidence_ref: sanitized-ref-or-null

evidence:
  request_digest: sha256-or-null
  profile_digest: sha256-or-null
  permission_projection_digest: sha256-or-null
  conformance_evidence_ref: ref-or-null
  output_refs: []

process:
  exit_code: integer-or-null
  started_at: timestamp-or-null
  finished_at: timestamp-or-null

details: sanitized-string-or-null
```

`COMPLETED` significa solo que la operacion acotada del launcher termino
correctamente y el output cumplio su contrato. No significa validation `PASS`,
review `PASS`, Developer `ACCEPTED`, integrado, publicado ni `DONE`.

### 5.6 Taxonomia inicial de reason codes

**DR-WP002-015.** Cada code pertenece a un unico status. Los consumidores no
interpretan substrings ni exit codes.

| Status | Reason codes v1 |
| --- | --- |
| `COMPLETED` | `LAUNCH_OPERATION_COMPLETED` |
| `BLOCKED` | `REQUEST_INVALID`, `AUTHORITY_RESOLUTION_FAILED`, `AUTHORITY_KIND_UNSUPPORTED`, `AUTHORITY_INSUFFICIENT`, `AUTHORITY_INPUT_MISMATCH`, `WORKTREE_AUTHORITY_MISMATCH`, `SCOPE_AUTHORITY_MISMATCH`, `CONTEXT_AUTHORITY_MISMATCH`, `PROFILE_UNKNOWN`, `PROFILE_CONTRACT_INVALID`, `CONDITIONAL_AUTHORIZATION_MISSING`, `PROJECT_RESOLUTION_REJECTED`, `REPOSITORY_REF_MISMATCH`, `CWD_OUTSIDE_REPOSITORY`, `WORKTREE_REQUIRED`, `WORKTREE_MISMATCH`, `SCOPE_INVALID`, `CONTEXT_NOT_READY`, `MODEL_REQUEST_UNSUPPORTED`, `MODEL_INELIGIBLE`, `PROVIDER_INELIGIBLE`, `MODEL_SELECTION_UNRESOLVED`, `PERMISSION_PROJECTION_DENIED`, `PERMISSION_PROJECTION_UNPROVABLE`, `EFFECTIVE_CONFIG_UNPROVABLE`, `EFFECTIVE_CONFIG_MISMATCH`, `EFFECTIVE_PERMISSION_BROADENING`, `NATIVE_SHELL_DENIED`, `WEB_AUTHORIZATION_MISSING`, `DELEGATION_DENIED`, `PAID_API_DISABLED`, `GLOBAL_CONFIG_MUTATION_DENIED`, `PROFILE_MODEL_BINDING_DENIED` |
| `FAILED` | `ADAPTER_INVOCATION_FAILED`, `ADAPTER_TIMEOUT`, `ADAPTER_ABORTED`, `MALFORMED_ADAPTER_OUTPUT`, `OBSERVED_IDENTITY_MISMATCH`, `RUNTIME_PERMISSION_VIOLATION`, `OUTPUT_CONTRACT_VIOLATION`, `EVIDENCE_SANITIZATION_FAILED` |
| `UNAVAILABLE` | `OPENCODE_NOT_FOUND`, `OPENCODE_VERSION_UNSUPPORTED`, `OPENCODE_CONFORMANCE_UNAVAILABLE`, `CONTEXT_PROVIDER_UNAVAILABLE`, `MODEL_RESOLUTION_UNAVAILABLE`, `PROVIDER_RUNTIME_UNAVAILABLE` |

Un futuro code requiere versionado compatible del contrato; no puede cambiar de
status ni de significado dentro de v1.

## 6. Perfil explicito y separacion de modelo

**DR-WP002-016.** `profile_id` siempre es explicito. Router no lo selecciona,
Model Resolver no lo redefine y el adapter debe recibirlo como identidad
independiente hasta la invocacion observada.

**DR-WP002-017.** La secuencia de identidad es:

```text
explicit operational profile
                     \ independent from /
requested constraints or authorized deterministic selection
                     -> Router/Model Resolver -> resolved model/provider/runtime
                     -> OpenCode adapter -> observed model/provider/runtime
```

El request usa exactamente uno de dos estados cerrados:

| `model.request.state` | `REQUIRED` | `CONDITIONAL` | `FORBIDDEN` |
| --- | --- | --- | --- |
| `EXPLICIT_CONSTRAINTS` | `request.request_ref` y al menos uno de `request.model_ref`, `request.provider_ref` o `request.runtime_constraints_ref`; `request.model_ref` no es obligatorio | `routing_decision_ref`, `resolution_ref` | seleccionar fuera de las constraints o sustituirlas silenciosamente |
| `AUTHORIZED_DETERMINISTIC_SELECTION` | ausencia de `request.model_ref`, `request.provider_ref` y `request.runtime_constraints_ref`, mas autoridad existente y competente para seleccionar deterministicamente | `routing_decision_ref`, `resolution_ref` | identidad/constraints explicitas bajo `request` y cualquier default implicito de OpenCode |

`resolution_ref` puede llegar ya resuelta o ser producido durante preflight por
el owner existente; su nullabilidad en el request no permite invocacion sin
resolucion. En `EXPLICIT_CONSTRAINTS`, omitir `model_ref` significa que el owner
existente debe resolver un model concreto que satisfaga conjuntamente las
constraints de provider/runtime aportadas; no significa model sin resolver. En
`AUTHORIZED_DETERMINISTIC_SELECTION`, la ausencia de las tres constraints
explicitas significa que la autoridad competente permite la seleccion
determinista, no que OpenCode pueda seleccionar implicitamente.

**DR-WP002-017A.** Ambos estados legales convergen en el mismo invariante: antes
de invocar un actor debe existir una seleccion concreta elegible con
`resolved_model_ref`, `resolved_provider_ref`, `resolved_runtime_ref` y
`model_resolution_ref`. La seleccion debe satisfacer conjuntamente:

- elegibilidad vigente del model registry y FinOps;
- constraints de role/routing cuando apliquen, sin derivar role desde profile;
- constraints explicitas del request, cuando existan;
- paid API disabled;
- disponibilidad del provider/runtime;
- ausencia de binding profile->model/provider/runtime.

Un request o seleccion soportado pero policy-ineligible produce
`BLOCKED/MODEL_INELIGIBLE` o `BLOCKED/PROVIDER_INELIGIBLE`; una forma de request
no soportada produce `BLOCKED/MODEL_REQUEST_UNSUPPORTED`; una seleccion que no
queda concreta o determinista produce `BLOCKED/MODEL_SELECTION_UNRESOLVED`. La
indisponibilidad del resolver produce `UNAVAILABLE/MODEL_RESOLUTION_UNAVAILABLE`
y la del provider/runtime ya elegible produce
`UNAVAILABLE/PROVIDER_RUNTIME_UNAVAILABLE`. Estas dependencias no se confunden
con ineligibility de policy.

OpenCode default model/provider selection nunca es un mecanismo valido de
resolucion para WP-002. Si la resolucion determinista de Tecnotron no produce las
tres coordenadas concretas y elegibles, el launcher devuelve el resultado no
exitoso normalizado que corresponda segun los reason codes anteriores y no
invoca al actor.

Requested constraints/identity, resolved identity y observed runtime identity
se preservan como evidencia separada aun cuando coincidan. Una sustitucion solo
es valida si la policy de routing/resolucion aceptada la permite y la resolucion
registra la identidad resultante; no existe fallback a un model/provider no
relacionado. Una diferencia material no autorizada entre resolved y observed
falla como `FAILED/OBSERVED_IDENTITY_MISMATCH`, nunca como `COMPLETED`. Un cambio
de model/provider no cambia responsabilidad, permisos ni profile ID.

**DR-WP002-018.** Estan prohibidos campos o datos persistidos que creen:

```text
profile -> role
profile -> model
profile -> provider
```

Router y Model Resolver pueden producir una decision independiente. Si el Model
Resolver legacy requiere un role, un bridge acotado puede consumir una decision
de routing o resolucion ya autorizada para esa invocacion, pero no puede inferir
role desde profile, persistir un mapping ni usar role para sustituir profile.

## 7. Resolucion de proyecto, repositorio y worktree

**DR-WP002-019.** La resolucion parte de `project_profile_ref` y
`repository_ref` explicitos. Debe usar la frontera portable existente y validar
source directo. No puede inferir checkouts por paths hermanos, cwd heredado,
metadata de Orca, index de codigo o contexto empaquetado.

**DR-WP002-020.** El preflight comprueba deterministicamente:

- Project Profile existente, valido y consistente con sus roots;
- repository ref y root canonizados sin symlink/path traversal fuera de scope;
- cwd existente y contenido en el repositorio resuelto;
- Git repository, branch/HEAD y worktree identity observables;
- para writers, worktree task-scoped y coincidencia exacta con TASK y scope;
- para read-only, ausencia de mutacion aunque se use un worktree ya resuelto;
- ninguna responsabilidad de workspace/session transferida al launcher.

Un root explicito de la operacion puede resolver Tecnotron-ai directamente. Los
nombres de entorno `FF_PROJECT_*` permanecen compatibilidad de implementacion y
no se convierten en identidad del contrato.

## 8. Frontera ContextPackager

**DR-WP002-021.** ContextPackager conserva requirements, retrieval
orchestration, budget, coverage, fallback y telemetria. `repo-packager` conserva
solo materializacion. Explorer conserva la decision semantica que su contrato le
asigne. El launcher no absorbe esas responsabilidades.

**DR-WP002-022.** El launcher puede:

- consumir un paquete por referencia y digest;
- solicitar al port existente que atienda evidence requirements;
- exigir que el estado resultante permita la operacion;
- registrar status, coverage, providers y fallback por referencia.

No puede tratar `COMPLETE` como autoridad, ocultar `PARTIAL`/`EMPTY`, inventar
evidencia faltante ni añadir RAG/vector retrieval.

## 9. Proyeccion efectiva de permisos

### 9.1 Regla general

**DR-WP002-023.** La proyeccion efectiva es determinista y monotonicamente
restrictiva:

```text
effective permission
= intersection(
  accepted profile,
  accepted authority,
  conditional authorization,
  resolved repository/worktree scope,
  adapter capability proven by conformance
)
```

Una dimension unknown, unsupported, ambigua o no demostrable bloquea. Ningun
default, runtime primitive, tool, skill, MCP, plugin, adapter o config heredada
puede ampliar el contrato portable.

### 9.2 Tools, skills y primitivas nativas

**DR-WP002-024.** `tools.allow: []` y `skills.allow: []` significan que no hay
tools o skills adicionales autorizadas. No invalidan una primitiva nativa del
runtime cuando sea la implementacion determinista y probada de una dimension
semantica ya autorizada, por ejemplo lectura dentro de `read_scope` o escritura
dentro del `write_scope` de un writer.

La primitiva nativa debe estar identificada en la matriz de proyeccion, no tener
efectos adicionales y pasar controles de escape de scope. Si no puede probarse,
se deniega.

### 9.3 Native shell v1

**DR-WP002-025.** Native actor shell/bash/terminal/command execution esta
denegado para los nueve perfiles en WP-002 v1, incluso cuando el valor semantico
de WP-001 sea `read_only_deterministic` o `task_validation`.

Los checks de lectura determinista y validacion de repositorio se ejecutan fuera
del LLM actor por Validator, lifecycle o launcher preflight autorizado. No se
usan command globs permisivos para containment transitivo. Si una operacion
aceptada demostrara que un command broker es indispensable, se requiere una
nueva decision; no forma parte de esta SPEC.

### 9.4 Web, delegation y paid API

**DR-WP002-026.** Web permanece denegada salvo para `researcher` con
`research_authorization_ref` valido. La habilitacion debe cerrar escapes por
shell, skills, tools, MCP, plugins y adapters. Si el runtime no puede demostrar
esa separacion, el launch se bloquea.

**DR-WP002-027.** Delegation, subagents y task spawning permanecen denegados;
`subagent_depth` es exactamente `0`. Git mutation, planning provider mutation,
workspace lifecycle, dependency mutation y secret access permanecen denegados.
Paid API permanece disabled sin fallback.

## 10. Configuracion OpenCode y sanitizacion

**DR-WP002-028.** La configuracion proyectada de OpenCode es el artefacto
`INTENDED/PROJECTED` construido deterministicamente desde profile, resolved
authority, resolucion de identidad y permission projection. Es deny-by-default,
project-scoped o invocation-scoped y reproducible. Debe:

- seleccionar exactamente el profile ID solicitado;
- proyectar todas las dimensiones de permiso de forma explicita;
- deshabilitar shell, delegation/subagents y capacidades adicionales;
- impedir lectura/escritura fuera de scopes resueltos;
- impedir web salvo la condicion de `researcher`;
- excluir tools, skills, MCP y plugins no autorizados;
- separar profile de modelo/provider;
- producir `projected_config_digest` sanitizado y verificable.

El config proyectado y su digest expresan intencion; no demuestran por si solos
la configuracion `RUNTIME-RESOLVED EFFECTIVE` que OpenCode aplicara.

**DR-WP002-028A.** Para cada intento, despues de fijar executable/version, cwd,
entorno y argumentos y antes de actor invocation, el adapter debe producir una
prueba por al menos uno de estos mecanismos:

```text
A. INVOCATION_ISOLATION
   aislar la invocacion de forma determinista y demostrar que todas las capas
   no autorizadas quedan excluidas;

B. EFFECTIVE_CONFIG_PROBE
   obtener del runtime la configuracion efectiva resuelta y comparar sus
   capacidades y permisos security-relevant con la proyeccion.
```

Esta SPEC no selecciona A o B sin evidencia de implementacion. En ambos casos
se calcula un `effective_config_digest`, se obtiene evidencia sanitizada de
capabilities/permisos efectivos y se prueba que el runtime no amplia la
proyeccion. La prueba es per-invocation y no puede sustituirse por el digest
proyectado, por conformance historica de la version ni por inspeccion aislada de
un unico archivo.

El inventario a excluir o inspeccionar se deriva de la version exacta soportada
y debe cubrir, cuando esa version los exponga, remote/organizational config,
global/personal config, custom config file/directory, project config,
directorios `.opencode`, inline config y managed config; sustituciones de
entorno/archivo; agents, commands, skills, plugins, MCP y custom tools;
provider/model overrides y credentials discovery; permissions, auto/approval
mode, external directories, shell y web; sharing, autoupdate y
task/subagent/delegation capabilities. Una categoria no soportada por la version
exacta se registra como no aplicable desde conformance; no se inventa un
mecanismo o valor.

Actor invocation esta prohibida salvo que la configuracion efectiva quede
probada como `CONFORMANT` o `SAFELY_NARROWER`. Unknown o uninspectable produce
`BLOCKED/EFFECTIVE_CONFIG_UNPROVABLE`; contradiccion entre proyeccion y config
efectiva produce `BLOCKED/EFFECTIVE_CONFIG_MISMATCH`; cualquier capability o
permiso mas amplio produce `BLOCKED/EFFECTIVE_PERMISSION_BROADENING`. Ninguno de
esos estados puede degradarse a warning o resolverse mediante prompt interactivo.

**DR-WP002-029.** Esta prohibido crear o modificar configuracion OpenCode
global, personal o fuera del repositorio/worktree autorizado. La implementacion
no puede depender de perfiles, agents, skills, plugins, credentials o defaults
globales heredados. Si la precedencia/config discovery del CLI no puede aislarse
y probarse mediante `DR-WP002-028A`, la version es incompatible.

**DR-WP002-030.** El proceso hijo recibe un entorno reconstruido desde cero con
el minimo de variables de sistema y entradas task-scoped allowlisted. Debe
eliminar como minimo:

- API keys, tokens, cookies, credential paths y valores secret-like;
- variables de configuracion global/personal de OpenCode;
- variables de shell startup, command injection o dynamic loading no requeridas;
- roots, cwd o paths no coincidentes con la resolucion aceptada;
- provider/model overrides no representados por la resolucion registrada.

Credenciales, si una implementacion futura las requiere, deben llegar por un
canal opaco que el actor no pueda leer, estar expresamente autorizado y mantener
paid API disabled. En ausencia de prueba, el runtime es `UNAVAILABLE`; nunca se
inyecta el secreto en request, prompt, output o evidencia.

**DR-WP002-030A.** `configuration.capability_evidence_ref` referencia solo una
representacion sanitizada suficiente para comparar capabilities y permisos:
source category y estado aplicado/excluido, IDs no secretos de
model/provider/runtime, tool/capability IDs, reglas efectivas normalizadas y
digests. Raw config, variables de entorno, credentials, tokens, headers, cookies,
prompts completos y valores secret-like no entran al resultado normalizado. Si
la evidencia no puede sanitizarse sin perder la prueba, el launch no continua.

## 11. Adapter OpenCode y conformance

### 11.1 Frontera CLI

**DR-WP002-031.** El adapter preferido es un CLI adapter reemplazable. Recibe
solo request preflighted, profile explicito, configuracion efectiva, contexto y
resolucion de modelo; invoca OpenCode una vez; captura output/exit/timeout; y
devuelve datos sin semantica de lifecycle.

Plugin o SDK no se incorpora salvo evidencia `ITE` de que una capacidad
obligatoria es imposible mediante CLI. Esa evidencia no autoriza por si sola la
alternativa: requiere decision de implementacion dentro de una TASK aceptada y
sin ampliar arquitectura.

### 11.2 Capacidades OpenCode requeridas

**DR-WP002-032.** Una version soportada debe demostrar:

- discovery de version exacta sin ejecutar un actor;
- invocacion no interactiva y timeout/abort controlable;
- seleccion explicita de cwd, configuracion aislada y profile/agent;
- precedencia de configuracion verificable y proof per-invocation mediante
  isolation o effective-config probe;
- enforcement de read/write scope, shell denied, web conditional, delegation
  denied y ausencia de tools/skills/plugins/MCP adicionales;
- paso independiente de requested/resolved model sin alterar profile;
- observacion de runtime, provider y model efectivos suficiente para comparar
  su identidad con la resolucion preflight;
- output machine-readable o una normalizacion no ambigua;
- exit y errores distinguibles sin inferir aceptacion;
- sanitizacion de entorno, prompts, diagnostics y artifacts.

### 11.3 Boundary de versiones

**DR-WP002-033.** No se acepta cualquier OpenCode instalado. La implementacion
mantiene una boundary explicita de versiones soportadas derivada de conformance
reproducible. Una version o rango solo puede añadirse despues de demostrar todas
las capacidades obligatorias y todos los controles positivos/negativos
aplicables.

La observacion historica de OpenCode CLI `1.18.21` en
`docs/compatibility-baseline.md` no constituye soporte de WP-002. Esta SPEC no
inventa un rango compatible. Version ausente, distinta de la boundary probada o
sin evidencia vigente produce `UNAVAILABLE/OPENCODE_VERSION_UNSUPPORTED` o
`UNAVAILABLE/OPENCODE_CONFORMANCE_UNAVAILABLE` antes de invocar el actor.

### 11.4 Evidencia de conformance

**ITE-WP002-001.** Por cada version soportada deben registrarse:

- version exacta de OpenCode y del adapter;
- plataforma y command surface observadas;
- matriz capability -> probe/test -> resultado;
- configuracion proyectada y efectiva con digests distintos;
- mecanismo per-invocation usado (`INVOCATION_ISOLATION` o
  `EFFECTIVE_CONFIG_PROBE`), con capability/effective-permission evidence
  sanitizada y conformance status;
- pruebas de precedencia y aislamiento de configuracion;
- matriz completa de proyeccion de los nueve perfiles;
- positive y negative smokes;
- requested/resolved/observed identity evidence;
- status/reason-code normalization evidence;
- ausencia de global config mutation, secrets, shell, delegation y paid API;
- review independiente de security/runtime boundaries.

La evidencia debe distinguir `PASS`, `FAIL`, `NOT_RUN` y `UNAVAILABLE`. Solo
`PASS` de toda capacidad obligatoria incorpora una version a la boundary.

## 12. Preflight determinista

**DR-WP002-034.** El orden fail-closed es:

1. parse strict y version del request;
2. validar `operation_id`, resolver `accepted_authority_ref` al
   `resolved_authority` typed y rechazar kind/profile incompatible;
3. derivar o comparar por igualdad cada input security-relevant duplicado;
4. cargar y validar `tecnotron-agent-profile/v1`, exactamente nueve perfiles;
5. validar `profile_id` explicito y required inputs;
6. resolver Project Profile, repository, cwd y worktree desde referencias
   explicitas;
7. comprobar autorizaciones condicionales y scopes contra el envelope;
8. comprobar context ref/evidence requirements mediante la frontera existente;
9. resolver request/routing de modelo a una identidad concreta elegible de
   model/provider/runtime y comprobar disponibilidad;
10. calcular la interseccion de permisos y bloquear unknown/unprovable;
11. comprobar paid API disabled y native shell/delegation denied;
12. comprobar CLI exacto contra capability/version boundary vigente;
13. construir entorno y configuracion proyectada aislados y sanitizados;
14. demostrar per-invocation la configuracion efectiva mediante isolation o
    effective-config probe y bloquear unknown, mismatch o broadening;
15. calcular digests distintos de config proyectada/efectiva y preparar
    evidencia sanitizada sin secretos;
16. invocar una vez el adapter;
17. validar output, identidad observed contra resolved y artifacts;
18. normalizar resultado sin transicion de lifecycle.

Ningun paso posterior se ejecuta cuando falla uno anterior. La validacion de
repositorio que no requiere razonamiento ocurre fuera del actor.

## 13. Fallo, recovery e idempotencia

**DR-WP002-035.** La semantica de fallo es:

- `BLOCKED`: una politica, autoridad, scope o precondicion conocida impide el
  launch; el actor no se invoca;
- `UNAVAILABLE`: una capacidad o dependencia necesaria no esta disponible o no
  tiene conformance demostrada; no se reporta `PASS`;
- `FAILED`: el adapter fue invocado o la normalizacion posterior fallo;
- `COMPLETED`: la operacion acotada finalizo y su output contractual es valido.

**DR-WP002-036.** No hay fallback silencioso de profile, model, provider,
version, config, cwd, worktree, context o permissions. No hay auto-retry en v1.
Una recuperacion requiere corregir la causa, preservar las mismas coordenadas de
autoridad mientras sigan vigentes, generar un intento auditable y repetir todo
el preflight. Un output parcial o malformed se conserva solo como evidencia
sanitizada y nunca se promueve a `COMPLETED`.

**DR-WP002-037.** Abort y timeout intentan terminar el proceso hijo y cualquier
descendiente permitido por el adapter. La implementacion debe demostrar que no
deja actor, child process o write fuera del scope; si no puede demostrarlo, no es
operacional.

## 14. Invariantes de seguridad

**DR-WP002-038.** Son invariantes no negociables:

- exactamente nueve perfiles aceptados y un launcher generico;
- profile independiente de role/model/provider;
- resolved authority envelope unico y toda coordenada duplicada DERIVED o
  ASSERTED_AND_EQUAL;
- deny-by-default y effective permissions nunca mas amplios que WP-001;
- effective OpenCode configuration probada per-invocation como conforme o mas
  restrictiva que la proyeccion;
- model/provider/runtime concretos y elegibles antes de actor invocation, sin
  default implicito de OpenCode;
- native actor shell denied en v1;
- delegation/subagents denied;
- paid API disabled;
- global OpenCode configuration mutation denied;
- secretos ausentes de actor, request, output y evidencia;
- writer requiere TASK, worktree y scope congruentes;
- read-only pre-SPEC no requiere TASK cuando su autoridad competente no la
  exige, pero siempre requiere autoridad explicita;
- project/worktree identity proviene de source explicito, no de topologia o
  contexto derivado;
- ContextPackager no adquiere autoridad y launcher no adquiere retrieval;
- Validator y checks deterministas permanecen externos al actor;
- launcher no acepta, integra, publica, crea `DONE` ni persiste lifecycle;
- devBrain no es dependencia operacional;
- ninguna Recipe, role substitution o replacement Task Cycle es creado.

## 15. Acceptance y conformance tests

### 15.1 Positive tests obligatorios

**ITE-WP002-002.** Deben producir `PASS` reproducible:

| ID | Caso positivo |
| --- | --- |
| `AC-LAUNCH-001` | El schema acepta un request minimo valido con las dos coordenadas universales. |
| `AC-LAUNCH-002` | Exactamente los nueve perfiles son discoverable project-scoped y preservan su ID hasta el adapter. |
| `AC-LAUNCH-003` | Una operacion read-only pre-SPEC con autoridad competente se ejecuta sin implementation TASK y sin escritura. |
| `AC-LAUNCH-004` | `implementer` se ejecuta solo con TASK, worktree y source scope congruentes. |
| `AC-LAUNCH-005` | `doc_curator` se ejecuta solo con TASK, worktree y docs scope congruentes. |
| `AC-LAUNCH-006` | `researcher` habilita web solo con Research authorization valida y sin rutas indirectas. |
| `AC-LAUNCH-007` | `reviewer` se ejecuta read-only solo con change snapshot y validation evidence versionados. |
| `AC-LAUNCH-008` | `auditor` se ejecuta read-only solo con evidence snapshot y matrix versionados. |
| `AC-LAUNCH-009` | Una primitiva nativa de lectura opera dentro de scope con tools/skills adicionales vacias. |
| `AC-LAUNCH-010` | Requested constraints/identity, resolved model/provider/runtime y observed model/provider/runtime se registran separados sin cambiar profile. |
| `AC-LAUNCH-011` | Project Profile, repository, cwd y worktree explicitos se resuelven sin sibling inference. |
| `AC-LAUNCH-012` | ContextPackager/result refs, coverage y digest atraviesan la frontera sin convertirse en autoridad. |
| `AC-LAUNCH-013` | Cada status normalizado usa solamente reason codes de su clase. |
| `AC-LAUNCH-014` | La version exacta soportada satisface toda la matriz capability-based. |
| `AC-LAUNCH-015` | Timeout y abort producen resultado estable y no dejan procesos o writes. |
| `AC-LAUNCH-016` | La evidencia contiene digests distintos de config proyectada/efectiva, effective permissions y referencias requeridas sin secretos. |
| `AC-LAUNCH-017` | Los cinco authority kinds aceptan solo sus combinaciones REQUIRED/CONDITIONAL/FORBIDDEN y producen un envelope canonico. |
| `AC-LAUNCH-018` | Cada coordenada security-relevant duplicada es DERIVED o ASSERTED_AND_EQUAL antes del actor. |
| `AC-LAUNCH-019` | La invocacion prueba per-invocation isolation o effective config y solo continua con `CONFORMANT` o `SAFELY_NARROWER`. |
| `AC-LAUNCH-020` | `EXPLICIT_CONSTRAINTS` con `model_ref` es elegible para invocacion cuando la resolucion determinista produce model/provider/runtime concretos y elegibles que satisfacen las constraints. |
| `AC-LAUNCH-021` | `EXPLICIT_CONSTRAINTS` con `provider_ref` solamente es elegible para invocacion cuando el resolver determinista elige model/runtime concretos y elegibles que satisfacen ese provider. |
| `AC-LAUNCH-022` | `AUTHORIZED_DETERMINISTIC_SELECTION` sin constraints explicitas es elegible para invocacion cuando la autoridad competente permite que el resolver elija model/provider/runtime concretos y elegibles. |
| `AC-LAUNCH-023` | `EXPLICIT_CONSTRAINTS` con `runtime_constraints_ref` solamente es schema-valid y elegible para invocacion cuando el resolver determinista evalua esa constraint y produce model/provider/runtime concretos y elegibles; omitir `model_ref` y `provider_ref` no autoriza seleccion implicita de OpenCode ni invocacion antes de resolver las tres identidades. |

### 15.2 Negative tests obligatorios

**ITE-WP002-003.** Deben demostrar fail-closed:

| ID | Caso rechazado o no disponible |
| --- | --- |
| `NC-LAUNCH-001` | Falta `operation_id` o `accepted_authority_ref`; la ausencia de TASK no se interpreta como autoridad. |
| `NC-LAUNCH-002` | Profile desconocido, retirado `coder_*`, decimo perfil o alias. |
| `NC-LAUNCH-003` | Writer sin TASK/worktree/write scope o con ownership incongruente. |
| `NC-LAUNCH-004` | Perfil read-only intenta escribir o mutar Git/provider/workspace/dependencies. |
| `NC-LAUNCH-005` | Cwd, repository o worktree sale del root/scope, usa symlink escape o depende de sibling inference. |
| `NC-LAUNCH-006` | `researcher` omite Research authorization o intenta web fuera de lo autorizado. |
| `NC-LAUNCH-007` | Cualquier perfil intenta native shell, delegation, subagent o task spawn. |
| `NC-LAUNCH-008` | Tool, skill, MCP, plugin, adapter o primitiva nativa amplia una dimension denegada. |
| `NC-LAUNCH-009` | Paid API esta enabled o no puede probarse disabled. |
| `NC-LAUNCH-010` | Cualquier capa/config source heredada no autorizada queda uninspectable, contradice la proyeccion o amplia la configuracion efectiva. |
| `NC-LAUNCH-011` | Entorno contiene secret-like input, provider override o root conflictivo. |
| `NC-LAUNCH-012` | Permission value unknown, projection ambigua o comportamiento no demostrable. |
| `NC-LAUNCH-013` | Se introduce binding profile->role/model/provider o el Router sustituye el profile explicito. |
| `NC-LAUNCH-014` | Version OpenCode ausente, arbitraria, unsupported o sin conformance vigente. |
| `NC-LAUNCH-015` | Context ref invalido, tampered, insuficiente o unavailable segun su owner. |
| `NC-LAUNCH-016` | Adapter output malformed, output contract invalido o observed identity no coincide con resolved identity. |
| `NC-LAUNCH-017` | Exit cero sin output valido no produce `COMPLETED`. |
| `NC-LAUNCH-018` | `COMPLETED` no muta lifecycle ni implica validation/review/acceptance/integration/publication/DONE. |
| `NC-LAUNCH-019` | `reviewer` omite o mezcla change snapshot/validation evidence, o intenta escribir. |
| `NC-LAUNCH-020` | `auditor` omite o mezcla evidence snapshot/matrix, o intenta escribir. |
| `NC-LAUNCH-021` | Falta, sobra o no valida un profile-specific required input de WP-001. |
| `NC-LAUNCH-022` | Authority kind desconocido, incompatible con profile o con campos REQUIRED/CONDITIONAL/FORBIDDEN. |
| `NC-LAUNCH-023` | Un input duplicado de operation, profile, worktree, scope, context, change o evidence difiere del resolved authority envelope. |
| `NC-LAUNCH-024` | Solo existe config proyectada/digest, falta proof per-invocation, o effective config es unknown, uninspectable, contradictory o broader. |
| `NC-LAUNCH-025` | `AUTHORIZED_DETERMINISTIC_SELECTION` sin autoridad competente para seleccionar deterministicamente se bloquea antes del actor. |
| `NC-LAUNCH-026` | Request/model/provider policy-ineligible produce `BLOCKED`, mientras dependencia resolver/provider unavailable produce `UNAVAILABLE`. |
| `NC-LAUNCH-027` | `EXPLICIT_CONSTRAINTS` con `provider_ref` solamente y sin model elegible que satisfaga el provider produce `BLOCKED` y no invoca al actor. |
| `NC-LAUNCH-028` | `EXPLICIT_CONSTRAINTS` con `runtime_constraints_ref` solamente y sin model/provider elegibles que satisfagan el runtime produce `BLOCKED` y no invoca al actor. |
| `NC-LAUNCH-029` | Cualquier estado legal que deje model, provider o runtime sin resolucion concreta produce un resultado no exitoso normalizado y no invoca al actor. |
| `NC-LAUNCH-030` | Cualquier intento de usar seleccion implicita o defaults de model/provider de OpenCode esta prohibido y no invoca al actor. |

### 15.3 Gates de WP-002

**ITE-WP002-004.** Una implementacion solo es candidata a operativa cuando
existen conjuntamente:

- SPEC aceptada por el Developer;
- schema/contract tests del request y resultado;
- exactamente nueve perfiles OpenCode project-scoped;
- un launcher generico y un CLI adapter;
- matriz de permission projection completa;
- exact-version capability conformance;
- todos los positive y negative smokes aplicables en `PASS`;
- full regression sin regresiones atribuibles a WP-002;
- `git diff --check` y checks documentales/contractuales aplicables;
- independent security/runtime review `PASS`;
- evidencia de cero global config mutation, secrets, native actor shell,
  delegation y paid API.

Un check `NOT_RUN` o `UNAVAILABLE` permanece asi; no puede contarse como `PASS`.

## 16. Observabilidad y evidencia

**DR-WP002-039.** Por intento, la frontera debe poder reconstruir, mediante
resultado y referencias sanitizadas:

- `operation_id`, `accepted_authority_ref`, authority kind/ID, profile y request
  digest;
- Project Profile, repository, branch/HEAD, cwd y worktree observados;
- authority resolution, congruence states y autorizaciones condicionales, sin
  copiar contenido sensible;
- context ref, digest, budget/coverage/status y fallback por referencia;
- requested constraints/identity, resolved identity y observed model, provider
  y runtime identities;
- OpenCode exact version, adapter version y conformance evidence ref;
- permission projection, projected/effective config y effective permission
  digests, conformance status y capability evidence sanitizada;
- inicio/fin, timeout/abort, exit code, status, reason code y phase;
- output artifact refs y diagnostics sanitizados;
- si el actor fue invocado y si quedo algun proceso o write residual.

**DR-WP002-040.** El launcher emite evidencia pero no define su persistencia
canonica. WP-005 puede correlacionarla posteriormente sin duplicar Run State. La
evidencia no contiene prompts completos por defecto, secretos, credentials,
config global, lifecycle acceptance ni inferencias de `DONE`.

## 17. Responsabilidades diferidas

| Owner posterior | Responsabilidad diferida |
| --- | --- |
| WP-003 | Autoridad y artifacts SDD, RF/RNF y templates. |
| WP-004 | Lifecycle operativo, materializacion TASK, transitions, Git/worktree provisioning y compatibility mapping. |
| WP-005 | Persistencia/correlacion general de execution observations. |
| WP-006 | System Guide y navegacion documental global. |
| WP-007 | Closure, promotion y evidencia de milestone completa. |
| Decision futura | Command broker acotado si una necesidad demostrada lo exige. |
| Post-MVP | Recipes, Developer role substitution, devBrain/Advisory, RAG/vector retrieval, benchmarking y advanced FinOps. |

## 18. Stop conditions

Detener implementacion y solicitar decision del Developer si:

- el CLI no puede aislar o probar la configuracion efectiva, o no puede negar
  shell, delegation, web indirecta o scope escapes;
- una capacidad obligatoria exige plugin/SDK, command broker, paid API, secret
  visible al actor o global config mutation;
- se requiere persistir profile->role/model/provider;
- Project Profile/resolveProject, ContextPackager, Router, Model Resolver o Agent
  Runtime requieren un cambio incompatible de contrato;
- el scope exige generalized Recipes, replacement Task Cycle, Developer role
  substitution o devBrain;
- una version OpenCode no puede probar capability-based conformance;
- existe contradiccion material con WP-000, WP-001 o autoridad canonica;
- se necesita escribir otro repositorio o un path sin ownership explicito.

## 19. Trazabilidad de decisiones

| Decision | Disposicion reflejada |
| --- | --- |
| `OD-WP002-01` | `operation_id + accepted_authority_ref` universales resueltos a un envelope runtime; autorizaciones TASK/change/research/evidence condicionales y congruentes; read-only pre-SPEC no exige TASK cuando el contrato competente no la exige. |
| `OD-WP002-02` | Profile explicito e independiente; request/resolved/observed model identities separadas; Router/Model Resolver no seleccionan ni redefinen profile; bindings persistidos prohibidos; bridge legacy estrictamente acotado. |
| `OD-WP002-03` | Proyeccion por interseccion, deny-by-default; listas vacias niegan adicionales sin invalidar primitivas nativas ya autorizadas; unknown/unprovable fail closed. |
| `OD-WP002-04` | Native actor shell denied en v1; validacion/checks externos; command globs permisivos y broker futuro fuera de scope. |
| `OD-WP002-05` | Capability conformance, boundary de versiones explicitamente probada, exact observed version evidence, incompatible fail; CLI adapter preferido; ningun rango inventado. |
| `OD-WP002-06` | `COMPLETED/BLOCKED/FAILED/UNAVAILABLE`, reason codes estables y ninguna inferencia de lifecycle o aceptacion. |

## 20. Estado de materializacion

```yaml
spec_status: ACCEPTED
implementation_authority_created: false
gate: WP-002_SPEC_ACCEPTANCE
gate_status: SATISFIED
spec_accepted: true
accepted_semantic_sha256: 4733259d18b3f64f58f31127b1de4ba1b2ee6ca2a09a9046d95fced04aaaf202
next_owner: Architect
next_required_action: materialize WP-002 WP PLAN from the accepted SPEC; obtain the Developer READY gate before executable TASK materialization
```
