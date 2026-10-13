# Held-out set H2: result

**169 of 171 unfinished activities match P6 on all seven fields,** on the 11 cases the frozen read-back kept. Ten of those 11 match on every field. The read-back left out H2-09 by a false alarm, explained below. Read back with that alarm corrected, all 12 cases score **174 of 176**, and H2-09's five activities all match. Both results are published here.

This is the first and only score of the engine 2.10.2 release candidate on this set. The engine is `cpm-engine.js`, SHA-256 `b0fb8089c58123a8f2bb316bc47a7511ba5ba49d7076aaab7a91c79bcfbbdfec`. Nothing was changed between the freeze and the score.

## What H2 tested, and what it did not

H2 is the held-out test of the three rules that H1 led to ([`PROTOCOL.md`](PROTOCOL.md)):

- start constraints on work under way;
- As Late As Possible under way and past its late finish;
- free float across a lag on another calendar.

H2's random draw exercised only the third. The candidate's output differs from v2.10.1's on exactly two fields in the whole set. Both are free float in H2-11, where the lag runs on the 24-hour calendar:

| Activity | v2.10.1 | Candidate | P6 |
|---|---|---|---|
| H2-11 A1050 | 1 h | 7 h | 7 h |
| H2-11 A1120 | 202 h | 200 h | 200 h |

So H2 confirms the free-float rule, blind, on both rows it touched.

No H2 case has a started activity carrying Start On or Before, Start On or Mandatory Start, and no As Late As Possible activity whose dates the new rule moves. H2 therefore neither confirms nor contradicts the other two rules. Their evidence remains the P6 probes they were written to ([`../../p6-probes/h1-situations-2026-10-13/`](../../p6-probes/h1-situations-2026-10-13/)), which is fitted.

## The two differences

Both differences were already present in v2.10.1, and neither is one of the three situations the candidate changes.

**1. H2-06 A1130: a Mandatory Start dated before the data date, on work not started.**

- The activity has 40 h to do and a Mandatory Start of 23 Jun 08:00. The data date is 26 Jun 08:00.
- P6 does not start work before the data date. It gives an early start of 26 Jun 08:00 and an early finish of 2 Jul 17:00. It keeps the mandatory date on the late side (late start 23 Jun 08:00, late finish 29 Jun 17:00), so total float is −24 h.
- The engine pins the early start to the constraint date, 23 Jun 08:00, before the data date, and reports 0 h.
- Three fields differ: early start, early finish and total float.

**2. H2-03 A1160: free float to a start-to-start successor, out of work under way, with lag counted from the actual start.**

- The project's scheduling options count start-to-start lag from the actual start (`sched_lag_early_start_flag = N`).
- A1160 is under way. Its remaining work restarts at 3 Jun 09:00, and its start-to-start successor restarts at 9 Jun 16:30.
- P6's free float is 37 h, measured from the restart.
- The engine measures from the data date, 3 Jun 08:00, and gets 38 h.
- One field differs: free float, by 1 h.

## H2-09 and the read-back

`readback_p6_sqlite.py` leaves out a case if any activity or relationship row was updated after the F9. For H2-09 it reported "5 rows edited after the F9". No row was edited:

- the case was imported at 14:58:42 (local time, UTC−4) and scheduled once;
- P6 stamped that F9 at 14:58:58.986;
- P6 wrote the five rows the F9 changed at 14:58:59, a whole-second time that is 14 ms after the millisecond stamp.

The check compares those two times as strings, so it read the F9's own writes as later edits. In every H1 case and in the other 11 H2 cases, the F9 finished within the second it was stamped, and the check never fired.

The protocol does not allow the read-back to change between the freeze and the score. So the primary result above is the frozen read-back's. [`supplementary/`](supplementary/) holds a copy of the read-back, [`readback_same_second.py`](supplementary/readback_same_second.py). Its one change counts rows written in the second the F9 ends as the F9's own. It holds that read-back's `p6-results.csv` and `p6-capture.json` and the scorer's output on all 12 cases.

On the 11 cases both read-backs keep, P6's values are identical row for row. A later set will use the corrected check from its protocol commit onward.

## By field

| Field | 11 cases (frozen read-back) | 12 cases (supplementary) |
|---|---|---|
| Early start | 170 of 171 | 175 of 176 |
| Early finish | 170 of 171 | 175 of 176 |
| Late start | 171 of 171 | 176 of 176 |
| Late finish | 171 of 171 | 176 of 176 |
| Total float (hours) | 170 of 171 | 175 of 176 |
| Free float (hours) | 170 of 171 | 175 of 176 |
| Critical | 171 of 171 | 176 of 176 |
| **All seven** | **169 of 171** | **174 of 176** |

For comparison, v2.10.1 on the same 12 cases (a diagnosis run after the score) gives 172 of 176. Its differences are the two above plus H2-11's two free-float rows.

## Timeline (UTC, 13 October 2026)

| Time | Event |
|---|---|
| 18:24:39 | Branch `v2.10.2-candidate` created on GitHub at `13e699e` (GitHub's repository activity record): the engine 2.10.2 candidate (`71425fc`) and this set's protocol, naming drand round 6549541 |
| 18:47:30 | drand round 6549541 published; its randomness `6522a72b…` is the seed |
| 18:48:01 | `freeze.py` run; the set regenerates byte for byte from the seed |
| 18:48:28 | Freeze pushed (`f5e70b5`, GitHub's record) |
| 18:49–19:02 | Each case imported into P6 Professional 23.12.1 on its own and scheduled once (F9) |
| 19:03 | Read-back (11 cases kept), then `node score_held_out.js H2`, run once |
| 19:04:01 | Raw result pushed (`831afb4`) |

## What this result does and does not say

- **Scope.** It speaks for 12 random synthetic networks, drawn as H1's were and scheduled by one copy of P6.
- **The change.** On those networks the candidate never moved a P6-matching value away from P6. It moved two free-float values onto P6's.
- **Not covered.** Two older differences remain, and both are listed above. The rules for start constraints and As Late As Possible under way are not tested by this set.
- **What happens next.** The engine is not changed against H2. A later engine that changes the two situations above is scored on a new held-out set, and H2's result stays as published.
