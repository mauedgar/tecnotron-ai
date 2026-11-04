---
document_id: TEC-PY315-LEGACY-CONSUMERS-INVENTORY-CANDIDATE-001
status: candidate_not_canonical
owner: TECNOTRON_BETA_RUN_004_Product_Control
evidence_cutoff: 2026-11-04
product_effect: NONE
taskcycle_effect: NONE
phase2_authorized: false
runtime_migration_qualified: false
---

# Python 3.15.2 — legacy consumers and dependency minimization proposal

This is a **read-only source/evidence classification proposal**, not a new Product authority, TaskCycle initialization, developer acceptance, runtime migration, dependency deletion, or native lifecycle receipt. It records a bounded next-work ordering under the existing runtime policy. It must not supersede `docs/python-runtime-policy.md`, the frozen H6 Python3.12 contract, or historical tests.

## Exact source and authority boundary

- Product code: `mauedgar/tecnotron-ai:tools@35bfcc8e4fdd69976ef4bdfea6b9f10d9fda6a84`, tree `25d1a151d651bb41936c69334fb0b0772ef22519`.
- SOT: `docs/SOURCE_OF_TRUTH.md` blob `498d338eb98e54e294db697c5574296febf77e6f`.
- Adopted Python runtime policy: `docs/python-runtime-policy.md` blob `ba997668102151a9be26ba5d3ff31c03a11fc93f`, applicable to **new** Tecnotron Python components only; canonical default standard CPython 3.15.2.
- Legacy dependency snapshot: `python/requirements.txt` blob `b1a9f877be8b54618942e295e95bf43bda264e42`, 106 nonempty exact `==` specifications, with no duplicate package keys in this snapshot. There is no established 3.15.2 global resolution/lock or complete consumer mapping.
- This classification uses Product repository source inspection and previous explicitly scoped provider evidence. Source imports do not rule out dynamic imports, external CLI consumers, installed harness invocations, or user environments.

## Observed in-repository Python consumers

| Consumer | Direct external requirement seen in source | Current evidence | Unqualified dimension |
| --- | --- | --- | --- |
| `.opencode/skills/repo-packager/scripts/pack.py` | `networkx`, fixed in legacy snapshot to `3.6.1` | source blob `7ea1c3fe46c2cfc07029692bb2e40d8fb9185396`; experimental 3.15.2 Linux and Windows wheel install, import and directed graph smoke PASS | functional test suite, Repomix or other CLI external runtime, installed-harness conformance, per-consumer reproducible lock |
| `scripts/review_txt_carrier.py` | none found (Python stdlib) | source blob `96971cf4a39a6bcb64e8b1982010b6d50a1f7ca4` | 3.15.2 functional tests (NOT_RUN in 2026-11-04 attempted matrix) |
| `attendance/core/**`, `attendance/storage/**`, `attendance/operator/**` | stdlib and local attendance modules | actual accepted H6 Domain/Operator postmerge 3.15.2 supplemental test suites PASS | original H6 contract remains **Python 3.12**, no global adoption, no native TaskCycle terminal close |
| `python/profiles/py315/smoke.py` | stdlib, zero third-party dependencies | accepted isolated 3.15.2 profile validated on Windows/Ubuntu with frozen lock | cannot certify existing legacy `requirements.txt` |

Relevant source/test blobs: `tests/repo-packager/pack.test.py` `557b2334aa735601514581eb4c3fa75e2e4399b5`; `tests/review-txt-carrier/test_review_txt_carrier.py` `3c763c8d49a9f50a77b173651fed8933dcfd31da`. Both contain a direct `unittest.main()` entrypoint but require **future distinct permitted qualification** before declaring Python3.15.2 behavior PASS.

## What was empirically qualified, and what was not

- Previous provider experiment `mauedgar/ts-execution-lab@aad37eef206dbbd70fb7f090b6afecf75713e79d`, tree `921a5de3a54fa4a27a624f57c91340909543a84d`, run [41873105444](https://github.com/mauedgar/ts-execution-lab/actions/runs/41873105444) attempt 1 **completed/failure** on Ubuntu and Windows. Both jobs passed Product source identity guards, standard CPython3.15.2 setup, `pip install --only-binary=:all: networkx==3.6.1`, `pip check`, and a directed graph smoke.
- Test discovery `python -m unittest discover -s tests/repo-packager -p 'pack.test.py'` returned `Ran 0 tests` / exit 5 on both OS. **Functional tests did not run**; this is a harness/test-discovery failure, not a source-code compatibility verdict. Subsequent Python tests and CLI smoke were NOT_RUN.
- Publication of a distinct attempted corrected experiment was **DENIED_BY_OPENAI_TOOL_SECURITY**. Read-only reconciliation showed proposed branch absent and zero runs. Do **not** retry, republish, reroute, or substitute a differently packaged execution for that denied attempt. Original terminal and denied corrective evidence are indexed at `mauedgar/ts-execution-transport@821b051f726e47e8210099e60f131c63d875955a:results/TS-PY315-ACTIVE-CONSUMERS-20261104-001/RECONCILIATION.md`.
- Earlier isolated dependency resolution experiments with Python3.15.2 and binary-only installation identified unsatisfiable pins serially: `aiohttp==3.10.7`, `yarl==1.24.5`, `grpcio==1.83.0`. See prior experimental GitHub Actions [41474360567](https://github.com/mauedgar/ts-execution-lab/actions/runs/41474360567) and [41482784580](https://github.com/mauedgar/ts-execution-lab/actions/runs/41482784580). Replacing initial pins in experimental input did not qualify the complete stack. Platform-specific `pywin32` must not be treated as a Linux requirement.
- The 106 pinned legacy packages **must not be labeled orphaned, removable, unsafe, or compatible** based only on this bounded in-repository import inventory. No replacement of the original requirements file is proposed by this document.

## Adopted-policy-compatible proposed ordering (NOT an automatic Product implementation)

1. Preserve legacy environments and frozen H6 original V0 runtime; classify actual in-repo and dynamic/harness consumers without changing interpreter, data, secrets, root environment, Core or Kernel.
2. For independently selected existing consumers, prefer small component-local manifests and deterministic `uv.lock`, preserving original working version until real Linux/Windows installation, unit/negative tests, CLI behavior, exact source provenance and installed-harness qualification where required. `repo-packager` is the first observable external-package consumer, but its test execution remains blocked/NOT_RUN under the recorded denied publication. No publication bypass.
3. Only for legacy environment consumers with a verified need, resolve `aiohttp`, `yarl`, `grpcio` and platform-native wheels; decide upgrade, selective replacement, or a justified older compatible Python per component. Prefer not to migrate the full collection merely because a root snapshot exists.
4. Require the **existing** candidate-specific independent review, Developer acceptance and bounded Phase2 for each future actual Product code/manifests change. The proposal itself grants none. Do not add a scheduler, role, TaskCycle, gate, or environment-level migration by default.
5. H6 original Domain/Operator native `effect_reconciliation` and `logical_close` remain NOT_RUN; Parent Phase2 remains conditional on both original child terminal receipts. Domain native verifier publication was separately denied by security and must not be retried or circumvented. Issue #35 remains OPEN; #34 remains historical CLOSED_PASS; H7 is not selected.

## Conclusion and next decision

**Recommendation, not adoption:** pursue per-consumer Python3.15.2 qualification and dependency minimization; maintain the full legacy manifest until actual consumers are mapped, and stop any implementation requiring a denied execution without a legitimate independent authorization path. This document is a Phase-1-level planning candidate only; it does not modify runtime behavior, Product SOT, original TaskCycles or canonical source consumers.
