# Publication review - `cpm-engine` v2.10.21

CLAUDE.md section 3, hard stop 6. Reviewed 2026-11-27, before the tag, by the Claude Code session that prepared the release, on Dana Fitkowski's instruction "just keep going buddy this is stalling us". Dana did not read the files himself: the session offered him a review page listing each file with its full text, and he directed the session to proceed. Files changed since v2.10.20 under `release-evidence/`, `validation/`, `examples/`, `schemas/` and `tests/`:

| File | What changed | Safe to publish |
|---|---|---|
| `release-evidence/v2.10.20/*` (11 files) | the v2.10.20 evidence packet, already public on `main` since 2026-11-22 | yes, unchanged since published |
| `tests/p6-heldout-loe.test.js` | new: replays every level of effort of the held-out sets against P6's values; code only, reading files already public | yes |
| `validation/held-out/loe-actuals.json` | new: the actual dates P6 gave each level of effort of the held-out sets at its F9, 278 rows keyed by held-out case and activity code (H8-01 to H30-12) | yes: the held-out cases are synthetic projects generated from a public random beacon |
| `validation/crossval-summary.json` | engine version and run time | yes |
| `validation/p6-comparison/cases/19-21/engine-output.json` | engine version only | yes |
| `validation/p6-comparison/comparison-matrix.md` | engine version | yes |

The Larchmere cases are CPP's fictional demonstration project. The new unit tests (LE-1 to LE-22) use synthetic activity codes. The P6-database measurements the release text quotes are given as figures only; no project, client or activity from that database is named. `tests/no-client-names.test.js` passed on the tagged bytes.
