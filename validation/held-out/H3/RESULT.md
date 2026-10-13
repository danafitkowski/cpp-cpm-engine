# Held-out set H3: result

**244 of 253 unfinished activities match P6 on all seven fields.** Nine of the 12 cases match on every field. The nine differing activities come from three causes. All three were already present in engine 2.10.2, and the candidate introduced none of them. One of the three falls inside a situation the candidate changed, so it counts against that change.

This is the first and only score of the engine 2.10.3 release candidate on this set. The engine is `cpm-engine.js`, SHA-256 `60927cd4aef66adc9bb61d9ecead22ac69e82b27686e3208822d9143199bb98c`. Nothing was changed between the freeze and the score. After the score, the engine, the four scripts, both protocols and the 12 cases still hash to [`cases/manifest.json`](cases/manifest.json). The read-back kept all 12 cases.

## What H3 tested, and what it did not

H3 is the held-out test of the three rules the H2 probes led to ([`PROTOCOL.md`](PROTOCOL.md)):

- **MD:** a Mandatory Start or Mandatory Finish dated before the data date, on work not started;
- **SR:** free float to a start-to-start successor out of work under way;
- **SO:** start-to-start and start-to-finish links out of work under way, under progress override.

A diagnosis run after the score shows where the candidate's output differs from v2.10.2's on this set: 71 fields on 18 activities, in three cases. Every one of those 71 values moved onto P6's. None moved away from P6.

| Rule | Where H3 exercised it | What the candidate changed |
|---|---|---|
| MD | H3-04 A1100: a Mandatory Finish of Fri 3 Apr 17:00, a week before the data date | Early start, early finish and total float, all onto P6 (3 fields) |
| SO | 10 links in 6 cases, all with lag counted from Early Start | H3-02: two free-float values, onto P6. H3-10: 66 fields on 15 activities, onto P6, from three links with lags of 0, 8 and 40 h. One link, in H3-04, differs from P6 (difference 1 below). |
| SR | Start-to-start links out of work under way in the four retained-logic cases (H3-05, H3-07, H3-08, H3-09) | Nothing: on these links the old and new rules give the same free float |

So H3 confirms MD on one activity and SO on two cases, blind. It neither confirms nor contradicts SR.

## The three differences

**1. H3-04 A1230: a start-to-start link out of work under way, under progress override, with lag counted from Early Start. This counts against SO.**

- The project schedules with progress override and counts start-to-start lag from Early Start (`sched_lag_early_start_flag = Y`). The data date is Fri 10 Apr 2026 17:00.
- A1160 is under way on a Monday-to-Friday calendar (08:00–12:00 and 13:00–17:00), so the data date falls at the end of its working day. Its remaining work restarts Mon 13 Apr 08:00. P6 and the engine agree on that.
- A1230 has not started. It has 56 h of work on a 24-hour calendar and one predecessor: A1160, start-to-start with no lag.
- P6 starts A1230 at the data date, Fri 10 Apr 17:00.
- The engine starts it at A1160's restart, Mon 13 Apr 08:00.
- The difference carries to A1260, which follows A1230 with a 16 h lag. The engine starts A1260 on Thu 16 Apr; P6 starts it on Tue 14 Apr. It also carries to A1210's free float into A1260: 20 h in the engine, 4 h in P6.
- Nine fields differ, on three activities.

The probes behind SO measured progress override only with lag counted from Actual Start (`ZZ-CPP-H2S-RO`). Under that setting the engine already anchors the link at the data date. This case uses the other setting, which was not probed, and the candidate gives the same values here as v2.10.2.

A diagnosis after the score re-ran this case with start-to-start lag counted from Actual Start, the setting under which the engine anchors such a link at the data date. The engine then gives P6's values on all 29 of H3-04's unfinished activities. The same re-run of the other six cases that count lag from Early Start under progress override moves no value off P6's.

**2. H3-11 A1150: Start On or Before on a finish milestone. This is another situation.**

- A1150 is a finish milestone, not started, on a Monday-to-Friday 07:00–17:00 calendar. It carries Start On or Before, Mon 27 Apr 07:00. It is the only start constraint on a finish milestone in H1, H2 and H3.
- P6 keeps the constraint on the activity but does not apply it. A1150's late finish is Fri 8 May 13:30, with 145.5 h of total float.
- The engine applies it. A1150's late finish is Fri 24 Apr 17:00, the end of the last working day before the constraint date, with 49 h of total float.
- The engine's earlier late finish carries to two predecessors: A1100 (finish-to-finish) and A1110 (finish-to-start).
- Nine fields differ, on three activities: late start, late finish and total float on each.

A diagnosis after the score removed the constraint from A1150. The engine then gives P6's values on all three activities.

**3. H3-11 A1270 and H3-12 A1220: a late start at a lunch break. This is another situation.**

Each activity's late start is set by a start-to-start successor with a negative lag, and it lands exactly at the start of a lunch break:

- **H3-12 A1220** (16 h; Monday to Thursday 07:00–12:00 and 13:00–17:30). Its successor A1290 (lag −4 h) has a late start of Tue 26 Jan 2027 08:00, and 4 h of work later is 12:00. P6 prints A1220's late start as 12:00, the end of the morning. The engine prints the same point of working time as 13:00, the start of the afternoon.
- **H3-11 A1270** (16 h; Monday to Thursday 07:00–12:00 and 12:30–17:30). Its successor A1320 (lag −16 h) has a late start of Mon 4 May 16:30, and 16 h of work later is Wed 6 May 12:00. P6 prints 12:00 and the engine prints 12:30.

On each activity's own calendar the two times are the same point, and its late finish, total float and free float agree with P6.

A1270's predecessor A1210 is on a 24-hour calendar (finish-to-start, no lag), and there the half hour is real. A1210's late finish is Wed 6 May 12:00 in P6 and 12:30 in the engine, and its late start and total float follow.

Five fields differ, on three activities.

## By field

| Field | Candidate (the score) | v2.10.2 (diagnosis after the score) |
|---|---|---|
| Early start | 251 of 253 | 237 of 253 |
| Early finish | 251 of 253 | 237 of 253 |
| Late start | 247 of 253 | 237 of 253 |
| Late finish | 249 of 253 | 239 of 253 |
| Total float (hours) | 247 of 253 | 235 of 253 |
| Free float (hours) | 250 of 253 | 239 of 253 |
| Critical | 253 of 253 | 253 of 253 |
| **All seven** | **244 of 253** | **226 of 253** |

v2.10.2's differences are the candidate's nine activities plus the 18 the candidate moved onto P6.

## Timeline (UTC, 13 October 2026)

| Time | Event |
|---|---|
| 21:30:40 | Branch `v2.10.3-candidate` created on GitHub at `60f7fff` (GitHub's repository activity record), carrying the engine 2.10.3 candidate (`5393c3b`) |
| 21:31:52 | Protocol pushed (`1045fb1`), naming drand round 6549889 |
| 21:41:30 | drand round 6549889 published; its randomness `0d4a3079…` is the seed |
| 21:41:42 | `freeze.py` run |
| 21:42:03 | Freeze pushed (`e9545f4`) |
| 21:43:42–21:57:19 | Each case imported into P6 Professional 23.12.1 on its own and scheduled once (F9). The first import is at 21:43:42; the last F9 is stamped 21:57:19. |
| 21:58:15 | Read-back (all 12 cases kept) |
| 21:58:18 | `node score_held_out.js H3`, run once |
| 22:02:55 | Raw result pushed (`cea208e`) |

## What this result does and does not say

- **Scope.** It speaks for 12 random synthetic networks, drawn as H1's and H2's were and scheduled by one copy of P6.
- **The change.** On those networks the candidate moved 71 values onto P6's and none away. The 18 activities they belong to all now match P6 on every field.
- **Against the change.** One situation inside SO differs from P6: progress override with lag counted from Early Start, where the data date falls at the end of the predecessor's working day and the successor's calendar is working at the data date. v2.10.2 gave the same values.
- **Not covered.** Two other differences remain, listed above. Both were already present in v2.10.2. SR was not exercised.
- **What happens next.** The engine is not changed against H3. A later engine that changes any of these situations is scored on a new held-out set, and H3's result stays as published.
