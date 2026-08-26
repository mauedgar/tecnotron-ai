---
document_id: FFAI-VALIDATION-AGENT-003
status: evidence
machine_context: true
version: 1.0
updated: 2026-08-26
task_id: FF-AI-AGENT-003
result: PASS
---

# Validation FF-AI-AGENT-003

## Deterministic checks

- Ten profile files exist under `.opencode/agents/`; the installer contains the
  same ten names exactly once: PASS.
- Bindings match the observed zero-cost line: five Big Pickle roles, two Hy3
  roles and one MiMo V2.5 role: PASS.
- `opencode models opencode --verbose` reports input/output/cache cost zero for
  Big Pickle, Hy3 Free and MiMo V2.5 Free: PASS.
- `opencode agent list` discovers the project profiles: PASS.
- Installer invocation from the ephemeral worktree fails closed before creating
  links: PASS.
- `git diff --check`: PASS; line-ending warnings only.

## Bounded invocation evidence

- Big Pickle completed a read-only semantic review and produced concrete
  findings: PASS.
- Hy3 Free completed a bounded evidence-retrieval task: PASS.
- MiMo V2.5 Free completed a mechanical profile/installer comparison: PASS.
- Nemotron 3 Ultra Free exceeded 600 seconds and was excluded from the active
  line: `UNAVAILABLE_LATENCY`.

## Scope and postflight

`.opencode/package.json` and `.opencode/package-lock.json` were ambient dirty
before this task and are excluded from its ownership and result. Global symlink
creation remains a post-integration Developer gate; no global configuration was
mutated during validation.
