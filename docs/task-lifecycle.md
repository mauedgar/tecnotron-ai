---
status: canonical
owner: tecnotron-ai
type: workflow
updated: 2026-09-25
version: 3.2-transitional
related:
  - "[[operational-architecture]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Task Lifecycle — transitional policy

## Transitional scope

This document remains canonical transitionally for repository/process policy
that has not been superseded by the post-bootstrap substrate. It does **not**
define a second State Kernel or Operational Spine lifecycle and does not
reactivate historical WP004.

Ownership is now read narrowly:

- State Kernel owns durable TaskCycle / Operation / ExecutionAttempt state and
  explicit authority/effect facts.
- Operational Spine owns deterministic recipe resolution/execution mechanics.
- This Task Lifecycle policy continues to describe bounded repository work,
  validation/review/acceptance separation, integration/cleanup discipline, and
  worktree/Git conventions where applicable.
- A later operational-maturation responsibility may decide whether a smaller
  replacement lifecycle contract is still required.

No `tecnotron-task-lifecycle/v1` contract is introduced by this normalization.

## Core lifecycle navigation

```text
bounded Product responsibility
  -> implementation
  -> deterministic validation where applicable
  -> immutable candidate
  -> independent semantic review when required
  -> Developer acceptance
  -> separately authorized integration/publication
  -> reconciliation/closure where applicable
```

This is navigation, not one scalar state variable. A correction after review
FAIL preserves the failed review as evidence and requires a new frozen candidate
and applicable re-review before acceptance.

## Separate dimensions

Keep at least these dimensions separate when applicable:

| Dimension | Meaning |
| --- | --- |
| Product/TASK authority | competent scope and responsibility basis |
| materialization | branch/worktree/artifact preparation |
| implementation | observed semantic work state |
| validation | deterministic covered checks |
| review | independent semantic verdict |
| Developer acceptance | terminal human Product decision |
| integration | incorporation into declared target |
| publication | deliberate remote/external exposure |
| closure/cleanup | terminal obligations and ephemeral-state removal |

No dimension implies a later one automatically.

## Roles

- **Implementer:** bounded semantic implementation and task-specific validation;
  no terminal acceptance.
- **Reviewer:** independent read-only semantic assessment; no fixes or terminal
  acceptance.
- **Validator:** deterministic checks only.
- **Developer:** Product orchestration, architecture rulings, exceptions, and
  terminal acceptance.

Role implementations/harnesses are replaceable. Role identifiers in executable
registries remain governed by their own contracts.

## Repository/worktree policy

A write task normally uses task-scoped repository isolation. Git worktrees are a
current mechanism, not Product authority. Repository root/base/integration
branch must come from explicit competent inputs rather than inferred sibling
paths or historical defaults.

`tools` is the current integration branch for the active pre-alpha Product work,
but it is not a universal Task Lifecycle constant. `main` promotion requires a
separate deliberate authority. Historical `tooling` references remain
provenance only.

## Context input

An implementer receives bounded authority, required inputs, write/no-touch
scope, and relevant validation policy. Context may be supplied directly or via
a derived package. A generated package, retrieval result, chat, memory, or
workspace never substitutes for competent Product authority.

## Validation and review

Validation status is explicit: `PASS`, `FAIL`, `NOT_RUN`, or `UNAVAILABLE`.
Unavailable checks cannot be reported as PASS. Validation PASS proves only the
covered check.

Independent review, when required, consumes the exact frozen candidate and
bounded competent inputs. Review PASS does not constitute Developer acceptance.
Developer acceptance does not itself prove integration/publication unless those
effects are separately authorized and observed.

## Integration/publication

After Developer acceptance and explicit effect authorization, deterministic
mechanics may verify identities/guards, integrate the exact accepted candidate,
publish the explicitly authorized refs/artifacts, and verify post-effect state.
They must fail closed on baseline drift, scope expansion, missing authority, or
UNKNOWN mandatory facts.

## Cleanup

Cleanup may remove task-local ephemeral state when authorized. It must preserve
canonical source, accepted Git history, review/result evidence required by
policy, and unrelated state.

## Provider independence

GitHub may currently host repository/planning/integration views, but planning
providers are replaceable. Mechanical provider operations should be
deterministic when possible. No provider field, PR state, Project field, or
harness session becomes Product authority by convenience.

## Stop conditions

Stop for competent ruling when Product authority is missing/contradictory,
write scope must expand, source/runtime behavior must change outside the owned
responsibility, a required review cannot be performed, or deterministic
mechanics cannot establish mandatory preconditions.
