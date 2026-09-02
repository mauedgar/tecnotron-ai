---
document_id: TOF-WP-001-PLAN-001
status: ACCEPTED
owner: tecnotron-ai
type: work-package-plan
version: 1.1
updated: 2026-09-01
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-001
spec: docs/work-packages/wp-001-operational-profile-contracts/SPEC.md
task_base: 651e84de6524972cae925c067209705560b43f6d
execution_status: PENDING_REVIEW
implementation_status: IMPLEMENTED
validation_status: PASS
review_status: REVIEW_REQUIRED
implementation_authorized: true
authorization_source: Developer ruling TOF-W1-001 execution and evidence correction
implementation_task: TOF-W1-001
complexity: high
criticality: high
scope_fit: FIT
context_budget:
  class: medium
  policy: accepted_SPEC_plus_one_execution_unit
  expansion_limit: 2
dependencies:
  - WP-000 DONE
  - WP-001 SPEC accepted
ownership:
  terminal_acceptance: Developer
  planning: Architect
  implementation: Implementer
  validation: deterministic Validator
  independent_review: Reviewer
related:
  - "[[work-packages/wp-001-operational-profile-contracts/SPEC]]"
  - "[[tasks/TOF-W1-001/TASK]]"
---

# PLAN WP-001: Operational Profile Contracts

## 1. Estrategia

Implementar la SPEC aceptada mediante una única TASK, `TOF-W1-001`, porque el
resultado permanece en un repositorio, un contrato y un ownership. La solución
separa el nuevo profile registry del role registry de routing existente y usa
conformance estática fail-closed antes de cualquier adapter o launcher.

La SPEC ya está aceptada. Este plan no puede modificar sus nueve perfiles,
writers, permisos, Validator, frontera de modelo, compatibilidad ni condición
web.

## 2. Diseño técnico

### Registry portable

El registry canónico será YAML y contendrá únicamente
`tecnotron-agent-profile/v1` y las nueve entradas aprobadas. No será configuración
de producto ni registry de routing.

### Schema y loader

Un schema Zod strict validará todos los niveles, enums cerrados, conjunto exacto
de perfiles e invariantes cross-entry. Un loader dedicado reutilizará la lectura
YAML determinista existente sin registrar el nuevo archivo como configuración
FitFlow ni modificar `fitflow-role-registry/v3`.

### Fixtures y contract tests

Una fixture válida demostrará la forma canónica. Fixtures negativas cubrirán
cada frontera de writer, permisos, web, delegation, identidad de modelo,
legacy IDs, unknown fields, namespace y estructura exacta. Los errores
relevantes serán estables y reproducibles.

### Documentación contractual

La documentación mínima explicará el contrato, el registry, la frontera legacy,
los consumidores y el handoff a WP-002 sin implementar perfiles OpenCode.

## 3. Descomposición y paths

Una sola TASK es suficiente:

| TASK | Resultado |
| --- | --- |
| `TOF-W1-001` | Schema, registry YAML, loader/export, fixtures, contract tests, inventario de consumidores y documentación mínima de `tecnotron-agent-profile/v1`. |

La TASK permanece única, pero sus fases tienen ownership disjunto. Write scope
exacto del `implementer`:

```text
implementer_write_scope:
src/registries/schemas/agent-profiles.js
src/registries/agent-profiles.js
src/registries/agent-profiles.yaml
src/registries/index.js
tests/contract/agent-profiles.test.js
tests/fixtures/agent-profiles/**
```

Write scope exacto del `doc_curator`:

```text
doc_curator_write_scope:
docs/contracts/tecnotron-agent-profile-v1.md
```

Persistencia exclusiva del Task Lifecycle o evidence recorder determinista:

```text
lifecycle_evidence_scope:
docs/tasks/TOF-W1-001/RESULT.md
docs/tasks/TOF-W1-001/REVIEW.md
```

`reviewer_write_scope` está vacío. El Reviewer permanece read-only y emite un
`external_review_report`; no escribe `REVIEW.md`. `RESULT.md` se materializa
desde los reportes existentes en su gate y `REVIEW.md` solo después del handoff
del review externo. Ningún perfil adquiere permiso de lifecycle bookkeeping.

## 4. Fases

### Phase 0: gate de ejecución

1. Exigir review independiente `PASS` y aceptación del Developer de esta
   materialización.
2. Integrar la materialización en `tools` mediante Task Lifecycle.
3. Resolver un `task_base` fresco desde el nuevo `tools`.
4. Crear `feat/TOF-W1-001` y su worktree exclusivo.
5. Revalidar TASK, PLAN, branch, worktree, clean status y write scope.

Gate: ninguna implementación comienza en la rama de materialización.

### Phase 1: RED

1. Crear contract tests que expresen `AC-PROFILE-001` a
   `AC-PROFILE-017`.
2. Crear fixtures negativas para todos los controles de la SPEC.
3. Confirmar que los tests fallan por ausencia del nuevo contrato, no por
   dependencias o configuración externa.

Gate: evidencia RED reproducible dentro del write scope.

### Phase 2: GREEN mínimo

1. Implementar schema strict e invariantes cross-entry.
2. Materializar el registry YAML exacto.
3. Implementar loader dedicado y export mínimo.
4. Mantener tools/skills con allowlists vacías y fail-closed.
5. No modificar role/model registries ni sus consumidores.

Gate: tests focalizados positivos y negativos `PASS`.

### Phase 3: compatibilidad

1. Verificar que `coder_*` se rechaza solo como profile ID nuevo.
2. Confirmar que Router, Model Resolver, Agent MVP y runtime siguen sin cambios.
3. Confirmar consumidores conocidos y frontera WP-001/WP-002.
4. Confirmar ausencia de paths absolutos y namespaces FitFlow/OpenCode en el
   registry.

Gate: no migration, alias, launcher, runtime ni otro repositorio.

### Phase 4: documentación autorizada

1. El Developer inicia una ejecución separada de `doc_curator`, sin delegation.
2. `doc_curator` materializa únicamente
   `docs/contracts/tecnotron-agent-profile-v1.md` desde la SPEC y evidencia
   aceptadas.
3. `doc_curator` emite `documentation_report` externo.

Gate: ningún source writer escribe documentación contractual.

### Phase 5: validación, evidencia y handoff

1. Ejecutar contract tests focalizados y regresión de registries.
2. Ejecutar la suite disponible sin instalar dependencias.
3. Validar allowlist del diff, `git diff --check` y no staging.
4. `implementer` emite `implementation_report`; Validator emite resultados
   deterministas sin filesystem write.
5. Task Lifecycle o un evidence recorder determinista materializa `RESULT.md`
   desde los reportes existentes.
6. Entregar el snapshot a un Reviewer independiente, que emite un
   `external_review_report` sin escribir el repositorio.
7. El evidence recorder materializa `REVIEW.md` solo después del handoff.

Gate: `AC-PROFILE-018` requiere review `PASS` antes del Developer gate.

## 5. Trazabilidad

| Decisión | Evidencia planificada |
| --- | --- |
| `D-WP001-01` | Schema, registry y resultado único dentro del scope. |
| `D-WP001-02` | Exact-key validation y fixtures missing/extra. |
| `D-WP001-03` | Matriz canónica codificada y tests por perfil. |
| `D-WP001-04` | Rechazo de Validator como profile y separación documental. |
| `D-WP001-05` | Invariantes de permisos, delegation y web. |
| `D-WP001-06` | Allowlists strict, vacías por defecto y no expansivas. |
| `D-WP001-07` | Rechazo de campos de modelo/provider/runtime. |
| `D-WP001-08` | Namespace nuevo y role registry v3 sin cambios. |
| `D-WP001-09` | Rechazo `coder_*`; cero aliases o migración. |
| `D-WP001-10` | Única TASK `TOF-W1-001`. |
| `D-WP001-11` | TASK referencia esta SPEC aceptada y no la produce. |
| `D-WP001-12` | AC, controles negativos, stop conditions y budget preservados. |

## 6. Gates, rollback y split

Gates obligatorios:

- aislamiento y baseline fresco;
- RED y GREEN reproducibles;
- validación determinista con estados explícitos;
- review independiente de contrato y security boundaries;
- aceptación exclusiva del Developer;
- integración posterior mediante Task Lifecycle.

Rollback revierte únicamente los paths task-owned de `TOF-W1-001`; no modifica
registries legacy, consumidores, branches históricas ni configuración externa.

Stop conditions:

- dividir y volver al Developer si aparece otro repositorio, ownership diferente,
  cambio de Router/runtime, migración legacy o un segundo resultado independiente;
- Stop if the selected schema cannot express deny-by-default permissions without ambiguity.


## 7. Estado

La planificación fue revisada independientemente con `PASS` y aceptada por el
Developer. Esa aceptación de materialización no inició por sí sola la TASK. Un
ruling posterior autorizó `TOF-W1-001` desde `task_base` `651e84d`; la
implementación y la validación disponible están completas y el handoff actual
requiere un nuevo review independiente.

```text
ACCEPTED
IMPLEMENTED
PENDING_REVIEW
```
