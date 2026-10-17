# P6 probes: the five rows held-out set H12 left

Held-out set H12 ([`../../held-out/H12/RESULT.md`](../../held-out/H12/RESULT.md)) scored the v2.10.8 candidate once at 274 of 279. v2.10.7 has all five differences too. They fall in three shapes no probe had measured:

- **H12-06 A1210:** resource dependent work under way with an expected finish. P6 restarts it later than the engine does.
- **H12-09 A1330, with A1260 and A1200 before it:** a Mandatory Start in a project whose must-finish-by date gives it negative float.
- **H12-11 A1160:** the late finish of resource dependent work with two assignments, where a start-to-start bound falls between the assignments' late starts.

Five synthetic probe projects measured what P6 does in each shape, one factor at a time. The engine was then changed to reproduce them, so the probes, and H12, are **fitted**: they are not a held-out test.

**How they were captured.**
- The five were imported into Primavera P6 Professional 23.12.1 in one import (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). P6's import re-sized only resource dependent work, as it does all such work: 20 values in each of ZZ-CPP-RDXP and -RDXR, 13 in ZZ-CPP-RD2S, none in ZZ-CPP-MSNP or -MSNR.
- Each project was then scheduled once with F9 on its own, at its own data date, on 17 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 74 rows, with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-h12-followups.test.js`), with P6's import laid over each file as the held-out scorers lay it.

## What P6 does

### An expected finish on resource dependent work

**ZZ-CPP-RDXP** (progress override) and **ZZ-CPP-RDXR** (retained logic) carry the same twelve rows, X1 to X12, and P6 gives the same values under both.
- **The setup:** H12-06 A1210's situation. Use Expected Finish Dates is on and the data date is Tue 1 Dec 2026 08:00. The activity calendar is Mon-Fri 07:00-17:00. The assignments are R1 (Mon-Sat 08:00-16:00, 29 at 1/h) and R2 (the activity calendar's hours, 14.5 at 0.5/h).
- **The rows:** they vary one factor at a time: the suspension, the FF predecessor, one or two assignments, started or not, task or resource dependent, and where the expected finish and the requirement fall.

| What P6 does | Rows |
|---|---|
| The expected finish re-sizes each assignment from the data date to the expected finish (XR, as measured on 13 October). This holds with or without a suspension, with one or two assignments, started or not, and with an FF requirement that falls at the expected finish. | X1-X7, X12; X9 (task dependent) |
| An expected finish before the work would finish shortens it to the expected finish. | X10 |
| An FF requirement later than the expected finish places the work against the requirement, as RQ does. The expected finish then re-sizes nothing: each assignment keeps its 29 h. | X11; H12-06 A1210, whose FF predecessor finishes Fri 8 May 08:00, after its Thu 7 May 17:00 expected finish |
| An FF requirement with no expected finish places work under way by RQ, under progress override too. | X8 |

### Mandatory constraints under negative float

**ZZ-CPP-MSNP** (progress override) and **ZZ-CPP-MSNR** (retained logic) carry the same rows, M1 to M9, and P6 gives the same values under both.
- **The setup:** H12-09's situation. The data date is Sat 24 Oct 2026 00:00 and the project must finish by Fri 13 Nov 2026 00:00. Every row is task dependent and not started.

| What P6 does | Rows |
|---|---|
| A Mandatory Start or Mandatory Finish sets its own late date whatever its successors need, as MP (v2.10.4) does. | M3, M6, and M8, whose successor needs an earlier late finish |
| The project's must-finish-by date still caps that late finish. Where the pin would put the late finish after it, P6 keeps the late finish the must-finish-by date gives, and the late start that much earlier, so the float goes negative. | M1 (H12-09 A1330's shape, a predecessor finishing after the constraint), M2, M4 (a Mandatory Start on non-working time), M5 (a Mandatory Finish), M9 |
| Predecessors take their late dates from that late start. | P1, P9 |
| A Start On keeps the earlier bound (control). | M7 |

### A start-to-start or start-to-finish bound on two assignments

**ZZ-CPP-RD2S** (retained logic, the smaller float, lag calendar of the successor, as H12-11) has eight rows, S1 to S8.
- **The setup:** each row is resource dependent, not started, with assignments Q1 (Mon-Sat 08:00-16:00) and Q3 (the activity calendar's hours). From the must-finish-by date their own late starts are Mon 26 Oct 14:30 and Wed 28 Oct 10:00.

| What P6 does | Rows |
|---|---|
| P6 holds the bound against the activity's late start, the earliest of its assignments' own. Where that start meets the bound, no assignment takes it, not even one whose own late start is later. The late finish is then the later assignment's. | S1 (H12-11 A1160's shape), S4 (start-to-finish), S5 (a lead) |
| Where the bound falls before the activity's late start, every assignment takes it (RL). | S2 |
| One assignment (L13), and work under way, which takes no start bound. | S6, S7 |
| A finish-to-start successor (control). | S8 |

## The engine

Three rules were taken from these answers, in both ports. The whole-day pass takes MC as well.
- **RX:** an FF or SF requirement later than the expected finish places resource dependent work by RQ, and the expected finish re-sizes nothing.
- **MC:** the project's late finish caps a mandatory pin.
- **RA:** an SS or SF bound on resource dependent work is held against the activity's late start.

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.7 | 49 of 74 |
| The candidate H12 scored | 55 of 74 |
| This candidate (RX, MC, RA) | 74 of 74 |

The changes are in `cpm-engine.js` and in `python_reference/cpm_hours.py` and `cpm.py`. On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H12, now fitted | 279 of 279 (274 before) |
| H1 to H11 | unchanged, every row |
| The probes of H9's, H10's and H11's rows | 53 of 53, 55 of 55, 28 of 28 |
| The 13-Oct-2026 resource dependent probes | 126 of 126 |

The builder is in the P6 oracle repository (`h12_followups_2026_10_17/build_h12p.py`).
