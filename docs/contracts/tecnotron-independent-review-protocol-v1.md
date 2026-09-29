---
document_id: TEC-CONTRACT-INDEPENDENT-REVIEW-PROTOCOL-V1
status: implementation_candidate
owner: tecnotron-ai
type: contract
version: 1.0
contract_version: tecnotron-independent-review-protocol/v1
updated: 2026-09-28
machine_context: true
task_id: TOF-WP-PB-001-WU01-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP-PB-001-WU01-PROTOCOL-CONTRACT-001
work_package_id: WP-PB-001
work_unit: WU01
spec: docs/work-packages/wp-pb-001-reusable-independent-review-protocol/SPEC.md
wp_plan: docs/work-packages/wp-pb-001-reusable-independent-review-protocol/PLAN.md
requirement_refs: [RF-IR-001, RF-IR-002, RF-IR-003, RF-IR-004, RF-IR-005, RF-IR-006, RF-IR-007, RF-IR-008, RF-IR-009, RF-IR-010, RF-IR-011, RF-IR-012, RF-IR-013, RF-IR-014, RF-IR-015, RNF-IR-001, RNF-IR-002, RNF-IR-003, RNF-IR-004, RNF-IR-005]
independent_review: NOT_RUN
developer_acceptance: NOT_GRANTED
---

# Tecnotron Independent Review Protocol v1

## 1. Status, scope, and authority

This WU01 implementation candidate materializes the accepted
[WP-PB-001 SPEC](../work-packages/wp-pb-001-reusable-independent-review-protocol/SPEC.md)
and [WP PLAN](../work-packages/wp-pb-001-reusable-independent-review-protocol/PLAN.md)
as one reusable semantic protocol. The [WU01 TASK](../tasks/TOF-WP-PB-001-WU01-001/TASK.md)
bounds this materialization. The accepted definition owns WHAT, its WP PLAN owns
the work-package HOW, and this contract cannot widen either source.

The protocol governs how a competent independent reviewer conducts one bounded
semantic review. It does not perform semantic judgment, validate a candidate,
grant authority, implement a candidate, or operate a lifecycle. Its stable
identity is `tecnotron-independent-review-protocol/v1`.

This contract specializes the existing
[WP003 SDD artifact contract](tecnotron-sdd-artifacts-v1.md). WP003 continues to
own the `REVIEW` artifact kind, exact candidate and evidence reference semantics,
artifact relations, and authority separation. This protocol creates no seventh
SDD artifact kind, parallel SDD contract, or second lifecycle. If the contracts
conflict, review stops for competent resolution; convenience interpretation is
not permitted.

## 2. Normative terms and boundary

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` are normative. A review instance is the
explicit bounded input supplied to one independent review. The review subject is
the exact immutable candidate or equivalent immutable subject identified by that
instance. A reviewer is the independent read-only semantic assessor. Developer
acceptance is a separate terminal human authority decision.

The protocol is provider-, model-, harness-, workspace-, repository-host-, and
conversation-neutral. No provider field, harness session, generated template,
package, manifest, report, tool result, or protocol citation creates Product
authority by existing. A fresh competent reviewer MUST be able to perform the
review from the declared inputs without originating chat history, conversational
memory, hidden state, or provider continuity.

The protocol does not define a review template, conformance fixture or example
corpus, package Recipe, Context Package engine, runner, CLI, scheduler,
auto-retry, workflow engine, semantic validator, State Kernel behavior,
Operational Spine behavior, or Phase2A/Phase2B behavior. Those exclusions are
not optional implementation gaps in WU01.

## 3. Exact review subject

Every review instance MUST identify one exact immutable review subject. For a
Git subject, the identity follows WP003 and includes repository, full commit,
tree, and every parent. For a non-Git subject, the instance MUST supply an
equivalent immutable and reproducible identity appropriate to its owner.

A mutable branch, tag without immutable resolution, workspace, later commit,
live repository state, implicit latest state, convenient reconstruction, copied
content without correspondence proof, or reviewer-modified form MUST NOT
substitute for the declared subject. A mutable locator MAY aid transport but is
never the reviewed identity. Identity mismatch or material ambiguity makes the
review interface incompetent and fails closed in preflight.

## 4. Explicit review input boundary

A review instance MUST explicitly supply:

| Input | Required meaning |
| --- | --- |
| Protocol | Exact protocol identity/version when this accepted protocol is applicable. |
| Review identity | Stable `review_id`, reviewer responsibility, and immutable output identity/version. |
| Authority | Competent authority references for the bounded review request and applicable Product sources. |
| Scope | Included responsibility and explicit exclusions sufficient to detect leakage. |
| Subject | Exact immutable candidate identity/reference and transport correspondence. |
| Criteria | Applicable requirement and acceptance-criteria references at exact revisions. |
| Evidence | Supplied validation/evidence references, actual outcomes, subject correspondence, and material limitations. |
| Questions | Responsibility-specific semantic assessment questions. |
| Deviations | Explicit deviations or extensions and their competent authority; otherwise an explicit empty declaration. |
| Input inventory | The complete authorized files/references available to the reviewer. |

The declared input inventory is the review boundary. The reviewer MUST NOT
silently repair an incomplete boundary using unrelated chats, memory, live
repository state, hidden workspace state, undeclared files, network discovery,
or external evidence outside the authorized interface. Missing material remains
missing. Material ambiguity in authority, scope, criteria, subject identity, or
evidence correspondence MUST block adjudication rather than be resolved by
inference.

A review request MAY include complete bounded canonical sources or exact
authority excerpts sufficient for adjudication. Excerpts MUST identify their
source/revision and MUST NOT omit context material to meaning. Generated
transport remains non-authoritative.

## 5. Preflight before semantic adjudication

Before judging candidate semantics, the reviewer MUST determine whether the
review interface is competent. Preflight MUST assess:

1. review identity and exact immutable subject identity;
2. competent authority and bounded scope;
3. applicable requirements and criteria at declared revisions;
4. evidence identity, actual status, provenance, and subject correspondence;
5. reviewer read-only responsibility and the complete declared input boundary;
6. deviations, contradictions, missing inputs, and material limitations;
7. compatibility of the requested assessment with controlling contracts.

Preflight is not semantic adjudication. Mechanical integrity checks MAY support
it, but their success cannot prove semantic competence or correctness. If a
defect makes the supplied interface materially incompetent, the reviewer MUST
record it and return `BLOCKED` without pretending to reject candidate semantics.
If the interface is competent, the reviewer proceeds to semantic assessment.

Candidate defects, review-interface defects, and evidence limitations are
different facts. One MUST NOT be relabeled as another to obtain a preferred
verdict. An evidence limitation becomes an interface blocker only when its
significance prevents competent completion of the bounded semantic assessment.

## 6. Common semantic assessment dimensions

For a competent interface, every review MUST assess the following dimensions
unless the protocol and instance explicitly permit one to be inapplicable and
record why:

| Dimension | Required assessment |
| --- | --- |
| Authority and scope fidelity | Candidate and requested effect remain within competent authority and bounded responsibility. |
| Requirement/criteria coverage | Applicable requirements and local criteria are addressed without omission, substitution, or redefinition. |
| Semantic correctness | Candidate meaning coherently implements the accepted behavior, including negative and edge semantics. |
| Invariant preservation | Controlling invariants, role boundaries, separations, and fail-closed conditions remain intact. |
| Evidence correspondence | Evidence actually concerns the exact subject and supports only the stated conclusions. |
| Controlling-contract compatibility | Candidate specializes or composes with governing contracts without parallel authority or conflict. |
| Scope leakage | Candidate introduces no behavior, dependency, permission, artifact, or effect outside the assignment. |
| Explicit limitations | Unsupported, unresolved, `NOT_RUN`, `UNAVAILABLE`, or insufficient checks remain visible and are assessed for significance. |

Task-specific criteria MAY refine or add questions within these dimensions. They
MUST NOT redefine their common meaning or the protocol's subject, finding,
verdict, independence, history, or authority semantics.

## 7. Deterministic validation and semantic review

Deterministic validation and Independent Review are separate responsibilities.
Validation reports actual covered outcomes as `PASS`, `FAIL`, `NOT_RUN`, or
`UNAVAILABLE`. A validation `PASS` proves only the executed mechanical checks.
`NOT_RUN`, `UNAVAILABLE`, unresolved, unsupported, or insufficient checks MUST
remain explicit when relevant and MUST NOT be coerced to `PASS` or omitted from
the conclusion.

Parsers, identity checks, manifests, package checks, link checks, keyword
inventories, and preflight automation MAY provide evidence. They MUST NOT
replace semantic judgment, infer natural-language equivalence, assign semantic
severity from keywords, determine a review verdict, or grant Developer
acceptance. Semantic assessment remains semantic even when mechanically supplied
evidence is complete.

## 8. Structured findings

Each material finding MUST contain:

- stable finding identity;
- affected subject, requirement, criterion, or protocol dimension;
- evidence or reasoned basis tied to declared inputs;
- observed issue or supported observation;
- impact and corrective significance;
- one classification from section 8.1;
- one severity from section 8.2;
- explicit limitations relevant to interpreting the finding.

Findings SHOULD identify the smallest adequate candidate location or interface
field without assuming a particular repository or report format. No keyword,
file count, test result, classification, or severity mechanically determines
another semantic field or the final verdict.

### 8.1 Finding classification vocabulary

| Classification | Meaning |
| --- | --- |
| `CANDIDATE_DEFECT` | The exact frozen subject conflicts with applicable authority, requirements, criteria, contracts, or invariants. It requires a competent semantic basis, not merely a failed interface check. |
| `REVIEW_INTERFACE_DEFECT` | The supplied authority, scope, criteria, identity, evidence correspondence, or declared boundary is incomplete, inconsistent, ambiguous, or mismatched. It does not by itself reject candidate semantics. |
| `EVIDENCE_LIMITATION` | A required or relevant check is `NOT_RUN`, `UNAVAILABLE`, unsupported, unresolved, insufficiently evidenced, or unable to support the claimed conclusion. |
| `OBSERVATION` | A supported non-defect fact relevant to the bounded assessment or its limitations. |

### 8.2 Severity vocabulary

| Severity | Meaning |
| --- | --- |
| `BLOCKING` | The finding prevents competent completion of the bounded review or a claimed later effect unless resolved. Its classification and basis determine whether it concerns the candidate or interface; the word alone does not determine verdict. |
| `MATERIAL` | The finding can change compliance, correctness, scope fidelity, evidence correspondence, or the bounded conclusion and requires explicit disposition. |
| `ADVISORY` | The finding is supported and useful but does not change the current bounded verdict or require candidate correction for that verdict. |

Classification identifies what kind of fact was found. Severity identifies its
significance in this review. Reviewers assign both through semantic judgment and
explain their relationship to the verdict.

## 9. Verdict semantics

Every completed review result has exactly one verdict from this vocabulary:

| Verdict | Required semantics |
| --- | --- |
| `PASS` | Preflight established a competent bounded interface, the required semantic assessment completed successfully for that interface, and no unresolved material candidate defect prevents the bounded conclusion. Declared non-material limitations remain visible. |
| `FAIL` | The interface was competent enough to adjudicate the relevant semantics and one or more material candidate defects require correction plus a new frozen subject before a later review can supersede this evidence. Interface failure alone MUST NOT produce `FAIL`. |
| `BLOCKED` | Competent semantic adjudication could not complete because the supplied review interface or evidence was materially incomplete, inconsistent, ambiguous, mismatched, or otherwise incompetent. `BLOCKED` MUST NOT claim rejection of candidate semantics that were not competently adjudicated. |

Verdict selection is semantic, not a mechanical reduction from counts, keywords,
classification, severity, or deterministic validation. When an interface defect
prevents completion, the overall verdict is `BLOCKED` even if supported partial
observations are recorded; no complete candidate conclusion is implied. A
material candidate defect yields `FAIL` only when the applicable interface is
competent for that conclusion. `PASS`, `FAIL`, and `BLOCKED` are therefore
distinct and non-interchangeable.

## 10. Read-only independence

The independent reviewer MUST remain read-only with respect to the subject and
candidate repository. The reviewer MUST NOT implement, repair, rewrite, mutate,
stage, commit, amend, merge, rebase, integrate, publish, or otherwise change the
reviewed candidate. The reviewer reports findings, limitations, and a verdict;
the implementer or another authorized role performs any later correction.

Review independence is a responsibility boundary, not a provider feature. A
harness that can write does not grant the reviewer permission to write. If
review requires candidate repair to continue, the review records the applicable
verdict and stops; a corrected subject requires a new immutable identity and a
new review.

## 11. Developer and later-effect separation

A review verdict grants none of the following:

- Developer acceptance;
- implementation or correction authority;
- integration or publication authority;
- lifecycle closure or reconciliation;
- canonical status;
- next-work-unit or next-stage authority.

In particular, `PASS` is not Developer acceptance. `FAIL` does not authorize a
fix, and `BLOCKED` does not authorize context repair. These effects require their
own competent authority and observed evidence under the controlling lifecycle.

## 12. Task-specific instantiation contract

A task-specific review instance MUST reference this protocol version when it is
accepted and applicable, then supply only responsibility-specific authority,
scope, criteria, subject, evidence, questions, output identity, and declared
deviations described in section 4. Common protocol semantics MUST be referenced
rather than re-authored.

An instance MAY add bounded questions or stricter criteria when covered by
competent authority. It MAY mark a common assessment dimension inapplicable only
when this protocol permits that treatment, the reason is explicit, and no
material obligation is hidden. A deviation or extension MUST identify competent
authority and scope. No instance may redefine exact-subject treatment, the input
boundary, finding vocabulary, `PASS`/`FAIL`/`BLOCKED`, read-only independence,
Developer separation, historical preservation, or the no-deterministic-
substitute rule.

Templates and conformance examples are WU02 responsibilities. A generated
instance is transport and creates no authority; correctness depends on explicit
competent inputs and semantic review, not template provenance.

## 13. Historical preservation and re-review

A completed review is immutable historical evidence. Candidate correction after a
competently adjudicated `FAIL` MUST create a new frozen review subject and a new
review identity/version tied to that subject and its inputs. Review-interface or
evidence repair, additional evidence, or re-review that does not require candidate
correction MUST create a new review identity/version tied to its exact subject and
inputs; it MAY review the same immutable candidate. A later result MUST NOT rewrite,
erase, relabel, or
silently supersede an earlier `FAIL`, `BLOCKED`, limitation, finding, or evidence
status into success.

A later review MAY supersede the earlier result for an explicitly identified
current decision only through preserved provenance linking both identities. The
earlier record remains truthful evidence of what was reviewed, with which
inputs, and what was concluded at that time.

## 14. Protocol conformance and limitations

Conformance to this protocol requires semantic assessment of the applicable
normative clauses. Deterministic checks MAY establish explicit field presence,
supported vocabulary, identity shape, package integrity, or declared
correspondence, but a structural `PASS` is not proof of semantic conformance.
Material review-interface or evidence uncertainty that prevents competent semantic
adjudication fails closed to `BLOCKED` for the affected review rather than being
repaired by defaults. Material ambiguity or contradiction in a competently supplied
candidate remains candidate-defect territory and MAY require `FAIL`.

This WU01 contract is itself an unaccepted candidate. It MUST NOT be cited as
accepted authority for its own Independent Review. That review uses currently
accepted WP003 REVIEW semantics, the exact frozen candidate/evidence, the
existing reviewer read-only boundary, and an explicit bounded request. Later
work may instantiate this protocol only after the applicable acceptance and
authority gates.

## 15. Requirement traceability

| Requirement | Contract projection |
| --- | --- |
| RF-IR-001 | Sections 1-2 define one reusable versioned provider-independent protocol. |
| RF-IR-002 | Section 3 requires one exact immutable review subject and rejects mutable substitutes. |
| RF-IR-003 | Section 4 defines the explicit competent input boundary. |
| RF-IR-004 | Section 4 prohibits undeclared context repair. |
| RF-IR-005 | Section 5 requires competent preflight before semantic adjudication. |
| RF-IR-006 | Section 6 defines the reusable semantic assessment dimensions. |
| RF-IR-007 | Section 7 separates deterministic evidence from semantic review and later authority. |
| RF-IR-008 | Section 8 defines structured findings and versioned vocabulary. |
| RF-IR-009 | Sections 6-8 and 14 preserve explicit limitations and unsupported checks. |
| RF-IR-010 | Section 9 defines distinct `PASS`, `FAIL`, and `BLOCKED` semantics. |
| RF-IR-011 | Section 10 preserves read-only reviewer independence. |
| RF-IR-012 | Section 11 separates Developer acceptance and all later effects. |
| RF-IR-013 | Section 12 defines bounded task-specific instantiation by reference. |
| RF-IR-014 | Section 13 preserves immutable historical reviews and re-review identity. |
| RF-IR-015 | Sections 5, 7, and 14 prohibit deterministic semantic substitution. |
| RNF-IR-001 | Section 2 requires provider neutrality. |
| RNF-IR-002 | Section 2 requires harness and conversational-continuity neutrality. |
| RNF-IR-003 | Sections 3-5 and 14 fail closed on material interface ambiguity. |
| RNF-IR-004 | Sections 2, 4, and 12 make generated material non-authoritative. |
| RNF-IR-005 | Sections 2 and 4 require a self-contained explicit interface for a fresh reviewer. |

This table traces accepted requirements; it does not replace or restate their
authority. WU02 retains reusable template and conformance-corpus proof. WU03
retains adoption and Stage-D conformance disposition. No requirement trace here
claims those later outputs already exist.

## 16. Out-of-scope effects

This contract introduces no provider dependency, Product Recipe, Context Package
engine, runtime, CLI, source-code effect, test corpus, workflow, lifecycle,
State Kernel or Operational Spine redesign, Phase 2 modification, consumer
adoption, FitFlow effect, F03/F07/F08/F09 implementation, canonical integration,
remote publication, Stage-D closure, or Stage-E entry. Such an effect requires a
separate competent responsibility and cannot be inferred from this protocol.
