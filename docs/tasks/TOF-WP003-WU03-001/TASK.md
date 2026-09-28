---
document_id: TOF-TASK-WP003-WU03-001
status: READY
materialization_status: MATERIALIZED
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-09-28
machine_context: true
task_id: TOF-WP003-WU03-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP003-WU03-FAIL-CLOSED-LINT-VALIDATION-001
responsibility: MATERIALIZE_WP003_FAIL_CLOSED_LINT_VALIDATION
work_package_id: WP-003
work_units: [WP003-WU-03]
repository: mauedgar/tecnotron-ai
integration_branch: tools
task_branch: candidate/wp003-wu03-fail-closed-lint-validation-001
task_base: f62199bee7819c8a9ae0f84deff6f102a9679b99
task_base_tree: fa4e922e8e3f5662a10a1f7f991f1ea5539e87b5
scope_fit: FIT
assignment_authority: Developer
authorization_ref: DEVELOPER-AUTHORIZE-WP003-WU03-PHASE1-20260928
implementation_authority: WU03_ONLY
implementation_authorized: true
independent_review: NOT_RUN
developer_acceptance: NOT_GRANTED
integration_authority: NOT_GRANTED
publication_authority: NOT_GRANTED
accepted_spec:
  path: docs/work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md
  blob: e44e501944838d368520cd2c6eb37a7ccd878c68
accepted_wp_plan:
  path: docs/work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md
  blob: b13ba1c41c8a8491ccdf2620f6b0692fbaa79399
accepted_contract:
  path: docs/contracts/tecnotron-sdd-artifacts-v1.md
  blob: 82e59a7e253b4e7b416b7e25761b606140d459e8
accepted_adr:
  path: docs/adr/ADR-WP003-SDD-AUTHORITY.md
  blob: 43bfe26ff5b6161baa9038177708dd2db11d84f4
accepted_wu01_validator:
  path: src/contracts/sdd-artifacts.js
  blob: c5d781e84babb3b4e2971e29b09054b6dc3e88e4
requirement_refs: [RF-201, RF-202, RF-203, RF-204, RF-205, RF-206, RF-207]
write_scope:
  - docs/tasks/TOF-WP003-WU03-001/TASK.md
  - docs/tasks/TOF-WP003-WU03-001/PLAN.md
  - scripts/validate-sdd-artifacts.js
  - tests/contract/sdd-artifact-authority.test.js
---

# TASK TOF-WP003-WU03-001: fail-closed lint validation

## Assignment and authority

Materialize only `WP003-WU-03` from the accepted WP003 PLAN. The accepted SPEC owns WHAT/RF-RNF, the accepted WP PLAN owns HOW/decomposition, WU01 owns deterministic parser/relation semantics, and WU02 owns the accepted templates and fixture corpus. This TASK exposes those accepted semantics through one read-only fail-closed CLI facade; it creates no new SDD behavior or authority.

`READY` records assignment only. It is not validation, review, Developer acceptance, integration, publication, closure, WU04 authorization, or Stage-D entry.

## Bounded implementation

Create `scripts/validate-sdd-artifacts.js` as an explicit-input facade over `validateSddArtifactSet`. The CLI requires a JSON input that explicitly supplies `artifacts[]` and `external_references[]`; it does not infer authority, mutate inputs, add authoritative defaults, auto-repair, or provide a fix mode. Executed WU01 validation preserves the WU01 result and limitations unchanged.

Extend the existing focused contract test only as required to exercise WU03 through the unchanged WU02 corpus. Existing WU02 fixture bytes and template bytes remain unchanged. `package.json` is intentionally unchanged because an additional package command is not required to satisfy the bounded CLI responsibility.

## Exit criteria

| ID | Criterion |
| --- | --- |
| AC-01 | `tools` parent/tree and accepted SPEC/PLAN/contract/ADR/WU01 blob identities match the recorded predecessor. |
| AC-02 | CLI validation is read-only, explicit-input, network-free and delegates executable SDD semantics to unchanged WU01 code. |
| AC-03 | Every mandatory WU02 positive fixture reports PASS and every mandatory negative fixture reports FAIL containing each fixture's intended finding code. |
| AC-04 | Missing invocation reports NOT_RUN, unavailable input reports UNAVAILABLE, and neither condition reports PASS or exit code 0. |
| AC-05 | Missing `external_references[]` fails closed rather than receiving an authoritative default. |
| AC-06 | Focused contract tests, contract surface, complete repository suite and `git diff --check` pass. |
| AC-07 | Changed paths remain inside this TASK write scope; WU01 validator and all WU02 template/fixture bytes remain unchanged. |
| AC-08 | Exactly one immutable candidate and one self-contained external Independent Review package are frozen; no review or Phase-2 effect occurs. |

## Explicit boundaries

Do not change WP003 SPEC/WP PLAN, accepted contract/ADR, WU01 validator semantics, WU02 template/fixture semantics, FitFlow, WP004, canonical navigation, adoption/migration, `main`, remote `tools`, or Stage D/E. The CLI is a deterministic result surface only and has no acceptance authority.

Stop on any need to change accepted semantics or widen scope. Otherwise stop at `TECNOTRON_WP003_WU03_FROZEN_FOR_INDEPENDENT_REVIEW`.
