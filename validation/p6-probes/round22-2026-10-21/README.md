# P6 probes, round 22 (21 October 2026): held-out H29's two causes, and the float-type codes on the QA shape

Held-out H29 ([`../../held-out/H29/RESULT.md`](../../held-out/H29/RESULT.md)) matched P6 on 673 of 676 unfinished
activities. The three that differed fall under two causes no probe had measured. Round 21
([`../round21-2026-10-21/`](../round21-2026-10-21/)) had also left the float-type codes to measure on a shape where
start float and finish float of resource dependent work differ.

These 18 synthetic probes were built with `build_r22.py` in the P6 oracle and committed with the predictions of the
candidate and of v2.10.12 before P6 saw them. They were imported once into EPS ZZ-CPP-TEST (projects 5639 to 5656). FIN
was set in P6 as the end of the float paths of FC4 and FC7, and the dialog kept their FT_FF and FT_Min. Each probe was
recorded before its F9, then opened alone and scheduled once. 80 unfinished activities; none left out.

## ZB: work with no work left on an activity calendar that has the day off (H29-06 A1700, H29-12 A1560)

F is As Late As Possible resource dependent work whose one assignment has no work left. Its resource works Mon-Thu
08:00-16:00, and F is bound by a task held on Sun 7-Mar (start-to-start) or Sat 6-Mar (finish-to-start). F's activity
calendar works every day 00:00-24:00 but one day.

| Probe | F's calendar | F in P6 |
|---|---|---|
| ZB1 | off Mon 8-Mar; start-to-start bound | Mon 8-Mar 08:00, total float 232 h |
| ZB2 | off Mon 8-Mar; finish-to-start bound | Mon 8-Mar 08:00, 230 h |
| ZB3 | off Tue 9-Mar instead | Mon 8-Mar 08:00, 224 h |
| ZB4 | every day 09:00-17:00 | Mon 8-Mar 08:00, 87 h |
| ZB5 | ZB1 with 8 units of work left | Thu 4-Mar 08:00 to 16:00, 312 h |

P6 keeps work with no work left at its resource's opening (AZ). It does so on a day the activity calendar has off
(ZB1, ZB2), and before that calendar opens (ZB4). The engine had then run the start on to the activity calendar's next
opening (AV), a day later in ZB1 and ZB2 and an hour later in ZB4. AV now leaves work with no work left where AZ puts
it. Work with work left is unchanged (ZB5).

## LC: a Mandatory Start on a day its resource has off (H29-05 A1710)

R is 24 h of resource dependent work on a Mon-Sat 08:00-16:00 calendar. It has 24 units on a resource that works
Mon-Thu 07:00-12:00 and 13:00-17:30 and Fri 07:00-11:00, a Mandatory Start on Wed 10-Mar 08:00 and, in LC1, a Finish On
or Before on Sat 13-Mar 16:00. The import fits the units over the resource's 13.5 h in the planned window.

| Probe | Change from LC1 | R's late dates in P6 |
|---|---|---|
| LC1 | (the resource off Wed 10-Mar) | Tue 9-Mar 07:00 to Thu 11-Mar 11:00, total float -21 h |
| LC2 | no second constraint | the same |
| LC3 | the resource off Tue 9-Mar instead | Wed 10-Mar 08:00 to Fri 12-Mar 11:00, 0 h |
| LC4 | the resource not off | the same as LC3 |
| LC5 | Finish On or Before Fri 12-Mar 16:00 | the same as LC1 |
| LC6 | Finish On or Before Mon 15-Mar 16:00 | the same as LC1 |

Where the resource has the Mandatory Start's day off as a holiday, P6 runs R on the late side from Tue 07:00, for its
13.5 h of work, to Thu 11:00. The engine had placed R back from the finish the pin gives on the activity calendar with
the stored duration (Fri 16:00), at Thu 07:00 to Fri 11:00. The second constraint makes no difference (LC2, LC5 and LC6
equal LC1).

Round 23 ([`../round23-2026-10-21/`](../round23-2026-10-21/)) found the mechanism, rule MO. On resource dependent work
with no expected finish in force, the pin runs from the Mandatory Start for the span, on the activity calendar, of the
work placed forward from it on its resources' own calendars. Here that work runs Thu 07:00 to Fri 11:00, 11 h, so the
pin ends Thu 11:00 and the work placed back from there starts Tue 07:00. An expected finish in force keeps the stored
duration (H24's probe ZZ-CPP-MXR X1 and X3, [`../h24-shapes-2026-10-19/`](../h24-shapes-2026-10-19/)). Round 18's RE1
and RE2, a four-hour version of the same shape capped by a Start On or Before, come out the same either way.

## FC: the float-type codes on round 17's QA1

QA1 is progress override with "Calculate multiple float paths" on free float. R is resource dependent work not started
and U is resource dependent work under way; R's start float is 146 h and its finish float 148 h, and U's 154 h and 166 h.

| Probe | Code | R / U total float in P6 |
|---|---|---|
| FC1 | FT_SS | 146 / 154 h: start float |
| FC2 | FT_Total | 148 / 166 h: FT_Start, with RT |
| FC3 | FT_FF | 148 / 166 h: finish float |
| FC4 | FT_FF, FIN set in P6 as the end of the float paths | 148 / 166 h |
| FC5 | FT_SS under retained logic | 146 / 154 h |
| FC6 | FT_SS without multiple float paths | 146 / 154 h |
| FC7 | FT_Min, FIN set in P6 as the end of the float paths | 146 / 166 h: the smaller, RT on U |

FT ([`../round21-2026-10-21/`](../round21-2026-10-21/)) already reads every one of these. FT_SS sets RT aside, on work not
started and on work under way, under either schedule mode, with or without multiple float paths. An end set in P6 changes
no float definition.

## Scores

With FT but before MO and AZ's exception to AV, both engines matched 73 of 80 rows. The candidate before FT (engine
e605a226) matched 67, and v2.10.12 66. With them, both engines match all 80. `tests/p6-round22.test.js` replays them.
