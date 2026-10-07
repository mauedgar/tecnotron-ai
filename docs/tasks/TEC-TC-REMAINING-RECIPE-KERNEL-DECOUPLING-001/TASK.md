---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-REMAINING-RECIPE-KERNEL-DECOUPLING-001
artifact_kind: TASK
owner: tecnotron-ai
scope: DECOUPLE_REMAINING_OPERATIONAL_SPINE_RECIPES_FROM_STATE_KERNEL
revision: "1.0"
authority_refs:
  - ref: DEVELOPER-SELECT-REMAINING-RECIPE-KERNEL-DECOUPLING-20261007
    revision: "2026-10-07"
assignment_authority_ref:
  ref: DEVELOPER-SELECT-REMAINING-RECIPE-KERNEL-DECOUPLING-20261007
  revision: "2026-10-07"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: 9e975fd7c9c504fb7fd24d91231d0aa3c04c71be
  tree: 319cf7a8e17ff657448cbaa07aba9a800f206176
write_scope:
  - src-typescript/operational-spine-v0/contracts.ts
  - src/operational-spine-v0/contracts.js
  - src/operational-spine-v0/contracts.d.ts
  - src/operational-spine-v0/recipes/materialize-frozen-review-interface.js
  - src/operational-spine-v0/recipes/validate-fitflow-http-contract-candidate.js
  - src/operational-spine-v0/recipes/render-current-state.js
  - src-typescript/operational-spine-v0/resolution.ts
  - src/operational-spine-v0/resolution.js
  - tests/operational-spine-v0/contracts-and-resolution.test.js
  - tests/operational-spine-v0/recipe-kernel-decoupling.test.js
acceptance_criteria:
  - "AC-01: No file under src/operational-spine-v0/recipes imports state-kernel-v0 directly."
  - "AC-02: Operational Spine contracts no longer import referenceSchema from State Kernel; the rich AUTHORITY/EVIDENCE/ARTIFACT/GIT_OBJECT reference shape remains semantically equivalent for current consumers."
  - "AC-03: materialize_frozen_review_interface and validate_fitflow_http_contract_candidate consume the portable Operational Spine reference schema without changing their external request/receipt behavior."
  - "AC-04: render_current_state expresses its contract in terms of an injected portable state-render capability, not State Kernel ownership."
  - "AC-05: Operational Spine resolution accepts a durable Operation aggregate without naming State Kernel as its semantic owner."
  - "AC-06: Within active Operational Spine source, direct state-kernel-v0 imports are confined to state-kernel-adapter.js as an explicit compatibility boundary."
  - "AC-07: reconcile_and_close_taskcycle remains bound to TaskCycleLifecycleCapability and is not regressed to State Kernel-shaped semantics."
  - "AC-08: Existing focused recipe/contract tests plus a new confinement regression pass; full regression and typecheck remain promotion-grade validation obligations."
  - "AC-09: No State Kernel migration/removal, persistence replacement, TC Core redesign, Recipe lifecycle redesign, GitHub Projects adoption, or unrelated consumer cleanup occurs."
relations: []
---

# TASK TEC-TC-REMAINING-RECIPE-KERNEL-DECOUPLING-001

## Responsibility

Remove the remaining direct or semantic State Kernel coupling from shipped
Operational Spine Recipes while preserving the compatibility adapter as the
only intentional State Kernel boundary inside active Operational Spine source.

This is a bounded Product responsibility. It is not a State Kernel removal or
persistence migration.

## Exact observed coupling at assignment

At `tools@9e975fd7c9c504fb7fd24d91231d0aa3c04c71be`:

1. `materialize-frozen-review-interface.js` imports
   `referenceSchema` directly from `state-kernel-v0/contracts`.
2. `validate-fitflow-http-contract-candidate.js` imports the same schema directly.
3. `operational-spine-v0/contracts.js` and its TypeScript source import the rich
   reference schema from State Kernel, creating an indirect Recipe dependency.
4. `render-current-state.js` is mechanically injection-based already, but its
   Recipe definition still names State Kernel as the capability owner.
5. `resolution.{ts,js}` still describes the required Operation aggregate as a
   State Kernel aggregate despite using only the portable Operation shape.
6. `reconcile-and-close-taskcycle.js` already consumes
   `TaskCycleLifecycleCapability`; it is evidence of the desired direction,
   not a direct Kernel dependency to replace.
7. `state-kernel-adapter.js` remains the explicit compatibility boundary and is
   out of semantic-removal scope for this TaskCycle.

## Intended implementation

Use the existing Operational Spine contracts surface as the portable owner of
the rich reference schema. Do not introduce a new generic contract subsystem.

Expected shape:

```text
Operational Spine / Recipes
  -> Operational Spine ReferenceSchema
  -> portable lifecycle/execution contracts

State Kernel
  -> compatibility adapter boundary only
```

The portable reference contract must preserve the current accepted shape:

```yaml
kind:
  - AUTHORITY
  - EVIDENCE
  - ARTIFACT
  - GIT_OBJECT
id: non-empty
location: optional non-empty
sha256: optional lowercase 64-hex
git_oid: optional 40-64 hex
strict_object: true
```

Do not widen or narrow accepted Recipe inputs accidentally.

## Explicit non-goals

- remove State Kernel from the repository;
- change TaskCycle persistence;
- change execution-attempt persistence;
- replace `state-kernel-adapter.js`;
- alter `reconcile_and_close_taskcycle` lifecycle semantics;
- redesign TC Core;
- rewrite Recipe IDs or versions;
- migrate Product history;
- change FitFlow semantics;
- adopt DevLab backlog items automatically.

## Validation obligations

Future implementation must prove at minimum:

- focused Operational Spine contracts/resolution tests PASS;
- frozen-review Recipe tests PASS;
- FitFlow HTTP validation Recipe tests PASS;
- render/invocation tests PASS;
- TypeScript typecheck PASS;
- full regression PASS;
- source-level confinement regression proves no direct
  `state-kernel-v0` import from shipped Recipe files and no direct import from
  Operational Spine contracts/resolution;
- any remaining direct State Kernel import inside Operational Spine is explicitly
  the compatibility adapter boundary.

## Stop conditions

Stop for Product Control if:

- the fix requires changing State Kernel internals;
- the compatibility adapter must be removed or redesigned;
- Recipe external schemas must change incompatibly;
- a persistence/backend decision is required;
- write scope must expand outside the declared Operational Spine/test surface;
- an UNKNOWN effect appears.

## Next gate

```yaml
next_gate:
  id: INITIALIZE_AND_IMPLEMENT_REMAINING_RECIPE_KERNEL_DECOUPLING
  status: NOT_AUTHORIZED
```
