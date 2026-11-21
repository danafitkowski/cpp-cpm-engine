# Publication review - `cpm-engine` v2.10.19

CLAUDE.md section 3, hard stop 6. Reviewed 2026-11-21, before the tag, by the Claude Code session that prepared the release, on Dana Fitkowski's instruction "Land them". Files changed since v2.10.18 under `release-evidence/`, `validation/`, `examples/`, `schemas/` and `tests/`:

| File | What changed | Safe to publish |
|---|---|---|
| `release-evidence/v2.10.18/*` (11 files) | the v2.10.18 evidence packet, already public on `main` | yes, unchanged since published |
| `validation/crossval-summary.json` | engine version and run time | yes |
| `validation/p6-comparison/cases/19-21/engine-output.json` | engine version; one new alert count (`WARN out-of-sequence-fs-overlap: 1`) | yes |
| `validation/p6-comparison/cases/19-21/README.md` | one alert line added | yes |
| `validation/p6-comparison/comparison-matrix.md` | engine version | yes |

The Larchmere cases are CPP's fictional demonstration project. The new unit tests (OOS-FS-1 to 8) use synthetic activity codes. `tests/no-client-names.test.js` passed on the tagged bytes.
