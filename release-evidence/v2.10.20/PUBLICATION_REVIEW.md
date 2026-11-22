# Publication review - `cpm-engine` v2.10.20

CLAUDE.md section 3, hard stop 6. Reviewed 2026-11-22, before the tag, by the Claude Code session that prepared the release, on Dana Fitkowski's instruction "finish release". Files changed since v2.10.19 under `release-evidence/`, `validation/`, `examples/`, `schemas/` and `tests/`:

| File | What changed | Safe to publish |
|---|---|---|
| `release-evidence/v2.10.19/*` | the v2.10.19 evidence packet, already public on `main` | yes, unchanged since published |
| `validation/p6-comparison/cases/19-21/engine-output.json` | engine version only | yes |
| `validation/p6-comparison/comparison-matrix.md` | engine version | yes |

The Larchmere cases are CPP's fictional demonstration project. The new unit tests (MF-1 to MF-12) use synthetic activity codes. `tests/no-client-names.test.js` passed on the tagged bytes.
