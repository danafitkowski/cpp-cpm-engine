# P6 probes: the row held-out set H17 left

Held-out set H17 ([`../../held-out/H17/RESULT.md`](../../held-out/H17/RESULT.md)) scored the released v2.10.9 once, at 207 of 208. Its one difference is H17-10 A1070's early finish: the engine printed Thu 10 Dec 2026 08:00, where P6 has 07:00.

A1070 is resource dependent work: 8 h on Mon-Sat 08:00-16:00, under progress override. It has two assignments: labour on Mon-Fri 07:00-17:00, which does not work Wed 9 Dec, and equipment on every day 00:00-24:00. P6's import leaves the labour assignment with no work. A finish-to-finish link off A1060, which finishes Wed 9 Dec 16:00, sets A1070's start, Wed 08:00 (RQ). The empty assignment sits at its resource's next opening at or after that start, Thu 07:00 (RZ), and P6 prints the finish there.

Seven synthetic probe projects measured what P6 does there. The engine was then changed to reproduce them, so the probes, and H17, are **fitted**: they are not a held-out test.

**How they were captured.**
- The seven were imported into Primavera P6 Professional 23.12.1 in one import (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`).
  - As in H17-10, P6's import left each probe's labour assignment on A1070 with no work.
  - In ZZ-CPP-RZFG it also gave the equipment 2 units an hour, its 8 h of work in 4.
- Each project was then scheduled once with F9 on its own, at its own data date, on 18 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity in scope, 168 rows, with each file's SHA-256. The WBS summary row each clone carries (A1320) is left out, as the held-out scorers leave level of effort and WBS summary out. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-h17-followups.test.js`), with P6's import laid over each file as the held-out scorers lay it.

## The probes

Each is the whole case H17-10, cloned with its own identity, as it is or with one change around A1070:

| Probe | The change | A1070's early finish in P6 |
|---|---|---|
| ZZ-CPP-RZFA | none | Thu 10 Dec 07:00 |
| ZZ-CPP-RZFB | the labour assignment on its own resource working Mon-Fri 06:00-16:00, holidays kept | Thu 06:00 |
| ZZ-CPP-RZFC | the same, Mon-Fri 09:00-17:00 | Thu 09:00 |
| ZZ-CPP-RZFD | the labour assignment on its own resource that works Wed 9 Dec | Wed 9 Dec 16:00 |
| ZZ-CPP-RZFE | retained logic | Thu 07:00 |
| ZZ-CPP-RZFG | A1060 on Mon-Sat 11:00-19:00, so the requirement is Wed 19:00, off the activity calendar's working time; A1070's equipment on its own resource working Mon-Sat 08:00-12:00; the labour resource off Tue 8 Dec too | Thu 08:00 |
| ZZ-CPP-RZFS | the finish-to-finish link replaced by start-to-finish +40 h: the same requirement | Thu 07:00 |

A1070's early start is Wed 9 Dec 08:00 in every probe.

## What P6 does

In every probe the requirement off A1060 sets A1070's start (RQ), and the empty labour assignment sits at its resource's next opening at or after that start (RZ).

- **No activity working time between the finish and the requirement.** P6 prints the later of two instants: the finish, and the requirement as it stands on the activity calendar. That is the requirement itself at a close, or the activity calendar's next opening after a requirement off its working time.
  - ZZ-CPP-RZFA, -RZFE and -RZFS: the empty assignment sits at Thu 07:00, after a requirement at a close (Wed 16:00). P6 prints 07:00, under either scheduling mode and either link type.
  - ZZ-CPP-RZFB: it sits at Thu 06:00, and P6 prints 06:00.
  - ZZ-CPP-RZFG: it sits at Thu 07:00, before the requirement's next opening on the activity calendar, Thu 08:00, and P6 prints 08:00. The work there finishes Wed 12:00.
- **Activity working time between them.** The rule does not apply. ZZ-CPP-RZFC's empty assignment sits at Thu 09:00, after the activity calendar opens at 08:00, and P6 prints 09:00.
- **An empty assignment before the requirement.** In ZZ-CPP-RZFD it sits at Wed 08:00, and the finish is the requirement, Wed 16:00.

The rule this gives:

| Rule | What P6 does | Rows |
|---|---|---|
| ZP | Where the requirement sets the start and no activity working time separates the finish from it, the finish prints at the later of itself and the requirement as it stands on the activity calendar. | RZFA, RZFB, RZFE, RZFS (H17-10 A1070's shape); RZFG |

RQ's last clause printed the activity calendar's next opening after the later of the finish and the requirement. The two agree wherever the finish comes from work, since under RQ no assignment with work finishes after the requirement as it stands on the activity calendar. They differ only where an assignment with no work sits after a requirement at a close of the activity calendar and before that calendar's next opening.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.9 | 164 of 168: A1070's early finish in RZFA, RZFB, RZFE and RZFS |
| This candidate (ZP) | 168 of 168 |

ZP is in the hours pass, in both ports: `cpm-engine.js` (`_hrRsrcForward`) and `python_reference/cpm_hours.py` (`_rsrc_forward`). The whole-day pass is unchanged. On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H17, now fitted | 208 of 208 (207 before) |
| H1 to H16 | unchanged, every row: 3,741 of 3,741 |
| The probes of earlier rules (`tests/p6-h1-situations.test.js` to `tests/p6-susp-lag.test.js`) | every row, unchanged |

The builder is in the P6 oracle repository (`h17_followups_2026_10_18`).
