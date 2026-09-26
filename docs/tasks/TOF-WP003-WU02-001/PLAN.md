---
document_id: TOF-PLAN-WP003-WU02-001
status: implementation_candidate
owner: tecnotron-ai
type: task-plan
version: 1.0
updated: 2026-09-26
machine_context: true
task_id: TOF-WP003-WU02-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP003-WU02-TEMPLATES-FIXTURE-CORPUS-001
task: docs/tasks/TOF-WP003-WU02-001/TASK.md
task_base: 29f696e9ec44a2f80cef5b153d9322724b397e6c
implementation_authority: WU02_ONLY
requirement_refs: [RF-201, RF-202, RF-203, RF-204, RF-205, RF-206, RF-207]
---

# Local PLAN: templates and fixture corpus

This local strategy executes only the bounded WU02 assignment. The accepted SPEC
owns WHAT, the accepted WP PLAN owns HOW/decomposition, and WU01 owns validator
behavior. This PLAN creates no additional Product authority.

## TDD sequence and gates

1. Verify the exact canonical `tools` commit/tree, authority blobs, WU01 source
   and current repository conventions; create an isolated local candidate clone.
2. RED: extend the focused contract test to require the exact six templates and
   three-positive/eleven-negative corpus, then observe failures because those
   WU02 artifacts do not exist.
3. GREEN: add minimal derived templates and self-contained fixtures whose
   declared expectations execute through the unchanged WU01 validator.
4. REFACTOR: keep placeholder vocabulary and fixture identity/reference data
   consistent without extracting a new runtime, CLI, linter or authority layer.
5. Run the focused test, contract surface, complete repository suite and
   `git diff --check`; record failures, skips and unavailable checks truthfully.
6. Verify changed-path allowlist and unchanged authority/WU01 blobs. Freeze one
   commit directly descended from the accepted baseline.
7. Bind evidence to the frozen commit/tree and create one self-contained external
   Independent Review package with sources, diff, templates, fixtures, tests,
   validation logs, manifest/checksums and portable Git bundle. Do not review it.

## Fixture interpretation

Fixture names and `obligation_refs` map each case to SPEC §§8.1–8.2 and WP PLAN
§12. `expected.finding_codes` records deterministic WU01 findings; it does not
claim natural-language semantic equivalence, owner competence, truthful evidence
or Developer acceptance. Those validator limitations remain review inputs.

Raw templates deliberately contain explicit `{{placeholder}}` values and are not
ready artifacts. The focused test supplies test-only competent values and proves
the resulting frontmatter conforms to the accepted WU01 parser. Generation or
successful parsing grants no authority or lifecycle effect.
