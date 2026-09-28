---
document_id: TECNOTRON-WP-PB-001-SPEC-001
status: CANDIDATE
materialization_status: PRODUCT_DEFINITION_CANDIDATE
owner: tecnotron-ai
type: work-package-spec
version: 1.0
updated: 2026-09-28
machine_context: true
milestone_id: tecnotron-prealpha-normalization-and-integral-cycle-v1
work_package_id: WP-PB-001
responsibility: TECNOTRON_REUSABLE_INDEPENDENT_REVIEW_PROTOCOL
independent_review: NOT_RUN
developer_acceptance: NOT_GRANTED
implementation: NOT_STARTED
implementation_authority: NOT_GRANTED
related:
  - docs/milestones/tecnotron-prealpha-normalization-and-integral-cycle-v1/PLAN.md
  - docs/work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md
  - docs/work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md
  - docs/contracts/tecnotron-sdd-artifacts-v1.md
  - docs/contracts/tecnotron-agent-profile-v1.md
  - docs/task-lifecycle.md
---

# SPEC WP-PB-001: Reusable Independent Review Protocol

## 1. Status and authority

This candidate defines WHAT the selected Stage-D Product responsibility must mean.
It exists under the explicit Developer ruling for
TASKCYCLE-TECNOTRON-STAGE-D-REUSABLE-INDEPENDENT-REVIEW-PROTOCOL-DEFINITION-001.
It does not self-accept, authorize implementation, initialize a Work Unit, create a
Recipe, integrate to tools, close Stage D, or enter Stage E.

The accepted WP003 SDD authority model remains controlling for artifact boundaries:
SPEC owns WHAT; WP PLAN owns HOW; REVIEW is independent read-only semantic assessment;
Validator is deterministic evidence only; Developer retains terminal acceptance.

## 2. Product problem and objective

Bounded Independent Reviews already have frozen-candidate identity, evidence
correspondence, read-only reviewer boundaries, REVIEW artifact identity, result
transport, Developer-acceptance separation, deterministic Phase-2 mechanics, and
lifecycle reconciliation. Common semantic review obligations are still repeatedly
authored per task.

The objective is one reusable, versioned, provider-independent Independent Review
semantic protocol that bounded Product tasks instantiate without redefining common
review obligations. The protocol governs how a competent reviewer conducts a bounded
review; it does not perform or automate the semantic judgment.

## 3. Product boundary

Included:

- reusable semantic review obligations;
- exact immutable review-subject treatment;
- explicit review input boundary and preflight;
- common semantic assessment dimensions;
- deterministic validation treated as evidence, never semantic acceptance;
- structured findings with versioned classification and severity semantics;
- explicit limitations and unsupported checks;
- stable PASS, FAIL, and BLOCKED verdict semantics;
- read-only reviewer independence;
- separation from Developer acceptance and later effects;
- task-specific protocol instantiation without common-semantic re-authoring;
- immutable preservation of historical reviews.

Excluded:

- deterministic semantic judgment or automated Developer acceptance;
- lifecycle or State Kernel redesign;
- Phase2A or Phase2B changes;
- a dedicated review-package Recipe, universal Context Package engine, runner/CLI,
  scheduler, auto-retry, workflow engine, or orchestration framework;
- adoption of Commander, Orca, OpenCode, Codex/Work, MCP, plugins, Skills,
  Codebase Memory, FitFlow Recipes, or any mandatory provider/harness;
- implementation of F03, F07, F08, or F09.

## 4. Functional requirements

### RF-IR-001 — REUSABLE_PROVIDER_INDEPENDENT_PROTOCOL
Common Independent Review semantic obligations MUST come from one versioned Product
protocol rather than task-specific recreation. The protocol MUST NOT require a
specific model, provider, harness, workspace, repository host, or conversation state.

### RF-IR-002 — EXACT_REVIEW_SUBJECT
Every review MUST identify the exact frozen candidate or equivalent immutable review
subject. A mutable branch, workspace, later commit, or convenient reconstruction MUST
NOT silently substitute for that subject.

### RF-IR-003 — EXPLICIT_REVIEW_INPUT_BOUNDARY
The review instance MUST explicitly supply competent authority, bounded scope,
applicable requirements or criteria, exact candidate identity, and supplied
validation/evidence required for adjudication.

### RF-IR-004 — NO_UNDECLARED_CONTEXT_REPAIR
A bounded review MUST NOT silently repair an incomplete interface using unrelated
chats, memory, live repository state, hidden workspace state, or external evidence
that is not an authorized review input. Missing material remains missing.

### RF-IR-005 — PREFLIGHT_BEFORE_SEMANTIC_ADJUDICATION
The reviewer MUST determine whether the review interface and evidence are competent
before judging candidate semantics. Review-interface defects and candidate defects
MUST remain distinguishable.

### RF-IR-006 — COMMON_ASSESSMENT_DIMENSIONS
The protocol MUST define reusable assessment dimensions covering at least authority
and scope fidelity, requirement/criteria coverage, semantic correctness, invariant
preservation, evidence correspondence, compatibility with controlling contracts,
scope leakage, and explicit limitations. Task-specific criteria MAY refine these
dimensions but MUST NOT rewrite their common semantics.

### RF-IR-007 — VALIDATION_IS_NOT_SEMANTIC_ACCEPTANCE
Deterministic validation PASS is evidence only. It MUST NOT substitute for semantic
Product assessment, Developer acceptance, implementation authority, integration,
publication, closure, or later-stage authority.

### RF-IR-008 — STRUCTURED_FINDINGS
Each material finding MUST identify the affected subject or requirement, evidence or
basis, observed issue, impact/corrective significance, classification, and severity.
Finding vocabulary MUST be versioned by the reusable protocol.

### RF-IR-009 — EXPLICIT_LIMITATIONS
NOT_RUN, UNAVAILABLE, unresolved, unsupported, or insufficient checks MUST remain
explicit. They MUST NOT be coerced to PASS or silently omitted when material to the
review conclusion.

### RF-IR-010 — VERDICT_SEMANTICS
The protocol MUST define stable versioned verdict semantics:
- PASS: semantic review completed successfully for the supplied bounded interface;
- FAIL: one or more material candidate defects require candidate correction and a
  new frozen review subject before a later review can supersede the failed evidence;
- BLOCKED: competent semantic adjudication cannot be completed because the supplied
  review interface/evidence is materially incomplete, inconsistent, ambiguous, or
  otherwise incompetent.
PASS grants no Developer acceptance. FAIL is a candidate disposition, while BLOCKED
is a review-interface/evidence disposition and MUST NOT falsely reject candidate
semantics that could not be adjudicated.

### RF-IR-011 — READ_ONLY_INDEPENDENCE
Independent Review MUST remain read-only. The reviewer MUST NOT implement, repair,
mutate, stage, commit, integrate, publish, or otherwise change the reviewed candidate.

### RF-IR-012 — DEVELOPER_ACCEPTANCE_SEPARATION
A review verdict MUST grant no Developer acceptance, integration/publication
authority, lifecycle closure, implementation authority, or next-stage authority.

### RF-IR-013 — TASK_SPECIFIC_INSTANTIATION
A task-specific review instance MUST provide only responsibility-specific authority,
scope, criteria, candidate, evidence, and explicitly declared deviations or
extensions. Common protocol semantics MUST be referenced rather than re-authored.

### RF-IR-014 — HISTORICAL_REVIEW_PRESERVATION
Completed reviews MUST remain immutable historical evidence. Correction or re-review
MUST create a new review identity or version and MUST NOT rewrite an earlier FAIL,
BLOCKED, limitation, or finding into a later state.

### RF-IR-015 — NO_DETERMINISTIC_SUBSTITUTE
Mechanical integrity, identity, parser, manifest, or preflight checks MAY support the
review but MUST NOT replace semantic judgment where semantic assessment is required.

## 5. Non-functional requirements

### RNF-IR-001 — PROVIDER_NEUTRAL
The protocol MUST remain provider-independent.

### RNF-IR-002 — HARNESS_NEUTRAL
The protocol MUST remain harness-independent and MUST NOT require conversational
continuity.

### RNF-IR-003 — FAIL_CLOSED_ON_MATERIAL_REVIEW_INTERFACE_AMBIGUITY
Material ambiguity in candidate identity, authority, scope, criteria, or evidence
correspondence MUST block semantic adjudication rather than be repaired by inference.

### RNF-IR-004 — GENERATED_TEMPLATES_CREATE_NO_AUTHORITY
Templates, generated review requests, packages, manifests, or reports MUST create no
Product authority by their existence.

### RNF-IR-005 — NO_CONVERSATIONAL_MEMORY_DEPENDENCY
A fresh competent reviewer MUST be able to perform the bounded review from explicit
review inputs without reconstructing originating chat history or hidden memory.

## 6. Finding semantics

The reusable protocol MUST version a finding model with, at minimum, these
classifications:
- CANDIDATE_DEFECT: the frozen subject conflicts with applicable authority,
  requirements, criteria, or invariants;
- REVIEW_INTERFACE_DEFECT: the supplied review boundary is materially incomplete,
  inconsistent, ambiguous, or mismatched;
- EVIDENCE_LIMITATION: a required or relevant check is NOT_RUN, UNAVAILABLE,
  unsupported, or insufficiently evidenced;
- OBSERVATION: a supported non-defect fact relevant to the bounded conclusion.

Severity MUST distinguish at least BLOCKING, MATERIAL, and ADVISORY significance.
The protocol implementation MUST define deterministic vocabulary meaning but MUST NOT
mechanically decide semantic severity or verdict from keywords alone.

## 7. Preflight and semantic assessment

Before semantic adjudication, a review MUST establish:
1. exact review identity and exact immutable subject;
2. competent authority and bounded scope;
3. applicable requirements/criteria;
4. supplied validation/evidence identity and correspondence;
5. reviewer read-only authority and declared input boundary;
6. material limitations, missing evidence, or contradictions.

If preflight is materially incompetent, the review returns BLOCKED without silently
repairing inputs. If competent, the reviewer performs semantic assessment against the
common dimensions plus responsibility-specific criteria and records structured
findings and limitations before assigning a verdict.

## 8. Task-specific instantiation contract

A review instance MUST identify the reusable protocol version and supply:
- review_id and reviewer responsibility;
- authority_refs and bounded review scope;
- exact candidate identity/reference;
- requirement or acceptance-criteria references;
- validation/evidence references and their subject correspondence;
- declared task-specific assessment questions;
- declared deviations, if any, with competent authority;
- output identity for the immutable review result.

An instance MAY narrow irrelevant common dimensions only when the protocol permits the
dimension to be inapplicable and the reason is explicit. It MUST NOT redefine PASS,
FAIL, BLOCKED, finding classes, read-only independence, or Developer separation.

## 9. Compatibility and authority boundaries

This responsibility specializes existing WP003 REVIEW semantics; it does not replace
the six-artifact SDD model, create a seventh artifact kind, or create a second
lifecycle. REVIEW continues to identify the exact frozen candidate, validation
evidence, and independent assessment. The current reviewer profile remains read-only
and provider-neutral.

Deterministic checks may verify package integrity, manifest correspondence, identity
shape, or other mechanical facts. Those checks remain Validator evidence and cannot
perform semantic review.

## 10. Deferred debt preserved

F03_CONTEXT_EVIDENCE_IDENTITY, F07_GENERIC_ENVIRONMENT_PREPARATION,
F08_EXECUTION_RECORD_CRASH_DURABILITY, and F09_TEST_ORCHESTRATION remain
DEFERRED_UNTIL_NATURAL_TRIGGER under their accepted Stage-D characterization.
They are not implementation backlog for WP-PB-001.

## 11. Work-package exit gate

WP-PB-001 can later close only when accepted implementation evidence demonstrates:
- one reusable versioned semantic review protocol;
- provider and harness independence;
- exact candidate identity and explicit supplied evidence/scope;
- distinguishable candidate defects versus review-interface defects;
- reusable structured finding and verdict semantics;
- deterministic validation preserved as evidence only;
- read-only independent reviewer behavior;
- Developer acceptance preserved as a separate human authority dimension;
- no mandatory provider or Recipe dependency;
- no deterministic semantic reviewer.

## 12. Candidate acceptance boundary

This document remains CANDIDATE. Independent Review has not run; Developer acceptance
is not granted; implementation has not started. A later accepted definition may
authorize bounded WU implementation only through a separate explicit Developer
decision. Stage D remains nonterminal and Stage E remains not entered.
