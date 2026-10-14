# Held-out set H4: result

**233 of 237 unfinished activities match P6 on all seven fields.** Ten of the 12 cases match on every field. The four differing activities come from two causes. Both were already present in engine 2.10.3, and the candidate introduced neither. Neither falls in a situation the candidate changed.

This is the first and only score of the engine 2.10.4 release candidate on this set. The engine is `cpm-engine.js`, SHA-256 `c730158210afcef9969140659c0fdcf3c642a2fd0f13d96c47b20de4c4c93881`. Nothing was changed between the freeze and the score. After the score, the engine, the four scripts, both protocols and the 12 cases still hash to [`cases/manifest.json`](cases/manifest.json). The read-back kept all 12 cases.

## What H4 tested, and what it did not

H4 is the held-out test of the rules the H3 probes led to ([`PROTOCOL.md`](PROTOCOL.md)):

- **PD:** under progress override, a start-to-start or start-to-finish link out of work under way is laid from the data date under either "lag from" setting;
- **MC:** a milestone applies no constraint of its other end;
- **LC:** a lead landing on a close stays there as the late start, and how P6 breaks a tie between that bound and the late finish;
- **XM:** under "Use Expected Finish Dates", a milestone sits no earlier than its expected finish.

A diagnosis run after the score shows where the candidate's output differs from v2.10.3's on this set: **nowhere**. Of the 1,659 compared values, none moved. The draw did contain some of the changed situations, but none where the old and new rules disagree:

| Rule | Where H4 drew it | What the candidate changed |
|---|---|---|
| PD | 3 links: H4-08 A1010 → A1030 (SS), H4-09 A1130 → A1140 (SF), H4-11 A1060 → A1130 (SS), all with no lag | Nothing: the old and new rules give the same values here. All three successors match P6 under both versions. |
| LC | 4 leads out of work not started: H4-02, H4-03 (two), H4-04 | Nothing: the old and new rules give the same values here. All match P6 under both versions. |
| MC | None: no milestone carries a constraint of its other end | — |
| XM | None: no milestone carries an expected finish | — |

So **H4 neither confirms nor contradicts any of the four rules**. They rest on the fitted probes ([`../../p6-probes/h3-situations-2026-10-14/`](../../p6-probes/h3-situations-2026-10-14/), 537 of 537) and on the P6 database the candidate was checked against before the freeze, where no row moved away from P6. What H4 does show is that the change did no harm on 12 new networks drawn as before: v2.10.3 and the candidate give the same 233 of 237.

## The two differences

**1. H4-08 A1060: As Late As Possible work under way, under progress override, whose successor has started. This is another situation.**

- The project schedules with progress override. The data date is Thu 6 Aug 2026 08:00.
- A1060 is under way (actual start Thu 30 Jul 07:00) with 4 h left, on a Monday-to-Thursday calendar (07:00–12:00 and 12:30–17:30). It is As Late As Possible.
- It has two successors: A1070 (finish-to-start, no lag), which has also started, and A1120 (finish-to-start, −4 h), which is complete.
- Under progress override a finish-to-start link into a successor already under way holds nothing back on the late side, and P6 and the engine agree on A1060's late dates (Wed 9 Sep 07:00 to 11:00).
- P6 slides A1060's remaining work all the way to those late dates: early start Wed 9 Sep 07:00, total and free float 0, critical.
- The engine keeps it at the data date, held back by the started successor: early start Thu 6 Aug 08:00, 189 h of total and free float, not critical.
- Five fields differ, on one activity.

A diagnosis after the score removed the link from A1060 to A1070, the one P6 ignores here. The engine then gives P6's values on A1060, and A1070 does not move.

The As Late As Possible rule that v2.10.2 measured (`ZZ-CPP-H1S-O L8`) covers a start-to-start or start-to-finish link out of work under way. This case is a finish-to-start link into a successor under way, which was not probed.

**2. H4-07 A1120, A1050 and A1040: a Mandatory Start tied with a start-to-start bound that falls on a weekend. This is another situation.**

- A1120 has not started. It has 12 h of work on a Monday-to-Thursday calendar (07:00–12:00 and 12:30–17:30) and a Mandatory Start of Mon 14 Sep 2026 07:00.
- Its successor A1130 (start-to-start, no lag) has a late start of Sat 12 Sep 06:00 on its own seven-day calendar. On A1120's calendar that falls back to the close before it, Thu 10 Sep 17:30.
- The two bounds are the same point of A1120's working time: nothing is worked between Thursday 17:30 and Monday 07:00.
- P6 prints A1120's late start as the mandatory date, Mon 14 Sep 07:00.
- The engine prints the Thursday close. On A1120's calendar the two agree, and its late finish and float match P6.
- A1120's predecessor A1050 (finish-to-start, no lag) works every day 06:00–18:00, and there the gap is real. In P6 A1050's late finish is Mon 14 Sep 07:00 with −21 h of total float. In the engine it is Thu 10 Sep 17:30, with −58.5 h. The difference carries on to A1040 (P6 −42 h, engine −58.5 h).
- Seven fields differ, on three activities: late start on all three, late finish and total float on A1050 and A1040.

A diagnosis after the score removed the link from A1120 to A1130. The engine then gives P6's values on A1120, A1050 and A1040.

The candidate keeps the earlier instant when two late-start bounds tie, as P6 did on H3-02 A1240, where both bounds are links. Here one of the bounds is the activity's own Mandatory Start, and P6 takes the mandatory date. v2.10.3 gives the same values.

## By field

The candidate and v2.10.3 give the same values on every field, so one column serves for both.

| Field | Candidate (the score) and v2.10.3 (diagnosis after the score) |
|---|---|
| Early start | 236 of 237 |
| Early finish | 236 of 237 |
| Late start | 234 of 237 |
| Late finish | 235 of 237 |
| Total float (hours) | 234 of 237 |
| Free float (hours) | 236 of 237 |
| Critical | 236 of 237 |
| **All seven** | **233 of 237** |

## Timeline (UTC, 14 October 2026)

| Time | Event |
|---|---|
| 06:53:41 | Branch `v2.10.4-candidate` created on GitHub at `a21994f` (GitHub's repository activity record) |
| 08:55:08 | Engine 2.10.4 candidate pushed (`16f89c7`, with `700e3a0`) |
| 08:56:04 | Protocol pushed (`e453720`), naming drand round 6551257 |
| 09:05:30 | drand round 6551257 published; its randomness `7da81a07…` is the seed |
| 09:05:57 | `freeze.py` run |
| 09:06:11 | Freeze pushed (`6cf70e3`) |
| 09:07:18–09:22:59 | Each case imported into P6 Professional 23.12.1 on its own and scheduled once (F9). The first project is created at 09:07:18; the last F9 is stamped 09:22:59. |
| 09:23:25 | Read-back (all 12 cases kept) |
| 09:23:29 | `node score_held_out.js H4`, run once |
| 09:23:42 | Raw result pushed (`f80ee71`) |

## What this result does and does not say

- **Scope.** It speaks for 12 random synthetic networks, drawn as H1's to H3's were and scheduled by one copy of P6.
- **The change.** On those networks the candidate moved no value. It neither gained nor lost a match against v2.10.3.
- **The rules.** H4 drew no case where PD, MC, LC or XM decides a value, so it gives no blind evidence for or against them. They rest on the fitted probes and the database check.
- **Not covered.** Two differences remain, listed above. Both were already present in v2.10.3, and neither is in a situation the candidate changed.
- **What happens next.** The engine is not changed against H4. A later engine that changes either situation is scored on a new held-out set, and H4's result stays as published.
