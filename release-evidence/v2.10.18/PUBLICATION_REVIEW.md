# Publication review - `cpm-engine` v2.10.18

CLAUDE.md section 3, hard stop 6: before the tag, every file added or changed since the previous tag under
`release-evidence/`, `validation/`, `examples/`, `schemas/` and the `tests/` fixtures is read and confirmed safe to
publish (no client, employer or engagement name or data).

Reviewed 2026-11-21, before the tag, by the Claude Code session that prepared the release, on Dana Fitkowski's
instruction "Release". Files reviewed (`git diff --stat v2.10.17 v2.10.18 -- release-evidence validation examples schemas tests`):

| File | What changed | Safe to publish |
|---|---|---|
| `release-evidence/v2.10.17/*` (10 files) | the v2.10.17 evidence packet, already public on `main` since 2026-11-09 | yes, unchanged since it was published |
| `validation/crossval-summary.json` | engine version and run time | yes |
| `validation/p6-comparison/cases/19-21/engine-output.json` | engine version string | yes |
| `validation/p6-comparison/comparison-matrix.md` | engine version string | yes |

No file was added under `examples/`, `schemas/` or `tests/`. The new unit-test fixtures (`cpm-engine.test.js`,
V21018-1 to V21018-4) are synthetic activities coded A to F on a Monday to Friday calendar. `tests/no-client-names.test.js`
passed on the tagged bytes.
