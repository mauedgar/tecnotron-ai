---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-TEST-SUITE-TYPE-CLASSIFICATION-001
artifact_kind: TASK
owner: tecnotron-ai
scope: CLASSIFY_ACTIVE_TESTS_FOR_FOCUSED_VALIDATION_AND_SAFE_CLEANUP
revision: "2026-10-11-001"
authority_refs:
  - ref: DEVELOPER-TECNOTRON-DIRECT-TEST-CLASSIFICATION-AND-CLEANUP-2026-10-11
    revision: "2026-10-11"
coverage:
  kind: competent_exception
  exception_ref:
    ref: DEVELOPER-TECNOTRON-DIRECT-TEST-CLASSIFICATION-AND-CLEANUP-2026-10-11
    revision: "2026-10-11"
assignment_authority_ref:
  ref: DEVELOPER-TECNOTRON-DIRECT-TEST-CLASSIFICATION-AND-CLEANUP-2026-10-11
  revision: "2026-10-11"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: c875ef7c14ac95d8fa80f617cd36b86978290f99
  tree: 467151f16353970514d485eab0ef731052bac465
write_scope:
  - package.json
  - scripts/tests/run-by-type.js
  - scripts/tests/test-suites.test.js
  - docs/guides/testing-by-type.md
acceptance_criteria:
  - "Identify and classify every existing Node test file without cross-category duplicates, while keeping the full baseline npm test behavior until equivalence is independently proven."
  - "Expose distinct review-oriented test commands for unit, contract, integration, operational/lifecycle and compatibility."
  - "Fail closed on a new unclassified test file and preserve explicit tests requiring external FitFlow/project configuration, including honest SKIP outcomes."
  - "Retain State Kernel/legacy tests with active compatibility consumers; remove any test only with exact obsolescence/redundancy evidence and preserved contract coverage."
  - "Keep Python repo-packager tests outside Node classification; never imply native harness/Independent Review qualification from synthetic test PASS."
  - "Require native validation, frozen independent semantic review, distinct Developer acceptance and guarded Phase 2 before canonical tools integration."
---

# Tecnotron — Typed test inventory and evidence-safe cleanup

The Developer directly requested: "divide los test por tipo de test para hacer revisiones mas adecuadas. que quede canonico en tecnotron", and additionally "y de paso limpia los test que ya no corresponden". This is a bounded Product responsibility selection and proposal/Phase-1 scope; it is **not** a candidate-specific Developer acceptance receipt or an automatic Phase-2 integration authorization. The origin chat's `@Autónomo Experimental` grants no independent Product authority.

## Prior baseline / inventory

`tools@c875ef7c14ac95d8fa80f617cd36b86978290f99` has 50 JavaScript `*.test.js` files under `tests/**` and `scripts/doctor/tests/**`, plus one separate Python test `tests/repo-packager/pack.test.py`. Existing `npm test` builds and invokes the Node test files. Existing `test:typed-core` and `test:recipe-invocation` are bounded compatibility commands and should remain until their consumers are assessed.

The source ownership survey found active compatibility/transition clients for State Kernel, historic lifecycle IDs, router/AgentMVP and the shipped FitFlow Recipes. Historic names do not independently establish irrelevance. No safely deletable test file was proven; preserve these regression protections and keep skipped external-profile tests explicit.

## Phase-1 bounded goal

- Add **additive** type-specific suite selection and an exhaustive deterministic inventory without changing `npm test` or moving/replacing existing tests.
- Return a manifest of all selected Node test paths and their exact disjoint suite classification; fail for unknown paths instead of silently omitting them.
- Add self-tests that cover classification, unknown-path rejection, disjoint membership, deterministic inventory and the presence of optional external integrations.
- Document type-oriented reviewer evidence/limitations without turning deterministic tests into semantic Independent Review or authorization.
- For cleanup, classify historical/compatibility and external-profile tests accurately; physical deletion only if specific obsolete equivalence is proven. Do not remove unrelated active Product tests solely due age or FitFlow provenance.

## Lifecycle boundary

This is a TASK carrier and draft candidate, not an initialized TaskCycle or an accepted change. Product Control must reconcile native initialization, exact Git subject, native tests, frozen review, distinct Developer acceptance, authorized integration and closure before promotion. Existing Beta #32 and #33 candidates/PRs remain untouched. No new Product policy, scheduler, role, or standalone Recipe.
