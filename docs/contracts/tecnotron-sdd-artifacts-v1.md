---
document_id: TEC-CONTRACT-SDD-ARTIFACTS-V1
status: implementation_candidate
owner: tecnotron-ai
type: contract
version: 1.0
contract_version: tecnotron-sdd-artifacts/v1
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

# Tecnotron SDD Artifacts v1 — contract/policy foundation

## 1. Status, scope and source authority

This is the WU-00 **policy design candidate**, materialized under
[TOF-WP003-WU00-001](../tasks/TOF-WP003-WU00-001/TASK.md) and the
[implementation ADR](../adr/ADR-WP003-SDD-AUTHORITY.md). It represents accepted
SDD authority in a versioned machine-consistent vocabulary. It is not an
executable schema, parser, template, lint command or accepted contract yet.

Behavior derives from the [accepted WP-003 SPEC](../work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md).
Authority precedence is exclusively the one declared in SPEC §1. This policy
does not restate or alter it. Conflict with a canonical contract/ADR stops for
competent ruling; new expected behavior first requires the competent SPEC cycle.
The [accepted WP PLAN](../work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md)
supplies HOW, particularly §§6–9, 11, 14–18. IDs below are references to that
SPEC, not a second requirement set.

Only an explicit later adoption applies this normalized vocabulary to an
artifact. Existing Markdown/frontmatter, including the accepted SPEC/WP PLAN
and this TASK, is not silently migrated or retroactively declared invalid.
Document `version` and `contract_version` identify revisions; neither indicates
acceptance. Creating, validating or citing this candidate does not adopt it.

## 2. Single machine-readable vocabulary

The following JSON is the design vocabulary for this same policy. It is data,
not an enforcement engine or a source of authority independent of §§1–9. Future
WU-01 must implement the complete obligations, not merely parse this block. A
discrepancy between prose, vocabulary or competent input is a conflict to resolve,
never a reason to choose a convenient interpretation or default.

```json
{
  "contract_version": "tecnotron-sdd-artifacts/v1",
  "authority_precedence_ref": {
    "document_id": "TOF-WP-003-SPEC-001",
    "path": "docs/work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md",
    "section": "1"
  },
  "artifact_kinds": {
    "SPEC": "expected_behavior",
    "WP_PLAN": "technical_strategy",
    "TASK": "bounded_assignment",
    "TASK_PLAN": "local_execution_strategy",
    "RESULT": "observed_evidence",
    "REVIEW": "independent_assessment"
  },
  "common_required": [
    "contract_version", "document_id", "artifact_kind", "owner", "scope",
    "revision", "authority_refs"
  ],
  "reference_required": ["ref", "revision"],
  "requirement_reference_required": ["source", "id"],
  "requirement_id_prefixes": ["RF-", "RNF-"],
  "kind_fields": {
    "SPEC": ["requirements"],
    "WP_PLAN": ["requirement_refs", "relations"],
    "TASK": ["requirement_refs", "assignment_authority_ref", "write_scope", "acceptance_criteria", "relations"],
    "TASK_PLAN": ["relations"],
    "RESULT": ["subject_ref", "evidence_refs", "observations", "relations"],
    "REVIEW": ["candidate", "validation_evidence_refs", "assessment_ref"]
  },
  "allowed_artifact_relations": [
    {"from": "WP_PLAN", "relation": "derives_from", "to": "SPEC"},
    {"from": "TASK", "relation": "assigns_from", "to": "SPEC"},
    {"from": "TASK", "relation": "follows", "to": "WP_PLAN"},
    {"from": "TASK_PLAN", "relation": "executes", "to": "TASK"},
    {"from": "RESULT", "relation": "records", "to": "TASK"},
    {"from": "REVIEW", "relation": "uses_evidence", "to": "RESULT"}
  ],
  "exception_required": ["authority_ref", "scope", "rationale"],
  "frozen_candidate_required": ["identity_ref"],
  "git_candidate_identity": ["repository", "commit", "tree", "parents"],
  "state_dimensions": [
    "task_contract", "materialization", "implementation", "validation",
    "review", "review_handoff", "developer_acceptance", "integration",
    "publication", "closure"
  ],
  "validation_outcomes": ["PASS", "FAIL", "NOT_RUN", "UNAVAILABLE"],
  "authoritative_defaults": {},
  "obligations": [
    {"key": "spec_coverage_or_competent_exception", "source": "RF-201"},
    {"key": "stable_requirement_identity_and_provenance", "source": "RF-202"},
    {"key": "wp_plan_how_only", "source": "RF-203"},
    {"key": "bounded_task_assignment", "source": "RF-204"},
    {"key": "split_required_blocks_ready", "source": "RF-205"},
    {"key": "behavior_change_returns_to_spec", "source": "RF-206"},
    {"key": "no_parallel_authority", "source": "RF-207"}
  ]
}
```

These field names select a normalized representation; they do not change
responsibility. `artifact_kind` is explicit rather than inferred from a filename,
existing `type`, tool, provider or directory. ADR/policy/guide/index documents
are not additional six-artifact kinds and cannot be forced into that graph to
acquire SPEC or TASK authority. Their authority references remain explicit.

## 3. Metadata and identity semantics

All required values must be supplied, well-formed and unambiguous. Blank or null
values do not satisfy a required field. Lists required to establish authority,
assignment or evidence cannot be empty merely to pass shape validation. Future
strict parsing must reject unknown kinds and unsupported authority-bearing
fields/relations, not strip them and then report a successful authority check.
The representation contains no authoritative defaults or coercion of acceptance.

| Field / structure | Meaning and source constraint |
| --- | --- |
| `contract_version` | Explicit vocabulary version. Unsupported versions fail closed; no fallback to a convenient version. |
| `document_id` | Stable artifact identity. Identity persists across revisions; a new revision does not silently replace provenance. |
| `artifact_kind` | One of the six explicit kinds in §2; responsibility comes from SPEC §4. |
| `owner` | Declared competent owner, supported by `authority_refs`. A string alone is not proof of competence or permission. |
| `scope` | Explicit bounded subject and applicable repository/paths or logical responsibility. Comparisons need declared containment evidence; no inference from directory proximity. |
| `revision` | Explicit version, immutable commit/hash, or another reproducible revision appropriate to the owner. A mutable path alone is insufficient when exact reviewed identity is required. |
| `authority_refs` | Nonempty references to competent authority for this artifact and responsibility. A reference transports an existing decision; it does not create or rank authority. |
| Reference `{ref, revision}` | `ref` is an explicit document ID, versioned path or immutable locator; `revision` disambiguates the source snapshot. Resolution uses declared repository-local inputs or exact immutable evidence supplied by the caller. Unresolved, mismatched or conflicting identities fail closed. No network/provider discovery is necessary. |
| `requirement_refs` | Explicit list of `{source: Reference, id: string}` entries. `source` identifies the competent requirement source, normally the accepted SPEC. Each ID has `RF-` or `RNF-` plus a nonempty suffix and must exist with that identity in the source; syntax alone is insufficient. No numeric-only renumbering rule is introduced. |
| `requirements` | SPEC-owned stable IDs and their normative content, with explicit supersession/retirement provenance where applicable. PLAN/TASK reference them and do not become a second registry. |
| `relations` | Declared `{relation, target: Reference}` edges oriented from the current artifact to its input; target kind is resolved from the referenced snapshot. The permitted triples are in §2 and their conditions in §4. |
| `assignment_authority_ref` | Explicit competent decision authorizing a TASK's bounded responsibility and requirement subset. SPEC acceptance, plan existence or generated TASK metadata cannot substitute for that decision. |
| `write_scope`, `acceptance_criteria` | Explicit bounded effects and local checks within the assigned requirements. They neither widen the WP PLAN nor redefine SPEC semantics. |

Stable requirement identity is qualified by its competent source, not globally
deduplicated across unrelated capabilities. Within that source, duplicate IDs,
semantic reuse, unexplained renumbering or removal lose traceability and fail
the relevant check. Retired/superseded IDs retain their prior identity and
explicit disposition/replacement relation. Comparing meaning or detecting a
hidden prose change requires semantic assessment, not just a regular expression.

The accepted WP-003 SPEC provides RF-201–RF-207 and no numbered RNF entries.
The vocabulary supports RNF references for sources that actually declare them;
it does not fabricate RNF IDs for this SPEC's unnumbered constraints.

## 4. Artifact responsibilities and relation conditions

The relation table expresses structural derivation/evidence, **not authority
precedence** and not a runtime lifecycle. Each edge targets an explicit revision.

| Kind | Required relationship / responsibility | Boundary |
| --- | --- | --- |
| SPEC | Owns WHAT and stable RF/RNF. Cites competent decisions/contracts through `authority_refs`. | A draft SPEC does not grant accepted behavior or implementation permission by existing. |
| WP_PLAN | `derives_from` the competent SPEC; references covered requirements. | Defines HOW, decomposition, order and gates only. Uncovered expected behavior returns to the SPEC cycle. |
| TASK | `assigns_from` the owning SPEC and `follows` its WP PLAN; declares assignment authority, bounded scope and requirement subset. | May define local acceptance checks, not copy/reinterpret SPEC or enlarge its plan. |
| TASK_PLAN | `executes` its TASK. | Local execution strategy remains contained by that TASK. It cannot change expected behavior or assignment. |
| RESULT | `records` its TASK; identifies exact observed subject/revision and evidence. | Records observations, including failures; does not revise expected requirements or accept work. |
| REVIEW | Identifies the exact frozen candidate and its validation evidence. `uses_evidence` is allowed when the supplied evidence is a RESULT artifact. | Independent, read-only assessment. Other exact validation reports can be referenced directly without inventing a RESULT artifact. No candidate mutation or Developer acceptance. |

Authority/exception references and candidate/evidence references have their own
fields. They are not arbitrary extra edges in the six-artifact relation graph.
An unknown relationship is rejected; a convenience filename never supplies a
missing edge. Accepted-state evidence must accompany the source when required;
an artifact's own status declaration cannot self-certify acceptance. Frozen
proposal metadata and later competent decisions may coexist without rewriting
the snapshot. Both identities and the decision's applicable scope must resolve.

### RF-201 exception and mechanical-work branch

Before a capability acquires normative behavior, it needs an accepted SPEC or
an explicit competent exception with `authority_ref`, `scope` and `rationale`.
If existing authority does not cover the exception, a Developer ruling is
required. A missing SPEC never creates an exception.

A supplied exception can stand in for the SPEC-coverage reference only within
its authorized scope; it is **not** a synthetic SPEC, an additional artifact
kind, or a general waiver of stable IDs, ownership, bounded assignment, WP PLAN,
review or acceptance constraints. If other required relationships cannot be
established, validation still fails closed for competent resolution. Any
requirement reference must resolve to actual competent authority, including
explicit exceptional authority when applicable; never invent requirement IDs.

A purely mechanical unit remains traced to the owning accepted SPEC without a
separate SPEC if it only materializes/verifies already-authorized behavior and
adds no observable semantics, permissions, invariants, valid states,
interoperability or policy. Conversely, a TASK that defines an uncovered reusable
capability, new contract or normative behavior requires RF-201 handling before
READY. Ambiguous mechanical-versus-behavioral classification fails closed; a
label or author assertion cannot resolve it. These are the SPEC §7 edge cases,
not new exceptions introduced by this policy.

## 5. Evidence, review and separate dimensions

`subject_ref` identifies the TASK/candidate revision actually observed by RESULT.
`observations` record the actual outcomes and failures with `evidence_refs` that
resolve to reproducible evidence. Later success is a new observation/version;
it does not rewrite earlier FAIL into PASS. No input assertion can prove
historical failure preservation without the referenced evidence/provenance.

REVIEW `candidate` contains `identity_ref`, a Reference resolving to the frozen
identity record. REVIEW `validation_evidence_refs` identify the evidence actually
used, whose subject identity must match that record; no duplicate evidence list
inside `candidate` is required. For a Git candidate, the identity record contains
`repository`, full immutable `commit`, `tree` and `parents`; the tuple must agree
with the actual Git object, including all parents. For
another owner, an equivalent immutable, reproducible identity is required; a
branch name or provider status cannot substitute. No particular hash algorithm
or hosting service is made a product requirement. A REVIEW mismatch fails closed.

`assessment_ref` identifies the independent review report; reviewer ownership
and read-only authority must be established through explicit references. Review
cannot implement, correct or mutate the candidate. A review FAIL remains
versioned evidence through any later authorized correction/re-review.

The state-dimension names in §2 project [Task Lifecycle](../task-lifecycle.md)
§3.1. Their applicable values/transitions remain owned there; they do not define
`tecnotron-task-lifecycle/v1`. Absent evidence remains absent, not a default
accepted/ready/published status. In particular:

- `scope_fit: split_required` is incompatible with `READY` until competent
  division yields authorized units with unambiguous requirements, ownership
  and criteria; changing a provider label or the field alone is insufficient.
- Validation, review, Developer acceptance, integration, publication and closure
  are independent evidence dimensions. A PASS or accepted artifact never
  implicitly grants the next effect or implementation authority.
- Validator reports `PASS`, `FAIL`, `NOT_RUN` or `UNAVAILABLE` from actual checks.
  It does not review semantics or accept. Reviewer assesses independently.
  Developer retains terminal acceptance; Doc_Curator writes only under explicit
  ownership and cannot create behavior by documenting it.

## 6. Fail-closed obligations and limits

These are design obligations for the later validator and competent review.
They do not claim WU-00 has executable enforcement.

| Condition | Required disposition | Source |
| --- | --- | --- |
| Required metadata absent/blank, unknown kind, unresolved owner or ambiguous authority | Fail the applicable check; identify the missing input/authority. Do not default, coerce, strip the conflict or repair files. | SPEC §§5, 8; WP PLAN §§9, 14. |
| Unsupported relation or target identity mismatch | Reject the relation; require explicit competent references. | SPEC §§5, 8; WP PLAN §§11, 14. |
| Invalid, duplicate/conflicting, reused, renumbered or removed RF/RNF identity without provenance | Reject affected traceability; preserve prior identity and require competent disposition. | RF-202; SPEC §11. |
| PLAN/TASK/task PLAN contains uncovered or changed expected behavior | Stop affected derivation for SPEC update/approval before implementation. Do not normalize via RESULT or Current State. | RF-203, RF-204, RF-206. |
| TASK duplicates SPEC with changed meaning | Reject the competing authority; keep requirement assignment by reference. | RF-204. |
| Split-required unit seeks READY without competent division | Block READY; no provider-label bypass. | RF-205. |
| Convenience file, prompt, chat, runtime, provider field, AGENTS, skill, index or package claims independent normative authority | Reject the authority claim, regardless of filename. A traced derived view with no added requirements/permissions/states may exist. | RF-207. |
| Historical material is cited as current authority without explicit competent adoption | Reject authority use; history remains provenance only. | SPEC §11; RF-207. |
| Frozen REVIEW identity mismatches or review attempts mutation | Reject the review input/effect; require the exact frozen candidate and read-only assessment. | SPEC §§8, 10. |
| RESULT erases/relabels observed failure | Reject the evidentiary claim; preserve original failure and later observations separately. | SPEC §§8–10. |
| Uncovered independent capability or implicit/overbroad exception | Stop for RF-201 handling before READY. | RF-201; SPEC §7.1. |
| Ambiguous mechanical-versus-behavioral classification | Stop for competent resolution; do not invent an exception. | SPEC §7.2. |

Deterministic validation can check shape, declared authority/reference identity,
subset relations and explicit contradictions. It cannot prove natural-language
semantic equivalence, complete omission detection, real-world owner competence,
or truthful observations from metadata alone. Such a limitation must be reported
and routed to competent semantic assessment. A structural PASS must state its
coverage and cannot be presented as full behavioral proof. Unavailable checks
retain `UNAVAILABLE`; checks not executed retain `NOT_RUN`.

The future CLI/checker is read-only and reports findings, not exceptions,
new authority, automatic fixes or Developer dispositions. No default in §2
means that missing authority cannot be filled by implementation convenience.

## 7. Traceability to accepted authority

| Source | Policy projection | ADR decision |
| --- | --- | --- |
| RF-201; SPEC §§7.1–7.2 | §4 accepted coverage, scoped exception and both edge cases; §6 rejection limits. | D4 |
| RF-202; SPEC §11 | §§2–3 source-qualified RF/RNF references, identity and provenance; §6. | D2, D5 |
| RF-203 | §4 WP_PLAN HOW and SPEC-return boundary; §6. | D2, D6 |
| RF-204 | §§3–4 bounded assignment and local criteria; §6 duplicate-SPEC rejection. | D2, D3 |
| RF-205 | §5 split-required/READY exclusion; §6. | D6 |
| RF-206 | §§1, 4, 6 behavior changes return to SPEC before derived artifacts. | D2, D6 |
| RF-207 | §§1–4 no parallel authority; §6 convenience/history rules. | D1, D6, D9 |
| SPEC §§4–5 | §§2–5 artifact identity, ownership, scope and explicit relation/evidence graph. | D1–D3, D7 |
| SPEC §§8–10 | §§5–6 frozen review, failure preservation, dimensions and truthful validation. | D7–D8 |
| SPEC §11; WP PLAN §16 | §§1, 8 versioning/adoption and historical preservation. | D5, D9 |

Unnumbered source sections are retained as section references, not renamed RNFs.
The versioned projection must preserve this derivation if its representation
changes; a policy version bump cannot authorize new expected behavior.

## 8. Prospective adoption and deferred proof

After competent review and Developer acceptance of the exact foundation, a
separately authorized WU-01 can materialize parsing and relation checks at the
planned `src/contracts/sdd-artifacts.js` seam using existing JavaScript/Zod/YAML.
WU-02 owns templates and the full positive/negative fixture corpus; WU-03 owns
read-only CLI/lint; WU-04 owns bounded adoption and selected migrations.
None is initialized by this policy, and acceptance alone does not authorize them.

The mandatory fixture obligations remain SPEC §§8.1–8.2 and WP PLAN §12,
including the accepted full chain, mechanical unit, explicit exception and all
negative authority/evidence cases. WU-00 verifies the foundation's vocabulary,
traceability and scope, not that future runtime rejects those fixtures. The
future templates must project this same accepted contract and carry no default
acceptance, exception or lifecycle effects. Existing documents require explicit
owned adoption; a compatibility gap authorizes no rewrite. Source of Truth
navigation changes wait for actual accepted canonical artifacts and authority.

## 9. Out-of-scope effects

This foundation introduces no lifecycle engine, workflow engine, runtime
coordination changes, retry mechanism, execution optimization bundle, provider
binding, consumer configuration, FitFlow effect, GitHub Projects effect,
WP-004/WP-005 initialization, canonical integration/publication or `main`
promotion. Its records remain portable repository artifacts and exact references;
no execution-critical dependence on any harness or conversational persistence is
introduced. Independent review and terminal Developer acceptance remain external.
