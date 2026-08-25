---
document_id: FFAI-ARCH-AGENT-PROFILE-MATRIX
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-25
owner: fitflow-ai
type: architecture
related:
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[work-packages/agent-profiles-mvp/PLAN]]"
  - "[[tasks/FF-AI-AGENT-001/TASK]]"
  - "[[tasks/FF-AI-AGENT-001/PLAN]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[archive/source-material/roles-and-context-governance-source-material]]"
---

# Agent Profile Matrix

> **Status**: Canonical. Aceptado explícitamente por el Developer el 2026-08-25. Derivado normativamente de ADR-001 §9. Source material `docs/archive/source-material/roles-and-context-governance-source-material.md` solo provenance (no canónico, precedencia 7).
>
> **Seis separaciones normativas** (ADR-001 §9.1): role contract ≠ manual profile ≠ runtime selectable ≠ model binding ≠ skill/tool binding ≠ task permissions.
>
> **No runtime claims**: Esta matriz es documental. `roles.yaml` / registry data exacta: **Unknown** — FitFlow ownership.

## Initial Roles Matrix (7 Roles)

| role_id | role_contract_ref | manual_profile_status | runtime_selectable | model_binding | skill_tool_binding | task_permission_ceiling | terminal_authority | lifecycle_catalog_state |
|---|---|---|---|---|---|---|---|---|
| `planner_ai` | `agent-role-contracts.md#planner_ai` | PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | WP planning only; read roadmap/milestone/SoT/ADRs; no write to src/tests/FitFlow/contracts/registries/OpenCode config | NONE | PROPOSED |
| `architect` | `agent-role-contracts.md#architect` | PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | TASK/PLAN creation; read WP/evidence/ADRs/policies; no write to src/tests/FitFlow/contracts/registries/OpenCode config | NONE | PROPOSED |
| `explorer` | `agent-role-contracts.md#explorer` | PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | Read-only all repo files; write: NONE; no secrets/env/runtime/external | NONE | PROPOSED |
| `coder_a` | `agent-role-contracts.md#coder_a` | PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | Write ONLY ownership keys from TASK; read ownership scope/contracts/evidence; no write to opencode.json/.opencode/package manifests | NONE | PROPOSED |
| `coder_b` | `agent-role-contracts.md#coder_b` | PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | Write ONLY ownership keys from TASK; read ownership scope; no write to opencode.json/.opencode/package manifests | NONE | PROPOSED |
| `reviewer` | `agent-role-contracts.md#reviewer` | PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | Read-only task artifacts/sources/diff/evidence; repository write: NONE; findings/verdict returned to Task Lifecycle | NONE | PROPOSED |
| `doc_curator` | `agent-role-contracts.md#doc_curator` | PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | Write ONLY docs ownership keys from TASK; read all docs/SoT/ADRs; no write to src/tests/FitFlow/contracts/registries/OpenCode config | NONE | PROPOSED |

`manual_profile_status = PROPOSED` means the profile is documented as a future proposal only. It does not mean that an OpenCode profile file exists or is authorized for creation.

## Deferred Roles (Post-MVP)

| role_id | role_contract_ref | manual_profile_status | runtime_selectable | model_binding | skill_tool_binding | task_permission_ceiling | terminal_authority | lifecycle_catalog_state |
|---|---|---|---|---|---|---|---|---|
| `coder_strong_a` | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| Security Reviewer | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| Performance Reviewer | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| Migration Engineer | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| Workflow Observer | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| Model Evaluator/Optimizer | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| FinOps Optimizer | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| Retrieval/MCP roles | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| Temporal/workflow workers | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |
| Provider conformance specialist | Not defined (deferred) | NOT_PROPOSED | FALSE | UNSPECIFIED/NON_CANONICAL | TASK_SCOPED/REPLACEABLE | N/A | NONE | DEFERRED |

> **Nota**: Roles diferidos per ADR-001 §9.5 y source material §5.6/§11/§12. No contract definido. `coder_strong_a` activación futura solo si diferencia operativa verificable vs `coder_a` demostrada. Tabla separada, no en matriz inicial.

## Conformance Invariants

1. **role_contract_ref** must resolve to a section in `agent-role-contracts.md` (for initial 7 roles).
2. **manual_profile_status** = PROPOSED for initial 7; NOT_PROPOSED for deferred.
3. **runtime_selectable** = FALSE for all rows (manual profile ≠ runtime selectable).
4. **model_binding** = UNSPECIFIED/NON_CANONICAL (observations only, no benchmark/ranking/policy).
5. **skill_tool_binding** = TASK_SCOPED/REPLACEABLE (bindings per TASK/PLAN, not role identity).
6. **terminal_authority** = NONE for all roles (Developer sole acceptance authority per ADR-001 §9.1).
7. **lifecycle_catalog_state** tracks catalog state only: PROPOSED | DEFERRED (not runtime state).
8. **task_permission_ceiling** differentiated per role; strict subset of capability ceiling.
9. **No executable profiles created**: This matrix documents proposed manual profiles only.
10. **No registry/config changes**: Exact `roles.yaml` data Unknown (FitFlow ownership).

## Unknowns / No Files Created

- Exact `roles.yaml` / registry data: **Unknown** — FitFlow ownership, not defined here.
- OpenCode manual profile files (`.opencode/profile/*.md`): **Not created**.
- Model Resolver integration: **Not defined** — this phase is contracts + matrix only.
- Current runtime executability of any role: **Unknown** — belongs to registry/config in FitFlow.

**Do NOT assert current runtime executability or exact registry data.** Authority for executable roles resides in FitFlow registry/config.

---
**Provenance**: Source material `docs/archive/source-material/roles-and-context-governance-source-material.md` (solo provenance, no canónico). Fundación `FF-AI-DOC-001` DONE e integrada (PR10 merge `51821e2`; `DOC_SYNC` PR11 merge `c30646f`).
