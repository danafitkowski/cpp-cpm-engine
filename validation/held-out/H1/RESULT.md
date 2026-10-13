# Held-out set H1: result

**195 of 206 unfinished activities match P6 on all seven fields.** Seven of the 12 projects match on every field of every activity. 1,410 of the 1,442 field comparisons match, and all 32 that do not are listed in [`results/summary.json`](results/summary.json).

This is the first and only score of `cpm-engine.js` v2.10.1 (SHA-256 `cf87f327…`) on this set. It was run once and is published as it came out, as [`../PROTOCOL.md`](../PROTOCOL.md) requires. Nothing was changed between the freeze and the score.

## Timeline (UTC, 13 October 2026)

| Time | Event |
|---|---|
| 16:24:36 | Protocol, generator, scorer, read-back and freeze script pushed (commit `72895d3`), naming drand round 6549295 |
| 16:44:30 | drand round 6549295 published; its randomness `9cc6df14…177e8` is the seed |
| 16:45 | `freeze.py` run; the set regenerates byte for byte from the seed |
| 16:46:56 | Freeze pushed (commit `287e0b7`): 12 XER files, `cases.json`, `manifest.json` |
| 16:48–17:01 | Each case imported into P6 Professional 23.12.1 on its own and scheduled (F9) on its own. `p6-capture.json` records the F9 times in the P6 machine's local time (UTC−4). |
| 17:02 | `readback_p6_sqlite.py`: 206 unfinished activities from 12 cases, none left out |
| 17:03 | `node score_held_out.js H1`, run once |

## By field

| Field | Match |
|---|---|
| Early start | 205 of 206 |
| Early finish | 205 of 206 |
| Late start | 199 of 206 |
| Late finish | 199 of 206 |
| Total float (hours) | 198 of 206 |
| Free float (hours) | 202 of 206 |
| Critical | 202 of 206 |

## By case

| Case | Unfinished | All seven fields match |
|---|---|---|
| H1-01 | 29 | 29 |
| H1-02 | 21 | 18 |
| H1-03 | 14 | 13 |
| H1-04 | 23 | 23 |
| H1-05 | 6 | 6 |
| H1-06 | 6 | 6 |
| H1-07 | 29 | 29 |
| H1-08 | 22 | 22 |
| H1-09 | 15 | 15 |
| H1-10 | 7 | 5 |
| H1-11 | 11 | 10 |
| H1-12 | 23 | 19 |
| **Total** | **206** | **195** |

## The 11 activities that differ

They fall into four kinds. (Corrected 13 October 2026: situation 3 first called H1-12's `CS_MSO` constraint a Mandatory Start; `CS_MSO` is Start On, and P6's Mandatory Start is `CS_MANDSTART`. The scores are unchanged.) Three involve work already under way at the data date that carries a constraint or an expected finish. The fourth is free float alone, with every date the same.

**1. Start On or Before on work already started (H1-02: A1070, A1100, A1130).** A1130 has a Start On or Before constraint dated 27 Jul 07:00, but it started on 28 Jul 12:30, before the data date (5 Aug 17:00). The engine sets A1130's late start to the constraint date, which gives it −69.5 h of total float. That float carries back to A1100 (start-to-start, −8 h lag), which also shows −69.5 h, and to A1070 (start-to-finish), which shows −176 h. P6 gives A1130 and A1100 a late start at the data date and 0 h of total float, and A1070 135.5 h. The engine also flags A1070 critical; P6 does not.

**2. As Late As Possible on work already started (H1-03: A1170).** A1170 is As Late As Possible and was under way at the data date: it started 13 Jul with 5 h remaining, and the data date is 15 Jul 08:00. P6 schedules the remaining work as late as it can, with an early start of 30 Jul 09:30 and −40 h of total float, and flags it critical. The engine starts the remaining work at the data date, with 55 h of total float. Both give the same late dates.

**3. An expected finish before the data date on started work with a Start On constraint (H1-12: A1010, A1030, A1050, A1190).** A1190 is under way and carries two things:

- an expected finish of 2 Feb 18:00, earlier than both its actual start (5 Feb 06:00) and the data date (6 Feb 08:00);
- a Start On constraint (P6 `CS_MSO`) of 3 Feb 06:00.

The engine's late finish for A1190 is the expected finish date, which gives it −103 h of float. That negative float carries back along the chain of links to A1010 (−59 h), A1030 and A1050 (−103 h each), and the engine flags A1010 and A1190 critical. P6 gives A1190 a late finish of 13 Feb 08:00 and 19 h of float, and gives its predecessors no negative float.

The generator drew an expected finish earlier than the activity's own start. Real updates rarely carry that combination, but P6 accepts it, and the case stands as frozen.

**4. Free float across a lag on another calendar (H1-10: A1110, A1120; H1-11: A1110).** All dates and total float match on these activities; only free float differs. Free float is measured on each of these three links:

| Activity | Link and lag | Calendars | Free float: engine / P6 |
|---|---|---|---|
| H1-10 A1110 | Finish-to-finish to A1120, −8 h, lag on the 24-hour calendar | Monday-Saturday to Monday-Friday | 0 h / 3 h |
| H1-10 A1120 | Finish-to-finish to a finish milestone, +16 h, lag on the 24-hour calendar | Monday-Friday to Monday-Saturday | 31 h / 39 h |
| H1-11 A1110 | Finish-to-start to a finish milestone, −4 h, lag on the successor's calendar | Every-day 24-hour to Monday-Saturday | 460 h / 476 h |

## What this result does and does not say

It speaks for 12 random synthetic networks, on the features listed in the protocol, scheduled by one copy of P6.

On those networks the engine reproduced P6 on every field for 195 of 206 unfinished activities (94.7%). Every difference traces to one of the four situations above.

The engine is not changed against this set. If a later release changes how the engine handles any of the four situations, that release is scored on a new held-out set seeded the same way. H1's result stays as published here.
