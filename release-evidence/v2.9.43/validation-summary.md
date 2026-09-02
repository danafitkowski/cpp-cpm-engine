# Validation summary — `cpm-engine` v2.9.43

| Field | Value |
|---|---|
| Tag | `v2.9.43` |
| Commit | `0a8d52f7a54cdf0c796e54f27549eeda61950aa1` |
| Release date | 2026-09-02 |
| Engine SHA-256 | `f020510bc44b75ebed056e1d1ede417a7d07a890f6593130c795c36e45248b19` |
| Engine bytes | 523741 |
| Python reference SHA-256 | `83c6db6f61b36d8c8c22fee59d37bfeb36d3d8bc131a3716793e930327301ed5` |
| Python reference bytes | 136967 |
| Unit tests | 1273 / 1273 passing |
| Cross-validation | 1009 of 1015 defined comparisons executed and bit-identical, 0 failures, across 46 fixtures; 6 skipped rather than compared (3 `ff_signed`, 3 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 2685194682 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/33623938231 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1273 passed, 0 failed |
| `node cpm-engine.crossval.js` | 46 fixtures passed, 0 failed; 1009 of 1015 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| P6 comparison matrix | 13 / 13, fitted to a single capture |

## What changed in this release

- **Engine math changed.** Retained-logic remaining-work semantics move to
  P6's, the SS/SF free-float slack anchors move with them, and `parseXER`'s
  calendar decode gains corrupt-record detection.
  A result computed on v2.9.42 or earlier can differ, so a deliverable already
  issued from an earlier tagged build is inside the supersession window and
  needs the re-check step in the operator procedure.
- **Empirical basis.** Every rule in the wave was derived from P6's own stored
  `restart_date` / `reend_date` (in-progress rows) and probe early dates
  (not-started rows) on a private oracle corpus of real progressed P6 exports:
  380 gated in-progress rows and 148 gated not-started probe rows. The RULE is
  exact at minute resolution — replayed on the corpus's hour-accurate calendars
  it reproduces all 380 restart and reend instants and all 148 probe instants.
  The day-granular ENGINE realizes 375/380 stored restarts, 368/380 stored
  reends and 140/148 not-started probe starts on that corpus; every residual
  row is sub-day quantization (mid-day handoffs, fractional-day remaining
  durations), off by exactly one working day with the other bar of the same
  activity exact.
- **Honest delta.** The engine as of v2.9.42, run through the identical
  harness, already scored 370/380 restarts, 365/380 reends and 135/148 probe
  starts, so the wave's engine-level delta is +5 restarts, +3 reends and
  +5 probe starts, with zero previously-correct rows regressed. The wave's
  larger value is categorical: drives from historical actual starts,
  completed-predecessor pushes, unsnapped anchors, future-actual-start floors
  and corrupt-calendar decodes were wrong in kind, not merely off by a day.
- **SS/SF drives read the restart.** Under `retained_logic`, an SS drive (and
  an SF anchor) from a STARTED, incomplete predecessor reads the predecessor's
  restart — where its remaining work begins — never its historical actual
  start, and the SS/SF free-float slack measurement uses the same anchor.
  Measured for SS; inferred for SF by symmetry (the corpus carries no
  discriminating SF instance). `progress_override` is deliberately untouched.
- **Completed predecessors do not drive a started successor's restart.**
  P6 treats finished work as history: an actual finish after the data date
  leaves the started successor's stored restart at the data date. Not-started
  successors keep the completed-predecessor drive.
- **Restart anchor snaps forward on the activity calendar,** is defined even
  when a started activity has no remaining_duration, and a future actual start
  no longer floors it — the anchor stays at the data date, matching P6's
  stored restarts.
- **Corrupt-calendar record detection.** `parseXER` detects a corrupt
  `CALENDAR` record and falls back to the P6-Standard work pattern, gated on
  an illegal `clndr_type` token so a merely-unusual calendar is not clobbered.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 46 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated.
- The oracle corpus behind the retained-logic measurements is private (real progressed client exports). The corpus figures above are not reproducible from this repository; what ships are fixtures replicating the discriminating topologies under neutral names with real value shapes.
- The engine works in whole days. Sub-day lags round and raise an alert that is fatal in strict mode, and the corpus residuals above are the same day-granularity limit measured from the other side.
