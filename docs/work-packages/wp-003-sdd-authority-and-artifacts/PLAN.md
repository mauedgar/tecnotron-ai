---
document_id: TOF-WP-003-PLAN-001
status: CANDIDATE
materialization_status: CANDIDATE_DRAFT
owner: tecnotron-ai
type: work-package-plan
version: 1.0
updated: 2026-09-23
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-003
spec: docs/work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md
planning_base: bbdf64f40455994010928e496f427361db73e5aa
accepted_spec_blob: e44e501944838d368520cd2c6eb37a7ccd878c68
integration_target: tools
independent_review: NOT_RUN
developer_acceptance: NOT_REQUESTED
implementation_authority: NOT_GRANTED
task_materialization_authority: NOT_GRANTED
wp_004_authority: NOT_GRANTED
scope_fit: FIT
ownership:
  terminal_acceptance: Developer
  semantics: Architect
  writing: Doc_Curator
  deterministic_validation: Validator
  independent_review: Reviewer
related:
  - "[[SPEC]]"
  - "[[../../milestones/tecnotron-operational-foundation-v1/PLAN]]"
  - "[[../../task-lifecycle]]"
  - "[[../../SOURCE_OF_TRUTH]]"
---

# PLAN WP-003: SDD Authority and Artifacts

## 1. Purpose and scope

This WP PLAN defines only **HOW** WP-003 will later materialize the already accepted SDD authority model. The accepted SPEC remains the authority for WHAT and behavior. This PLAN does not implement the ADR, policy, templates, schemas, fixtures, lint, migration, implementation TASKs, WP-004, FitFlow effects, GitHub Projects effects, publication, integration, or promotion to `main`.

The technical objective is a small, deterministic, repository-native validation layer that makes the accepted artifact boundaries machine-checkable without creating a parallel authority. The layer must preserve the distinction `SPEC -> WP PLAN -> TASK -> task PLAN -> RESULT -> REVIEW -> Developer` and must fail closed when required identity, relation, ownership, scope, or authority evidence is absent or ambiguous.

If implementation discovers that accepted behavior must change, the affected work stops and returns to SPEC authority. No PLAN, TASK, template, schema, linter, runtime, provider, prompt, dashboard, index, or convenience file may normalize that change implicitly.

## 2. Competent inputs and precedence

Normative derivation order for implementation is:

1. the accepted WP-003 SPEC and RF-201 through RF-207;
2. competent Developer rulings for WP-003;
3. current canonical contracts and ADRs for invariants, schemas, and interoperability;
4. the accepted Milestone Plan for sequence, ownership, gates, and the WP-003/WP-004 boundary;
5. `docs/task-lifecycle.md` for lifecycle semantics, worktrees, validation, review, acceptance, integration, publication, and closure separation;
6. Current State only for confirmed implementation reality;
7. Source of Truth only for navigation and precedence.

Existing repository layout is implementation evidence, not competing authority. Historical documents may supply provenance or compatibility fixtures but may not be promoted by the validator or templates.

## 3. Artifact-authority boundary

| Artifact / actor | Owns | Implementation consequence |
| --- | --- | --- |
| SPEC | WHAT, expected behavior, RF/RNF | Validator references stable requirements; implementation never rewrites them. |
| WP PLAN | HOW, decomposition, gates | This document defines technical strategy but cannot change SPEC semantics. |
| TASK | Bounded authorized assignment | Future TASKs reference requirement IDs; they do not copy the SPEC as authority. |
| task PLAN | Local execution strategy | It is validated as contained by its TASK. |
| RESULT | Observed execution evidence | Failures remain evidence and cannot be rewritten into expectations. |
| REVIEW | Independent frozen-candidate assessment | It references exact candidate identity and cannot mutate it. |
| Developer | Terminal acceptance and exception rulings | No tool or provider field may infer acceptance. |
| Validator | Deterministic checks | Reports PASS/FAIL/NOT_RUN/UNAVAILABLE only from evidence. |
| Source of Truth / guides / indexes | Navigation or explanation | They cannot create behavioral authority. |

## 4. Accepted requirement mapping

| Requirement | Planned technical mechanism | Deterministic proof |
| --- | --- | --- |
| RF-201 | Require every normative capability artifact to reference an accepted SPEC identity or an explicit competent exception record with scope and rationale. Purely mechanical units may reference the owning SPEC rather than invent a new SPEC. | Positive fixtures for accepted SPEC and bounded exception; negative fixtures for missing, inferred, historical-only, or convenience-based authority. |
| RF-202 | Parse requirement references as stable `RF-*` / `RNF-*` identifiers and maintain an inventory during validation. Reject duplicate reuse with conflicting semantics and any renumbering/supersession without explicit provenance. | Fixture pairs covering stable IDs, supersession metadata, duplicate conflict, reuse, and deletion-without-provenance. |
| RF-203 | WP PLAN schema/policy permits technical solution, order, work units, gates, and strategy, while prohibiting behavior deltas not traceable to accepted SPEC requirements. | Negative fixture where a PLAN introduces a new normative behavior; validation fails closed and reports SPEC-cycle return required. |
| RF-204 | TASK template carries stable requirement references and bounded acceptance criteria without embedding copied normative requirement text as a second authority. | Positive subset assignment and negative copied/reinterpreted SPEC fixtures. |
| RF-205 | Validator enforces `scope_fit: split_required` as incompatible with `READY` until competent split evidence exists. | Direct positive/negative state fixtures; provider label changes alone do not satisfy the rule. |
| RF-206 | Behavior-delta detection is expressed as a traceability gate: new normative behavior in PLAN/TASK/task PLAN without accepted SPEC coverage is rejected. | Negative PLAN/TASK behavior-change fixtures and explicit return-to-SPEC disposition. |
| RF-207 | Deny-list and relation checks treat `design.md`, `tasks.md`, `apply`, prompts, chats, dashboards, provider fields, runtime outputs, AGENTS.md, skills, derived indexes, and context packages as non-authoritative unless they only derive from competent authority without adding normative state. | Negative fixtures for autonomous convenience authority plus positive derived-view fixtures. |

No implementation mechanism may weaken these requirements through defaults, inference, auto-repair, or migration shortcuts.

## 5. Mandatory edge cases

### 5.1 TASK becomes an independent capability

The validator must detect the structural symptom: a TASK or task PLAN claims reusable capability behavior, a new contract, or normative behavior not covered by assigned RF/RNF. It must return a fail-closed disposition requiring RF-201 handling before `READY`; it must not mint SPEC authority or an exception automatically.

### 5.2 Purely mechanical requirement

A mechanical work unit may remain under its owning accepted SPEC when it only materializes or verifies already-authorized behavior and introduces no new observable semantics, permissions, invariants, valid states, interoperability, or policy. If classification is ambiguous, validation fails closed for competent ruling rather than manufacturing an exception.

Both edge cases require positive and negative fixtures and must appear in the independent implementation review checklist.

## 6. Technical materialization strategy

Implementation should be layered so semantic authority remains in canonical documents and deterministic code only checks declared relationships:

```text
accepted SPEC + competent rulings
  -> one ADR fixes the implementation interpretation and non-authority of tooling
  -> one versioned SDD artifact contract/policy defines machine-checkable metadata and relations
  -> bounded templates project that contract into artifact skeletons
  -> parser/schema validates declared metadata without authoritative defaults
  -> relation validator checks RF/RNF, ownership, scope, frozen identity, and lifecycle separation
  -> fixture corpus proves positive and negative semantics
  -> fail-closed CLI/lint exposes deterministic results
  -> adoption validates new/opted-in artifacts without silently rewriting history
```

The first implementation TASK must prove whether the existing `src/contracts` conventions are sufficient for the executable schema. Prefer the existing JavaScript/Zod/YAML toolchain. A new schema technology or service is not authorized merely for WP-003.

## 7. Artifact layout

Planned implementation paths are bounded as follows; exact file creation occurs only under later authorized implementation TASKs:

| Purpose | Planned path | Boundary |
| --- | --- | --- |
| Accepted SPEC | `docs/work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md` | Immutable input for WP-003 implementation unless a separate SPEC cycle is authorized. |
| WP PLAN | `docs/work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md` | HOW only. |
| ADR | `docs/adr/ADR-WP003-SDD-AUTHORITY.md` | Records implementation choice and rejected alternatives; cannot create behavior beyond SPEC. |
| SDD contract/policy | `docs/contracts/tecnotron-sdd-artifacts-v1.md` | Canonical machine-facing semantics derived from SPEC; no parallel requirement set. |
| Executable validation contract | `src/contracts/sdd-artifacts.js` | Deterministic parsing/validation interface; no acceptance authority. |
| Contract exports | `src/contracts/index.js`, `src/contracts/index.mjs` only if required | Re-export only; no new semantics. |
| Templates | `docs/templates/sdd/` | Derived skeletons for SPEC, WP PLAN, TASK, task PLAN, RESULT, REVIEW. |
| Positive/negative fixtures | `tests/fixtures/sdd-authority/positive/` and `tests/fixtures/sdd-authority/negative/` | Immutable test inputs, not canonical authority. |
| Contract tests | `tests/contract/sdd-artifact-authority.test.js` | Deterministic conformance. |
| CLI/lint entry | `scripts/validate-sdd-artifacts.js` | Fail-closed validator facade; no mutation or auto-fix. |
| Package command | root `package.json` only if needed | Adds a deterministic check command; no dependency changes unless separately justified. |

Creation of `docs/adr/` or `docs/templates/sdd/` is a bounded WP-003 implementation choice. If repository policy or an accepted ADR requires a different canonical location, the TASK must stop before file creation and obtain the competent disposition; the PLAN does not authorize a competing directory convention.

## 8. ADR strategy

The ADR must answer only implementation questions already implied by the SPEC: authoritative artifact ownership, stable identity, relation validation, fail-closed behavior, frozen REVIEW input, and non-authority of convenience surfaces. It must explicitly reject: one universal mutable status, provider-derived acceptance, autonomous `design.md` / `tasks.md` / `apply`, silent historical promotion, and validator auto-repair.

The ADR is accepted before templates or lint become normative implementation outputs. If ADR review exposes a behavior choice not already covered by RF-201–RF-207 or the mandatory edge cases, that item returns to SPEC authority rather than being decided inside the ADR.

## 9. Policy and executable contract strategy

`docs/contracts/tecnotron-sdd-artifacts-v1.md` should define the minimum machine-checkable vocabulary for artifact identity, artifact type, competent owner, scope, revision/version identity, authority references, requirement references when applicable, frozen candidate identity for REVIEW, and observed-evidence identity for RESULT.

`src/contracts/sdd-artifacts.js` should expose deterministic validation functions over parsed document metadata and explicit relations. It must not infer missing owners, accepted states, requirement coverage, exceptions, frozen identities, or lifecycle transitions. Unknown artifact types, required metadata absence, unsupported relations, ambiguous authority, invalid requirement IDs, and forbidden READY/split combinations fail closed.

Use the repository's existing YAML and Zod dependencies where they are sufficient. Do not add a new schema runtime merely to restate the same constraints. A standalone JSON Schema is added only if a concrete interoperability consumer requires it; otherwise the executable contract plus fixtures is sufficient.

## 10. Template strategy

Templates are projections of accepted authority, not sources of truth. Each template must:

- identify its artifact type and owner field;
- contain explicit authority-reference fields rather than copied normative text;
- expose requirement-reference fields only where applicable;
- distinguish expected state from observed evidence;
- carry no default Developer acceptance, exception, integration, publication, or closure state;
- avoid platform/provider-specific authority fields;
- state that generated content requires competent ownership and does not become accepted by generation.

The TASK template references a bounded RF/RNF subset. The task PLAN template references its TASK. RESULT records observed evidence. REVIEW records exact frozen candidate identity and review evidence. SPEC and WP PLAN templates preserve the WHAT/HOW split.

## 11. Schema strategy when required

The implementation validator should parse frontmatter and explicit relation fields into a small typed internal representation. Validation is structural and relational; it does not attempt semantic equivalence through AI inference.

Required constraints include artifact-type enum, stable identity format, owner presence, scope presence where relevant, explicit source-authority references, RF/RNF token format, review candidate identity, and lifecycle-state compatibility rules. Cross-document checks resolve only declared repository-local references or exact immutable identities supplied by the caller.

No schema may declare a new lifecycle for WP-004, replace `docs/task-lifecycle.md`, or encode provider-specific status as canonical meaning.

## 12. Fixture strategy

Minimum positive fixtures:

1. accepted SPEC -> traced WP PLAN -> TASK with RF/RNF subset -> contained task PLAN -> RESULT -> REVIEW over exact candidate;
2. purely mechanical unit traced to its owning SPEC without independent SPEC;
3. explicit competent RF-201 exception limited by scope and rationale.

Minimum negative fixtures:

1. WP PLAN or TASK introduces behavior absent from SPEC;
2. TASK copies SPEC and changes meaning;
3. `scope_fit: split_required` together with `READY`;
4. behavior change appears only in PLAN/TASK;
5. `design.md`, `tasks.md`, `apply`, prompt, provider field, or equivalent asserts autonomous authority;
6. REVIEW mutates or references a different candidate identity;
7. RESULT rewrites a failure into PASS;
8. historical or derived index is used as authority without competent adoption;
9. missing or ambiguous metadata is completed by convenience;
10. TASK becomes a new reusable capability without RF-201 handling;
11. ambiguous mechanical-vs-behavioral classification attempts implicit exception.

Fixtures must be small, named by rule, and independently runnable without network or provider state.

## 13. Lint and deterministic validation strategy

The validator is a pure checker by default. The CLI reads explicit paths, emits structured findings and a process exit code, and never writes source artifacts. Suggested result classes are `PASS`, `FAIL`, `NOT_RUN`, and `UNAVAILABLE`, matching current Task Lifecycle semantics.

Validation order:

```text
parse
-> identify artifact type
-> required metadata
-> stable identity and RF/RNF syntax
-> authority-reference validity
-> allowed relation graph
-> scope / READY compatibility
-> frozen REVIEW identity
-> RESULT evidence preservation rules
-> prohibited parallel-authority patterns
-> report without mutation
```

`git diff --check`, focused contract tests, fixture matrix, and the repository test suite appropriate to touched code form the deterministic implementation gates. No unavailable check is reported as PASS.

## 14. Fail-closed behavior

Fail closed on: missing required metadata; unknown artifact type; unresolved competent owner; absent or ambiguous authority reference; invalid or conflicting RF/RNF identity; relation not permitted by the artifact graph; `split_required` with READY; REVIEW candidate mismatch; attempt to normalize RESULT failure; convenience authority; implicit RF-201 exception; or ambiguity about whether a unit is mechanical or behavioral.

The validator reports the reason and the authority boundary needed to continue. It does not invent defaults, rewrite files, create exceptions, choose a Developer disposition, or upgrade historical material.

## 15. Traceability model

Traceability uses stable artifact identity plus explicit references, not copied prose. The minimum graph is:

```text
SPEC identity + RF/RNF
  -> WP PLAN identity + covered RF/RNF
  -> TASK identity + assigned RF/RNF + assignment authority
  -> task PLAN identity + TASK reference
  -> RESULT identity + TASK/candidate/evidence references
  -> REVIEW identity + exact frozen candidate + validation evidence
  -> Developer ruling reference
```

A commit, blob/tree SHA, versioned path, or other reproducible identifier may satisfy exact identity where appropriate. The implementation contract must keep expected authority and observed evidence as separate fields/dimensions.

## 16. Adoption and migration sequence

WP-003 adopts the contract prospectively and incrementally:

1. accept the ADR and versioned SDD contract/policy;
2. implement parser/schema and relation validator;
3. prove all mandatory positive/negative fixtures;
4. materialize templates as derived views;
5. expose fail-closed CLI/lint;
6. validate the WP-003 implementation artifacts themselves;
7. inventory existing canonical artifacts only to classify compatibility gaps;
8. migrate an existing artifact only under explicit TASK ownership and without changing accepted behavior;
9. update Source of Truth navigation only after canonical artifacts actually exist and are accepted;
10. leave historical artifacts historical unless competent authority explicitly adopts or migrates them.

There is no repository-wide auto-rewrite and no silent backfill of metadata. A compatibility gap is evidence, not permission to mutate history.

## 17. Implementation work units

These labels are planning units, **not TASKs and not implementation authority**.

| Work unit | Responsibility | Primary outputs | Exit gate |
| --- | --- | --- | --- |
| WP003-WU-00 | Authority/contract foundation | ADR + versioned SDD contract/policy design | ADR semantically aligned to SPEC; no new behavior; Developer/required review disposition satisfied. |
| WP003-WU-01 | Deterministic parser and relation validator | `src/contracts/sdd-artifacts.js` plus required exports | Focused contract tests pass; no defaults or mutation; RF-201–RF-207 checks represented. |
| WP003-WU-02 | Templates and fixture corpus | derived templates + complete positive/negative fixtures | WHAT/HOW and authority boundaries remain explicit; mandatory edge cases covered. |
| WP003-WU-03 | Fail-closed CLI/lint | read-only CLI + optional package command | All negative fixtures fail for the intended reason; unavailable checks never pass. |
| WP003-WU-04 | Bounded adoption and evidence | compatibility inventory, selected owned migrations if authorized, final conformance evidence | No accepted SPEC mutation, no historical promotion, no WP-004 or FitFlow effect. |

A later competent authority may materialize one or more TASKs from these work units, but each TASK must assign stable RF/RNF references and a bounded write scope. Work-unit labels never substitute for TASK authority.

## 18. Dependency order

```text
WP003-WU-00
  -> WP003-WU-01
  -> WP003-WU-02
  -> WP003-WU-03
  -> WP003-WU-04
  -> frozen implementation candidate
  -> independent review
  -> Developer acceptance
  -> authorized integration/publication
```

WU-01 cannot proceed if ADR/policy interpretation requires a SPEC change. WU-02 depends on the validator vocabulary so templates and fixtures do not drift. WU-03 depends on the fixture matrix. WU-04 cannot broaden scope merely to make the linter green.

## 19. Validation gates

Before an implementation candidate may freeze, prove at minimum:

- RF-201 through RF-207 each have direct focused tests;
- both mandatory edge cases have positive/negative coverage;
- allowed artifact graph is explicit and rejects unknown relations;
- WHAT vs HOW boundary is preserved;
- no parallel authority can be created through convenience surfaces;
- stable RF/RNF identity checks pass;
- `scope_fit: split_required` blocks READY;
- REVIEW requires exact frozen candidate identity;
- RESULT failure preservation is tested;
- metadata absence/ambiguity fails closed;
- templates validate against the same contract they project;
- no network/provider state is required for core validation;
- no accepted SPEC mutation, WP-004 scope, FitFlow effect, GitHub Projects effect, or `main` effect exists;
- `git diff --check` and all relevant deterministic tests pass.

## 20. Independent review boundary

Independent review is performed outside the implementation context against an immutable candidate commit/tree plus versioned validation evidence. Reviewer authority is semantic assessment only: no implementation, correction, candidate mutation, or Developer acceptance.

A review FAIL preserves the failed review as evidence and returns only through a competent bounded correction disposition. A later PASS does not erase prior findings.

## 21. Developer acceptance boundary

Developer acceptance occurs only after independent review PASS for the exact frozen candidate. Acceptance is not inferred from validation, review, branch state, provider state, publication, or integration. Exceptions to RF-201 or other competent rulings must be explicit and scoped.

Acceptance of this PLAN likewise does not authorize WP-003 implementation. Implementation authority and later TASK materialization require their own competent Developer decision.

## 22. Integration strategy

For this PLAN candidate: freeze one local commit, review it independently, obtain explicit Developer acceptance, then integrate/publish to `tools` only under separately granted authority for this TaskCycle continuation.

For later WP-003 implementation: each materialized TASK follows `docs/task-lifecycle.md`, uses isolated worktrees, preserves validation/review/acceptance as separate dimensions, and integrates only the exact accepted candidate into the milestone `tools` branch. `main` remains outside WP-003.

Canonical state/documentation reconciliation after integration may update navigation/current-state artifacts only when separately authorized and only to describe observed accepted state.

## 23. Risks and stop conditions

Stop and return to competent authority when any of the following occurs:

- an implementation choice requires changing RF-201–RF-207 or a mandatory edge case;
- a new contract/ADR conflicts with existing canonical contract or ADR authority;
- a template, schema, linter, provider, runtime, index, prompt, or convenience file would become a parallel authority;
- repository policy rejects the proposed ADR/template location and no competent alternative is established;
- validating an artifact requires inventing owner, scope, acceptance, exception, or authority defaults;
- an implementation work unit actually constitutes a new independent capability requiring RF-201 handling;
- implementation requires WP-004 lifecycle semantics, FitFlow writes, GitHub Projects writes, provider-specific canonical state, or `main` promotion;
- accepted SPEC mutation becomes necessary;
- a frozen candidate would need mutation before a Developer correction disposition.

## 24. Explicit non-goals

This PLAN does not implement any artifact described above. It does not create implementation TASKs, define `tecnotron-task-lifecycle/v1`, initialize WP-004/WP-005/WP-006, redesign AGENTS.md/OpenCode/ExecutionSurfacePort, run an OpenCode research experiment, create ChatGPT-specific product contracts, change FitFlow, reconcile unrelated repository hygiene, or promote anything to `main`.

It does not make Source of Truth, Current State, templates, schemas, lint, generated files, context packages, chats, or runtime outputs independent sources of behavioral authority.

## 25. PLAN acceptance criteria

This PLAN is semantically ready to freeze only when it demonstrably:

- derives from the accepted WP-003 SPEC;
- maps RF-201 through RF-207 without changing meaning;
- preserves both mandatory edge cases;
- keeps SPEC=WHAT and WP PLAN=HOW;
- defines a bounded technical materialization strategy, artifact layout, ADR, policy, templates, schema strategy, fixtures, lint, fail-closed behavior, traceability, work units, dependency order, validation gates, review, acceptance, integration, risks, and non-goals;
- is complete enough for later bounded TASK derivation without creating those TASKs;
- preserves platform independence and deterministic validation where equivalent to AI reasoning;
- creates no implementation effect, accepted SPEC mutation, WP-004 scope, FitFlow effect, GitHub Projects effect, remote publication, integration, or `main` effect.
