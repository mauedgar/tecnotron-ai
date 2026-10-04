---
document_id: TEC-ARCH-KNOWLEDGE-OWNERSHIP-BASELINE-001
status: canonical
machine_context: true
version: 1.1
updated: 2026-10-04
owner: tecnotron-ai
type: architecture
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture]]"
  - "[[operational-architecture]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[capability-map]]"
---

# Architecture, knowledge and capability ownership baseline

## 1. Authority and scope

This document materializes the active Developer ruling for:

```yaml
TaskCycle: TASKCYCLE-TECNOTRON-ARCHITECTURE-KNOWLEDGE-OWNERSHIP-SOT-RECONCILIATION-001
responsibility: MATERIALIZE_RECONCILED_ARCHITECTURE_KNOWLEDGE_AND_CAPABILITY_OWNERSHIP_SOT
Developer_reconciliation_ruling: GRANTED
implementation_refactor_authorized: false
canonical_integration_authorized: false
remote_publication_authorized: false
Phase_2_authorized: false
```

It is the thin current decision layer for architecture direction, capability
ownership, knowledge ownership, continuation semantics and unresolved gates.
It does not rewrite frozen historical frontmatter, manufacture acceptance for
older TaskCycles, or change runtime behavior.

Evidence classes used by this reconciliation are:

```text
DEVELOPER_RULING
CANONICAL_REPOSITORY_FACT
SUPPLIED_WORK_FINDING
EXTERNAL_RESEARCHED_FACT
INFERENCE_HYPOTHESIS
RECOMMENDATION
UNKNOWN
```

Only `DEVELOPER_RULING` establishes the adopted Product direction recorded here.
Canonical repository facts describe the baseline. Work findings, research and
inference remain supporting evidence unless separately adopted.

## 2. Stable Product invariants retained

Tecnotron retains:

- explicit Developer authority and grants;
- separation of authority from execution, validation, review, acceptance,
  integration, publication, reconciliation and closure;
- portable responsibility, subject and effect identity;
- independent semantic review with immutable review subjects;
- `NONE` / `CONFIRMED` / `UNKNOWN` effect semantics;
- retry blocking while a prior effect is unreconciled;
- Git as owner of code identity, history and remote refs;
- repository SOT as durable Product knowledge;
- useful existing Recipes and Git execution qualification;
- the frozen review contract;
- explicit environment/harness binding profiles;
- historical provenance and evidence/cutoff discipline.

These semantics must survive replacement of any current LLM, harness, workspace,
session provider or execution surface.

## 3. Architecture direction and physical-disposition boundary

The adopted direction is responsibility/ownership reconciliation, not a physical
deletion order.

| Capability/component | Current direction | Physical disposition |
| --- | --- | --- |
| AgentRuntime / AgentMVP | NARROW | HOLD_PENDING_CONSUMER_INVENTORY |
| Router | NARROW | HOLD_PENDING_CONSUMER_INVENTORY |
| ModelResolver / FinOps | NARROW | HOLD_PENDING_CONSUMER_INVENTORY |
| ContextPackager | NARROW | HOLD_PENDING_CONSUMER_INVENTORY |
| repo-packager | NARROW | HOLD_PENDING_CONSUMER_INVENTORY |
| Operational Spine / Coordinator | NARROW | HOLD_PENDING_CONSUMER_INVENTORY |
| State Kernel usage | NARROW | final disposition UNDECIDED |
| Primitives as a named subsystem | NARROW | do not create a catalog without repeated need |
| Explorer | ABSORB_CONDITIONALLY | only after consumer/equivalence inventory |
| duplicate Lifecycle Controller concepts | ABSORB_CONDITIONALLY | no second lifecycle machine |
| context expansion as a separate subsystem | ABSORB_CONDITIONALLY | converge under context/continuation semantics |
| continuation snapshot parallel concepts | ABSORB_CONDITIONALLY | project the same semantic subject |
| RunStore / parallel state representations | ABSORB_CONDITIONALLY | only after ownership/equivalence evidence |
| Recipes with demonstrated bounded value | RETAIN | no generalization without a second need |
| Git execution qualification | RETAIN | extend only under exact conformance evidence |
| frozen review interface contract | RETAIN | transport mechanism remains replaceable |
| Project/environment bindings | RETAIN | profile/binding, not architecture service |
| Temporal / generalized orchestration | DEFER | no adoption in this TaskCycle |
| devBrain | DEFER / INACTIVE | reopen only for a concrete repo-SOT insufficiency |

No row authorizes file deletion, runtime refactor, migration or backend change.

## 4. Capability ownership — reuse before build

Tecnotron owns Product-specific semantics that external tools do not know:
authority boundaries, responsibility/subject identity, effect reconciliation,
review semantics, consumer/action sufficiency and adopted decision records.

Existing tools own their native mechanics:

| Capability | Competent owner / boundary |
| --- | --- |
| commit/tree/blob/ref identity and history | Git / repository host |
| worktree mechanics | Git; workspace tools may add ergonomics |
| workspace/session UI | replaceable workspace/harness provider |
| bounded command execution | selected execution surface under an operating profile |
| source/file transport | existing file/repository/transport mechanisms |
| package bytes | materializer/transport utility; never Product authority |
| semantic Product review | independent reviewer responsibility, not a packaging tool |
| Product acceptance | Developer |
| durable Product knowledge | repository SOT |

A new Tecnotron component requires a precise missing capability, an identified
current owner, evidence that composition/adaptation is insufficient, and a
bounded maintenance justification.

## 5. State Kernel status

```yaml
State_Kernel:
  evaluation_direction: NARROW
  final_disposition: UNDECIDED
```

Required invariants remain:

- stable responsibility / Operation / attempt identity;
- `NONE` / `CONFIRMED` / `UNKNOWN` effect state;
- retry blocking while an effect remains unreconciled;
- authority and evidence linkage;
- recovery without inventing a new attempt;
- auditability.

This baseline authorizes none of:

```text
Kernel shutdown
Kernel migration
SQLite adoption
Temporal adoption
smaller-ledger implementation
history rewrite
```

Future equivalence evaluation must exercise the same failure/recovery cases
against any candidate owner before migration or removal. Read-only reasoning and
documentation work must not be forced to create operational ledger events merely
to continue.

## 6. One semantic continuation model

Existing terms converge conceptually without creating a new store or schema.

```yaml
semantic_continuation:
  responsibility:
  subject_identity:
  authority:
  current_gate:
  obligations:
  last_terminal_result:
  evidence_refs:
  uncertainty:

consumer_projection:
  consumer:
  intended_action:
  required_evidence:
  coverage:
  sufficiency:
  missing_context:

volatile_carrier_observation:
  include_only_if_action_requires_it:
    - local_root
    - ref_HEAD
    - porcelain
    - local_content_identity
    - process_or_session_state
```

Vocabulary:

- `ContextBundle` = transport bytes + manifest.
- semantic caller / equivalent reasoning layer = forms semantic evidence
  requirements, interprets acquired evidence, decides semantic action sufficiency
  and decides whether more context is required.
- `Context Materializer` = exact acquisition/materialization of requested evidence.
- `ContextPackager` = deterministic coverage, budget, fallback, missing-coverage
  reporting and telemetry against declared requirements; it does not invent the
  complete semantic requirement set or decide final action sufficiency.
- `repo-packager` = mechanical repository materializer for declared requests;
  Repomix is optional and external where selected, not Product authority.
- `SemanticHandoff` / `TaskContextProjection` = consumer/action projection of
  the same semantic continuation.
- `TaskCycle envelope` = identity/authority/gate projection of that same subject.
- `operational snapshot` = a materialized view, not an independent mutable truth.
- `volatile carrier observation` = action-time evidence only.

Two sufficiency dimensions remain explicit:

```yaml
coverage_sufficiency:
  owner: deterministic_packaging/materialization_layer
  question: were the declared evidence requirements mechanically covered?

action_sufficiency:
  owner: semantic_caller_or_equivalent_reasoning_layer
  question: is the resulting context semantically sufficient for the intended action?
```

`coverage_sufficiency=COMPLETE` does not imply
`action_sufficiency=SUFFICIENT`. Semantic work may expose a new material
question after complete declared coverage.

Progressive acquisition therefore follows:

```text
initial context
-> semantic work
-> material question
-> explicit ContextExpansionRequest
-> exact incremental acquisition
-> continue without rebuilding the baseline
```

The portable Product concept is incremental exact context expansion. A dedicated
`context-delta-xform` implementation is not required to own it, and direct
Git/repository/Web/file materialization remains valid when capability and
correspondence are competent.

## 7. Knowledge authority model

Repository SOT is the durable Product knowledge owner.

```yaml
knowledge_reconciliation:
  authoritative:
    - explicit Developer rulings materialized in competent repository decision/SOT sources
    - canonical contracts and accepted Product artifacts within their scope
  active_decisions:
    - this architecture/knowledge/capability ownership baseline
  active_operating_profiles:
    - ChatGPT_Web
    - ChatGPT_Work
    - OpenCode
    - Orca
    - Commander
  validated_recipes:
    - retain existing Recipes only within their evidenced scope
  validated_primitives:
    - helpers/guards only where competent evidence exists
  supporting_findings:
    - research and experiment results with source, cutoff and authority scope
  historical_only:
    - closed TaskCycles and superseded operating/profile assertions
  superseded:
    - stale active navigation explicitly replaced by a later ruling
  unresolved:
    - final State Kernel disposition
    - historical-module consumer inventory before absorption/removal
    - installed harness conformance when a future action depends on it
    - exact WP-PB-001 WU01 ruling/terminal evidence before any continuation
    - exact root cause of the FitFlow result-summary divergence
```

Knowledge types remain distinct:

- Experiment/Evidence → an occurrence in a bounded environment.
- Finding → a scoped interpretation.
- Decision Record → an adopted Developer decision.
- Operating Profile → an environment/harness procedure and conformance boundary.
- Recipe/Primitive → reusable deterministic procedure/guard under its contract.
- ADR → adopted architectural decision with explicit authority and alternatives.

Research does not become an ADR by being useful. Chat history, Memory, Library,
session history and workspace state are not durable Product knowledge owners.

## 8. Operating profiles and transport dispositions

Operating profiles are replaceable. They describe how an action may be carried
out; they do not become core Product architecture or Product authority.

| Surface/mechanic | Classification | Current role | Authority |
| --- | --- | --- | --- |
| ChatGPT Web | ACTIVE_OPERATING_PROFILE | reasoning, review/control coordination where appropriate | NONE |
| ChatGPT Work | ACTIVE_OPERATING_PROFILE | multistep research/planning/artifact work where appropriate | NONE |
| OpenCode | ACTIVE_OPERATING_PROFILE | bounded worker/execution surface when selected and conformed | NONE |
| Orca | ACTIVE_OPERATING_PROFILE | workspace/session ergonomics and locator functions | NONE |
| Commander | ACTIVE_OPERATING_PROFILE | thin transport, bounded already-determined execution, exact result collection and mechanical reconciliation | NONE |
| MAT-XFORM / XForm | TEMPORARY_EXECUTION_MECHANIC | deterministic transport validation, exact extraction, framing/manifest/filename/byte/hash checks | NONE |
| closed envelope + explicit manifest + literal boundaries + artifact IDs + exact filenames + deterministic extraction + post-transport hash verification | PORTABLE_PRODUCT_CONTRACT | transport-integrity discipline independent of carrier | NONE |

Commander is execution/result-only. It is not a semantic repository, source,
architecture, implementation-discovery, editing or Product-adjudication surface.
MAT-XFORM is a mechanical transport utility, not a Tecnotron semantic subsystem.

Library and transport copies are carriers only. Successful transport does not
create Product truth.

## 9. Harness independence

The portability unit is `SEMANTIC_HANDOFF`, not chat history or harness session.

A future harness must be able to consume the same responsibility, subject
identity, authority, gate, obligations, evidence and uncertainty without relying
on hidden conversational continuity. Harness-specific session/process state is
attached only when the intended action needs it.

## 10. Historical and active-document policy

```yaml
historical_content: PRESERVE
frozen_frontmatter: DO_NOT_RETROACTIVELY_REWRITE
stale_active_assertions: SUPERSEDE_EXPLICITLY
current_navigation: RECONCILE
broad_historical_cleanup: DEFER
```

The earlier broad label `Roadmap/current-state -> SUPERSEDE` is narrowed to
`SUPERSEDE_STALE_ACTIVE_ASSERTIONS_ONLY`.

Historical presence never reactivates an old responsibility. A live index may
record a later ruling without rewriting the historical artifact that preceded it.

## 11. WP-PB-001 and FitFlow boundaries

```yaml
WP_PB_001:
  continuation: DEFERRED
  future_resume_requires:
    - exact_competent_WU01_ruling
    - exact_terminal_evidence
```

No WP-PB implementation or continuation is authorized by this reconciliation.

The FitFlow incident is retained only as supporting evidence:

```yaml
FitFlow_result_incident:
  type: RESULT_SUMMARY_VS_EXECUTION_LOG_DIVERGENCE
  root_cause: UNKNOWN
```

Architectural criterion: derived summaries should come from the same competent
structured execution record, or be reconcilable by exact identity. This baseline
does not repair FitFlow or attribute the incident to a specific Tecnotron Recipe.

## 12. Feedback/evaluation disposition

No new Feedback Recipe is adopted by default.

```yaml
feedback_evaluation:
  disposition: DEFER_OR_ABSORB_IN_EXISTING_MECHANISMS
  create_new_Recipe_only_if:
    - repeated_bounded_need_exists
    - existing_tools_scripts_profiles_are_insufficient
```

## 13. Unresolved gates

The following remain unresolved and must fail closed when a future action depends
on them:

1. final State Kernel disposition and equivalence evidence;
2. consumer inventory before physical absorption/removal of historical modules;
3. current installed harness versions/configuration/conformance;
4. exact competent WP-PB-001 WU01 ruling and terminal evidence before resume;
5. exact FitFlow summary generator/root cause before any corrective evolution;
6. any new capability whose current owner has not first been evaluated.

## 14. Future repo-first bootstrap

A fresh Product TaskCycle should reconstruct Product state in this order:

1. resolve `refs/heads/tools` and record exact commit/tree;
2. read `docs/SOURCE_OF_TRUTH.md`;
3. read this baseline;
4. read `docs/current-state.md`;
5. read only the responsibility-specific contracts/recipes/evidence referenced
   by those sources;
6. add volatile carrier/process observations only when the next action requires
   them;
7. obtain the exact current Developer ruling/responsibility for new authority.

Expected reconstruction shape:

```yaml
RECONSTRUCTION:
  canonical_anchor:
  architecture_baseline:
  Product_authority_sources:
  active_or_next_responsibility:
  current_gate:
  adopted_decisions:
  conditional_decisions:
  deferred_decisions:
  State_Kernel_status:
  knowledge_model:
  operating_profiles:
  unresolved_questions:
  required_volatile_observations:
  exact_next_action:
```

A historical ChatGPT transcript, Memory, session, giant Library capsule or
workspace history must not be required for a competent reconstruction.

## 15. SOT_RECONCILIATION_DELTA

Baseline:

```yaml
repository: mauedgar/tecnotron-ai
branch: refs/heads/tools
commit: 4515c16d65dfaf27b87c282865354070835b7509
tree: 9129d9a79f164386327a431e8db5d661fa8a2784
active_SOT_sources:
  - docs/SOURCE_OF_TRUTH.md
  - docs/architecture.md
  - docs/operational-architecture.md
  - docs/current-state.md
  - docs/implementation-roadmap.md
  - docs/capability-map.md
  - docs/context-strategy.md
```

Material changes:

| Subject | Target | Before | After | Type | Authority | Historical preservation | Future bootstrap value |
| --- | --- | --- | --- | --- | --- | --- | --- |
| architecture/knowledge ownership | this file + SOT index | distributed direction; no adopted reconciliation layer | one thin adopted baseline | ADD / NAVIGATION_CHANGE | DEVELOPER_RULING | yes | direct reconstruction |
| active responsibility | current-state / roadmap / README | WP-PB-001 presented as current next responsibility | SOT reconciliation is current; WP-PB deferred | SUPERSEDE_ACTIVE_ASSERTION | DEVELOPER_RULING | prior wording remains Git history | avoids false continuation |
| capability ownership | baseline / capability map | implementation presence often read as current ownership | RETAIN/NARROW/ABSORB_CONDITIONALLY/DEFER separated from physical state | CLASSIFICATION_CHANGE | DEVELOPER_RULING + canonical facts | yes | reuse-before-build |
| State Kernel | baseline / current-state | accepted substrate commonly shown as central operational layer | evaluation direction NARROW; final UNDECIDED; invariants preserved | UPDATE | DEVELOPER_RULING | implementation/history untouched | prevents inferred migration |
| context/handoff | baseline | compatible concepts existed under multiple names | one semantic continuation + consumer projection + volatile observation distinction | UPDATE | DEVELOPER_RULING + existing context policy | yes | portable bootstrap |
| knowledge owner | baseline / SOT | repository already canonical, but external handoffs still needed for reconstruction | repository SOT explicitly durable owner; Library/chat/session transport only | UPDATE | DEVELOPER_RULING | yes | removes giant-handoff dependency |
| operating surfaces | baseline | replaceability stated, current ownership dispersed | explicit profiles plus XForm/Commander/transport classifications | CLASSIFICATION_CHANGE | DEVELOPER_RULING | yes | harness independence |
| historical navigation | roadmap/current-state/capability-map/README | stale active WP-PB assertions | explicitly superseded as active only | SUPERSEDE_ACTIVE_ASSERTION | DEVELOPER_RULING | frozen/history untouched | current navigation |
| feedback | baseline | candidate new Recipe direction existed in supporting planning | defer/absorb; new Recipe only after repeated uncovered need | UPDATE | DEVELOPER_RULING | yes | prevents component sprawl |

Unchanged but revalidated:

- `docs/architecture.md` stable authority/harness-independence principles;
- `docs/context-strategy.md` semantic handoff, provenance, cutoff and sufficiency
  semantics;
- independent review protocol semantics and frozen-review contract;
- current Recipes and Git qualification as implementation/evidence, not proof of
  universal ownership;
- historical artifacts and frozen frontmatter.

Explicitly deferred:

- State Kernel final disposition or backend change;
- runtime/module refactor or removal;
- Temporal, SQLite or smaller-ledger adoption;
- broad historical cleanup;
- WP-PB continuation;
- FitFlow repair;
- new Feedback Recipe/Primitive;
- installed harness conformance not needed by this documentation candidate.

## 16. BOOTSTRAP_GAP_LEDGER

| Question | Why current repo baseline was insufficient | External source used | Evidence class | Result | Future disposition | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| What architecture/knowledge direction is adopted now? | pre-task repo predates the ruling | current Developer TaskCycle request | DEVELOPER_RULING | adopted direction materialized in this baseline | INCORPORATE_IN_SOT | future consumers need the decision |
| Why these ownership dispositions? | repository shows implementations but not the large reconciliation reasoning | `TECNOTRON-WORK-LARGE-RECONCILIATION-PLAN-2026-10-04-001.md`, cutoff 2026-10-04 | SUPPLIED_WORK_FINDING | used as supporting decision substrate only | KEEP_EPHEMERAL except adopted conclusions/source register references | research is not authority and need not become a second SOT |
| What are current XForm/Commander/transport dispositions? | not fully represented in pre-task SOT | current Developer continuation ruling | DEVELOPER_RULING | classified without semantic promotion | INCORPORATE_IN_SOT as operating-profile/transport boundaries | future execution needs the boundary, not chat history |
| Are current installed Orca/OpenCode versions/conformance known? | repo records configs/history, not current installation truth | none acquired; not needed for this candidate | UNKNOWN | unresolved | KEEP_AS_OPERATING_PROFILE with future re-observation | avoid unnecessary local probing |
| What is exact WP-PB WU01 terminal authority/evidence? | repo contains frozen candidate metadata and stale navigation but exact later ruling is not established here | none acquired because continuation is deferred | UNKNOWN | explicit future gate | DO_NOT_PRESERVE as guessed truth; require exact future acquisition | prevents inferred acceptance/closure |
| What caused the FitFlow summary/log divergence? | not established by Tecnotron repo or supplied planning evidence | supplied Work finding records only the incident | SUPPLIED_WORK_FINDING / UNKNOWN | root cause remains unknown | KEEP_EPHEMERAL until traced | no defect attribution without evidence |

## 17. TASKCYCLE_HARNESS_FEEDBACK

```yaml
TASKCYCLE_HARNESS_FEEDBACK:
  evidence_class: SUPPORTING_EXPERIMENTAL
  context:
    repository_context_needed:
      - SOT_navigation
      - current_state
      - architecture_and_operational_architecture
      - capability_map
      - context_strategy
      - frozen_review_contract
    external_context_needed:
      - Developer_reconciliation_ruling
      - supplied_Work_plan_as_supporting_research
      - current_XForm_Commander_transport_ruling
    Work_plan_sections_actually_used:
      - evidence_discipline
      - canonical_reconstruction
      - capability_ownership
      - architecture_dispositions
      - State_Kernel_comparison
      - knowledge_reconciliation
      - context_handoff_convergence
      - reuse_before_build
      - source_register
    supplied_context_that_was_redundant:
      - detailed historical consumer chronology not needed to materialize the active baseline
    bootstrap_gaps_discovered:
      - current decision authority was outside the pre-task repository
      - exact WP_PB_WU01_terminal_authority remains intentionally unresolved
  SOT:
    information_that_should_have_already_been_in_repo:
      - current architecture/ownership decision layer
      - current responsibility rather than stale WP_PB navigation
      - explicit State_Kernel_UNDECIDED_status
      - portable operating_profile classifications
    information_that_should_remain_ephemeral:
      - chat/session continuity
      - local versions not required by the next action
      - full Work-plan reasoning once adopted conclusions are materialized
    navigation_failures:
      - several active documents still selected WP_PB_001
    duplicated_truth:
      - overlapping current-state/roadmap/capability assertions
    stale_assertions_found:
      - WP_PB_001_as_current_next_work
      - State_Kernel_as_unqualified_universal_operational_path
  handoffs:
    internal_handoff_effectiveness: "semantic fields are sufficient when authority/gate/evidence/unknowns are explicit"
    missing_fields: []
    redundant_fields:
      - full_transcript
      - harness_session_history_when_no_action_depends_on_it
    portability_across_harnesses: "target is semantic_handoff, not session portability"
  execution:
    semantic_vs_mechanical_boundary_issues:
      - candidate semantics must be settled before bounded execution
    execution_surface_friction:
      - current chat environment does not provide a networked local Git checkout for canonical Recipe execution
    transport_friction:
      - frozen review packaging must preserve exact Git object correspondence without granting authority
    frozen_review_materialization_friction:
      - reuse the existing contract; do not turn a one-off carrier utility into a Product subsystem
  ownership:
    capabilities_better_owned_externally:
      - Git_object_and_ref_mechanics
      - workspace_and_session_mechanics
      - generic_file_transport
    capabilities_that_remain_Tecnotron_specific:
      - authority_and_effect_separation
      - Product_identity_and_reconciliation
      - semantic_review_contract
      - context_sufficiency_for_consumer_action
    candidate_components_that_should_not_exist:
      - duplicate_session_manager
      - duplicate_workspace_manager
      - second_lifecycle_machine
      - new_snapshot_store_without_gap
  harness:
    ChatGPT_specific_dependencies_encountered:
      - conversation_supplied_Developer_ruling
    assumptions_that_would_fail_on_another_LLM:
      - hidden_chat_history_as_required_Product_context
    changes_needed_for_harness_independence:
      - materialize adopted rulings and unresolved gates in repository SOT
  future:
    what_the_next_fresh_chat_should_need:
      - repository_anchor
      - SOURCE_OF_TRUTH
      - this_baseline
      - current_state
      - exact_new_Developer_responsibility
    what_it_should_no_longer_need:
      - historical_chat_transcript
      - Memory
      - giant_Library_reconstruction_capsule
    recommended_repo_first_bootstrap_test:
      - reconstruct_from_repo_plus_exact_current_ruling_and_action_required_volatile_observations_only
```

## 18. Current gate

This reconciliation candidate must be independently reviewed before any
Developer acceptance, Phase 2, integration or publication.

```yaml
next_gate: INDEPENDENT_REVIEW
canonical_Product_effect_from_candidate_creation: NONE
```
