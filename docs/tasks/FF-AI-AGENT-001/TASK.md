---
document_id: FFAI-TASK-AGENT-001
status: canonical
machine_context: true
version: 1.3
updated: 2026-08-25
owner: fitflow-ai
type: workflow
criticality: medium
risk: medium
priority: P1
work_package: agent-profiles-mvp
wave: 1
dependency_gate: DOC001_satisfied
ownership_keys:
  - "doc:docs/work-packages/agent-profiles-mvp/PLAN.md"
  - "doc:docs/tasks/FF-AI-AGENT-001/TASK.md"
  - "doc:docs/tasks/FF-AI-AGENT-001/PLAN.md"
  - "doc:docs/architecture/agent-role-contracts.md"
  - "doc:docs/architecture/agent-profile-matrix.md"
  - "doc:docs/SOURCE_OF_TRUTH.md"
  - "doc:docs/current-state.md"
  - "doc:docs/implementation-roadmap.md"
  - "doc:docs/milestones/document-governance-v1/PLAN.md"
validation: PASS
review_verdict: ACCEPT_WITH_NON_BLOCKING_FINDINGS
developer_acceptance: ACCEPTED
accepted_at: 2026-08-25
integration:
  status: INTEGRATED
  target: tooling
  sha: 3d5d8b85a316233eae029963a3f5d14400fcd7fc
  integrated_at: 2026-08-25
lifecycle_status: DONE
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[work-packages/agent-profiles-mvp/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
  - "[[milestones/document-governance-v1/PLAN]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-matrix]]"
---

# Task FF-AI-AGENT-001: Agent Role Contracts and Profile Matrix (Docs Only)

## Identification Table

| Dimension | Value |
|---|---|
| `document_id` | FFAI-TASK-AGENT-001 |
| `status` | canonical |
| `validation` | PASS |
| `review_verdict` | ACCEPT_WITH_NON_BLOCKING_FINDINGS (dos aclaraciones no bloqueantes resueltas) |
| `developer_acceptance` | ACCEPTED |
| `accepted_at` | 2026-08-25 |
| `integration.status` | INTEGRATED |
| `integration.target` | tooling |
| `integration.sha` | 3d5d8b85a316233eae029963a3f5d14400fcd7fc |
| `integration.integrated_at` | 2026-08-25 |
| `lifecycle_status` | DONE |

## Objetivo

Producir **solo documentación**: contratos normativos para los 7 roles iniciales (`agent-role-contracts.md`) y una matriz de perfiles propuestos con tabla deferred (`agent-profile-matrix.md`). Ambos documentos fueron aceptados explícitamente por el Developer y promovidos de `draft` a `canonical` el 2026-08-25. Sin implementación, runtime, adapters, registros ejecutables, selección automática, ranking, fallback ni model policy.

Implementación, validación determinista y review independiente completados. El Developer aceptó explícitamente la task y ambos entregables el 2026-08-25. PR #12 integró la task en `tooling` mediante merge `3d5d8b85a316233eae029963a3f5d14400fcd7fc`; este cierre completa `DOC_SYNC` y establece `lifecycle_status: DONE`.

## Ownership Keys (exactos, 9 paths)

**Nuevos (5)**:
1. `docs/work-packages/agent-profiles-mvp/PLAN.md`
2. `docs/tasks/FF-AI-AGENT-001/TASK.md`
3. `docs/tasks/FF-AI-AGENT-001/PLAN.md`
4. `docs/architecture/agent-role-contracts.md`
5. `docs/architecture/agent-profile-matrix.md`

**Modificados (4)**:
6. `docs/SOURCE_OF_TRUTH.md`
7. `docs/current-state.md`
8. `docs/implementation-roadmap.md`
9. `docs/milestones/document-governance-v1/PLAN.md`

## Criterios de Aceptación (ACs)

1. **7 role contracts** en `agent-role-contracts.md`: `planner_ai`, `architect`, `explorer`, `coder_a`, `coder_b`, `reviewer`, `doc_curator`. Cada uno con: propósito, required inputs, minimum output/deliverable, boundaries, context minimum sufficient/verifiable, capability ceiling, task permission ceiling, delegation/handoff, stop conditions.

2. **6 separaciones normativas** mantenidas explícitas (ADR-001 §9.1): role contract vs manual profile vs runtime-selectable role vs model binding vs skill/tool binding vs task-specific permissions.

3. **Matrix rows** en `agent-profile-matrix.md`: 7 roles iniciales con columnas exactas `role_id`, `role_contract_ref`, `manual_profile_status`, `runtime_selectable`, `model_binding`, `skill_tool_binding`, `task_permission_ceiling`, `terminal_authority`, `lifecycle_catalog_state`. Valores: `manual_profile_status=PROPOSED`, `runtime_selectable=FALSE`, `model_binding=UNSPECIFIED/NON_CANONICAL`, `skill_tool_binding=TASK_SCOPED/REPLACEABLE`, `terminal_authority=NONE`. Permission ceilings diferenciados por rol.

4. **coder_strong_a y post-MVP** en tabla **Deferred** separada, no en matriz inicial.

5. **LLM bindings non-canonical**: observaciones únicamente, no benchmark/ranking/policy. No fallback automático: `unavailable` → `UNAVAILABLE` → manual Developer override.

6. **Source provenance only**: `docs/archive/source-material/roles-and-context-governance-source-material.md` referenciado como provenance, no canónico.

7. **SoT/current/roadmap/milestone updated**: índices y estado reflejan AGENT001 `DONE`, `ACCEPTED` e `INTEGRATED`, AGENT002 proposed/no creado, sin perfiles/registry/runtime capability.

8. **Scope exactly 5 new + 4 modified**: git diff confirma solo los 9 ownership keys; sin archivos extra.

9. **Git diff check**: `git diff --check` PASS; sin cambios en `src/`, `tests/`, `FitFlow/`, contratos ejecutables, `opencode.json`, `.opencode/package*.json`, package.json, package-lock.json.

## Stop Conditions

Detenerse inmediatamente si cualquier comando o edición produce cambios en:
- `src/**`, `tests/**`, `FitFlow/**`
- `src/contracts/**`, `src/registries/schemas/**`
- `opencode.json`, `.opencode/**`
- `package.json`, `package-lock.json`
- Cualquier archivo fuera de los 9 ownership keys listados arriba

No se crean archivos `RESULT.md` ni `REVIEW.md` en esta ejecución.

## Autoridad y Entradas

- **Autoridad normativa**: ADR-001 §9 (gobernanza roles/contexto/capacidades/skills/modelos).
- **Source material (provenance only)**: `docs/archive/source-material/roles-and-context-governance-source-material.md` — no canónico, precedencia 7.
- **Fundación**: `FF-AI-DOC-001` DONE + integrada en `tooling` (PR10 merge `51821e2`; `DOC_SYNC` PR11 merge `c30646f`).
- **Gate habilitación**: Cumplido (DOC001 foundation artifacts Developer-accepted + integrated).
- **No leer/escribir FitFlow**: Tratar FitFlow como read-only salvo TASK explícita y ownership vigente.

## Delegación

- `Planner` → define WP y task (ya hecho en WP PLAN y este TASK).
- `Architect` → materializa contratos y matriz (ejecuta esta task).
- `Coder` → implementa los 9 archivos documentales.
- `Reviewer` → review independiente read-only (fase posterior, no en esta ejecución).
- `Doc Curator` → normalización formato/navegación/metadata (parte de implementación).

## Cierre Task Lifecycle

- `validation: PASS`
- `review_verdict: ACCEPT_WITH_NON_BLOCKING_FINDINGS` (dos aclaraciones no bloqueantes resueltas)
- `developer_acceptance: ACCEPTED` (`2026-08-25`)
- `integration: INTEGRATED` en `tooling` mediante PR #12, merge SHA `3d5d8b85a316233eae029963a3f5d14400fcd7fc`
- `DOC_SYNC`: completado por esta actualización de cierre
- `lifecycle_status: DONE`
