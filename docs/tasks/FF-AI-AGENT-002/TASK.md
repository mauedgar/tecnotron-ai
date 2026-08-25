---
document_id: FFAI-TASK-AGENT-002
status: canonical
machine_context: true
version: 1.1
updated: 2026-08-25
owner: fitflow-ai
type: workflow
criticality: medium
risk: medium
priority: P1
work_package: agent-profiles-mvp
wave: 2
dependency_gate: AGENT001_satisfied
ownership_keys:
  - "doc:docs/tasks/FF-AI-AGENT-002/TASK.md"
  - "doc:docs/tasks/FF-AI-AGENT-002/PLAN.md"
  - "doc:docs/architecture/agent-profile-conformance.md"
  - "doc:docs/work-packages/agent-profiles-mvp/PLAN.md"
  - "doc:docs/SOURCE_OF_TRUTH.md"
  - "doc:docs/current-state.md"
  - "doc:docs/implementation-roadmap.md"
  - "doc:docs/milestones/document-governance-v1/PLAN.md"
validation: PASS
review_verdict: ACCEPT_WITH_NON_BLOCKING_FINDINGS
developer_acceptance: ACCEPTED
accepted_at: 2026-08-25
integration:
  status: NOT_INTEGRATED
  target: tooling
  sha: null
lifecycle_status: ACCEPTED
related:
  - "[[tasks/FF-AI-AGENT-002/PLAN]]"
  - "[[work-packages/agent-profiles-mvp/PLAN]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-matrix]]"
  - "[[architecture/agent-profile-conformance]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
---

# Task FF-AI-AGENT-002: Minimal Profile Conformance (Docs Only)

## Objetivo

Definir una especificación documental y verificable de perfiles mínimos para los siete roles iniciales. La especificación cubre descriptor de adapter, permisos efectivos, descubrimiento/invocación, skills y tools permitidas/denegadas, profundidad de delegación y formato de handoff.

Esta task no crea perfiles OpenCode ni adapters ejecutables, no modifica registries/runtime y no afirma que ningún rol sea runtime-selectable. Toda comprobación que requiera ejecución se registra como `NOT_VERIFIED` o `UNAVAILABLE` hasta una task con ownership ejecutable explícito.

## Gate

`FF-AI-AGENT-001` está `DONE`, `ACCEPTED` e `INTEGRATED` en `tooling`; PR #12 merge `3d5d8b85a316233eae029963a3f5d14400fcd7fc` y cierre DOC_SYNC PR #14 merge `bc4b98d931fc372cfe6861ecc7f8938a1b5eaa9b`.

## Ownership Keys

**Nuevos (3)**:
1. `docs/tasks/FF-AI-AGENT-002/TASK.md`
2. `docs/tasks/FF-AI-AGENT-002/PLAN.md`
3. `docs/architecture/agent-profile-conformance.md`

**Modificados (5)**:
4. `docs/work-packages/agent-profiles-mvp/PLAN.md`
5. `docs/SOURCE_OF_TRUTH.md`
6. `docs/current-state.md`
7. `docs/implementation-roadmap.md`
8. `docs/milestones/document-governance-v1/PLAN.md`

## Criterios de Aceptación

1. `agent-profile-conformance.md` define un descriptor mínimo común sin convertirlo en schema ejecutable.
2. Los siete roles iniciales tienen una proyección documental que referencia su contrato canónico y conserva `manual_profile_status: PROPOSED` y `runtime_selectable: FALSE`.
3. Cada proyección declara permisos efectivos como subconjunto del techo de la TASK, incluyendo read/write, tools/skills permitidas y denegadas.
4. `explorer` y `reviewer` permanecen estrictamente read-only; `coder_a`, `coder_b` y `doc_curator` sólo escriben ownership keys autorizados.
5. Profundidad de delegación: un nivel máximo cuando el contrato lo permite; roles leaf no delegan; no hay delegación transitiva implícita.
6. Se define un handoff mínimo con campos verificables, sin razonamiento privado ni autoridad terminal.
7. Descubrimiento e invocación distinguen `DOCUMENTED`, `NOT_VERIFIED`, `VERIFIED` y `UNAVAILABLE`; esta task no usa `VERIFIED` para runtime.
8. Adapter, model y skill/tool bindings permanecen reemplazables y no canónicos; sin fallback, ranking ni model policy.
9. `coder_strong_a` y roles post-MVP permanecen `DEFERRED`, sin contrato ni activación.
10. SoT/current/roadmap/milestone/WP reflejan AGENT002 `WORKING`, docs-only y pendiente de review/aceptación/integración.
11. Scope exacto: 3 nuevos + 5 modificados; ningún path adicional.
12. `git diff --check` PASS; sin cambios en `src/`, `tests/`, `FitFlow/`, `opencode.json`, `.opencode/`, manifests o registries.

## Stop Conditions

- Se requiere crear o modificar un perfil OpenCode, adapter, registry, runtime, contrato ejecutable o model binding.
- Se requiere afirmar discovery/invocation runtime sin comando y evidencia PASS.
- Se requiere leer o escribir FitFlow para obtener datos de `roles.yaml` o configuración efectiva.
- Aparece un cambio fuera de los ocho ownership keys.
- Se intenta activar `coder_strong_a`, fallback, ranking o selección automática.

## Delegación

- `Architect`: límites, ACs y formato de conformance.
- `Coder`: implementación documental dentro de los ocho ownership keys.
- `Doc Curator`: metadata, navegación y consistencia dentro del mismo scope.
- `Reviewer`: revisión independiente read-only; findings y veredicto, sin correcciones.
- `Developer`: única autoridad de aceptación y promoción canónica del entregable draft.
