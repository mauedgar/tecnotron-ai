---
document_id: TEC-ADR-WP003-SDD-AUTHORITY
status: implementation_candidate
owner: tecnotron-ai
type: adr
version: 1.0
updated: 2026-09-23
machine_context: true
task_id: TOF-WP003-WU00-001
work_package_id: WP-003
work_unit: WP003-WU-00
spec: docs/work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md
wp_plan: docs/work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md
requirement_refs: [RF-201, RF-202, RF-203, RF-204, RF-205, RF-206, RF-207]
independent_review: NOT_RUN
developer_acceptance: NOT_GRANTED
---

# ADR: WP-003 SDD authority and artifact foundation

## Status and competent inputs

Implementation decision **candidate** for [TOF-WP003-WU00-001](../tasks/TOF-WP003-WU00-001/TASK.md).
It is not an accepted ADR and creates no new behavior or execution authority.
Use the [accepted SPEC](../work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md)
for expected behavior and its §1 for precedence. This ADR references that
precedence without restating, reordering or competing with it. A conflict with
an existing canonical contract/ADR stops for competent ruling; an implementation
choice requiring new behavior returns to the SPEC cycle before implementation.

The [accepted WP PLAN](../work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md)
§§6–9, 15–18 selects an ADR and versioned policy foundation before parser,
templates, fixtures, lint and adoption. The frozen input identities are in the
TASK. The canonical predecessor records SPEC/PLAN acceptance despite their
preserved proposal frontmatter; this ADR does not alter those input snapshots.

## Context and existing conventions

The repository already uses Markdown/frontmatter for authority documents,
versioned contracts under `docs/contracts/`, and JavaScript/Zod contracts under
`src/contracts/`. There is no competing canonical ADR directory in this baseline;
the explicit `docs/adr/ADR-WP003-SDD-AUTHORITY.md` location in WP PLAN §7 applies.

| Existing surface | Assessment for WP-003 |
| --- | --- |
| `src/contracts/package.json` and root `package.json` | CommonJS contract package, existing Zod and YAML dependency declarations. No new technology/service is required. |
| `src/contracts/task.js` | `fitflow-task/v2` is an existing runtime/exchange contract, not the six-artifact SDD model. Do not reinterpret its statuses or retrofit SDD authority into it. |
| `src/contracts/common.js` | Existing IDs, references and state types are domain-specific. Reuse a type later only if its semantics are identical; do not import a universal status or a mismatched requirement-ID constraint. |
| `src/contracts/execution-coordination.js` | Demonstrates strict Zod objects and cross-field refinements. Some execution fields use defaults; authoritative SDD metadata must not copy that defaulting pattern. No coordinator changes are required. |
| `src/contracts/index.js` / `index.mjs` | Existing CommonJS/ESM export convention is sufficient for a later dedicated module if exports are needed. No export changes occur in WU-00. |
| `docs/contracts/tecnotron-agent-profile-v1.md` | Establishes a versioned contract document with source/TASK references and explicit implementation/review/acceptance limits. Preserve its role boundaries. |

These source-level observations establish suitability of the existing toolchain
for the later parser/schema and relation checks. They do **not** establish an
SDD executable implementation or runtime conformance. No new dependencies,
standalone JSON Schema consumer, service or library are required by this design.

## Decisions and derivation

| Decision | Implementation choice | Accepted source |
| --- | --- | --- |
| D1 | One versioned [SDD policy](../contracts/tecnotron-sdd-artifacts-v1.md) holds a normalized metadata vocabulary, explicit relations and obligations. Its JSON block is part of the same design, not an independent behavioral source. | SPEC §§4–5, RF-207; WP PLAN §§6–9, 15. |
| D2 | Keep six artifact responsibilities distinct. Authority references record competent input; requirement references select stable IDs in that input rather than copying normative prose. | SPEC §§4–5, RF-202–RF-204, RF-206. |
| D3 | Represent identity, scope, ownership, revision and declared relations explicitly. Check only declared local or caller-supplied immutable references; no filesystem-name or provider-based authority discovery. | SPEC §5, §8; WP PLAN §§9, 11, 15. |
| D4 | Require accepted SPEC coverage or a competent scoped exception before normative capability authority. Mechanical work may reference the owning SPEC; ambiguity or a new capability returns to competent authority. | RF-201, SPEC §§7.1–7.2. |
| D5 | Preserve a source/revision-qualified RF/RNF inventory and explicit supersession/provenance. Structural reference checks cannot prove natural-language semantic equivalence. | RF-202, SPEC §11; WP PLAN §§4, 11. |
| D6 | Treat scope split, missing/ambiguous authority, unsupported relationships and forbidden authority claims as fail-closed obligations. Do not auto-repair or inject authoritative defaults. | RF-205–RF-207, SPEC §8; WP PLAN §§13–14. |
| D7 | Keep expected authority separate from observed evidence. RESULT retains failures; REVIEW consumes exact frozen identity and validation evidence read-only. | SPEC §§5, 8–10; WP PLAN §§15, 20–21. |
| D8 | Preserve current Task Lifecycle and all separate state dimensions. Validator reports checks, Reviewer assesses, Developer accepts; no status field implies another effect. | SPEC §§9–10; current `docs/task-lifecycle.md` §§3.1, 8–10. |
| D9 | Adopt prospectively only after review/acceptance. Later TASKs own parser, fixtures, templates, lint and migration. No automatic historical adoption or index promotion. | SPEC §11; WP PLAN §§16–18. |

## Representation and later implementation seam

The policy defines `tecnotron-sdd-artifacts/v1` as a normalized metadata design,
not a replacement for every current frontmatter format. Artifact kind is
explicit: `SPEC`, `WP_PLAN`, `TASK`, `TASK_PLAN`, `RESULT`, `REVIEW`. ADR and
policy remain implementation projections referencing the competent sources;
they are not extra steps in the six-artifact assignment/evidence graph.

The later `src/contracts/sdd-artifacts.js` may implement strict parsed-metadata
checks and relation functions using the existing Zod/YAML toolchain. That work
is **WU-01**, not this ADR. The future parser must retain evidence of invalid or
ambiguous input, avoid coercion/default authority, and leave semantic sufficiency
to competent review. Unknown types/relationships are failures, not extension
points that silently grant authority. A later extension must be competent and
versioned. This decision does not define WP-004 lifecycle transitions.

The policy's deterministic design can check explicit declarations and identity
consistency. It cannot decide whether two paragraphs mean the same thing, a
declared owner is competent without supplied authority, an undeclared behavior
delta is acceptable, or a failure really occurred without its evidence. Missing
proof stays unresolved and cannot become `PASS` by assertion. Semantic review
is required even after future structural validation passes.

## Rejected alternatives

| Alternative | Reason for rejection inside accepted authority |
| --- | --- |
| One universal mutable status / provider status as authority | Collapses distinct dimensions and infers acceptance; SPEC §§9–10. |
| Autonomous `design.md`, `tasks.md`, `apply`, chat or generated schema authority | Creates parallel behavior or permissions; RF-207. |
| Copy the SPEC into every TASK | Turns bounded assignment into competing requirements; RF-204. |
| Treat a new reusable capability as a mechanical TASK | Bypasses accepted SPEC/explicit exception handling; RF-201 and §7. |
| Silent metadata repair, acceptance defaults or historical backfill | Hides ambiguity and promotes history; SPEC §§8, 11. |
| Reuse the existing runtime Task/State model as SDD lifecycle | Conflates exchange/runtime types with document authority; SPEC §9. |
| New schema runtime or standalone JSON Schema now | No concrete interoperability need; existing conventions suffice; WP PLAN §§6, 9. |
| Build parser, templates or lint to demonstrate this ADR | Crosses the WU-00 boundary and its prior review/acceptance gate; WP PLAN §§8, 17–18. |

## Consequences, evidence and acceptance

Later work receives a single contract design with explicit vocabulary,
traceability and rejection obligations; it does not receive pre-approved
implementation authority. Full fixture and runtime proof remains deferred to
the work units that own those outputs. This ADR and policy require independent
review and explicit Developer acceptance before their later normative use.

WU-00 validation checks document/vocabulary consistency, source identities,
traceability, scope and whitespace, with a separate implementer semantic
assessment. Its evidence accompanies the frozen review package. No independent
review, acceptance, canonical integration/publication, WP completion or WU-01
authorization can be inferred from these documents or their successful checks.

The design uses repository artifacts and reproducible identities. It introduces
no dependency on a particular harness, provider, chat memory or storage service.
