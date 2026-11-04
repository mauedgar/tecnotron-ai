# Repo-packager: isolated CPython 3.15.2 profile

This profile installs dependencies solely for Tecnotron's **existing** `.opencode/skills/repo-packager/scripts/pack.py`. It is not the 106-pin historical `python/requirements.txt` environment and does not change the frozen H6 Attendance V0 Python 3.12 contract.

The original source uses `networkx.pagerank`; NetworkX 3.x requires SciPy for this call. Tested *together* on actual Windows 2022 and Ubuntu 24.04 under CPython **3.15.2**, using binary wheels, with `networkx==3.6.1`, `numpy==2.5.4`, and `scipy==1.18.1`: original 4/4 tests per OS, GitHub Actions [41858927338](https://github.com/mauedgar/ts-execution-transport/actions/runs/41858927338). Prior narrower bindings failed and remain valid provenance.

From the root of a trusted Tecnotron checkout after installing `uv==0.13.6` and making CPython3.15.2 available:

```sh
uv lock --check --project python/profiles/repo-packager-py315
uv sync --locked --no-dev --project python/profiles/repo-packager-py315
uv run --project python/profiles/repo-packager-py315 --locked --no-dev python tests/repo-packager/pack.test.py -v
uv run --project python/profiles/repo-packager-py315 --locked --no-dev python .opencode/skills/repo-packager/scripts/pack.py --help
```

The real `reducido`, `drill-down`, and `ampliado` invocations are governed by the existing repo-packager SKILL. The optional environment is component-local; it must not alter Python installation at repo root or imply compatibility of untested legacy packages.

**Scope:** separate Product Phase1 candidate until original `uv.lock`, direct Windows/Linux CI, independent semantic review, competent acceptance and guarded canonical Phase2 are established. The presence of this file on a candidate branch is not Product authority.

**Security:** only process trusted repositories and context, respect `.gitignore`/default exclusions, never include credentials in review artifacts. Existing script behavior and original regression tests remain unchanged.
