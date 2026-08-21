---
name: repo-packager
description: Use when packaging repository context with reducido, drill-down, or ampliado. It ranks or returns requested code without deciding whether the context is sufficient.
---

# Repo Packager

`repo-packager` packages exactly the requested repository context. Explorer or
the calling agent decides what to request and whether the result is sufficient.

## Modes

- `reducido --json repo.json --budget 8000`: ranked overview from Repomix JSON.
- `drill-down --json repo.json --focus path --budget 6000`: focused ranked overview.
- `ampliado --paths path1,path2`: complete source for no more than ten paths.

Generate the base JSON from the target repository with:

```bash
npx repomix --style json --compress -o repo.json
```

The script respects default exclusions plus `.repomixignore` and `.gitignore`.
It emits `EMPTY` when nothing remains and `PARTIAL` with omitted paths when a
budget or the expanded-path limit prevents a complete result.
