---
document_id: TOF-TASK-W1-003
status: READY
materialization_status: MATERIALIZED
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-09-05
machine_context: true
operation_id: TOF-W1-003-TASK-MATERIALIZATION-01
task_id: TOF-W1-003
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-002
work_units:
  - WP002-WU-02
  - WP002-WU-03
  - WP002-WU-04
  - WP002-WU-05
  - WP002-WU-06
  - WP002-WU-07
repository: mauedgar/tecnotron-ai
integration_branch: tools
branch_management: TASK_LIFECYCLE
requested_branch: feat/TOF-W1-003
effective_branch: PENDING_TASK_LIFECYCLE_RESOLUTION
task_base_policy: POST_MATERIALIZATION_TOOLS_HEAD
worktree: PENDING_TASK_LIFECYCLE_RESOLUTION
execution_status: NOT_STARTED
implementation_status: NOT_STARTED
validation_status: NOT_RUN
review_status: NOT_RUN
developer_acceptance: NOT_RUN
integration_status: NOT_STARTED
closure_status: OPEN
implementation_authorized: true
implementation_started: false
complexity: high
criticality: high
scope_fit: FIT
context_budget:
  class: large
  policy: accepted_SPEC_plus_one_launcher_slice
  expansion_limit: 2
accepted_spec:
  path: docs/work-packages/wp-002-deterministic-opencode-launchers/SPEC.md
  semantic_sha256: 4733259d18b3f64f58f31127b1de4ba1b2ee6ca2a09a9046d95fced04aaaf202
accepted_wp_plan:
  path: docs/work-packages/wp-002-deterministic-opencode-launchers/PLAN.md
  semantic_sha256: d67b1b9fc582f6e5223a8b716a32476ee78d9bbc2cc74573fc1e3409309bf3b4
dependencies:
  - WP-000 DONE
  - WP-001 ACCEPTED_INTEGRATED
  - WP-002 SPEC ACCEPTED
  - WP-002 PLAN ACCEPTED
  - Developer READY gate SATISFIED
  - TOF-W1-002 DONE
  - TOF-W1-002 CLEANUP_COMPLETE
ownership:
  terminal_acceptance: Developer
  lifecycle: Task Lifecycle
  competent_owner: Implementer
  implementation: Implementer
  validation: deterministic Validator
  independent_review: Reviewer
  evidence_persistence: Task Lifecycle or deterministic evidence recorder
related:
  - "[[work-packages/wp-002-deterministic-opencode-launchers/SPEC]]"
  - "[[work-packages/wp-002-deterministic-opencode-launchers/PLAN]]"
  - "[[contracts/tecnotron-agent-profile-v1]]"
  - "[[tasks/TOF-W1-002/TASK]]"
---

# TASK TOF-W1-003: launcher OpenCode determinista

## 1. Autoridad y objetivo

Esta TASK autoriza exclusivamente `WP002-WU-02` a `WP002-WU-07`: implementar y
validar el contrato strict `tecnotron-agent-launch/v1`, sus preflights
fail-closed, la proyeccion efectiva de permisos y entorno, la resolucion
autorizada de model/provider/runtime, un unico adapter OpenCode CLI y un launcher
generico; despues, producir conformance determinista y review independiente.

La autoridad de implementacion queda creada, pero la implementacion no comienza
con esta materializacion. Task Lifecycle debe crear o seleccionar la rama y el
worktree exclusivos desde `execution_task_base`, definido como el
`post_materialization_tools_head` exacto de esta operacion, antes de cualquier
ejecucion.

```yaml
task_id: TOF-W1-003
execution_task_base: POST_MATERIALIZATION_TOOLS_HEAD
integration_target: tools
branch_management: TASK_LIFECYCLE
requested_branch: feat/TOF-W1-003
effective_branch: PENDING_TASK_LIFECYCLE_RESOLUTION
worktree: PENDING_TASK_LIFECYCLE_RESOLUTION
owner: Implementer
effective_role: Implementer
implementation_authorized: true
implementation_started: false
```

El nombre solicitado de rama no afirma que la rama o el worktree existan. Esta
operacion no los crea ni inventa un path. La identidad Git concreta debe ser
resuelta y transportada por Task Lifecycle en la siguiente operacion competente.

## 2. Scope y write ownership

### Incluido

- `WP002-WU-02`: contrato, autoridad y preflight estructural.
- `WP002-WU-03`: permisos, entorno y configuracion efectiva.
- `WP002-WU-04`: resolucion de model/provider/runtime.
- `WP002-WU-05`: adapter OpenCode CLI y launcher generico.
- `WP002-WU-06`: conformance determinista completa.
- `WP002-WU-07`: review independiente y handoff al Developer.
- Reuso estricto de `tecnotron-agent-profile/v1`, Project Profile,
  `resolveProject`, ContextPackager, Router, Role Registry v3, Model Registry v3,
  Model Resolver, FinOps v1 y contratos existentes segun sus owners competentes.

### Write scope exacto

```yaml
implementer_write_scope:
  - src/contracts/agent-launch.js
  - src/contracts/index.js
  - src/agent-launch/authority.js
  - src/agent-launch/project-preflight.js
  - src/agent-launch/context-preflight.js
  - src/agent-launch/permission-projection.js
  - src/agent-launch/environment.js
  - src/agent-launch/configuration.js
  - src/agent-launch/evidence-sanitizer.js
  - src/agent-launch/model-resolution.js
  - src/agent-launch/index.js
  - src/model-resolver/index.js
  - src/contracts/model-resolution.js
  - src/adapters/opencode-cli.js
  - src/adapters/index.js
  - tests/contract/agent-launch.test.js
  - tests/core/agent-launch-preflight.test.js
  - tests/core/agent-launch-permissions.test.js
  - tests/core/agent-launch-configuration.test.js
  - tests/core/agent-launch-model-resolution.test.js
  - tests/core/agent-launch.test.js
  - tests/core/agent-launch-*.test.js
  - tests/adapters/opencode-cli.test.js
  - tests/integration/opencode-launch.test.js
  - tests/fixtures/agent-launch/**
  - tests/fixtures/agent-launch-configuration/**
  - tests/fixtures/agent-launch-model-resolution/**
  - tests/fixtures/opencode-cli/**
validator_write_scope:
  - tests/contract/agent-launch.test.js
  - tests/core/agent-launch-*.test.js
  - tests/adapters/opencode-cli.test.js
  - tests/integration/opencode-launch.test.js
  - tests/fixtures/agent-launch/**
  - tests/fixtures/opencode-cli/**
reviewer_write_scope: []
lifecycle_evidence_scope:
  - docs/tasks/TOF-W1-003/RESULT.md
  - docs/tasks/TOF-W1-003/REVIEW.md
```

El Validator solo puede completar fixtures/tests deterministas faltantes dentro
de su scope despues del snapshot de `WP002-WU-05`; no adquiere ownership de
source. El Reviewer permanece read-only. `RESULT.md` y `REVIEW.md` solo pueden
ser materializados posteriormente por Task Lifecycle o un evidence recorder
determinista desde reportes externos.

### Excluido

- Implementacion durante esta operacion de materializacion.
- WP-003 a WP-007, SDD authority, generalized Task Cycle, persistencia general
  de observations, curation global, closure o promotion.
- Creacion o modificacion de Project Profile, ContextPackager, Router, registries,
  FinOps o Agent Runtime fuera de las extensiones exactas autorizadas.
- Model Registry refresh, ranking, benchmarking, advanced FinOps, fallback,
  retries, implicit OpenCode defaults o paid API.
- Binding `profile -> role/model/provider/runtime` o persistencia de preferencia
  de modelo/provider/runtime en perfiles.
- Plugins, SDK, command broker, nuevas dependencias, upgrades o cambios de
  manifest/lockfile.
- Configuracion OpenCode global/personal, secretos, credenciales visibles, otro
  repositorio o broad documentation sync.
- Creacion de branch/worktree de implementacion en esta materializacion.

## 3. WP002-WU-02: contrato, autoridad y preflight

Implementar request/result strict v1, rechazo de unknown fields, envelope de las
cinco authority kinds, reglas `REQUIRED`/`CONDITIONAL`/`FORBIDDEN`, congruencia
`DERIVED`/`ASSERTED_AND_EQUAL`, observacion explicita de proyecto/repositorio/cwd/
branch/HEAD/worktree, containment de symlinks/traversal, scopes writer/read-only,
integridad y budget de contexto, y resultados normalizados con reason codes
estables y digests sanitizados.

Debe demostrar `DR-WP002-004` a `DR-WP002-015`, incluidos `010A`/`010B`,
`DR-WP002-019` a `DR-WP002-022` y el orden estructural de `DR-WP002-034`.
Todo fallo de autoridad, worktree, ownership, scope, contexto o input requerido
bloquea antes de invocar al actor.

## 4. WP002-WU-03: permisos, entorno y configuracion

Proyectar la interseccion monotonicamente restrictiva de perfil, autoridad,
autorizaciones condicionales, scope task/worktree y capacidades demostradas.
Denegar shell nativo, delegation/subagents, paid API, tools/skills/MCP/plugins
extra y rutas web indirectas; permitir web solo a `researcher` cuando este
autorizada. Reconstruir un entorno minimo allowlisted, rechazar secrets,
provider overrides y conflictos de roots, y comparar config proyectada contra
config efectiva mediante `INVOCATION_ISOLATION` o `EFFECTIVE_CONFIG_PROBE`.

Debe demostrar `DR-WP002-023` a `DR-WP002-030A`, incluidos `028A` y `030A`.
Solo `CONFORMANT` o `SAFELY_NARROWER` habilita al actor; unknown, mismatch o
broader config falla cerrado.

## 5. WP002-WU-04: model/provider/runtime

Resolver `EXPLICIT_CONSTRAINTS` y `AUTHORIZED_DETERMINISTIC_SELECTION` a las tres
coordenadas concretas y elegibles antes del actor, preservando por separado
requested, resolved y observed identity. Cubrir model-only, model+provider,
provider-only, runtime-only y provider+runtime; distinguir unsupported,
ineligible, unresolved, resolver-unavailable y provider/runtime-unavailable.

Debe demostrar `DR-WP002-016` a `DR-WP002-018`, incluido `017A`, sin usar
`profile_id` como input de routing/model selection, sin reemplazar Router y sin
introducir defaults implicitos, ranking, paid API o compatibility shims
genericos.

La observacion mutable aceptada se conserva y debe revalidarse sin autorizar
sustitucion automatica:

```yaml
known_model_runtime_observation:
  requested_model: opencode/hy3-free
  observed_result: MODEL_NOT_FOUND
  observed_during: WP002_PLAN_COVERAGE_AUDIT
  architectural_effect: NONE
  disposition: REVALIDATE_DURING_MODEL_RUNTIME_PREFLIGHT
```

## 6. WP002-WU-05: adapter y launcher

Implementar exactamente un adapter OpenCode CLI y un launcher generico. Deben
descubrir version/capacidades sin actor, ejecutar una unica invocacion no
interactiva solo despues de todos los preflights, pasar cwd/profile/config/
identidad/contexto explicitamente, controlar timeout/abort y descendientes,
validar output machine-readable y artefactos, observar identidad/version y
compararlas, y normalizar resultados/diagnosticos sanitizados.

Debe demostrar `DR-WP002-001`, `DR-WP002-003`, `DR-WP002-031` a
`DR-WP002-040` e `ITE-WP002-001`. No hay retry, fallback, default implicito,
plugin/SDK ni mutacion global. Cualquier capability obligatoria no demostrable
produce `UNAVAILABLE` antes del actor.

## 7. WP002-WU-06: conformance determinista

Completar solo fixtures/tests deterministas faltantes y ejecutar suites
contract/core/adapter/integration, regresion completa, allowlist del diff,
staging, `git diff --check`, ausencia de secretos y ausencia de mutacion global.
La matriz final debe demostrar `AC-LAUNCH-001` a `AC-LAUNCH-023`,
`NC-LAUNCH-001` a `NC-LAUNCH-030`, `ITE-WP002-002` a `ITE-WP002-004`, los
nueve perfiles, ambos writers, todos los read-only y la version exacta soportada.

Ninguna capability obligatoria puede quedar `FAIL`, `NOT_RUN` o `UNAVAILABLE`.
La salida es un snapshot inmutable validado y evidencia sanitizada para review;
no es review, aceptacion, integracion, publicacion ni `DONE`.

## 8. WP002-WU-07: review independiente

Un Reviewer independiente y read-only debe verificar contra source directo y
evidencia versionada las fronteras de contrato, autoridad, security, permisos,
config isolation, separacion de modelo, containment del adapter y sanitizacion.
El commit/diff y los digests revisados deben coincidir con el snapshot de WU-06.

El reporte externo emite `PASS` o `FAIL` y una matriz de findings. Solo un
snapshot `PASS` puede entregarse como `PENDING_ACCEPTANCE` al Developer. El
review no escribe source, tests, config, TASK, RESULT, REVIEW ni lifecycle state,
y no implica aceptacion o integracion.

## 9. Acceptance y cobertura

- [ ] `WP002-WU-02` cubre contrato strict, cinco authority kinds, congruencia,
      ownership/worktree/scope/context, inputs y reason codes.
- [ ] `WP002-WU-03` cubre permission/config projection, entorno/secrets, paid
      denial y proof efectivo por invocacion.
- [ ] `WP002-WU-04` cubre ambos estados legales de model request y todos los
      constraint shapes sin profile binding ni defaults implicitos.
- [ ] `WP002-WU-05` cubre la boundary CLI real, version exacta, una invocacion,
      observed identity, malformed output, timeout/abort y process/write cleanup.
- [ ] `WP002-WU-06` demuestra la matriz integrada completa AC/NC sin casos
      obligatorios omitidos y sin regresion atribuible a WP-002.
- [ ] `WP002-WU-07` entrega review security/runtime independiente sobre el
      snapshot inmutable exacto.
- [ ] Los nueve perfiles preservan su ID hasta el adapter; solo los dos writers
      aceptados pueden escribir dentro de allowlists task-owned.
- [ ] Shell, delegation/subagents, extra tools/skills/MCP/plugins, paid API,
      implicit defaults, secrets y mutacion global permanecen denegados.
- [ ] Requested/resolved/observed identity y status/reason codes son trazables y
      sanitizados.
- [ ] El diff contiene solo paths autorizados, staging esta vacio en handoff y
      `git diff --check` pasa.

## 10. Secuencia, gates y stop conditions

La secuencia obligatoria es `WU-02 -> WU-03/WU-04 -> WU-05 -> WU-06 -> WU-07`.
No se invoca al actor antes de completar autoridad, contexto, permisos, config e
identidad. Validacion, review, aceptacion e integracion son dimensiones
separadas. Despues de review independiente `PASS`, el Developer conserva el gate
terminal; solo despues de aceptacion Task Lifecycle puede integrar por PR hacia
`tools`.

Detener y volver al Developer si:

- baseline, TASK, branch, worktree, ownership, scope, contexto o identity no se
  pueden probar o son incongruentes;
- una autoridad competente no puede producir el envelope completo;
- un owner existente requiere un cambio incompatible o se crearia otra fuente
  de autoridad, lifecycle, registry o worktree provisioner;
- OpenCode no puede probar config efectiva, negar capacidades prohibidas,
  contener procesos/writes u observar identidad sin ambiguedad;
- se requiere plugin/SDK, command broker, dependencia nueva/upgrade, paid API,
  secret visible, config global, otro repositorio o scope de un WP posterior;
- resolver runtime-only exige mapear profile a role/model/provider/runtime;
- una capability o caso obligatorio queda `FAIL`, `NOT_RUN` o `UNAVAILABLE`;
- cambia el snapshot despues de validacion, queda un finding bloqueante o no se
  puede demostrar independencia/read-only del Reviewer.

## 11. Durabilidad y estado

Esta materializacion debe versionarse en `tools` para que la siguiente operacion
resuelva un `execution_task_base` que contenga la TASK. No crea branch/worktree
de implementacion, no ejecuta WU-02..WU-07 y no materializa RESULT/REVIEW.

```text
TASK_MATERIALIZED: MATERIALIZED
TASK_CONTRACT_STATUS: READY
TASK_EXECUTED: NOT_STARTED
IMPLEMENTATION_STARTED: false
VALIDATION: NOT_RUN
REVIEW: NOT_RUN
DEVELOPER_ACCEPTANCE: NOT_RUN
INTEGRATION: NOT_STARTED
CLOSURE: OPEN
NEXT_OPERATION: TASK_LIFECYCLE_CREATE_IMPLEMENTATION_BRANCH_AND_WORKTREE
```

## Runtime

```yaml
execution_backend: CURRENT_COMPETENT_RUNTIME
reasoning_effort: medium
session_policy: FRESH_TASK_LIFECYCLE_SESSION
model_selection_effect: NONE
```
