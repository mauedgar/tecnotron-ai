---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-ACCEPTED-RANGE-PHASE2-LIFECYCLE-001
artifact_kind: TASK
owner: tecnotron-ai
scope: EVOLVE_POST_PHASE1_LIFECYCLE_TO_REPRESENT_ACCEPTED_RANGE_PHASE2
revision: "1.0"
assignment_authority_ref:
  ref: DEVELOPER-AUTHORIZE-ACCEPTED-RANGE-PHASE2-LIFECYCLE-2026-10-07
  revision: "2026-10-07"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: ff668b3878f2cd89030306dbfd979da23acf33cb
  tree: 572f7445337f97fb77a7d0ce3fbe3af91eb11083
write_scope:
  - src/deterministic-taskcycle-substrate-v0/taskcycle-post-phase1-lifecycle.js
  - tests/deterministic-taskcycle-substrate-v0/taskcycle-post-phase1-lifecycle.test.js
---

# TASK TEC-TC-ACCEPTED-RANGE-PHASE2-LIFECYCLE-001

## Responsibility

Evolve the kernel-free post-Phase1 lifecycle contract so terminal Phase 2
evidence can represent an accepted exact first-parent range whose actual
pre-tools baseline differs from the reviewed tip's direct parent.

## Demonstrated Product topology

```yaml
actual_pre_tools: 9e975fd7c9c504fb7fd24d91231d0aa3c04c71be
accepted_range:
  ordered_commits:
    - dcdd64a7aa42173f7cd81216ebaf476206132122
    - ff668b3878f2cd89030306dbfd979da23acf33cb
reviewed_tip:
  commit: ff668b3878f2cd89030306dbfd979da23acf33cb
  parent: dcdd64a7aa42173f7cd81216ebaf476206132122
post_tools: ff668b3878f2cd89030306dbfd979da23acf33cb
```

The already-qualified integration Recipe correctly supports this topology. The
defect is limited to post-Phase1 lifecycle validation, which currently assumes
`Phase_2.pre_tools == candidate.parent`.

## Required semantics

Preserve the legacy direct-child variant unchanged.

Add an accepted first-parent range variant whose Phase 2 evidence preserves:

- actual `pre_tools`;
- exact integration range base;
- exact ordered commit range;
- exact reviewed tip, parent and tree;
- exact changed paths and commit count;
- exact `post_tools` and `post_tree`;
- `force: false`;
- `remote_correspondence: EXACT`.

Required coherence:

```yaml
accepted_range.integration_range_base: equals Phase_2.pre_tools
accepted_range.accepted_tip: equals candidate.commit
accepted_range.accepted_tip_parent: equals candidate.parent
accepted_range.accepted_tip_tree: equals candidate.tree
accepted_range.ordered_commit_range_last: equals candidate.commit
accepted_range.commit_count: equals ordered_commit_range.length
Phase_2.post_tools: equals candidate.commit
Phase_2.post_tree: equals candidate.tree
```

No range may be inferred from the reviewed tip alone.

## Fail-closed regressions

The implementation must block without materialization when:

- `pre_tools != candidate.parent` and no accepted range is supplied;
- range base differs from `pre_tools`;
- accepted tip differs from the reviewed candidate;
- accepted tip parent/tree differ from reviewed candidate identity;
- ordered range does not end at reviewed candidate;
- commit count disagrees with ordered range length;
- post tools/tree differ from reviewed candidate;
- resolved observation differs from request;
- evidence is UNKNOWN/ambiguous;
- an existing terminal projection conflicts or is ambiguous.

Existing direct-child close, exact duplicate idempotence and external identity
consumption must remain unchanged.

## Explicit non-scope

Do not modify:

- `integrate_accepted_candidate@v0`;
- accepted-range Git qualification semantics;
- TC Core architecture;
- State Kernel ownership;
- persistence backend;
- Commander policy.

The blocked Product TaskCycle
`TASKCYCLE-TECNOTRON-REMAINING-RECIPE-KERNEL-DECOUPLING-001`
must not be retried or replayed during this TaskCycle.

## Commander boundary

Commander is not a semantic work surface. Any Commander use, if later necessary,
is limited to execution of an already-materialized bounded command or observing
an already-running execution.

## Stop conditions

Stop without automatic repair if any gate produces FAIL, BLOCKED or UNKNOWN, if
the implementation must leave the declared two-file write scope, or if new
evidence would require changing the integration Recipe or reopening TC Core.
