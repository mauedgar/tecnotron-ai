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
deletion order. Consumer inventory was reconciled at exact repository anchor
`c7c68f0b0f20b6bc722d2201f7a3ad7adf995736` /
`e0218ac280d4bc4cfdd49d42c24939bc80507521` by
`TASKCYCLE-TECNOTRON-ACTIVE-CONSUMER-INVENTORY-RECONCILIATION-001`.

| Capability/component | Current direction | Reconciled current consumers | Physical-disposition candidate |
| --- | --- | --- | --- |
| AgentRuntime / AgentMVP | NARROW | PARTIALLY_ACTIVE — AgentMVP directly invokes AgentRuntime; AgentMVP has unit/integration consumers but no current top-level Product script/Recipe/lifecycle entrypoint was found | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| Router | NARROW | PARTIALLY_ACTIVE — direct AgentMVP library consumer plus current tests | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| ModelResolver / FinOps | NARROW | PARTIALLY_ACTIVE — AgentMVP invokes ModelResolver; ModelResolver invokes FinOps; current tests exercise both | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| ContextPackager | NARROW | PARTIALLY_ACTIVE — AgentMVP requires its contract and current tests execute it; no concrete production materializer was established | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| repo-packager | NARROW | PARTIALLY_ACTIVE — ffai-doctor probes `pack.py --help`; the OpenCode skill exposes it as a mechanical materializer; exact installed-harness invocation remains dynamic | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| Operational Spine / Coordinator | NARROW | ACTIVE — `recipe:invoke`, stable Recipe invocation, built-in Recipes and Coordinator composition depend on it | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| State Kernel usage | NARROW | ACTIVE — current lifecycle persistence and stable Recipe invocation depend on it | NEEDS_EQUIVALENCE_BEFORE_CHANGE |
| Primitives as a named subsystem | NARROW | NO_ACTIVE_CONSUMER_FOUND — no concrete named `Primitives` subsystem artifact exists at this anchor; current docs use the term as capability vocabulary | SAFE_TO_EVALUATE_ABSORPTION |
| Explorer | ABSORB_CONDITIONALLY | PARTIALLY_ACTIVE — AgentMVP directly invokes `src/explorer`; the OpenCode `explorer` profile is a separate harness/profile concept, not a consumer of that module | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| duplicate Lifecycle Controller concepts | ABSORB_CONDITIONALLY | NO_ACTIVE_CONSUMER_FOUND — no duplicate runtime Lifecycle Controller artifact was found; `task-lifecycle.md` is transitional policy and explicitly not a second lifecycle machine | SAFE_TO_EVALUATE_ABSORPTION |
| context expansion as a separate subsystem | ABSORB_CONDITIONALLY | NO_ACTIVE_CONSUMER_FOUND — no separate subsystem artifact was found; incremental expansion remains context semantics and bounded counters | SAFE_TO_EVALUATE_ABSORPTION |
| continuation snapshot parallel concepts | ABSORB_CONDITIONALLY | PARTIALLY_ACTIVE — the deterministic continuation module has a current CLI consumer and tests; unrelated State Kernel snapshots and Recipe handoff snapshots are distinct mechanics | ACTIVE_CONSUMER_BLOCKS_PHYSICAL_CHANGE |
| RunStore / parallel state representations | ABSORB_CONDITIONALLY | NO_ACTIVE_CONSUMER_FOUND — `RunStore` is re-exported and tested, but no current runtime/script/Recipe/lifecycle caller was found | SAFE_TO_EVALUATE_ABSORPTION |
| Recipes with demonstrated bounded value | RETAIN | ACTIVE — stable Recipe invocation resolves and executes current built-ins | no generalization without a second need |
| Git execution qualification | RETAIN | ACTIVE through bounded Recipe/integration mechanics | extend only under exact conformance evidence |
| frozen review interface contract | RETAIN | ACTIVE through current review-freeze mechanics | transport mechanism remains replaceable |
| Project/environment bindings | RETAIN | ACTIVE as explicit profiles/bindings | profile/binding, not architecture service |
| Temporal / generalized orchestration | DEFER | no current consumer required for this inventory | no adoption in this TaskCycle |
| devBrain | DEFER / INACTIVE | no current Product consumer established | reopen only for a concrete repo-SOT insufficiency |

Negative conclusions above cover current source imports/symbol references, scripts,
package/configuration, built-in Recipes, tests, lifecycle evidence and active
documentation at the exact anchor. Historical planning/provenance references were
not counted as active consumers. Direct dynamic invocation outside declared repo
entrypoints cannot be universally excluded; installed-harness conformance is
therefore still required before a future repo-packager/harness absorption decision.

No row authorizes file deletion, runtime refactor, migration, dependency removal,
backend change or final architecture disposition.

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
2. component-specific equivalence/disposition decisions where the reconciled inventory reports active or partially active consumers;
3. exact installed-harness versions/configuration/conformance before a future repo-packager or harness-bound absorption decision;
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


## 16. Upper LC v1 — bounded Product adoption reconciliation

**Adoption boundary.** This section represents the Product decision proposed by
`TASKCYCLE-TECNOTRON-UPPER-LC-V1-PRODUCT-ADOPTION-001`. It takes canonical
effect only after exact-candidate Independent Review, distinct Developer
acceptance, authorized Phase 2 and confirmed integration into `tools`.
The Developer's TaskCycle bootstrap authorized producing and reviewing this
candidate, not accepting or integrating it. The originating DevLab architecture
remains supporting evidence, not an additional Product SOT.

Evidence: `TECNOTRON-CONTROL-003-UPPER-LC-PRODUCT-ADOPTION-HANDOFF-2026-10-07-001`,
`TS-DEVLAB-UPPER-LC-FORK-RETURN-RECONCILIATION-2026-10-07-001`,
`TS-EXECUTION-ENGINEERING-RETURN-CAPSULE-2026-10-07-001`, and the
`docs/SOURCE_OF_TRUTH.md` precedence index at base
`c60804e167d67a08a025b77328aefff26dd3b27d`. These references identify
source/cutoff only; they do not import noncanonical authority.

### 16.1 Exact Upper LC contract dispositions

| Upper LC v1 contract | Product disposition | Existing owner and bounded Product delta |
| --- | --- | --- |
| Lifecycle Identity / Receipt Map | **ADOPT** | Keep Product work item, responsibility, stable Product Operation, ExecutionAttempt and provider run distinct. Correlate exact subjects, authority, effects and receipts through existing Git / lifecycle evidence; **no new ledger, aggregate or persistence engine**. |
| Capability / Asset Index | **ADAPT** | Reuse `docs/capability-map.md` as a derived navigation projection, plus exact qualified external capability references. Reuse-before-build and current owner evidence precede addition of a component. No authoritative index service or duplicated catalog. |
| Actor Model vNext | **ADOPT** | Product Control and Developer remain outside ordinary Actors. Actor responsibility/semantic ceiling is distinct from replaceable model, agent, harness and execution bindings. A sophisticated binding cannot select work, grant authority or accept. |
| Portable Handoff | **REUSE** | Existing semantic continuation and `docs/context-strategy.md` already own action-relative responsibility, subject, authority, gate, obligations, evidence, uncertainty and cutoff. References are preferred over transcript reconstruction; carrier/session state is attached only if required. |
| Field Ownership Map | **ADOPT** | Developer owns required grants/acceptance; Product Control owns responsibility/admission/next-work and post-close decisions; semantic Actors own bounded judgments; deterministic Recipes/bindings execute already authorized mechanics; Git owns object/ref truth; repository SOT owns Product knowledge; GitHub Issues/Projects owns operational projection only after promotion. |
| Horizontal Context Control | **REUSE** | The semantic caller forms evidence requirements and action-sufficiency judgment; deterministic ContextPackager/materializers measure declared coverage. Exact incremental acquisition replaces context rebuild when new material questions emerge; no generic context service. |
| GitHub Issues / Projects Operational Projection | **ADOPT** | After competent Product promotion, optionally project operational backlog, milestone, spec, task, dependency, evidence and status into the provider. No board-to-worker auto-launch, Product authority transfer, automatic backlog admission or inferred acceptance. Provider-specific field mappings remain separate qualification work. |
| Feedback / Observability Normalization | **ADAPT** | Normalize signals from existing exact execution results, receipts, validation, review, UNKNOWN recovery and follow-up findings. Provenance and actual outcome govern; no new telemetry platform, mandatory observer Recipe or automatic policy update. |
| Post-Close Reconciliation | **ADOPT** | After confirmed logical close, reconcile findings, deferred evidence and `CONTROL_DELTA` for Product Control to choose later work. A PASS-class advisory finding does not reopen the reviewed candidate, create a TaskCycle, or automatically become backlog/milestone authority. |
| TC Core v1 | **PRESERVE** | `DOD: PASS`; `FROZEN_MAINTENANCE`; no reopening evidence. Upper LC is a policy/control layer around the Core, not a second lifecycle machine or redefinition of accepted gates. |

Dispositions specialize existing Tecnotron owners; they do **not** authorize
physical component replacement, broad cleanup, kernel removal, effectful execution
or adoption of all DevLab experiments. The historical transition remains:
research/framing and optional planning → competent Product Control selection →
bounded Actor/context/capability/handoff → existing TaskCycle Core →
post-close CONTROL_DELTA. No globally mandatory artifact format is introduced by
this ordering. Existing Milestone → Spec → Task authority retains its competent
scope; an experimental DoD does not replace it.

### 16.2 Runner and autonomous-binding qualifications

```yaml
Execution_Runner_v0_2:
  disposition: REUSE
  qualified_source: mauedgar/ts-execution-lab
  qualified_commit: 083d3b96f533e246c6f6fb58a0e1a7efdc431c31
  role: OPTIONAL_QUALIFIED_EXTERNAL_EXECUTION_CAPABILITY
  qualified_profiles:
    - canonical-sha256/v0
    - git-exact-subject/v0
  Tecnotron_specific_binding_conformance: NOT_ESTABLISHED
  effectful_profiles: NOT_QUALIFIED
  Product_semantics: OUTSIDE_RUNNER
  automatic_retry: FORBIDDEN
  generic_orchestrator_created: false
  automatic_Tecnotron_runtime_migration: false
```

Its JSON/Zod/TypeScript runner, local/Actions bindings, stable request identity
and portable results may be reused when the actual requested profile and runtime
have competent correspondence. Lab qualification alone cannot certify a
Tecnotron-specific effectful operation, choose an ExecutionAttempt, reconcile
UNKNOWN, or create Product authority. This disposition **does not** install or
invoke the runner.

`BOUNDED_AUTONOMOUS_EXECUTION@v0`, `CHATGPT_WEB_AUTONOMOUS_BINDING@v0`,
the experiment-specific DoD and same-chat semantic-review observations remain
**DEFERRED empirical evidence** rather than Actor policy, unconditional review
independence, universal DoD, conditional auto-acceptance or a mandatory binding.
Any review still needs its actual frozen interface and applicable independence
contract.

### 16.3 Unselected refinements and retention

The following are **DEFER** / Product-specific future qualification, not
adoption blockers: framing schema and planning optionality; context
serialization, freshness, retention and compaction; GitHub provider fields;
Post-Close policy edge cases; feedback retention/threshold/failure taxonomies;
Obsidian UI metadata projection; installed Tecnotron Runner conformance.
Each needs demonstrated consumer demand and separate authority before any
implementation. Findings remain traceable as evidence rather than being
automatically promoted into Product backlog or milestones.

Earlier baseline statements remain historical at their exact cutoffs. This
section supersedes only their **active navigation** where they represented
Upper LC lifecycle identity/receipts or Post-Close as not yet adopted. It does
not supersede unresolved State Kernel disposition, consumer guards, harness
conformance, WP-PB-001 or the FitFlow incident.

### 16.4 External-review independence binding — bounded qualification candidate

This clause is a **proposed Product qualification**, bounded by
`TASKCYCLE-TECNOTRON-AUTONOMOUS-INDEPENDENT-REVIEW-QUALIFICATION-001`.
It has no Product effect unless the exact candidate receives a genuinely
separate Independent Review, distinct Developer acceptance and confirmed
Phase 2 on `tools`. It neither adopts the deferred `WP-PB-001` WU01
candidate nor invents a second general review protocol. The existing accepted
WP003 REVIEW authority and the adopted Upper LC v1 Actor/field-ownership
dispositions control; `materialize_frozen_review_interface@v0` supplies
transport mechanics, never a semantic verdict.

**Binding contract.** A `QUALIFIED_INDEPENDENT_REVIEW_BINDING` may be
asserted **for one declared provider/context profile only** when all of the
following are evidenced, not merely promised by a launch prompt:

1. A frozen interface declares one exact repository, candidate commit/tree,
   parent(s), changed scope, applicable Product authority/criteria, review
   request, explicit evidence inventory, declared deviations and transport
   SHA-256/size/entry count. Its contents and correspondence are checked
   before semantic assessment. Mutable branch names are only locators.
2. The reviewer is invoked in a **fresh, separate review context**, without
   originating implementation/control conversation, ChatGPT Memory or prior
   reviewer judgments as implicit evidence. The invocation input is the
   frozen interface and a minimal hash-bound launch instruction, not a
   mutable implementation worktree. Any missing applicable context is
   `BLOCKED`; the reviewer must not rediscover or reconstruct it secretly.
3. The declared inventory is exhaustive for adjudication. Unlisted mutable
   implementation scratch, secrets, sessions and unqualified external
   repository state are excluded. The reviewer is read-only and may not
   repair, commit, publish or acquire Product authority.
4. The resulting semantic report identifies its own unique review ID and the
   exact candidate/tree and frozen-interface digest that it consumed.
   A hash check is an identity/integrity proof, **not** a substitute for
   semantic assessment or for observed provider isolation.
5. `PASS`, `FAIL` and `BLOCKED` stay distinct: incompetent interface or
   acquisition gives `BLOCKED`, a competently evidenced candidate defect
   gives `FAIL`, and completed competent assessment with no blocking
   candidate defect can give `PASS`. Validation has a separate status.
6. A `PASS` carrying advisories preserves every original finding and
   limitation as review evidence / possible `CONTROL_DELTA`, without
   automatically promoting backlog, triggering repair or implying Product
   acceptance. Reviewer output cannot authorize Developer acceptance,
   Phase 2, integration or close.
7. Candidate mutation demands a **new** exact frozen subject and review
   identity. The previous review remains immutable; it cannot be relabeled.
8. Re-review of the **same** candidate is permitted only for a documented
   competent reason (e.g. prior transport `BLOCKED` or a genuinely distinct
   needed assessment), with a fresh review identity and explicit linkage to
   preserved prior history. Chat interruption alone is not a retry reason.
9. The qualification receipt must distinguish observed independent-context
   isolation from merely instructed isolation and bind: provider/context
   profile, launch identity, frozen subject and archive digests, review ID,
   access limitations, actual verdict, findings, and later Product gate.
   `SAME_CHAT_NOT_EXTERNALLY_QUALIFIED` remains the truthful disposition
   of earlier Upper LC adoption / Pilot 002 reviews.

**Acceptance evidence and ceiling.** Evidence from a genuinely fresh
reviewer that reads the immutable frozen interface and emits an independently
bound semantic result is needed to finish this TaskCycle's qualification.
Deterministic fixtures may prove packaging, tamper detection, explicit
boundaries and verdict/authority separation, but cannot alone establish
semantic reviewer independence. The qualification never auto-accepts
a Product candidate and does not make its provider binding mandatory for
all TaskCycles. A transport failure must be repaired as a new interface
attempt without silently rerunning a prior semantic verdict.

**Historical fixture provenance (no re-adjudication).**
The original immutable review results
`IND-REVIEW-TECNOTRON-UPPER-LC-V1-PRODUCT-ADOPTION-001` and
`IND-REVIEW-TECNOTRON-LIFECYCLE-COMPAT-PILOT-002-001` both recorded
`PASS` with nonblocking findings, and both explicitly lacked separate
reviewer-context qualification. Their accepted subjects and CLOSED_PASS
terminal effects are not reopened or replaced by this clause.


### 16.5 Post-Close CONTROL_DELTA → deliberate planning admission (bounded Branch B candidate)

**Gate and ownership.** This clause is proposed by
`TASKCYCLE-TECNOTRON-POSTCLOSE-TO-PLANNING-BRIDGE-001`, selected within
`TASKCYCLE-TECNOTRON-UPPER-LC-V1-OPERATIONAL-COMPLETENESS-001`.
It becomes adopted Product guidance **only after its own exact candidate,
independent semantic review, distinct Developer acceptance and confirmed Phase 2**.
The adopted §16.1 Post-Close / Field Ownership Map, existing WP003
Milestone → Spec → Task contracts and `docs/task-lifecycle.md` continue to govern.
This clause is a semantic bridge, **not** a new backlog store, planning engine,
universal artifact format, lifecycle gate or automatic transition.

#### Distinct identities and states

```text
review finding / terminal CONTROL_DELTA (evidence)
  != possible Product backlog candidate (proposal)
  != explicitly promoted Product backlog work (accepted admission)
  != Milestone / Spec / Task (competently scoped planning artifacts)
  != initialized Product TaskCycle (separate assigned lifecycle)
```

A `CONTROL_DELTA` is a *read-only, derived, source-bound planning input*
from an actually confirmed logical close, or a separately identified
nonterminal finding with its accurate gate. Its minimum sufficient fields are:

- source TaskCycle and exact terminal / review / validation receipt references;
- stable finding identity, literal observed outcome, impact, resolved/unresolved
  classification, evidence references and observation cutoff;
- bounded suggested Product disposition or `UNDECIDED` (recommendation only);
- authority/decision reference **only when** an actual competent Control ruling
  exists; a target work identity only after an actual separately authorized
  promotion.

Projections may live within existing Control handoff/decision and repository SOT
artifacts, with references instead of duplicated source bytes. Transport and
external task-board state do not become Product authority. Keep the immutable
original finding even after a later decision or additive resolution receipt:
`PASS` with advisories is still `PASS` with those advisories.

#### Product Control dispositions

A competent Product Control reconciliation may explicitly classify **each**
finding without silently altering its original review or terminal evidence:

| Disposition | Product meaning and guard |
| --- | --- |
| `NO_ACTION` | No current corrective/planning action; retain source evidence and decision/cutoff. No deletion of historical finding. |
| `KEEP_AS_EVIDENCE` | Retain a traceable finding for later consumer-specific inspection. No backlog item or task. |
| `PROMOTE_TO_PRODUCT_BACKLOG` | **Requires a separate explicit competent promotion/admission decision** identifying the Product work and scope. The disposition string alone does not perform promotion. |
| `RETURN_TO_ARCHITECTURE_RESEARCH` | Return the specific unanswered question to the competent non-Product research line; no Product TaskCycle is selected by this routing. |
| `RETURN_TO_EXECUTION_ENGINEERING` | Return a bounded execution/binding experiment to its existing evidence line, with no implied Product write. |
| `BLOCKED_EXTERNAL` | Name exact missing provider/capability/evidence and current consumer; no inferred PASS, retry, workaround authority or automatic successor. |

`UNDECIDED` is a provisional **absence of a Control decision**, not a seventh
adopted disposition. Where an effect is `UNKNOWN`, reconciliation is required
*before* any further conditioned effect or promotion depending on it.

#### Competent promotion and planning route

A **promotion** is a separate, traceable Product Control/Developer decision,
not a transform performed by a reviewer, lifecycle close, board webhook,
`CONTROL_DELTA` aggregator or an LLM Actor. The competent decision must
identify at least: promotion authority reference; distinct Product work item
identity; evidence/provenance/cutoff; scoped problem and intended outcome;
required acceptance or further research before admission; and intended planning
route. Missing authority, unclear work identity, insufficient bounded scope, or
unresolved material `UNKNOWN` means **not promoted**.

After promotion, the competent planning owner selects exactly the level
appropriate for the *new* responsibility under existing policy:

1. **Direct bounded Task responsibility** — one well-defined, independently
   reviewable change with clear acceptance/effect boundary and a competent
   exception/assignment permitting it; does not waive ordinary gates.
2. **Spec → Task** — a distinct behavior/contract or several dependent changes
   need accepted requirements and Task decomposition under existing WP003 SDD
   semantics. A generated Spec is not accepted merely because it exists.
3. **Milestone → Spec → Task** — a genuinely coordinated Product objective with
   multiple Specs, dependencies or releases requires deliberate milestone-level
   authority and review; never auto-create a Milestone from an advisory or DoD.

No route is selected automatically from severity keywords, test PASS,
review PASS, experimental DoD or GitHub status. Backlog presence does not
initialize a TaskCycle. A competent new assignment and source baseline remain
necessary before an effect. Provider projections may be done only **after**
promotion, through their separately qualified mapping, and are not admissions.

#### Bounded empirical examples (no Product promotions performed)

- **Real evidence-only fixture:** `IR-A001-001-A01`, from accepted/terminal
  Branch A, reports that fresh external review context was observed but technical
  internal provider/harness-memory isolation was not independently attested.
  Control outcome for this fixture: `KEEP_AS_EVIDENCE`, with the original
  advisory and review SHA retained. This is not a new defect verdict or a
  Product backlog admission.
- **Hypothetical promotable fixture, explicitly NOT an actual Product action:**
  suppose a future reviewer interface measurably leaks mutable implementation
  scratch into the fresh reviewer context. That factual finding could become
  a backlog *candidate* and, if a competent later Product decision provides an
  exact work identity, outcome and scope, be promoted with a Spec → Task route.
  Without the promotion authority, its status stays `NOT_PROMOTED`;
  no issue, Milestone, Spec, Task or TaskCycle is created by this example.

This bridge does not adopt optional feedback retention thresholds, generic
orchestration, automatic board-to-worker launches, final State Kernel
disposition, WP-PB continuation or a universal backlog schema. Existing
post-close findings, including all four preserved Branch A advisories, remain
evidence until separately dispositioned by competent Product Control.
