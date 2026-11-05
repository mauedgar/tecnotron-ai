# ULC-OP02 frozen historical test evidence — NOT Product SOT

These files are **immutable test fixtures**, not active navigation, governance,
contracts, authority, or a reusable context packager corpus. The source file
content may historically describe itself as `status: canonical`; that label
belongs only to the original source at its historical observation cutoff.
Consumers must always obtain today's Product authority from
`docs/SOURCE_OF_TRUTH.md` in the current `tools` commit, never from this
directory. Tests deliberately assert those old frozen Git blob SHA identities;
do not "refresh" a fixture to make a future test pass.

| Test-only fixture | Original source path | Exact Git blob |
| --- | --- | --- |
| `SOURCE_OF_TRUTH.518fb736.freeze.txt` | `docs/SOURCE_OF_TRUTH.md` at Product commit `518fb736b96e2a4f5084c5c930cdac6c090dc73b` | `dd8d34a7e3ef3094805d014f9e59741d2c553957` |
| `CONTEXT_STRATEGY.8b32f6b9.freeze.txt` | `docs/context-strategy.md` (same blob at historical commit and current checked base) | `8b32f6b9a149ef5b240c7e31f42dc05f92e457e1` |
| `TASK.d9bc7bae.freeze.txt` | `docs/tasks/TEC-TC-ULC-OP02-ACTOR-CONTEXT-CONSUMER-001/TASK.md` at Product baseline `ac18fc398c52b2ebb9636d93dcdbdddf75f87fb1` | `d9bc7baefcc933c0ea8b7c23eb63f0bff84ca7c8` |

**Historical distinction:** the ULC-OP02 TASK file was not present at the
`518fb736...` snapshot, so its fixture is identified by its later verified
baseline and blob SHA, not falsely attributed to that older commit.

This is a test-only preservation of the original three required evidence IDs,
paths and byte hashes, with fail-closed negative mutation tests. It does not
change current Product state, actor permissions, or TaskCycle lifecycle.
