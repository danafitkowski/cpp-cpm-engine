# Publication review - `cpm-engine` v2.10.22

CLAUDE.md section 3, hard stop 6. Reviewed 2026-11-28, before the tag, by the Claude Code session that prepared the release, as Dana Fitkowski directed. Files changed since v2.10.21 under `release-evidence/`, `validation/`, `examples/`, `schemas/` and `tests/`:

| File | What changed | Safe to publish |
|---|---|---|
| `release-evidence/v2.10.21/*` (11 files) | the v2.10.21 evidence packet, already public on `main` since 2026-11-27 | yes, unchanged since published |
| `tests/p6-heldout-loe.test.js` | checks the engine's own status and actual dates for every level of effort of the held-out sets against P6's, instead of laying P6's over; code only, reading files already public | yes |
| `validation/held-out/loe-actuals.json` | one sentence of its `_about` note (how the test uses it); the 278 rows, keyed by held-out case and activity code (H8-01 to H30-12), are unchanged | yes: the held-out cases are synthetic projects generated from a public random beacon |
| `validation/crossval-summary.json` | engine version and run time | yes |
| `validation/p6-comparison/cases/19-21/engine-output.json` | engine version only | yes |
| `validation/p6-comparison/comparison-matrix.md` | engine version | yes |

The Larchmere cases are CPP's fictional demonstration project. The new unit tests (LE-23 to LE-29) use synthetic activity codes. The P6-database measurements the release text quotes are given as figures only; no project, client or activity from that database is named. `tests/no-client-names.test.js` passed on the release commit.
