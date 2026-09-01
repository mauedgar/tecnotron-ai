---
document_id: TEC-CONTRACT-AGENT-PROFILE-V1
status: implementation_candidate
owner: tecnotron-ai
type: contract
version: 1.0
contract_version: tecnotron-agent-profile/v1
machine_context: true
task_id: TOF-W1-001
work_package_id: WP-001
spec: ../work-packages/wp-001-operational-profile-contracts/SPEC.md
task: ../tasks/TOF-W1-001/TASK.md
related:
  - ../work-packages/wp-001-operational-profile-contracts/PLAN.md
  - ../tasks/TOF-W1-001/PLAN.md
---

# Tecnotron Agent Profile v1

## Autoridad y propósito

La [SPEC aceptada de WP-001](../work-packages/wp-001-operational-profile-contracts/SPEC.md)
prevalece sobre este documento. Esta materialización describe el contrato y la
superficie de implementación candidata observada; no acepta ni integra la
implementación y no demuestra el runtime futuro.

`tecnotron-agent-profile/v1` identifica perfiles operativos portables por
responsabilidad, entradas, salidas y permisos explícitos deny-by-default. No es
un registry de routing ni una configuración de producto.

Quedan fuera los perfiles ejecutables, la selección de modelo o provider, el
runtime, routing, launcher, telemetría, FinOps, Task Lifecycle, automatización
Git/GitHub, configuración global y cambios en productos consumidores.

## Superficie observada

- Registry: [`agent-profiles.yaml`](../../src/registries/agent-profiles.yaml).
- Schema strict: [`schemas/agent-profiles.js`](../../src/registries/schemas/agent-profiles.js).
- Loader dedicado `loadAgentProfiles`: [`agent-profiles.js`](../../src/registries/agent-profiles.js).
- Exports observados `AgentProfileRegistry` y `loadAgentProfiles`:
  [`registries/index.js`](../../src/registries/index.js). El registry no forma
  parte de `REGISTRY_SCHEMAS` de configuración activa.
- Contract tests: [`agent-profiles.test.js`](../../tests/contract/agent-profiles.test.js).

## Perfiles y datos contractuales

El conjunto de profile IDs contiene exactamente:

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

Todas las entradas requeridas son la unión sin duplicados de las entradas
comunes, las condicionales aplicables y las específicas del perfil. Son
vocabulario contractual, no un payload de launch o runtime.

Entradas comunes:

```text
accepted_authority_ref
resolved_project_profile_ref
resolved_repository_ref
read_scope
context_ref_or_evidence_requirements
context_budget
```

Entradas condicionales:

| Aplicación | Entradas añadidas |
| --- | --- |
| `implementer`, `doc_curator` | `task_authorization_ref`, `write_scope_if_writer` |
| `researcher` | `research_authorization_ref` |
| `reviewer` | `change_snapshot_ref`, `validation_evidence_ref` |
| `auditor` | `evidence_snapshot_ref`, `evidence_matrix_ref` |

La matriz restante es cerrada:

| Profile ID | Responsibility ID | Entradas específicas añadidas | Allowed outputs | Escritura |
| --- | --- | --- | --- | --- |
| `spec_analyst` | `specification` | `problem`, `accepted_authorities`, `constraints`, `gaps` | `spec_proposal` | denegada |
| `planner` | `execution_planning` | `accepted_spec`, `milestone`, `dependencies`, `ownership` | `wp_plan_proposal`, `task_decomposition_proposal` | denegada |
| `architect` | `technical_architecture` | `accepted_spec`, `existing_contracts`, `architecture`, `consumers` | `architecture_proposal`, `adr_proposal` | denegada |
| `explorer` | `evidence_exploration` | `evidence_requirements`, `project_profile` | `context_report` | denegada |
| `implementer` | `source_implementation` | `authorized_task`, `task_plan`, `task_worktree`, `write_scope`, `context_reference` | `implementation_report` | solo source/tests/config task-owned |
| `doc_curator` | `documentation_materialization` | `authorized_documentation_task`, `accepted_authorities`, `documentation_write_scope` | `documentation_report` | solo documentación task-owned |
| `reviewer` | `independent_review` | `accepted_spec_or_task`, `change_snapshot`, `validation_result` | `external_review_report` | denegada |
| `researcher` | `authorized_research` | `research_question`, `authorized_research_task`, `source_policy` | `research_report` | denegada; web condicional |
| `auditor` | `conformance_audit` | `contracts`, `audit_scope`, `evidence_matrix`, `artifacts` | `audit_report` | denegada |

Solo `implementer` y `doc_curator` son writers, dentro de sus respectivos scopes
task-owned. Sus reportes y efectos autorizados no aceptan, integran, publican ni
cambian el estado del lifecycle.

## Profundidad de subagentes

Los nueve perfiles declaran explícitamente `subagent_depth: 0`. El schema strict
exige el literal numérico `0` para cada perfil; no existe default silencioso. La
omisión del campo, cualquier valor distinto de cero y el string `"0"` fallan
cerrados.

## Permisos

Cada perfil declara el objeto completo siguiente; los tres valores marcados se
resuelven exclusivamente mediante la tabla posterior:

```yaml
permissions:
  default: deny
  repository_read: declared_scope
  filesystem_write: <por-perfil>
  command_execution: <por-perfil>
  web: <por-perfil>
  delegation: denied
  git_mutation: denied
  planning_provider_mutation: denied
  workspace_lifecycle: denied
  dependency_mutation: denied
  secret_access: denied
  paid_api: denied
```

| Profile ID | `filesystem_write` | `command_execution` | `web` |
| --- | --- | --- | --- |
| `spec_analyst` | `denied` | `read_only_deterministic` | `denied` |
| `planner` | `denied` | `read_only_deterministic` | `denied` |
| `architect` | `denied` | `read_only_deterministic` | `denied` |
| `explorer` | `denied` | `read_only_deterministic` | `denied` |
| `implementer` | `task_owned_source` | `task_validation` | `denied` |
| `doc_curator` | `task_owned_docs` | `task_validation` | `denied` |
| `reviewer` | `denied` | `read_only_deterministic` | `denied` |
| `researcher` | `denied` | `read_only_deterministic` | `authorized_research_task_only` |
| `auditor` | `denied` | `read_only_deterministic` | `denied` |

No hay defaults permisivos ni capacidades implícitas. En particular, hay un
único source writer, un único documentation writer, los otros siete perfiles
son read-only, solo `researcher` tiene web condicional y las otras siete
dimensiones permanecen `denied` para todos.

Tools y skills también fallan cerrados:

```yaml
tools:
  default: deny
  allow: []
skills:
  default: deny
  allow: []
```

Una allowlist ausente equivale a vacía. Ninguna tool o skill puede ampliar los
permisos del perfil.

## Fronteras

La identidad de perfil está separada de modelo, provider, runtime, routing y
launcher. El contrato prohíbe `model`, `model_id`, `provider`, `runtime`,
`runtime_id`, `reasoning_effort`, `resource_pool`, `preference` y `fallback`;
no contiene bindings ni selecciona o inicia ejecución.

Validator es un componente determinista externo, read-only y no es un profile
ID. Puede producir `PASS`, `FAIL`, `NOT_RUN` o `UNAVAILABLE`, pero no interpreta
ambigüedad, revisa semánticamente, escribe, acepta ni integra. `reviewer` también
permanece read-only y emite únicamente `external_review_report`; la persistencia
de evidencia pertenece a Task Lifecycle o a un evidence recorder autorizado.

Este contrato es nuevo y separado de `fitflow-role-registry/v3`. Los IDs legacy
`coder_*` fallan cerrados: no hay aliases, mapping, fallback ni migración a
`implementer`.

Los consumidores conocidos son el schema loader y los contract tests de
Tecnotron-ai, este registry portable, WP-002 para perfiles y launch, WP-003 para
responsabilidades SDD, WP-004 para asignación TASK/profile y WP-006 para
navegación derivada. WP-001 termina en definición y validación estática; WP-002
posee la habilitación runtime, incluida la comprobación dinámica de autorización
web y el cierre transitivo de capacidades.

## Validación y evidencia

Comandos reproducibles:

```text
node --test tests/contract/agent-profiles.test.js
node --test tests/contract/registries.test.js tests/contract/agent-profiles.test.js
npm test
git diff --check
```

Los `PASS` observados demuestran únicamente schema, registry, loader/export,
fixtures, contratos estáticos y regresión cubierta por esas suites. No prueban
perfiles ejecutables, integración, aceptación, production readiness, web
dinámica de WP-002 ni ejecución de provider/modelo. La [TASK](../tasks/TOF-W1-001/TASK.md)
y sus [tests](../../tests/contract/agent-profiles.test.js) delimitan la evidencia.
