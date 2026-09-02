---
document_id: TOF-TASK-W1-001
status: PLANNED
materialization_status: ACCEPTED
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-09-01
machine_context: true
task_id: TOF-W1-001
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-001
repository: tecnotron-ai
integration_branch: tools
task_branch: feat/TOF-W1-001
task_base: bb2bfe7892b2e3c87297e445bb16279c4630385c
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-TOF-W1-001
execution_status: EXECUTED
execution_readiness: READY_FOR_INDEPENDENT_REVIEW
implementation_authorized: true
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
  - materialization review PASS
  - Developer materialization acceptance COMPLETE
  - materialization integrated into tools
  - fresh task_base and isolated worktree
ownership:
  terminal_acceptance: Developer
  contract_and_registry: tecnotron-ai
  implementation: Implementer
  contract_documentation: Doc Curator
  validation: deterministic Validator
  independent_review: Reviewer
  evidence_persistence: Task Lifecycle or deterministic evidence recorder
related:
  - "[[work-packages/wp-001-operational-profile-contracts/SPEC]]"
  - "[[work-packages/wp-001-operational-profile-contracts/PLAN]]"
  - "[[tasks/TOF-W1-001/PLAN]]"
---

# TASK TOF-W1-001: implementar tecnotron-agent-profile/v1

## 1. Objetivo

Implementar la SPEC WP-001 ya aceptada mediante un registry YAML portable,
schema strict, loader/export mínimo, fixtures, contract tests positivos y
negativos, inventario de consumidores y documentación contractual mínima.

Esta TASK no produce, redefine ni acepta la SPEC. Su materialización fue
aceptada e integrada; el Developer autorizó explícitamente la implementación y
la ejecución ya se completó en el worktree dedicado.

## 2. Identidad de ejecución

```yaml
repository: tecnotron-ai
integration_branch: tools
task_branch: feat/TOF-W1-001
task_base: bb2bfe7892b2e3c87297e445bb16279c4630385c
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-TOF-W1-001
implementation_authorized: true
```

El `task_base` fue resuelto mediante ruling del Developer para esta ejecución.
No se reutilizó `0574759b54a362accbb2ff76df1163e39ef87aba` por inferencia ni se
implementó desde `feat/WP-001-materialization`.

## 3. Write ownership exacto

```yaml
implementer_write_scope:
  - src/registries/schemas/agent-profiles.js
  - src/registries/agent-profiles.js
  - src/registries/agent-profiles.yaml
  - src/registries/index.js
  - tests/contract/agent-profiles.test.js
  - tests/fixtures/agent-profiles/**
doc_curator_write_scope:
  - docs/contracts/tecnotron-agent-profile-v1.md
lifecycle_evidence_scope:
  - docs/tasks/TOF-W1-001/RESULT.md
  - docs/tasks/TOF-W1-001/REVIEW.md
reviewer_write_scope: []
validator_write_scope: []
```

El `implementer` escribe solo source/schema/registry/fixtures/tests autorizados y
emite `implementation_report`. El `doc_curator` escribe solo documentación
contractual autorizada y emite `documentation_report`. El Reviewer permanece
read-only y emite `external_review_report`.

Task Lifecycle o un evidence recorder determinista materializa `RESULT.md` desde
reportes existentes y `REVIEW.md` después del handoff del review externo. Estos
paths no amplían permisos de perfiles. Validator permanece read-only salvo que
otro contrato defina explícitamente un evidence sink. `TASK.md`, este PLAN y la
SPEC son autoridades de solo lectura durante la ejecución.

## 4. Scope

Incluido:

- schema y registry `tecnotron-agent-profile/v1`;
- loader dedicado y export mínimo;
- exactamente nueve profile IDs;
- responsabilidades, inputs, outputs y permisos aceptados;
- tools/skills fail-closed;
- fixtures válidas e inválidas;
- contract tests y errores estables;
- compatibilidad documentada sin migración;
- documentación contractual mínima mediante `doc_curator`;
- persistencia determinista posterior de `RESULT.md` y `REVIEW.md`.

Excluido:

- `.opencode/agents`, launcher y perfiles ejecutables;
- Router, Model Resolver, Agent MVP, Actor, runtime y FinOps;
- role/model registries legacy y configuración FitFlow;
- modelo/provider binding, ranking, telemetría o paid API;
- implementación o modificación de Task Lifecycle, Git/GitHub automation y
  cleanup;
- cualquier otro repositorio;
- instalación o actualización de dependencias.

## 5. Requisitos y acceptance criteria

- [ ] `AC-PROFILE-001`: aceptar solo `tecnotron-agent-profile/v1`.
- [ ] `AC-PROFILE-002`: exigir exactamente los nueve IDs aprobados.
- [ ] `AC-PROFILE-003`: exigir responsabilidad única, inputs y outputs enumerados.
- [ ] `AC-PROFILE-004`: permitir `task_owned_source` solo a `implementer`.
- [ ] `AC-PROFILE-005`: permitir `task_owned_docs` solo a `doc_curator`.
- [ ] `AC-PROFILE-006`: mantener read-only los otros siete perfiles.
- [ ] `AC-PROFILE-007`: exigir `delegation: denied` en todos.
- [ ] `AC-PROFILE-008`: permitir web condicional solo a `researcher`.
- [ ] `AC-PROFILE-009`: exigir todas las dimensiones deny-by-default.
- [ ] `AC-PROFILE-010`: rechazar identidad o preferencia de modelo/provider/runtime.
- [ ] `AC-PROFILE-011`: rechazar Validator como profile.
- [ ] `AC-PROFILE-012`: rechazar `coder_b`, `coder_a`, `coder_strong_a` y `coder_*`.
- [ ] `AC-PROFILE-013`: rechazar unknown fields, extras y permission values desconocidos.
- [ ] `AC-PROFILE-014`: excluir paths absolutos y dependencia FitFlow/OpenCode.
- [ ] `AC-PROFILE-015`: impedir que tools o skills amplíen permisos.
- [ ] `AC-PROFILE-016`: no modificar Router, Resolver, FinOps, runtime ni launchers.
- [ ] `AC-PROFILE-017`: finalizar contract tests positivos/negativos con `PASS` reproducible.
- [ ] `AC-PROFILE-018`: obtener review independiente `PASS` antes del Developer gate.

## 6. Controles negativos

Los tests deben rechazar perfil faltante/extra, `coder_*`, Validator, segundo
source writer, writers incorrectos, write read-only, delegation habilitada, web
fuera de researcher, web incondicional, permiso omitido/desconocido, campos de
modelo/provider/runtime, tool/skill expansivo, unknown fields, versión legacy,
namespace/path FitFlow y launcher/configuración global.

La comprobación dinámica de autorización web pertenece a WP-002 y se registra
`NOT_RUN` para esta TASK.

## 7. Validación y evidencia

Comandos mínimos previstos, sujetos al baseline y dependencias ya disponibles:

```text
node --test tests/contract/agent-profiles.test.js
node --test tests/contract/registries.test.js tests/contract/agent-profiles.test.js
npm test
git diff --check
```

Los perfiles emiten reportes externos. Task Lifecycle o un evidence recorder
determinista persiste la evidencia en el gate aplicable. La evidencia debe
incluir RED, resultados focalizados y de regresión, matriz `AC-PROFILE-*`,
fixtures negativas, diff allowlist, ausencia de staging y confirmación de que no
cambió ningún consumidor excluido. Cada check usa `PASS`, `FAIL`, `UNAVAILABLE`
o `NOT_RUN`.

## 8. Gates

1. Materialización revisada independientemente.
2. Aceptación explícita del Developer.
3. Integración de la materialización en `tools`.
4. `task_base` fresco y worktree exclusivo creados por Task Lifecycle.
5. Implementación TDD dentro de `implementer_write_scope`.
6. Documentación dentro de `doc_curator_write_scope`, en ejecución separada.
7. Validator determinista read-only.
8. Persistencia determinista de RESULT desde reportes existentes.
9. Reviewer independiente read-only y `external_review_report`.
10. Persistencia determinista de REVIEW después del handoff.
11. Gate terminal del Developer antes de integración.

`PASS` de tests o review no implica aceptación, integración ni publicación.

## 9. Stop conditions

Detener si se requiere otro repositorio/ownership, Router/Resolver/runtime,
segundo writer, model/provider/runtime binding, dependencia FitFlow, migración
legacy, configuración OpenCode global, delegation, web no contenible, instalación
de dependencias, path fuera del scope o conflicto con contrato/ADR canónico.

Stop if the selected schema cannot express deny-by-default permissions without ambiguity.

## 10. Rollback

Task Lifecycle revierte únicamente cambios versionados dentro de los scopes
autorizados de `TOF-W1-001`. No elimina worktrees o branches ajenos, no modifica
registries legacy y no ejecuta cleanup sin autorización posterior.

## 11. Estado

```text
EXECUTED
READY_FOR_INDEPENDENT_REVIEW
```
