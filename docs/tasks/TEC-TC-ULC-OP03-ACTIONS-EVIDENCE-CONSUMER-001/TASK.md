---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-ULC-OP03-ACTIONS-EVIDENCE-CONSUMER-001
artifact_kind: TASK
owner: tecnotron-ai
scope: QUALIFY_BOUNDED_NATIVE_ACTIONS_EVIDENCE_FOR_REAL_PRODUCT_CONTROL_CONSUMER
revision: "2026-10-24-001"
authority_refs:
  - ref: TECNOTRON-ULC-OP03-OP04-BOUNDED-CONTRACT-SELECTION-20261024-001
    revision: "2026-10-24"
  - ref: TECNOTRON-ULC-OP03-OP04-PRESTART-PLANNING-RELEASE-20261024-001
    revision: "2026-10-24"
coverage:
  kind: competent_exception
  exception_ref:
    ref: TECNOTRON-ULC-OP03-OP04-BOUNDED-CONTRACT-SELECTION-20261024-001
    revision: "2026-10-24"
requirement_refs:
  - source: {ref: TECNOTRON-ULC-OP03-OP04-BOUNDED-CONTRACT-SELECTION-20261024-001, revision: "2026-10-24"}
    id: RF-OP03-001
  - source: {ref: TECNOTRON-ULC-OP03-OP04-BOUNDED-CONTRACT-SELECTION-20261024-001, revision: "2026-10-24"}
    id: RF-OP03-002
  - source: {ref: TECNOTRON-ULC-OP03-OP04-BOUNDED-CONTRACT-SELECTION-20261024-001, revision: "2026-10-24"}
    id: RF-OP03-003
assignment_authority_ref:
  ref: TECNOTRON-ULC-OP03-OP04-BOUNDED-CONTRACT-SELECTION-20261024-001
  revision: "2026-10-24"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: 7a7225940aeaf1fbd16ac46ecd1cb76fa527ff56
  tree: 8caa56d36f3efeba359bbbf65b158ffb01a19da6
write_scope:
  - src/adapters/github.js
  - tests/adapters/github-native-actions-evidence.test.js
acceptance_criteria:
  - "AC-01: Reobserve tools exact Product baseline and TASK carrier identity/parent/tree before lifecycle effects; verify competent #34 authority and absence of conflicting original effects."
  - "AC-02: Normalize one genuine native GitHub Actions run with source URL, provider, workflow/event, run_id/run_attempt/job_id, exact commit/tree, observation cutoff, stage results and original validation outcome."
  - "AC-03: Preserve provider native evidence independently from Product Operation/ExecutionAttempt/owner and Developer authority; do not manufacture Product identities or acceptance from run, check, Issue/Project or merged PR."
  - "AC-04: For genuine Product effect correspondence, require independent authentic Operation/ExecutionAttempt/subject/owner/authority receipts before evaluating NONE/CONFIRMED/UNKNOWN; unknown binding cannot masquerade as UNKNOWN effect."
  - "AC-05: Prove idempotent observation/deduplication, identity conflicts, mismatched commit/tree, missing native fields and genuinely unresolved UNKNOWN fail-closed without retry."
  - "AC-06: Limit subsequent Phase1 source changes to declared two paths, reusing existing GitHubAdapter; no TC Core, Kernel, SOT, CI/workflow or generic telemetry, scheduler, role, Recipe, planning engine or automatic Project writes."
  - "AC-07: Run focused and promotion-grade validation against exact frozen candidate, with preserved limitations; CI PASS alone is not independent review or Developer acceptance."
  - "AC-08: Preserve separate TaskCycle initialization, Phase1, candidate freeze, fresh Independent Review, distinct Developer acceptance, authorized Phase2, reconciliation and logical close."
relations:
  - relation: follows
    target: {ref: docs/implementation-roadmap.md, revision: "2026-10-24"}
---

# ULC-OP-03 — Native Actions evidence, real bounded Control consumer

## Competent selection and status

This TASK is the assignment carrier for [issue #34](https://github.com/mauedgar/tecnotron-ai/issues/34) only. Product Control selected its narrow scope at [comment 6384012965](https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6384012965), after the Developer-delegated [planning-hold release, comment 6382954803](https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6382954803). The Developer subsequently instructed: **“Autorizo proximo gate”** on 2026-10-24, authorizing this immediately next **TASK assignment/materialization gate**, not unconditional acceptance, a new reviewer run or Phase2.

- Responsibility: `QUALIFY_BOUNDED_NATIVE_ACTIONS_EVIDENCE_FOR_REAL_PRODUCT_CONTROL_CONSUMER`.
- Proposed later TaskCycle ID: `TASKCYCLE-TECNOTRON-ULC-OP03-ACTIONS-EVIDENCE-CONSUMER-001`. **NOT_INITIALIZED**: naming is not a lifecycle state transition.
- Product baseline: `mauedgar/tecnotron-ai:tools@7a7225940aeaf1fbd16ac46ecd1cb76fa527ff56`, tree `8caa56d36f3efeba359bbbf65b158ffb01a19da6`.
- SOT: `docs/SOURCE_OF_TRUTH.md`, blob `dd8d34a7e3ef3094805d014f9e59741d2c553957`; architecture/ownership §16.1/§16.5, Context Strategy and Task Lifecycle continue governing.
- This isolated TASK branch carries the exact assignment; this TASK path is **not** an extra future Phase1 code write.
- Historical #32/#33 original native terminal receipts remain **UNVERIFIED**; no replay or retroactive CLOSED_PASS.
- OP04 implementation, Beads adoption and any second planning responsibility are out of this TASK.

## Exact genuine native source (evidence-only)

```yaml
provider: GITHUB_ACTIONS
repository: mauedgar/tecnotron-ai
url: https://github.com/mauedgar/tecnotron-ai/actions/runs/40082522885
run_id: 40082522885
run_attempt: 1
job_id: 120838820954
event: pull_request
provider_status: completed
provider_conclusion: success
checkout_commit: 2169c2144ee05116d735743df66eec01e6e57bf4
checkout_tree: a44b9dedbed04d16437bad94085f29e6bc38c0d0
reported_validation: "653 PASS, 6 SKIP, 0 FAIL; audit/typecheck/contracts PASS"
later_accepted_merge: 6cc50ab174b284f9bd345145b6f9a9ed6befdb1b
product_operation_binding: UNVERIFIED
product_execution_attempt_binding: UNVERIFIED
product_effect: NOT_EVALUATED
read_only_observation_effect_state: NONE
```

The **real selected consumer** is Product Control reading this source for bounded qualification, not a fabricated historical Product Operation. The native checkout and later merge are distinct Git subjects. `NOT_EVALUATED` describes the present Product-correspondence gap, **not** a new effect-state enum. Only when a genuine bound Product effect exists may the existing `NONE/CONFIRMED/UNKNOWN` distinctions be applied. The run's successful validation never grants acceptance, integration or retrospective ExecutionAttempt identity.

## Phase1 assignment, currently NOT_DISPATCHED

Reuse `src/adapters/github.js` in read-only observation mode. Verify provider data against native sources and exact Git subjects; produce a bounded typed result and report missing native/semantic bindings explicitly. Make a single focused test covering original success plus negative cases: absent run/attempt/job, incorrect tree, conflicting source identity, repeated identical observation (no-op), false Product Operation/Attempt inference, unsupported permission, and an actual `UNKNOWN` without blind retry.

**Future Phase1 code write-set only:**
1. `src/adapters/github.js`.
2. `tests/adapters/github-native-actions-evidence.test.js`.

If it is necessary to modify more code or obtain a genuine authorized Product effect for a stronger qualification claim, return to Control first. No broad scheduler, observer Recipe, new telemetry data store, GitHub Projects Ready/Done, automatic backlog promotion or State Kernel migration. Write owner of subsequent implementation remains **UNASSIGNED** until a competent Phase1 dispatch.

## DoD and existing gate boundaries

1. **Current gate:** single TASK carrier commit on isolated branch; readback exact file blob, commit/tree, first-parent base, one changed TASK path. Task materialization is not canonical `tools` integration.
2. **Next, NOT_RUN:** verify appropriate authority/identity for **one** kernel-free TaskCycle initialization (nine genuinely pending obligations). No automatic TaskCycle initialization by TASK presence. Fail closed if missing.
3. Only after that: separately authorized bounded Phase1, focused + promotion-grade validation, frozen exact candidate and immutable review interface.
4. Fresh independent semantic review; preserve advisories/blockers. A distinct candidate-specific Developer acceptance is required, not inferred from PASS.
5. Guarded separately authorized Phase2 → original effect reconciliation → logical close; never skip or retry original UNKNOWN blindly.

Future nine ordinary obligations are all **NOT_STARTED**: `implementation`, `promotion_grade_validation`, `exact_candidate`, `frozen_review_interface`, `independent_review`, `Developer_acceptance`, `Phase_2`, `effect_reconciliation`, `logical_close`.

**Assignment result ceiling:** `TaskCycle=NOT_INITIALIZED`, `ExecutionAttempt=NONE`, `Product_candidate=NONE`, `Independent_Review=NOT_RUN`, `Developer_candidate_acceptance=NOT_GRANTED`, `Phase2=NOT_AUTHORIZED`. The TASK file is a scoped assignment and evidence carrier, not a Product review/acceptance receipt.
