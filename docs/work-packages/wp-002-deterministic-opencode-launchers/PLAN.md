---
document_id: TOF-WP-002-PLAN-001
status: ACCEPTED
materialization_status: ACCEPTED
owner: tecnotron-ai
type: work-package-plan
version: 1.1
updated: 2026-09-04
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-002
operation_id: TOF-WP002-WP-PLAN-MATERIALIZATION-01
acceptance_operation_id: TOF-WP002-READY-GATE-01
spec: docs/work-packages/wp-002-deterministic-opencode-launchers/SPEC.md
accepted_spec_semantic_sha256: 4733259d18b3f64f58f31127b1de4ba1b2ee6ca2a09a9046d95fced04aaaf202
accepted_plan_source_sha256: d67b1b9fc582f6e5223a8b716a32476ee78d9bbc2cc74573fc1e3409309bf3b4
planning_baseline: d5b972408700ee83bd312bc2c3ade74972e53b73
integration_target: tools
developer_ready_gate: SATISFIED
task_materialization_authorized: true
next_executable_task: TOF-W1-002
executable_tasks_created: true
implementation_authority_created: true
implementation_status: NOT_STARTED
validation_status: NOT_RUN
review_status: NOT_RUN
complexity: high
criticality: high
scope_fit: SPLIT_REQUIRED
context_budget:
  class: large
  policy: accepted_SPEC_plus_one_launcher_slice
  expansion_limit: 2
dependencies:
  - WP-000 DONE
  - WP-001 ACCEPTED_INTEGRATED
  - WP-002 SPEC ACCEPTED
task_candidates:
  - TOF-W1-002
  - TOF-W1-003
ownership:
  terminal_acceptance: Developer
  planning: Architect
  implementation: Implementer
  validation: deterministic Validator
  independent_review: Reviewer
  lifecycle: Task Lifecycle
related:
  - "[[milestones/tecnotron-operational-foundation-v1/PLAN]]"
  - "[[work-packages/wp-002-deterministic-opencode-launchers/SPEC]]"
  - "[[work-packages/wp-001-operational-profile-contracts/PLAN]]"
  - "[[contracts/tecnotron-agent-profile-v1]]"
---

# PLAN WP-002: Deterministic OpenCode Launchers

## 1. Estado, autoridad y limite de esta propuesta

Este documento materializa la descomposicion tecnica aceptada de la SPEC WP-002.
El Developer acepto el PLAN y satisfizo su gate `READY` mediante
`TOF-WP002-READY-GATE-01`. La sincronizacion posterior materializo
`TOF-W1-002`, creo su autoridad de implementacion y resolvio su rama/worktree
sin modificar la SPEC ni iniciar implementacion.

La precedencia aplicada es:

1. SPEC WP-002 aceptada y su fingerprint semantico;
2. Milestone Plan aceptado;
3. `tecnotron-agent-profile/v1` aceptado e integrado por WP-001;
4. arquitectura, operacion, Task Lifecycle, contexto y estado canonicos;
5. evidencia directa del source existente, solo para clasificar reuse.

Estado conceptual:

```yaml
wp_plan: ACCEPTED
developer_ready_gate: SATISFIED
task_materialization_authorized: true
executable_tasks_created: true
implementation_authority_created: true
implementation_started: false
next_executable_task: TOF-W1-002
task_base: 03651b806da290ae256dfaa6bf924feef0487327
effective_branch: mauedgar/feat-TOF-W1-002
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-TOF-W1-002
next_owner: deterministic Validator
next_required_action: EXECUTE_WP002_WU_00_ENVIRONMENT_TOOLCHAIN_PREFLIGHT
```

La aceptacion y el gate `READY` solo significan que el PLAN cubre la SPEC y tiene
una descomposicion completa, acotada y ordenada para derivar TASKs. No significan
conformance de OpenCode, implementacion, validation `PASS`, review `PASS`,
aceptacion de una TASK, integracion, publicacion ni `DONE`.

## 2. Estrategia de ejecucion

WP-002 se implementara como una frontera nueva y pequena sobre contratos y
ports existentes:

```text
environment reproducibility
  -> project-scoped profile projection
  -> strict launch contract + authority/worktree/context preflight
  -> effective permission/config enforcement
  -> concrete model/provider/runtime resolution
  -> one generic OpenCode CLI adapter and launcher
  -> complete positive/negative conformance
  -> independent security/runtime review
  -> Developer acceptance and Task Lifecycle integration
```

Los controles deterministas permanecen fuera del actor. El launcher recibe una
autoridad ya aceptada, la resuelve mediante su owner, valida congruencia y nunca
crea TASK, worktree, lifecycle state o aceptacion. `profile_id` es explicito y
permanece independiente de routing role, model, provider y runtime.

Se conservan los candidatos `TOF-W1-002` y `TOF-W1-003` del Milestone Plan. Las
unidades `WP002-WU-*` siguientes refinan su orden y gates; no son TASKs ni
autorizaciones. `TOF-W1-002` agrupa el preflight ambiental y la proyeccion
project-scoped estatica. `TOF-W1-003` agrupa contrato, preflight runtime,
seguridad, resolucion, adapter, launcher y conformance. El Developer puede
materializarlos solo despues del gate READY y con `task_base`, paths y worktree
frescos.

## 3. Preflight de ambiente y toolchain

`WP002-WU-00` debe ejecutarse antes de usar tests de WP-001 o WP-002 como
evidencia. No instala ni actualiza dependencias por si mismo.

El diagnostico determinista debe clasificar, sin colapsar categorias:

| Categoria | Prueba requerida | Disposicion antes de continuar |
| --- | --- | --- |
| Dependencia declarada pero checkout no bootstrapped | Comparar import requerido con `package.json` y `package-lock.json`; ejecutar resolucion local read-only como `npm ls <dependency> --depth=0` y un require probe sin network | `BLOCKED_ENVIRONMENT`; solicitar bootstrap reproducible autorizado desde lockfile en el worktree y repetir el preflight; no aceptar diff de manifest/lockfile |
| Dependencia requerida pero undeclared | El import existe en source/test pero no en manifest o lockfile | Detener; no instalar ad hoc. El Developer debe decidir y autorizar cualquier cambio exacto de manifest/lockfile |
| Manifest/lockfile inconsistente | Parsear ambos y comparar nombre, version, dependencias directas, rangos y lockfile version | Detener; no regenerar lockfile silenciosamente |
| Test historico obsoleto o no aplicable | Trazar el test a contrato, SPEC y consumidor vigentes, con resultado `NOT_RUN` hasta disposition competente | No borrar, saltar ni convertir a `PASS` sin evidencia y ruling aplicable |
| Runtime/tool incompatible | Capturar executable resuelto y versiones exactas de Node, npm, Git y OpenCode; comparar con engines, lockfile, compatibility authority y capability boundary | `UNAVAILABLE` o `BLOCKED` segun owner; disponibilidad de OpenCode no equivale a conformance |

La limitacion conocida permanece explicitamente abierta:

```yaml
check: wp001_test
status: UNAVAILABLE
reason: declared yaml dependency absent from checkout
```

El manifest y lockfile declaran `yaml`, pero esa observacion no autoriza una
instalacion. Si el preflight confirma exclusivamente un checkout no
bootstrapped, Task Lifecycle o el mecanismo de entorno autorizado debe resolver
el bootstrap desde el lockfile, demostrar cero diff en ambos archivos y repetir
los tests afectados. Si aparece cualquier otra categoria, la ejecucion se
detiene para disposition del Developer. Hasta entonces, ningun test afectado se
cuenta como `PASS`.

## 4. Analisis de reuse

### 4.1 REUSE_AS_IS

| Componente | Uso acotado en WP-002 |
| --- | --- |
| `tecnotron-agent-profile/v1`, `loadAgentProfiles` y schema/registry | Unica fuente de IDs, required inputs y permisos semanticos de los nueve perfiles; no se duplica semantica en los archivos OpenCode |
| ContextPackager v2 y `ContextPackagerResult` | Resolver evidence requirements mediante el port existente y consumir status, coverage, budget, providers y fallback por referencia |
| `repo-packager` | Materializer opcional detras de ContextPackager; no decide autoridad ni suficiencia |
| Router y Role Registry v3 | Consumir una decision de routing independiente cuando la autoridad/model request la requiera; nunca derivar role desde profile |
| Model Registry v3 y FinOps v1 | Fuente de elegibilidad, provider/runtime coordinates, resource policy y paid API disabled |
| Node test runner, fixtures, contract validation y `git diff --check` | Infraestructura determinista de tests y validacion |
| doctor version discovery | Base read-only para localizar executable y version exacta; no constituye capability conformance |

### 4.2 BOUNDED_EXTENSION

| Componente | Extension permitida | Limite |
| --- | --- | --- |
| Project Profile / `resolveProject` | Exponer las coordenadas canonicas necesarias para proyecto/root explicitos y permitir la comprobacion de repository/cwd/worktree por una capa launch-specific | No inferir siblings, no asumir FitFlow como identidad, no crear worktrees ni cambiar ownership del Profile |
| Model Resolver | Aceptar constraints explicitas y seleccion autorizada, incluyendo provider-only y runtime-only, y retornar model/provider/runtime concretos con resolution ref | No mapear profile a role/model/provider, no introducir ranking nuevo ni cambiar v3 de forma incompatible |
| Agent Runtime port e identity patterns | Reusar la frontera reemplazable de adapter y ampliar la evidencia observed para model/provider/runtime/version requerida por launch v1 | El `executeRuntime` legacy no se convierte en lifecycle ni en launcher; cambio incompatible exige stop |
| adapters export y doctor probes | Exportar el adapter OpenCode y probes capability-based estrictamente acotados | No mutar configuracion global ni convertir discovery historico en soporte |

### 4.3 NEW_IMPLEMENTATION_REQUIRED

- schemas strict de request, resolved-authority envelope y normalized result
  `tecnotron-agent-launch/v1`;
- reason-code/status invariants y unknown-field rejection;
- AuthorityResolver port/adapters, typed congruence, Git worktree identity y
  scope containment launch-specific;
- exactamente nueve perfiles `.opencode/agents`, derivados del registry;
- permission projection, environment sanitizer, projected/effective config
  comparison y evidence sanitization;
- launch-specific bridge hacia Model Resolver para los dos request states;
- una version boundary capability-based;
- exactamente un `opencode-cli` adapter y un launcher generico;
- fixtures y conformance positiva/negativa completa.

### 4.4 OUT_OF_SCOPE

| Componente | Disposicion |
| --- | --- |
| Agent MVP composition root | Permanece consumidor legacy y objetivo de regresion. No se reutiliza como launcher porque su flujo Task->role y sus stages no representan el request/authority/profile de launch v1 |
| Run Store, State Machine y general observation persistence | WP-002 solo emite resultado y refs sanitizadas; WP-005 conserva persistencia/correlacion general |
| Codebase Memory | Puede aportar contexto derivado por un port; es opcional y reemplazable, nunca autoridad ni dependencia operacional |
| devBrain, Recipes, generalized Task Cycle, Developer substitution, RAG/vector, provider benchmarking y advanced FinOps | Diferidos segun la SPEC; no entran a ninguna unidad |

## 5. Grafo de dependencias

```text
WP002-WU-00  Environment and toolchain preflight
      |
      v
WP002-WU-01  Project-scoped profiles and static projection
      |
      v
WP002-WU-02  Launch contract, authority, project/worktree/context preflight
      |\
      | +-------------------+
      v                     v
WP002-WU-03              WP002-WU-04
Security/config          Model/runtime resolution
      |                     |
      +----------+----------+
                 v
           WP002-WU-05
           Generic adapter/launcher
                 |
                 v
           WP002-WU-06
           Complete deterministic conformance
                 |
                 v
           WP002-WU-07
           Independent review and Developer handoff
```

`WP002-WU-03` y `WP002-WU-04` pueden ejecutarse en paralelo solo si una futura
TASK asigna paths disjuntos, el contrato de `WP002-WU-02` esta estable y cada
unidad conserva validacion independiente. Ninguna unidad posterior omite el
preflight de `WP002-WU-00`.

## 6. Unidades de ejecucion aceptadas

### WP002-WU-00 - Reproducibilidad del entorno

```yaml
id: WP002-WU-00
task_candidate: TOF-W1-002
purpose: Clasificar y cerrar los blockers de toolchain/dependencias antes de confiar en tests de WP-001 o WP-002.
depends_on: []
competent_role: deterministic Validator
classification: REUSE_AS_IS
write_scope: []
required_inputs:
  - accepted WP-002 SPEC and semantic fingerprint
  - fresh task worktree baseline and clean Git state
  - package.json and package-lock.json
  - current test imports and compatibility authority
  - resolved executable paths and exact tool versions
implementation_scope:
  - read-only manifest/lockfile/import consistency checks
  - local dependency resolution probes without install or network assumption
  - historical-test applicability trace
  - Node/npm/Git/OpenCode version inventory without actor invocation
  - non-actor inventory of the OpenCode profile/config command surface needed by WP002-WU-01
deterministic_validation:
  - each finding has exactly one of the five environment classifications
  - wp001_test remains UNAVAILABLE until yaml resolves and affected tests rerun
  - no manifest, lockfile, dependency tree, source, test or config mutation
required_evidence:
  - commands and exact outputs with PASS/FAIL/NOT_RUN/UNAVAILABLE
  - manifest-lock comparison
  - declared-versus-resolved dependency matrix
  - exact tool executable/version inventory
  - Git status proving zero writes
stop_conditions:
  - dependency installation or update would be required without Developer authorization
  - undeclared dependency, manifest/lock mismatch or tool incompatibility is found
  - a historical test needs removal or semantic rewrite
handoff: Environment classification and required Developer disposition, or reproducible PASS precondition for WP002-WU-01.
```

Esta unidad no produce un environment fix por inferencia. Una autorizacion de
bootstrap o cambio, si resulta necesaria, debe preceder la repeticion de esta
unidad y quedar fuera del actor.

El ruling `TOF-WP002-READY-GATE-01` autoriza exclusivamente este bootstrap
condicional para la futura TASK:

```yaml
dependency_bootstrap_policy:
  eligible_only_if:
    - dependency already declared in the competent manifest
    - dependency represented consistently in the accepted lockfile
    - checkout deterministically classified as NOT_BOOTSTRAPPED
    - no manifest or lockfile semantic correction required
  authorized_action:
    - use the repository canonical reproducible bootstrap from the existing lockfile
    - introduce no dependency upgrade, new dependency, manifest change or lockfile change
    - rerun affected baseline tests
  required_postcondition:
    manifest_diff: NONE
    lockfile_diff: NONE
    affected_tests: RERUN
  otherwise: STOP_AND_RETURN_TO_DEVELOPER
```

`WP002-WU-00` debe revalidar la observacion de `yaml` y no asumir
`NOT_BOOTSTRAPPED` antes del diagnostico. El preflight no instala dependencias.

### WP002-WU-01 - Perfiles project-scoped y proyeccion estatica

```yaml
id: WP002-WU-01
task_candidate: TOF-W1-002
purpose: Materializar exactamente los nueve perfiles OpenCode project-scoped como proyecciones del registry aceptado y validar su matriz estatica deny-by-default.
depends_on: [WP002-WU-00]
competent_role: Implementer
classification: NEW_IMPLEMENTATION_REQUIRED
write_scope:
  - .opencode/agents/spec_analyst.md
  - .opencode/agents/planner.md
  - .opencode/agents/architect.md
  - .opencode/agents/explorer.md
  - .opencode/agents/implementer.md
  - .opencode/agents/doc_curator.md
  - .opencode/agents/reviewer.md
  - .opencode/agents/researcher.md
  - .opencode/agents/auditor.md
  - tests/contract/opencode-agent-profiles.test.js
  - tests/fixtures/opencode-agent-profiles/**
required_inputs:
  - accepted tecnotron-agent-profile/v1 registry and loader
  - exact nine profile IDs and required inputs
  - WP-002 permission, native shell, web, delegation and model-separation invariants
  - exact OpenCode command/config surface observed by WP002-WU-00
implementation_scope:
  - one derived project-scoped artifact per accepted profile ID
  - explicit deny projection for shell, delegation/subagents, extra tools/skills/MCP/plugins, Git/provider/workspace/dependency mutation, secrets and paid API
  - writer/read-only/web distinctions without embedding model, provider, runtime or routing role
  - static discovery and profile-digest fixtures
deterministic_validation:
  - exactly nine artifacts and no coder aliases, tenth profile or implicit default
  - one-to-one equality with registry IDs, required inputs and permission ceiling
  - seven read-only profiles and only the two accepted task-owned writer classes
  - subagent_depth exactly 0 and no profile-model/provider/runtime/role field
required_evidence:
  - nine-profile projection matrix
  - positive discovery fixture per profile
  - negative fixtures for unknown/legacy profile and every broadening dimension
  - proof no global or personal config path changed
stop_conditions:
  - OpenCode profile format cannot express the accepted projection without a permissive default
  - static artifact would become a second semantic registry
  - profile requires a permanent role/model/provider/runtime binding
handoff: Versioned nine-profile snapshot and static matrix for WP002-WU-02 and runtime proof in WP002-WU-05.
```

Static conformance does not declare an OpenCode version supported. Runtime
support remains gated by `WP002-WU-05` and `WP002-WU-06`.

### WP002-WU-02 - Contrato, autoridad y preflight estructural

```yaml
id: WP002-WU-02
task_candidate: TOF-W1-003
purpose: Implementar el contrato strict launch v1 y sus primitivas fail-closed de autoridad, proyecto, repositorio, worktree, scope y contexto.
depends_on: [WP002-WU-01]
competent_role: Implementer
classification: NEW_IMPLEMENTATION_REQUIRED
write_scope:
  - src/contracts/agent-launch.js
  - src/contracts/index.js
  - src/agent-launch/authority.js
  - src/agent-launch/project-preflight.js
  - src/agent-launch/context-preflight.js
  - tests/contract/agent-launch.test.js
  - tests/core/agent-launch-preflight.test.js
  - tests/fixtures/agent-launch/**
required_inputs:
  - DR-WP002-004 through DR-WP002-015
  - accepted profile registry and WP002-WU-01 snapshot
  - Project Profile/resolveProject boundary
  - Task Lifecycle worktree and ownership semantics
  - ContextPackager contracts and ports
implementation_scope:
  - strict request with unknown-field rejection and universal authority coordinates
  - typed resolved-authority envelope for all five closed authority kinds
  - REQUIRED/CONDITIONAL/FORBIDDEN validation and profile-specific inputs
  - DERIVED/ASSERTED_AND_EQUAL congruence with canonical typed comparisons
  - explicit project/root/repository/cwd/branch/HEAD/worktree observation
  - symlink/traversal containment, task-owned writer scopes and empty read-only write scope
  - ContextPackager/result-ref integrity, budget and executable-state checks
  - strict normalized result, phase, status/reason-code ownership and sanitized digests
deterministic_validation:
  - schema accepts only valid v1 requests and results
  - all five authority kinds cover every accepted profile combination
  - every duplicated security coordinate is derived or equal; every mismatch blocks before actor
  - invalid worktree, ownership, scope, context or required input blocks with its stable code
  - status/reason-code cross-product rejects codes from another class
required_evidence:
  - request/result schema fixtures including unknown fields
  - authority-kind and congruence matrices
  - repository/worktree/symlink negative fixtures
  - context COMPLETE/PARTIAL/EMPTY/tampered/unavailable fixtures
  - actor-invocation spy proving short-circuit on every failed preflight stage
stop_conditions:
  - accepted authority owner cannot resolve a complete competent envelope
  - Project Profile or ContextPackager requires an incompatible contract change
  - another lifecycle, authority registry or worktree provisioner would be created
handoff: Preflighted launch payload and normalized blocked/unavailable outcomes for security and model units.
```

El AuthorityResolver se implementa como port/adapters sobre owners competentes;
su envelope es runtime interno y no una fuente de autoridad paralela.

### WP002-WU-03 - Permisos, entorno y configuracion efectiva

```yaml
id: WP002-WU-03
task_candidate: TOF-W1-003
purpose: Proyectar permisos/configuracion de forma monotonicamente restrictiva y probar por invocacion que OpenCode no los amplia.
depends_on: [WP002-WU-02]
competent_role: Implementer
classification: NEW_IMPLEMENTATION_REQUIRED
write_scope:
  - src/agent-launch/permission-projection.js
  - src/agent-launch/environment.js
  - src/agent-launch/configuration.js
  - src/agent-launch/evidence-sanitizer.js
  - tests/core/agent-launch-permissions.test.js
  - tests/core/agent-launch-configuration.test.js
  - tests/fixtures/agent-launch-configuration/**
required_inputs:
  - accepted profile and resolved-authority envelope
  - conditional authorizations and resolved repository/worktree scopes
  - exact-version OpenCode config-source and capability inventory
  - DR-WP002-023 through DR-WP002-030A
implementation_scope:
  - intersection of profile, authority, conditional authorization, task/worktree scope and proven adapter capabilities
  - explicit native shell denial, delegation/subagent denial and paid API denial
  - researcher-only authorized web with indirect routes closed
  - exclusion/denial of extra tools, skills, MCP, plugins and native primitives
  - environment rebuilt from minimum system names plus allowlisted task inputs
  - secret-like/provider-override/root-conflict rejection
  - projected config, effective config and permission digests as distinct evidence
  - per-invocation INVOCATION_ISOLATION or EFFECTIVE_CONFIG_PROBE comparison
  - sanitized capability evidence with no raw config, secrets or full prompts
deterministic_validation:
  - CONFORMANT or SAFELY_NARROWER is the only actor-enabled outcome
  - unknown/uninspectable, mismatch and broader config produce their exact BLOCKED codes
  - read-only cannot write; writers cannot escape their task-owned allowlists
  - no global/personal config mutation and no inherited environment
required_evidence:
  - complete nine-profile permission projection matrix
  - projected-versus-effective comparison fixtures for equal, narrower, unknown, mismatch and broader
  - environment name allowlist and redacted rejection evidence
  - filesystem snapshots proving zero out-of-scope/global mutation
stop_conditions:
  - neither accepted per-invocation proof mechanism can prove effective containment
  - shell, delegation, web indirect paths, external scopes or secrets cannot be denied
  - a plugin, SDK or command broker appears necessary
handoff: Sanitized invocation config/environment and proof result for WP002-WU-05, or fail-closed stop for Developer.
```

La seleccion entre `INVOCATION_ISOLATION` y `EFFECTIVE_CONFIG_PROBE` es una
eleccion de implementacion basada en evidencia dentro de las dos alternativas
ya aceptadas por la SPEC. No se fija anticipadamente y no constituye una
decision arquitectonica pendiente.

### WP002-WU-04 - Resolucion de model/provider/runtime

```yaml
id: WP002-WU-04
task_candidate: TOF-W1-003
purpose: Resolver ambos estados de model request a coordenadas concretas y elegibles sin ligar profile a routing role o identidad de modelo.
depends_on: [WP002-WU-02]
competent_role: Implementer
classification: BOUNDED_EXTENSION
write_scope:
  - src/agent-launch/model-resolution.js
  - src/model-resolver/index.js
  - src/contracts/model-resolution.js
  - tests/core/agent-launch-model-resolution.test.js
  - tests/fixtures/agent-launch-model-resolution/**
required_inputs:
  - DR-WP002-016 through DR-WP002-018
  - model request and authority/routing/resolution refs from WP002-WU-02
  - Router, Role Registry v3, Model Registry v3, Model Resolver and FinOps v1
  - concrete current consumers of the existing resolver contract
implementation_scope:
  - EXPLICIT_CONSTRAINTS for model-only, model+provider, provider-only, runtime-only and provider+runtime
  - AUTHORIZED_DETERMINISTIC_SELECTION only with competent selection authority
  - independently authorized routing decision when role constraints apply
  - concrete model/provider/runtime plus immutable/versioned resolution ref before actor
  - separate requested, resolved and later observed identity fields
  - distinct unsupported, ineligible, unresolved, resolver-unavailable and provider/runtime-unavailable outcomes
  - compatibility for concrete existing resolver consumers without adding generic legacy shims
deterministic_validation:
  - both legal states converge on all three concrete eligible coordinates
  - provider-only and runtime-only success/failure cases are deterministic
  - profile is never input to routing/model selection and cannot be replaced by Router
  - paid providers and implicit OpenCode defaults never become candidates
required_evidence:
  - table of every accepted constraint shape and selected/rejected result
  - runtime-only and provider-only positive and negative fixtures
  - requested/resolved identity snapshots
  - spies proving no actor invocation while any coordinate is unresolved
  - regression for Router, Model Resolver, FinOps, Agent Runtime and Agent MVP consumers
stop_conditions:
  - satisfying runtime-only constraints requires profile-to-role mapping
  - existing resolver/registry contracts require an incompatible change
  - selection requires ranking, benchmarking, advanced FinOps, paid API or OpenCode defaults
handoff: Concrete eligible identity envelope or normalized blocked/unavailable outcome for WP002-WU-05.
```

Un runtime-only request puede consumir un routing decision autorizado e
independiente; no puede inferirlo desde `profile_id`. Si no existe la autoridad
o no hay modelo/provider elegible para esa constraint, se bloquea antes del
actor.

La derivacion futura de `TOF-W1-003` debe conservar y revalidar esta evidencia
mutable en `WP002-WU-04/WU-05`:

```yaml
known_model_runtime_observation:
  requested_model: opencode/hy3-free
  observed_result: MODEL_NOT_FOUND
  observed_during: WP002_PLAN_COVERAGE_AUDIT
  architectural_effect: NONE
  disposition: REVALIDATE_DURING_MODEL_RUNTIME_PREFLIGHT
```

La observacion no autoriza sustitucion automatica. Cualquier reemplazo debe
cumplir Router, Model Registry, Model Resolver y FinOps; una limitacion de
credenciales se registra como disponibilidad de environment/provider y no se
elude.

### WP002-WU-05 - Adapter CLI y launcher generico

```yaml
id: WP002-WU-05
task_candidate: TOF-W1-003
purpose: Implementar exactamente un adapter OpenCode CLI y un launcher generico que ejecuten una sola invocacion despues de completar todo el preflight.
depends_on: [WP002-WU-03, WP002-WU-04]
competent_role: Implementer
classification: NEW_IMPLEMENTATION_REQUIRED
write_scope:
  - src/adapters/opencode-cli.js
  - src/adapters/index.js
  - src/agent-launch/index.js
  - tests/adapters/opencode-cli.test.js
  - tests/core/agent-launch.test.js
  - tests/integration/opencode-launch.test.js
  - tests/fixtures/opencode-cli/**
required_inputs:
  - preflighted payload from WP002-WU-02
  - sanitized config/environment and effective proof from WP002-WU-03
  - concrete model/provider/runtime resolution from WP002-WU-04
  - exact OpenCode executable/version and capability probes
  - bounded context/reference and explicit profile ID
implementation_scope:
  - exact-version discovery without actor execution
  - capability matrix and explicit supported-version boundary
  - non-interactive invocation with explicit cwd, profile, config, model/provider/runtime and bounded context
  - one child process invocation, controlled timeout/abort and descendant cleanup
  - machine-readable event/output parsing and artifact validation
  - observed model/provider/runtime/version collection and equality check
  - strict normalized result and sanitized diagnostics/output refs
  - no retry, fallback, implicit default or global config mutation
deterministic_validation:
  - actor spy count is zero for every failed preflight and exactly one for a valid launch
  - unsupported/unproven CLI is UNAVAILABLE before actor
  - timeout, abort, malformed output, zero-exit invalid output and observed mismatch normalize stably
  - no residual process or out-of-scope write after timeout/abort
  - no nine adapters/launchers or coder aliases exist
required_evidence:
  - exact CLI and adapter versions plus platform/command surface
  - capability -> probe/test -> result matrix
  - sanitized invocation arguments/config/environment evidence
  - projected/effective digests and proof mechanism for each attempted launch
  - requested/resolved/observed identity snapshots
  - process exit/timeout/abort and residual-process/write checks
stop_conditions:
  - CLI cannot satisfy every required capability or effective-config proof
  - plugin/SDK, visible credential, global mutation or paid API is required
  - observed identity cannot be obtained or compared unambiguously
  - timeout/abort cannot contain descendants and writes
handoff: Version-pinned launcher snapshot and complete raw deterministic results for WP002-WU-06.
```

La observacion historica de OpenCode `1.18.21` y la dependencia local de plugin
no incorporan ninguna version a la boundary. Solo la matriz completa `PASS`
puede hacerlo. Un plugin/SDK no entra por estar instalado.

### WP002-WU-06 - Conformance determinista

```yaml
id: WP002-WU-06
task_candidate: TOF-W1-003
purpose: Demostrar toda la acceptance/conformance determinista de la SPEC y entregar un snapshot inmutable a review sin autoaceptar ni integrar.
depends_on: [WP002-WU-05]
competent_role: deterministic Validator
classification: BOUNDED_EXTENSION
write_scope:
  - tests/contract/agent-launch.test.js
  - tests/core/agent-launch-*.test.js
  - tests/adapters/opencode-cli.test.js
  - tests/integration/opencode-launch.test.js
  - tests/fixtures/agent-launch/**
  - tests/fixtures/opencode-cli/**
required_inputs:
  - accepted SPEC and complete AC-LAUNCH/NC-LAUNCH matrix
  - immutable implementation snapshot from WP002-WU-05
  - all unit-level evidence and environment PASS prerequisite
  - exact supported OpenCode version candidate
implementation_scope:
  - fill only missing deterministic fixtures/tests needed for complete coverage
  - execute focal contract/core/adapter/integration suites and full regression
  - verify diff allowlist, no staging, no global mutation and no secrets
  - prepare sanitized external implementation and validation reports
deterministic_validation:
  - AC-LAUNCH-001 through AC-LAUNCH-023 PASS
  - NC-LAUNCH-001 through NC-LAUNCH-030 demonstrate fail-closed semantics
  - all nine profiles, both writers and all read-only profiles covered
  - exact-version capability matrix PASS with no NOT_RUN/UNAVAILABLE mandatory capability
  - full regression has no WP-002-attributable failure
  - git diff --check and authorized-path checks PASS
required_evidence:
  - complete AC/NC traceability matrix with command and result per case
  - exact-version capability and nine-profile permission matrices
  - zero global config mutation, secrets, shell, delegation/subagents and paid API evidence
  - requested/resolved/observed identity and status/reason-code evidence
  - immutable implementation and validation snapshot for independent review
stop_conditions:
  - any mandatory case is FAIL, NOT_RUN or UNAVAILABLE
  - an unauthorized path, secret, residual process/write or global mutation is observed
  - evidence would imply lifecycle, acceptance, integration, publication or DONE
handoff: Immutable validated snapshot and sanitized evidence package to WP002-WU-07.
```

### WP002-WU-07 - Review independiente y handoff al Developer

```yaml
id: WP002-WU-07
task_candidate: TOF-W1-003
purpose: Revisar independientemente las fronteras security/runtime y entregar al Developer un veredicto versionado sin aceptar ni integrar.
depends_on: [WP002-WU-06]
competent_role: Reviewer
classification: REUSE_AS_IS
write_scope: []
required_inputs:
  - accepted WP-002 SPEC and this accepted plan
  - immutable implementation/validation snapshot from WP002-WU-06
  - complete AC/NC, capability, permission and identity evidence matrices
  - exact Git diff and task-owned scope
implementation_scope:
  - read-only semantic review of contract, authority, permissions, config isolation, model separation, adapter containment and evidence sanitization
  - verify every finding against direct source and versioned evidence
  - emit an external review report with PASS or FAIL and explicit findings
  - hand off only a PASS snapshot to the Developer acceptance gate
deterministic_validation:
  - reviewed commit/diff and evidence digests match WP002-WU-06
  - Reviewer identity is independent from implementation authorship
  - review does not write source, tests, config, RESULT, REVIEW or lifecycle state
required_evidence:
  - external security/runtime review report with PASS or FAIL
  - finding disposition matrix and reviewed snapshot identity
  - explicit statement that review is not Developer acceptance or integration
stop_conditions:
  - snapshot or evidence changed after validation
  - any blocking finding remains open
  - Reviewer independence or read-only boundary cannot be demonstrated
  - handoff would imply acceptance, integration, publication or DONE
handoff: PENDING_ACCEPTANCE package to Developer; Task Lifecycle may persist evidence or integrate only after the applicable explicit rulings.
```

Task Lifecycle or un evidence recorder autorizado, no un profile, posee
cualquier materializacion futura de `RESULT.md`/`REVIEW.md`. El Reviewer es
read-only. Esta propuesta no preasigna esos paths ni los crea.

## 7. Cobertura normativa y de conformance

La propiedad primaria de requisitos queda cerrada asi; las unidades posteriores
revalidan las fronteras que integran:

| Unidad primaria | Requisitos SPEC |
| --- | --- |
| `WP002-WU-01` | `DR-WP002-002`, proyeccion estatica de `DR-WP002-023` a `DR-WP002-027` |
| `WP002-WU-02` | `DR-WP002-004` a `DR-WP002-015`, incluidos `DR-WP002-010A` y `DR-WP002-010B`; `DR-WP002-019` a `DR-WP002-022`; y orden estructural de `DR-WP002-034` |
| `WP002-WU-03` | `DR-WP002-023` a `DR-WP002-030A`, incluidos `DR-WP002-028A` y `DR-WP002-030A` |
| `WP002-WU-04` | `DR-WP002-016` a `DR-WP002-018`, incluido `DR-WP002-017A` |
| `WP002-WU-05` | `DR-WP002-001`, `DR-WP002-003`, `DR-WP002-031` a `DR-WP002-040` y `ITE-WP002-001` |
| `WP002-WU-06` | `ITE-WP002-002` a `ITE-WP002-004` y revalidacion integrada de `DR-WP002-001` a `DR-WP002-040` |
| `WP002-WU-07` | independent security/runtime review requerido por `ITE-WP002-001` y `ITE-WP002-004` |

### 7.1 Acceptance y controles negativos

La validacion final de `WP002-WU-06` ejecuta toda la matriz, pero cada frontera
se hace responsable primero de sus casos focales:

| Unidad primaria | Positive cases | Negative cases | Frontera demostrada |
| --- | --- | --- | --- |
| `WP002-WU-01` | `AC-LAUNCH-002` | `NC-LAUNCH-002`, `004`, `007`, `008`, `012`, `013` | Nueve perfiles, read-only/writers, sin aliases, shell/delegation/tool broadening ni bindings |
| `WP002-WU-02` | `AC-LAUNCH-001`, `003`-`008`, `011`-`013`, `017`, `018` | `NC-LAUNCH-001`, `003`-`006`, `015`, `017`-`023` | Request/result strict, authority kinds, ownership/worktree/scope/context, required inputs y reason codes |
| `WP002-WU-03` | `AC-LAUNCH-009`, `016`, `019` | `NC-LAUNCH-004`, `006`-`012`, `024` | Permission/config projection, env/secret isolation, paid denial y proof per invocation |
| `WP002-WU-04` | `AC-LAUNCH-010`, `020`-`023` | `NC-LAUNCH-013`, `025`-`030` | Explicit/authorized model resolution, runtime-only, unavailable/ineligible separation e implicit-default denial |
| `WP002-WU-05` | `AC-LAUNCH-002`, `003`-`016`, `019` | `NC-LAUNCH-007`-`011`, `014`, `016`, `017`, `024`, `030` | Real generic boundary, exact version, observed identity, malformed output, timeout/abort and effective config |
| `WP002-WU-06` | `AC-LAUNCH-001`-`023` | `NC-LAUNCH-001`-`030` | Integrated reproducibility and immutable handoff over the complete accepted matrix |

La matriz incluye expresamente:

- los nueve perfiles y preservacion del ID hasta el adapter;
- read-only pre-SPEC con autoridad competente y cero escritura;
- `implementer` y `doc_curator` solo dentro de TASK/worktree/scope congruentes;
- authority mismatch, invalid worktree y scope/context insufficiency bloqueados;
- effective config unknown/mismatch/broader bloqueada;
- model/provider ineligible versus resolver/provider/runtime unavailable;
- runtime-only explicit constraint con exito y sin candidato elegible;
- malformed output, exit cero invalido y observed identity mismatch;
- shell, delegation/subagents, extra tools/skills/MCP/plugins y paid provider
  denegados;
- ausencia de implicit OpenCode model/provider defaults y de global config
  mutation.

No se fabrica evidencia `PASS` en este PLAN. Los tests que dependan de `yaml`
permanecen no confiables hasta que `WP002-WU-00` cierre la limitacion conocida.

## 8. Scope e integracion

### Incluido

- `tecnotron-agent-launch/v1` strict, authority envelope y normalized result;
- nueve perfiles OpenCode project-scoped y un launcher/adapter generico;
- project/repository/worktree/ownership/scope/context fail-closed;
- permisos efectivos, config proof por invocacion, sanitizacion y aislamiento;
- resolucion concreta requested/resolved/observed de identidad;
- exact-version OpenCode capability conformance;
- tests positivos/negativos completos y review independiente.

### Excluido y diferido

- WP-003: SDD authority, RF/RNF y templates;
- WP-004: generalized Task Cycle, TASK provisioning, Git/worktree creation y
  lifecycle transitions;
- WP-005: persistencia/correlacion general de execution observations;
- WP-006/WP-007: curation global, closure y promotion;
- Recipes, Developer role substitution, devBrain/Advisory, RAG/vector,
  provider benchmarking, model ranking, advanced FinOps y command broker;
- FitFlow writes, dependency installation/update, global OpenCode config y
  broad repository documentation sync.

### Integracion posterior

Cada futura TASK debe partir de `tools` fresco en su worktree task-scoped. La
validacion, review, aceptacion e integracion son dimensiones separadas. Despues
de implementation/validation y review independiente `PASS`, el Developer decide
aceptacion. Solo entonces Task Lifecycle puede integrar por PR/squash hacia
`tools`. `main` permanece reservado para promotion del milestone.

Rollback revierte solo paths versionados y task-owned de la TASK afectada. No
elimina worktrees ajenos, no toca configuracion personal/global, no cambia
registries de producto y no ejecuta cleanup sin autoridad.

## 9. Stop conditions globales

Detener y volver al Developer si:

- la SPEC o una autoridad canonica presenta contradiccion material;
- el environment preflight no puede distinguir o cerrar su categoria;
- una frontera existente requiere cambio incompatible;
- autoridad, worktree, scope, context o model identity no puede probarse;
- OpenCode no puede aislar/probar config efectiva, negar shell/delegation/web
  indirecta, limitar scopes u observar identidad;
- una capacidad exige plugin/SDK, command broker, paid API, secret visible,
  config global o otro repositorio;
- se intenta persistir profile->role/model/provider;
- se necesita retrieval architecture, generalized lifecycle, Developer
  substitution, devBrain o trabajo de un WP posterior;
- cualquier write queda fuera de una TASK y worktree futuros explicitamente
  autorizados.

Estas condiciones son gates de evidencia, no autorizacion para inventar una
solucion alternativa.

## 10. Developer READY checklist

```yaml
accepted_spec_fully_covered: true
work_units_dependency_ordered: true
implementation_scope_bounded: true
environment_preflight_defined: true
security_boundaries_covered: true
conformance_coverage_complete: true
reuse_vs_new_work_explicit: true
later_wp_scope_excluded: true
task_candidates_not_yet_executable: true
unknown_architectural_decisions: []
```

La checklist expresa la suficiencia aceptada por el Developer mediante
`TOF-WP002-READY-GATE-01`. El gate queda `SATISFIED`; su disposicion confirma:

1. que los dos candidatos y la asignacion de unidades son suficientemente
   acotados;
2. que el preflight ambiental y su eventual bootstrap/disposition tienen owner;
3. que los write scopes exactos se fijaran contra un `task_base` fresco;
4. que ninguna eleccion implementation-time de capability proof requiere una
   nueva decision arquitectonica;
5. que review independiente de security/runtime es obligatorio.

## 11. Estado de materializacion

```yaml
plan_status: ACCEPTED
developer_ready_gate: SATISFIED
accepted_plan_source_sha256: d67b1b9fc582f6e5223a8b716a32476ee78d9bbc2cc74573fc1e3409309bf3b4
accepted_spec_coverage: COMPLETE
dependency_graph: COMPLETE
environment_preflight: INCLUDED
known_yaml_limitation: PRESERVED_UNAVAILABLE
conditional_bootstrap_policy: RECORDED
known_model_runtime_observation: PRESERVED_FOR_TOF-W1-003
task_materialization_authorized: true
executable_tasks_created: true
implementation_authority_created: true
implementation_started: false
next_executable_task: TOF-W1-002
task_base: 03651b806da290ae256dfaa6bf924feef0487327
effective_branch: mauedgar/feat-TOF-W1-002
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-TOF-W1-002
next_owner: deterministic Validator
next_required_action: EXECUTE_WP002_WU_00_ENVIRONMENT_TOOLCHAIN_PREFLIGHT
```

`TOF-W1-002` esta materializada contra el baseline competente, con rama/worktree
resueltos e implementacion no iniciada. `TOF-W1-003` se materializara despues
contra el baseline competente resultante; no se precrea su TASK ni su worktree.
