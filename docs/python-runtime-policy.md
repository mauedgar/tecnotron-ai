---
document_id: TEC-PY-RUNTIME-POLICY-001
status: canonical_on_tools_only
owner: tecnotron-ai
decision_date: 2026-11-04
runtime_target: CPython 3.15.2
policy_scope: new_Tecnotron_Product_Python_components
authority_ref: https://github.com/mauedgar/tecnotron-ai/pull/59#issuecomment-6633687043
review_precondition: exact_candidate_independent_review_and_competent_Phase2
---

# Python runtime policy — Tecnotron

## Competent decision and scope

The Developer selected **CPython 3.15.2 (standard GIL build)** as the canonical **default target for newly created Tecnotron Product Python components** on 2026-11-04. This is a bounded Product architecture/runtime preference, not a claim that every existing Tecnotron Python consumer can run on Python 3.15.2 today. The original decision/grant is [PR #59, comment 6633687043](https://github.com/mauedgar/tecnotron-ai/pull/59#issuecomment-6633687043).

**Authority/effect rule:** this policy has canonical effect only in the actual Product `tools` tree after exact-candidate Independent Review, separate competent acceptance/Phase 2, and confirmed Git integration. The branch or this document's frontmatter alone establishes no Product effect. Existing accepted assignments, frozen TaskCycles and exact historical receipts retain their own authority. This policy does not create a new lifecycle or automatically admit work.

The first independently qualified stdlib-only Python3.15.2 profile was selectively integrated from accepted PR #59: Product commit `0c550524539a5d553f23e1e31273cd5b37fca091`, tree `751e48be9cb8027236c5a1f099ba72b26ccb8957`; [effect receipt](https://github.com/mauedgar/tecnotron-ai/pull/59#issuecomment-6633728264). The historical document `docs/proposals/python-3.15-runtime-baseline-candidate.md` remains unchanged *as a historical candidate*, rather than rewritten as if it had already been Product policy when authored.

## Applicability by consumer

| Consumer / scope | Canonical default or present qualification | Restriction |
| --- | --- | --- |
| **New Tecnotron Product Python code with no frozen runtime** | **Pin and validate CPython 3.15.2** (standard/GIL) by component, as the default. | No global interpreter or root `.python-version` change. An explicit competent exception plus validation is required for a different target. |
| **Integrated isolated stdlib-only profile** at `python/profiles/py315/**` | Python 3.15.2 on Ubuntu24.04 and Windows2022, `uv` 0.13.6 lock validation plus normal and optimized smoke. | Qualification is **isolated stdlib-only**, with zero third-party dependencies; it does not certify legacy installations. |
| **Existing Tecnotron Python legacy environment** at `python/requirements.txt` | **MIGRATION_NOT_QUALIFIED**; preserve existing pins/consumers until separately reviewed and validated. | Legacy `aiohttp==3.10.7`, `yarl==1.24.5`, `grpcio==1.83.0` and platform-specific extensions require real dependency resolution, platform wheel/install and behavior tests. Do not falsely label 3.15 ready for this environment. |
| **H6 Attendance Domain / Operator / Parent under issue #35** | Original **Python 3.12 stdlib contract frozen** and preserved. Supplementary H6 tests have run on 3.15.2. | No retroactive change to V0, TaskCycle initialization, validation obligations, lifecycle or Developer acceptance. H6 close is separate and dependent on native effect receipts; no real customer SQLite authorization. |
| **Other repositories / experimental execution providers (including FitFlow)** | Outside this Product policy. | No transfer of authority across Product repositories or from experimental CI/transport. |

No change to Node 22 / TypeScript Product runtime, Kernel, Beads, GitHub task management, credentials, production data or new scheduler is authorized by this Python preference.

## New-component implementation binding

1. Choose the actual component and exact Product assignment. Pin the interpreter **inside the component** with `.python-version = 3.15.2`; use a component-local `pyproject.toml` and, where applicable, a reproducible `uv.lock`. The qualified profile is a reusable example, **not** a global root environment.
2. For Python-3.15-only components, use `requires-python = ">=3.15,<3.16"` only when matching the real validated compatibility. Reusable multi-Python components must declare only actually supported versions; do not tighten their ranges based on policy alone.
3. Validate real `uv lock --check`, `uv sync --locked`, interpreter patch identity, unit/negative tests and applicable integration/E2E on every declared target OS. For third-party packages, verify native wheels and resolved dependency compatibility; validate Windows-specific dependencies on Windows only.
4. Treat the default as an engineering selection, **never a substitute for an exact candidate, independent semantic review, Developer acceptance, guarded Phase 2, actual post-integration checks and native lifecycle/effect reconciliation** where the current Product contract requires them. Do not introduce a separate mandatory gate.
5. Keep each existing Product component's previous runtime and dependencies working until an independent **consumer-specific** migration is proven and competently integrated. Record limitations as evidence; no artificial breaking reset or forced replacement of existing Python installations.
6. New Python 3.15 language/runtime features and no-GIL/free-threaded variants are opt-in and separately qualified by consumer. The default is standard CPython 3.15.2, not a blanket endorsement of free-threaded ABI, experimental JIT or third-party compatibility.

## Verified evidence and outstanding debt

- Original accepted PR #59 candidate `64401950037a97663e2bd818fb20a7c23e1fc0d1`, tree `b38a718c48bce8224ff7f694fc679260e8500844`, [independent IR004 original receipt](https://github.com/mauedgar/ts-execution-transport/blob/dd90c4ff41a4878c47f5141e912922491559ce50/results/TECNOTRON-PY315-ARCH-IR004-20261102-001/ORIGINAL_REVIEW_RESULT.json): PASS, no blocking findings or open advisories; CI run [41502381084](https://github.com/mauedgar/tecnotron-ai/actions/runs/41502381084) success on Windows and Ubuntu against that exact subject.
- Domain original [postmerge CI](https://github.com/mauedgar/ts-execution-transport/actions/runs/41785115770) (126 tests PASS) and Operator original [postmerge CI](https://github.com/mauedgar/ts-execution-transport/actions/runs/41844919616) (153 tests PASS) include Python 3.15.2 **as supplementary evidence**, not redefinition of the original H6 Python3.12 contract. Independent Operator postmerge IR [PASS within bounded scope](https://github.com/mauedgar/tecnotron-ai/issues/35#issuecomment-6633040871).
- The migration path for `python/requirements.txt` **has not been qualified**. It needs its own exact source/target, platform-native resolution/install/tests, reproducible platform constraints, negative cases and independent review before any runtime change.
- H6 Domain extra native lifecycle verifier publication remains **DENIED_BY_OPENAI_TOOL_SECURITY** and NOT_RUN; Domain and Operator native logical close NOT_RUN; Parent Phase2/close still dependent on both children. Do not reroute the denied effect or close #35 based on passing Python tests.
- Python 3.15.2 default may be reconsidered with new exact Product compatibility evidence and separate competent decision; do not automatically bump the runtime patch or rewrite historical receipts.

## Navigation and precedence

This file is a **Product policy projection** subordinate to `docs/SOURCE_OF_TRUTH.md`, adopted architecture/Upper LC, exact Product Git and competent Developer rulings. A proposal, accepted candidate, transport artifact or this document outside the confirmed `tools` ref is not an authority source. Preserve prior 3.14/3.15 candidate records as provenance and do not silently reclassify them as integrated policies.
