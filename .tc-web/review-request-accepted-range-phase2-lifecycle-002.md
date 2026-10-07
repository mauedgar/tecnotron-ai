# Independent Review — Accepted-range Phase 2 lifecycle repair

Review exactly one immutable subject for:

- TaskCycle: TASKCYCLE-TECNOTRON-ACCEPTED-RANGE-PHASE2-LIFECYCLE-001
- Responsibility: EVOLVE_POST_PHASE1_LIFECYCLE_TO_REPRESENT_ACCEPTED_RANGE_PHASE2

Use only the frozen review package as the semantic boundary.

## Required adjudication

Determine whether the exact subject:

1. preserves the existing direct-child Phase 2 lifecycle variant;
2. admits an accepted exact first-parent range where actual pre_tools differs from the reviewed tip parent;
3. preserves actual pre_tools and exact accepted-range provenance without normalization;
4. binds accepted_tip, accepted_tip_parent and accepted_tip_tree to the reviewed candidate identity;
5. requires ordered_commit_range to end at the reviewed candidate and commit_count to match the range length;
6. preserves exact post_tools/post_tree, force=false and remote_correspondence=EXACT;
7. fails closed when accepted-range evidence is absent or incoherent;
8. preserves NONE/CONFIRMED/UNKNOWN, idempotence, observation mismatch and projection conflict behavior;
9. does not create authority, alter State Kernel ownership, change persistence, or modify integrate_accepted_candidate@v0;
10. correctly treats accepted-range qualification/linearity/changed-path proof as already-qualified external Phase 2 evidence rather than re-running Git qualification inside terminal lifecycle validation.

A dependency on exact already-qualified Phase 2 evidence is not by itself a defect. Report a blocking finding only if the lifecycle contract can accept evidence that violates its declared responsibility/boundary or weakens a required authority/identity invariant.

## Output

Return exactly:

INDEPENDENT_REVIEW_RESULT:
  review_id: IND-REVIEW-TECNOTRON-ACCEPTED-RANGE-PHASE2-LIFECYCLE-002
  verdict: PASS | FAIL | BLOCKED
  subject:
    integration_range_base:
    accepted_tip:
    accepted_tip_tree:
  blocking_findings: []
  non_blocking_findings: []
  adjudication:
    legacy_direct_child_preserved:
    accepted_range_variant:
    exact_identity_preserved:
    fail_closed_preserved:
    authority_boundaries_preserved:
    State_Kernel_direct_calls:
    external_range_qualification_boundary:
