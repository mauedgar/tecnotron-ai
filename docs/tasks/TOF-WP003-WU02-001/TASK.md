---
document_id: TOF-TASK-WP003-WU02-001
status: READY
materialization_status: MATERIALIZED
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-09-26
machine_context: true
task_id: TOF-WP003-WU02-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP003-WU02-TEMPLATES-FIXTURE-CORPUS-001
responsibility: MATERIALIZE_WP003_TEMPLATES_AND_FIXTURE_CORPUS
work_package_id: WP-003
work_units: [WP003-WU-02]
repository: mauedgar/tecnotron-ai
integration_branch: tools
task_branch: candidate/wp003-wu02-templates-fixture-corpus-001-reanchor-001
task_base: 29f696e9ec44a2f80cef5b153d9322724b397e6c
task_base_tree: 2b000a3cfe0a9c1f12f75c0ca0358635df3d46ac
scope_fit: FIT
assignment_authority: Developer
authorization_ref: TASKCYCLE-TECNOTRON-WP003-WU02-TEMPLATES-FIXTURE-CORPUS-001
implementation_authority: WU02_ONLY
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
  - docs/tasks/TOF-WP003-WU02-001/TASK.md
  - docs/tasks/TOF-WP003-WU02-001/PLAN.md
  - docs/templates/sdd/SPEC.md
  - docs/templates/sdd/WP_PLAN.md
  - docs/templates/sdd/TASK.md
  - docs/templates/sdd/TASK_PLAN.md
  - docs/templates/sdd/RESULT.md
  - docs/templates/sdd/REVIEW.md
  - tests/fixtures/sdd-authority/positive/01-complete-spec-to-review-chain.json
  - tests/fixtures/sdd-authority/positive/02-mechanical-unit-owned-spec.json
  - tests/fixtures/sdd-authority/positive/03-competent-bounded-exception.json
  - tests/fixtures/sdd-authority/negative/01-plan-introduces-uncovered-behavior.json
  - tests/fixtures/sdd-authority/negative/02-task-copies-and-reinterprets-spec.json
  - tests/fixtures/sdd-authority/negative/03-split-required-ready.json
  - tests/fixtures/sdd-authority/negative/04-behavior-change-only-in-task.json
  - tests/fixtures/sdd-authority/negative/05-convenience-surface-authority.json
  - tests/fixtures/sdd-authority/negative/06-review-candidate-mismatch.json
  - tests/fixtures/sdd-authority/negative/07-result-relabels-failure.json
  - tests/fixtures/sdd-authority/negative/08-historical-index-authority.json
  - tests/fixtures/sdd-authority/negative/09-metadata-completed-by-convenience.json
  - tests/fixtures/sdd-authority/negative/10-independent-capability-without-rf201.json
  - tests/fixtures/sdd-authority/negative/11-ambiguous-mechanical-implicit-exception.json
  - tests/contract/sdd-artifact-authority.test.js
---

# TASK TOF-WP003-WU02-001: templates and fixture corpus

## Assignment and authority

Materialize only `WP003-WU-02` from the accepted WP003 PLAN. The accepted SPEC
owns WHAT/RF-RNF, the accepted WP PLAN owns HOW, and the accepted WU01 parser and
relation validator owns deterministic structural behavior. The Developer handoff
identified above authorizes this bounded implementation through one immutable
candidate and an external Independent Review package.

`READY` records assignment only. It is not implementation evidence, validation,
review, Developer acceptance, integration, publication or closure.

## Bounded implementation

Create exactly six derived artifact templates under `docs/templates/sdd/` and a
self-contained corpus containing the three mandatory positive and eleven
mandatory negative cases in WP PLAN §12. Templates expose required fields and
explicit references without acceptance, exception, lifecycle or provider
defaults. Fixtures remain test inputs and do not become Product authority.

Extend the existing WU01 focused contract test only to enumerate the exact
template/corpus surface, materialize template placeholders for parser checks,
and execute every fixture through `validateSddArtifactSet`. Do not alter WU01
validator semantics merely to make a fixture pass or fail.

## Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-01 | Baseline commit/tree and authority/validator blobs match the recorded identities before edits. |
| AC-02 | Exactly six templates project SPEC, WP PLAN, TASK, task PLAN, RESULT and REVIEW responsibilities without authoritative defaults. |
| AC-03 | Rendered template metadata passes the accepted WU01 parser; raw templates remain visibly derived placeholders requiring competent completion. |
| AC-04 | Three positive fixtures cover the full chain, a mechanical unit under its owning SPEC and a competent bounded RF-201 exception. |
| AC-05 | Eleven negative fixtures cover SPEC §8.2 and WP PLAN §12 items 10–11 with explicit expected finding codes. |
| AC-06 | Fixture execution is local, deterministic, network-free and uses the canonical WU01 validator. |
| AC-07 | Focused contract/fixture checks, contract surface, competent full suite and `git diff --check` pass or are truthfully reported. |
| AC-08 | Changed paths remain within `write_scope`; accepted SPEC/PLAN/contract/ADR and WU01 validator blobs remain unchanged. |
| AC-09 | One immutable candidate and one self-contained Independent Review package are produced; no review, acceptance or remote effect occurs. |

## Explicit boundaries

No accepted source or WU01 implementation is rewritten. This TASK creates no
CLI/lint facade, lifecycle semantics, adoption/migration, provider integration,
WP003-WU03/WU04, WP004/WP005, Phase 2, publication, integration or `main`
promotion. Semantic sufficiency remains an Independent Review responsibility.

Stop on baseline drift, a required SPEC/PLAN change, or any need for WU03/WU04
behavior. Otherwise stop at
`TECNOTRON_WP003_WU02_FROZEN_FOR_INDEPENDENT_REVIEW`.
