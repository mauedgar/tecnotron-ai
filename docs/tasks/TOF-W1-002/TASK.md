---
document_id: TOF-TASK-W1-002
status: READY
materialization_status: MATERIALIZED
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-09-04
machine_context: true
operation_id: TOF-W1-002-TASK-MATERIALIZATION-01
task_id: TOF-W1-002
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-002
work_units:
  - WP002-WU-00
  - WP002-WU-01
repository: mauedgar/tecnotron-ai
integration_branch: tools
branch_management: TASK_LIFECYCLE
requested_branch: feat/TOF-W1-002
effective_branch: PENDING_TASK_LIFECYCLE_RESOLUTION
task_base: 635f8b12aeeb86f16e7c56901392e8532b80a1b5
worktree: PENDING_TASK_LIFECYCLE_RESOLUTION
execution_status: NOT_STARTED
validation_status: NOT_RUN
review_status: NOT_RUN
developer_acceptance: NOT_RUN
integration_status: NOT_STARTED
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
ownership:
  terminal_acceptance: Developer
  lifecycle: Task Lifecycle
  competent_owner: Implementer
  implementation: Implementer
  environment_validation: deterministic Validator
  validation: deterministic Validator
  independent_review: Reviewer
  evidence_persistence: Task Lifecycle or deterministic evidence recorder
related:
  - "[[work-packages/wp-002-deterministic-opencode-launchers/SPEC]]"
  - "[[work-packages/wp-002-deterministic-opencode-launchers/PLAN]]"
  - "[[contracts/tecnotron-agent-profile-v1]]"
  - "[[tasks/TOF-W1-002/PLAN]]"
---

# TASK TOF-W1-002: perfiles OpenCode project-scoped

## 1. Autoridad y objetivo

Esta TASK autoriza exclusivamente `WP002-WU-00` y `WP002-WU-01`: demostrar una
precondicion reproducible de ambiente y materializar exactamente nueve perfiles
OpenCode project-scoped como proyeccion estatica de
`tecnotron-agent-profile/v1`.

La autoridad de implementacion queda creada, pero la implementacion no comienza
con esta materializacion. Task Lifecycle debe crear o seleccionar la rama y el
worktree exclusivos desde el `task_base` exacto antes de cualquier ejecucion.

```yaml
task_id: TOF-W1-002
task_base: 635f8b12aeeb86f16e7c56901392e8532b80a1b5
integration_target: tools
branch_management: TASK_LIFECYCLE
requested_branch: feat/TOF-W1-002
effective_branch: PENDING_TASK_LIFECYCLE_RESOLUTION
worktree: PENDING_TASK_LIFECYCLE_RESOLUTION
owner: Implementer
effective_role: Implementer
implementation_authorized: true
implementation_started: false
```

El nombre solicitado de rama sigue el mecanismo vigente, pero no afirma que la
rama o el worktree existan. No se inventa ni persiste un path de worktree.

## 2. Scope y write ownership

### Incluido

- `WP002-WU-00`: environment and toolchain reproducibility preflight.
- `WP002-WU-01`: nine project-scoped profiles and static permission projection.
- Reuso del registry, schema, loader y tests contractuales ya aceptados de
  `tecnotron-agent-profile/v1`.
- Evidencia determinista de ambiente, proyeccion y regresion.

### Write scope exacto del Implementer

```yaml
implementer_write_scope:
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
validator_write_scope: []
reviewer_write_scope: []
lifecycle_evidence_scope:
  - docs/tasks/TOF-W1-002/RESULT.md
  - docs/tasks/TOF-W1-002/REVIEW.md
```

`WP002-WU-00` es read-only salvo el bootstrap condicional exacto de la seccion
4, que puede cambiar solo el dependency installation state del worktree. No
autoriza cambios de source, tests, config, manifest o lockfile. `RESULT.md` y
`REVIEW.md` solo pueden ser materializados posteriormente por Task Lifecycle o
un evidence recorder determinista desde reportes externos; no amplian el write
scope del Implementer, Validator o Reviewer.

### Excluido

- `WP002-WU-02` a `WP002-WU-07` y cualquier parte de `TOF-W1-003`.
- `tecnotron-agent-launch/v1`, schemas de launch y authority-resolution envelope.
- AuthorityResolver, project/worktree/context launch preflight y runtime
  authority congruence.
- Effective-config proof, invocation isolation y runtime permission enforcement.
- Model/provider/runtime selection, resolver changes o model-registry refresh.
- Generic launcher, OpenCode adapter, actor invocation y full WP-002 conformance.
- Global/personal OpenCode configuration, otro repositorio y broad documentation
  sync.
- Nuevas dependencias, upgrades o cambios de manifest/lockfile.

La observacion stale de modelo pertenece a la evidencia futura de
`TOF-W1-003`; no es input, requisito ni autoridad de reemplazo para esta TASK.

## 3. WP002-WU-00: preflight de ambiente

Antes de confiar en tests de WP-001 o comenzar WU-01, el Validator debe observar
sin actor invocation ni network assumption:

- executable y version exacta de Node;
- executable y version exacta de npm o package manager competente;
- executable y version exacta de Git;
- executable OpenCode resuelto y version exacta observada;
- `package.json` y el lockfile aceptado;
- consistencia de manifest y lockfile;
- estado local de instalacion/resolucion de dependencias;
- tests baseline relevantes;
- tests contractuales relevantes de WP-001;
- command/config surface de OpenCode estrictamente necesaria para representar
  los perfiles estaticos de WU-01, sin declarar runtime conformance.

La limitacion conocida se conserva sin reinterpretarla:

```yaml
wp001_test:
  status: UNAVAILABLE
  reason: declared yaml dependency absent from checkout
```

El diagnostico debe asignar exactamente una categoria por causa, sin colapsar
categorias:

```text
DECLARED_NOT_BOOTSTRAPPED
UNDECLARED_DEPENDENCY
MANIFEST_LOCKFILE_INCONSISTENCY
OBSOLETE_OR_NON_APPLICABLE_TEST
RUNTIME_OR_TOOL_INCOMPATIBILITY
OTHER_BLOCKING_ENVIRONMENT_DRIFT
```

`UNAVAILABLE` puede describir el diagnostico, pero no satisface una validacion
final obligatoria. Si el estado no puede clasificarse inequivocamente, detener
para disposition del Developer.

## 4. Autoridad condicional de bootstrap

El bootstrap reproducible canonico desde el lockfile existente esta autorizado
si y solo si WU-00 prueba conjuntamente:

1. la dependencia esta declarada en el manifest competente;
2. la dependencia esta representada consistentemente en el lockfile aceptado;
3. el checkout esta clasificado deterministicamente como
   `DECLARED_NOT_BOOTSTRAPPED`;
4. no hace falta correccion semantica de manifest o lockfile.

En ese unico caso, Task Lifecycle o el mecanismo de ambiente autorizado puede
ejecutar el bootstrap reproducible canonico del repositorio desde el lockfile.

```yaml
dependency_upgrade: PROHIBITED
new_dependency: PROHIBITED
manifest_change: PROHIBITED
lockfile_change: PROHIBITED
ad_hoc_install: PROHIBITED
post_bootstrap:
  manifest_diff: NONE
  lockfile_diff: NONE
  affected_tests: RERUN
```

Si falta cualquiera de las cuatro pruebas, la TASK se detiene y vuelve al
Developer. No se adivina ni aplica una correccion alternativa.

## 5. WP002-WU-01: perfiles y proyeccion estatica

La implementacion debe cargar y validar el registry aceptado
`tecnotron-agent-profile/v1` y derivar exactamente estos nueve IDs, sin aliases,
default implicito, decimo perfil ni identidad nueva:

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

Cada archivo project-scoped es una proyeccion ejecutable del contrato portable,
no un registry semantico paralelo. La proyeccion debe preservar required inputs,
responsabilidad y techo de permisos del source aceptado y expresar de forma
determinista:

```yaml
profile_model_binding: PROHIBITED
implicit_model_binding: PROHIBITED
permission_strategy: DENY_BY_DEFAULT
delegation: DENIED
subagents: DENIED
subagent_depth: 0
native_actor_shell: DENIED
paid_api: DISABLED
global_opencode_config_mutation: PROHIBITED
```

La traduccion estatica de cada dimension semantica al formato OpenCode debe
estar cubierta por tests y fixtures. Nunca puede ampliar permisos; cualquier
valor unknown, unsupported, ambiguo o no demostrable falla cerrado. Allowlists
vacias de tools, skills o MCP significan cero capacidades adicionales, no
acceso irrestricto. Plugins y rutas indirectas tampoco pueden ampliar el
contrato.

Esta TASK valida solo la proyeccion estatica intended/project-scoped. La
autoridad dinamica, congruencia runtime, configuracion efectiva y actor
invocation pertenecen a `TOF-W1-003`.

## 6. Reuse obligatorio

| Clasificacion | Dependencia | Tratamiento |
| --- | --- | --- |
| `REUSE_AS_IS` | `tecnotron-agent-profile/v1` registry, schema y `loadAgentProfiles` | Unica fuente de IDs, inputs y permisos; no duplicar semantica. |
| `REUSE_AS_IS` | Node test runner, fixtures y contract-test infrastructure | Extender la suite con casos focalizados. |
| `REUSE_AS_IS` | doctor/version discovery | Observar executables y versiones; no inferir conformance. |
| `REUSE_AS_IS` | deterministic validators y `git diff --check` | Probar matrices, scope y ausencia de writes no autorizados. |
| `NEW_IMPLEMENTATION_REQUIRED` | nueve `.opencode/agents` y fixtures/tests de proyeccion estatica | Implementar solo los paths autorizados. |

Una necesidad real de cambiar un contrato aceptado, extender un runtime owner o
crear otra frontera se clasifica antes de escribir como `BOUNDED_EXTENSION` o
`NEW_IMPLEMENTATION_REQUIRED` y detiene esta TASK para disposition del
Developer. Esta TASK no autoriza esas extensiones.

## 7. Acceptance criteria

### Ambiente

- [ ] Executables y versiones de Node, package manager, Git y OpenCode observados.
- [ ] Manifest y lockfile consistentes.
- [ ] Estado de dependencias clasificado con exactamente una categoria por causa.
- [ ] Limitacion `yaml` resuelta y tests afectados reejecutados, o TASK detenida
      competentemente sin presentarla como validacion final `PASS`.
- [ ] Tests baseline relevantes utilizables y en `PASS`.
- [ ] Tests contractuales WP-001 relevantes en `PASS`.

### Perfiles

- [ ] Existen exactamente nueve perfiles project-scoped.
- [ ] Sus IDs coinciden uno a uno con el contrato aceptado.
- [ ] Ningun perfil contiene binding de role/model/provider/runtime.
- [ ] La proyeccion es deny-by-default y nunca mas amplia que el contrato.
- [ ] Native actor shell esta denegado en los nueve perfiles.
- [ ] Delegation, subagents y task spawning estan denegados.
- [ ] `subagent_depth` es exactamente `0`.
- [ ] Paid API permanece disabled.
- [ ] Configuracion OpenCode global/personal permanece intacta.

### Regresion y evidencia

- [ ] `AC-LAUNCH-002` pasa para discovery estatico de los nueve perfiles.
- [ ] `NC-LAUNCH-002`, `004`, `007`, `008`, `012` y `013` demuestran fail-closed.
- [ ] WP-001 contracts relevantes pasan despues de cualquier bootstrap elegible.
- [ ] Diff completo contiene solo paths autorizados.
- [ ] Staging esta vacio durante handoff del Implementer.
- [ ] `git diff --check` pasa.

## 8. Validacion y review

Los comandos exactos se fijan desde el package surface observado por WU-00. La
validacion minima incluye el test focalizado de perfiles OpenCode, los tests
contractuales de WP-001 afectados, la regresion baseline relevante, diff
allowlist, staging vacio y `git diff --check`. Cada resultado usa exclusivamente
`PASS`, `FAIL`, `NOT_RUN` o `UNAVAILABLE`.

Tras implementacion y validacion determinista completas, Task Lifecycle fija un
snapshot inmutable y activa review independiente por cambio de permisos/security
boundary. El Reviewer debe ser distinto del Implementer, permanecer read-only y
emitir un external review report. No se ejecuta review durante esta
materializacion. Un review `PASS` habilita solo el gate de aceptacion del
Developer; no implica aceptacion ni integracion.

## 9. Stop conditions

Detener y volver al Developer si:

- el baseline, branch, worktree o scope no coincide con esta TASK;
- la clasificacion ambiental no es inequivoca o no permite el bootstrap exacto;
- se requiere dependencia nueva, upgrade, install ad hoc o cambio de
  manifest/lockfile;
- OpenCode no puede representar estaticamente la proyeccion sin default
  permisivo;
- una dimension de permiso es unknown, unsupported, ambigua o no demostrable;
- un allowlist vacio se interpretaria como acceso irrestricto;
- se requiere config global/personal, model binding, shell, delegation,
  subagents o paid API;
- se necesita cambiar un contrato aceptado o una frontera fuera del write scope;
- se necesita cualquier parte de `WP002-WU-02+`, `TOF-W1-003`, otro WP u otro
  repositorio;
- Reviewer independiente o evidencia versionada no pueden demostrarse.

## 10. Durabilidad, integracion y estado

Esta materializacion no se autoacepta ni se integra. Conforme al Task Lifecycle,
commit, push y PR de los artefactos materializados requieren el gate competente;
la implementacion posterior ocurre solo en el worktree task-scoped que Task
Lifecycle asigne desde el `task_base` declarado. Integracion de implementacion
requiere validacion, review independiente `PASS` y aceptacion terminal posterior
del Developer.

```text
TASK_MATERIALIZED: MATERIALIZED
TASK_CONTRACT_STATUS: READY
TASK_EXECUTED: NOT_STARTED
VALIDATION: NOT_RUN
REVIEW: NOT_RUN
DEVELOPER_ACCEPTANCE: NOT_RUN
INTEGRATION: NOT_STARTED
CLOSURE: OPEN
```
