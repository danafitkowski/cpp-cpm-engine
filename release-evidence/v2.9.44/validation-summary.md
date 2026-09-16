# Validation summary — `cpm-engine` v2.9.44

| Field | Value |
|---|---|
| Tag | `v2.9.44` |
| Commit | `10dcc2c8f715f264e4868a581f2efe784e990b58` |
| Release date | 2026-09-15 |
| Engine SHA-256 | `77171847fe9799b5bf512058ae686fabb8f69d6587704dfdb3c9ad815a0e97ac` |
| Engine bytes | 536409 |
| Python reference SHA-256 | `a3ebb418739c36c4af6a9088a229cc81d3cae58d8f45efad8620e4d9b50799d1` |
| Python reference bytes | 150186 |
| Unit tests | 1288 / 1288 passing |
| Cross-validation | 1009 of 1015 defined comparisons executed and bit-identical, 0 failures, across 46 fixtures; 6 skipped rather than compared (3 `ff_signed`, 3 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 2854361810 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/35047768911 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1288 passed, 0 failed |
| `node cpm-engine.crossval.js` | 46 fixtures passed, 0 failed; 1009 of 1015 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| P6 comparison matrix | 13 / 13, recomputed under v2.9.44 against the single 2026-08-11 capture (fitted, not held out) |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-09-15) | 93.79% statements (9,718 / 10,361), 83.32% branches (2,084 / 2,501), 94.69% functions (125 / 132) |

## What changed in this release

- **Engine math changed.** Cross-calendar logic moves to P6's finish-instant
  semantics. A result computed on v2.9.43 or earlier can differ on any
  relationship that crosses calendars, so a deliverable already issued from an
  earlier tagged build is inside the supersession window and needs the
  re-check step in the operator procedure. Same-calendar networks are
  unchanged: every crossval fixture except the mixed-calendar one produced the
  same values before and after, and that one now agrees between the engines on
  the instant reading.
- **What P6 does.** An early finish is an instant, the close of the last
  working period of the activity's own calendar (Friday 17:00 on Monday to
  Friday). A successor starts at the first working instant of its own calendar
  at or after that instant plus lag, the lag consumed as working time on the
  relationship-lag calendar from the instant.
- **What the engine did.** It carried a finish as the opening of the next
  working day on the finishing activity's calendar (Monday for a Friday
  finish), handed that boundary to the successor as-is, walked the lag on the
  lag calendar from it, and never snapped the result onto the successor's
  calendar. A seven-day successor of a Friday finish started Monday instead of
  Saturday; a blackout-calendar successor started inside its blackout, its
  early finish right only because the duration walk skipped the blackout
  anyway; a successor whose calendar works the predecessor calendar's holiday
  started the day after it; a completed predecessor's successors could start
  on its finish day.
- **Empirical basis.** Measured on a 2,898-activity real export with five
  active calendars (a Monday-to-Friday design calendar with 141 exceptions, a
  680-exception blackout calendar, an installation calendar with 14 worked
  exceptions, a seven-day calendar and the project calendar), against P6's own
  stored early dates. The export had been rebuilt from a later layout's dates
  onto older logic, so 40 of its 2,619 incomplete activities carry stored
  starts no schedule run on the file can produce; with those pinned, every one
  of the 25 residual root divergences was one of the four shapes above, and
  after the change the engine reproduces P6 on every activity outside those 40
  and their successors, on every calendar, with three one-day residuals on one
  chain left unexplained by the exported calendar. The export is a client file
  and is not part of this repository; the fixtures that ship replicate the
  discriminating topologies under neutral codes with real value shapes.
- **The change, paired in `cpm-engine.js` and `python_reference/cpm.py`.**
  Every drive is computed as an instant and snapped onto the successor's own
  calendar; a positive lag is working time on the lag calendar counted from
  the instant, a negative lag retreats from it; a finish milestone
  (`task_type` TT_FinMile) sits at the instant that drove it, a start
  milestone at its own calendar's next working start; a completed
  predecessor's instant comes from the time of its actual finish, a date-only
  value keeping the legacy reading; the data date honours its time of day; and
  the backward pass mirrors it, so forward and backward walks are inverses on
  cross-calendar links (the V2942-7 fixture that used to manufacture tf -1 now
  reports the two seven-day days of float P6 does). Nodes carry `ef_instant` /
  `ef_instant_date` beside the boundary `ef`.
- **Expectations updated with their derivation.** Three existing checks
  pinned the boundary walker's under-count (the V2942-7 successor-walk date
  and its negative-float assertions, the RL-7 Saturday start of a
  Monday-to-Friday activity); each now carries the P6 reasoning for its new
  value. Ten XC checks and twenty-one Python pins were added.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 46 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository; the real-export measurement above was made outside it and is not reproducible from it.
- The P6 comparison matrix is fitted to one capture and was recomputed, not re-captured, for this release; no held-out capture exists.
- The engine works in whole days. An instant is the calendar day whose opening it is, so a finish at 17:00 and a finish at 12:00 on the same day are the same instant here; sub-day lags round and raise an alert that is fatal in strict mode.
