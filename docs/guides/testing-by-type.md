# Test suites by evidence type — bounded reviewer guidance

**Status: Phase-1 candidate, not accepted Product policy.** Owner: Tecnotron Product Control. Product authority, acceptance and Independent Review remain governed by the competent repository SOT and the current Task Lifecycle. This guide describes available test mechanics, not new TaskCycle gates or permission to merge.

## Why classify

The repository has 50 existing Node `*.test.js` files (plus one `tests/repo-packager/pack.test.py` outside Node) at `tools@c875ef7c14ac95d8fa80f617cd36b86978290f99`. The original `npm test` uses Node's test runner and remains the authoritative **full Node regression command** during qualification. Test types are **review/evidence filters**: passing a subset does not establish overall validation, semantic sufficiency, provider-native capability, Product acceptance or lifecycle closure.

## Commands and interpretation

| npm command | Type | Evidence; limitations |
|---|---|---|
| `npm run test:inventory` | Static inventory | Lists every discovered Node test and exactly one suite type, fails closed on unknown location. Does not run tests. |
| `npm run test:unit` | Unit | Core, adapters, repository doctor, bounded deterministic helpers; mocked adapter tests do **not** verify a real provider. |
| `npm run test:contract` | Contracts and invariants | Artifact/registry/schema contracts, declared identity/authority guards, and suite-inventory guards. Structural conformance is not Product acceptance. |
| `npm run test:integration` | Integration | Cross-component/cross-process and optionally external-profile paths. Embedded fake, simulated and conditional-skip tests are **not** live OpenCode/model/remote-provider qualification. |
| `npm run test:operational` | Operational/lifecycle regression | Deterministic TaskCycle, Recipe freeze/integration/closure, reconciliation, and FitFlow-specific current Recipe guards. Mechanical tests are not Phase 2 execution authority. |
| `npm run test:compatibility` | Maintained legacy compatibility | State Kernel semantics and regression protection for still-present, current compatibility consumers. Historic names are not grounds to delete. |
| `npm run test:categorized` | Complete categorized Node run | Every discovered `*.test.js` in declared test roots exactly once, with unknown-path guard. Compare with the original `npm test` before ever replacing it. |
| `npm test` | Existing full Node regression | **Unchanged** until qualifying any replacement: build and original `node --test` glob invocation. |

Commands except inventory first run `npm run build`. `npm run typecheck` is a **separate validation dimension**, not a Node test type. Every receipt should preserve full command, exact Git subject, environment, exit code, individual file/test counts, skips, failed tests and evidence location.

## Reviewer selection

A scoped reviewer can start with a targeted type **according to the changed subject**, not as a substitute for an independent semantic review:

- Contract/schemas/authority and Actor profile changes: `test:contract` then the directly affected unit/operational tests.
- Adapter, router or ContextPackager changes: `test:unit` then the relevant integrations; inspect simulated-vs-native limits.
- Cross-harness, command invocation, native Git and portable handoff changes: `test:integration` plus exact provider-native receipts when mandatory.
- Recipe/TaskCycle freeze, acceptance, integration and post-close changes: `test:operational`, and `test:compatibility` if kernel-compatible state could change.
- Broad change, release integration or promotion-grade validation: original `npm test` plus applicable build/typecheck/targeted validations.

A **fresh Independent Review** requires its own competent immutable inputs, distinct model/context and verified receipt. Test suite PASS never implies Developer grant, acceptance, phase transition or integration.

## Cleanup and historical tests

At this cutoff **no complete test file was proven obsolete**. Leave old compatibility tests in place: `src/state-kernel-v0` retains consumers, and `src/operational-spine-v0/recipes/prepare-fitflow-test-runtime.js` and `validate-fitflow-http-contract-candidate.js` remain shipped qualified mechanics. Tests named after prior products/events may still protect current compatibility paths; deleting or weakening them because the name is old would be a regression.

Three current integration files contain tests that skip unless explicit `FF_PROJECT_*` coordinates are supplied: `agent-mvp.test.js`, `routing.test.js` and `runtime-conformance.test.js`. Treat skips as **UNVERIFIED external-profile coverage**, not PASS; keep their test paths in the full inventory rather than silently dropping them. The Python repo-packager test `tests/repo-packager/pack.test.py` remains separate from the Node runner and is **not** claimed covered by `npm test`.

Physical test deletion is eligible only with evidence of a retired current source consumer **and** full equivalence/coverage at exact revision, including negative guards. Until then, classification (not deletion) is the evidence-safe cleanup. The inventory deliberately rejects unfamiliar `*.test.js` locations until Control assigns a meaningful type: it cannot silently misclassify new tests.

## Explicit scope / integration

This change adds only a test runner, contract self-tests, npm commands and this guide. It changes **no production source, no existing test, and no baseline `npm test` invocation**. Proposed TASK: `docs/tasks/TEC-TC-TEST-SUITE-TYPE-CLASSIFICATION-001/TASK.md`. Source subject must be qualified at the actual candidate SHA/tree, independently reviewed, separately accepted by Developer and integrated via guarded authorized Phase 2 before claiming these commands as canonical on `tools`.
