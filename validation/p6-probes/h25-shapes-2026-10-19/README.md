# P6 probes: the shapes held-out H25 found

Held-out set H25 ([`../../held-out/H25/RESULT.md`](../../held-out/H25/RESULT.md)) scored the v2.10.12 candidate at 384 of 391. Its 7 differences came from two shapes, both resource dependent work. These two probes measured both and their neighbours on 19 October 2026 (round 10), imported together into EPS ZZ-CPP-TEST.

## The probes

Synthetic projects built from scratch. Retained logic, "Make open-ended activities critical" and "Use Expected Finish Dates" on, the predecessor's calendar for lags.

**ZZ-CPP-ZLB** (H25-02 A1460, H25-08 A1220). The data date is Mon 7 Dec 2026 08:00. Each B is resource dependent work not yet started on Mon-Fri 08:00-12:00 and 13:00-17:00, behind P (8 h). Its start-to-start successor M, a finish milestone held by a Finish On or Before at a close, bounds its late start; its finish-to-start successor E, a finish milestone held by a Finish On or Before Mon 14 Dec 17:00, sets its late finish. Each has an assignment with no work left and a lag on a resource every day 06:00-18:00, and most have one with work on the activity calendar's hours:

- **B1**, H25-02 A1460's shape: 8 h of work and a 16 h lag, M held to Fri 11 Dec 17:00. The lag lands Sun 13 Dec 09:00, back to Fri 17:00 on the activity calendar, and the work runs Mon 14 Dec 08:00-17:00.
- **B2**, H25-08 A1220's shape: 16 units at 2 an hour and a 14 h lag.
- **B3**: B1 with M held to Thu 10 Dec 17:00. The work then finishes Fri 17:00, where the lag's landing goes back to.
- **B4**: B1 with 4 h of work, which finishes Mon 14 Dec 12:00.
- **B5**: the lagged assignment alone.
- **B6**: B1 with a second assignment of the same resource, a 10 h lag. P6's import kept one assignment per resource on an activity, so B6 is B1 as P6 holds it, and `zlb.xer` leaves the second one out.
- **B7**: 16 h of work and a 21 h lag, M held to Wed 9 Dec 12:00. The lag lands Fri 11 Dec 09:00, on the activity calendar's hours.

**ZZ-CPP-ALZ** (H25-01 A1310). The data date is Mon 7 Dec 2026 06:00. Each A is resource dependent work not yet started, As Late As Possible, on a calendar every day 06:00-18:00, planned from Sun 13 Dec 06:00, behind P (finishing Mon 14 Dec 11:30). Its finish-to-start successor S, held by a Start On or After, sets the slide's bound. Each A has 8 units with a 4 h lag on a resource every day 06:00-18:00 that has Mon 14 Dec off; most also have an assignment written with 6 units at 0.5 an hour on a resource Mon-Thu 07:00-12:00 and 13:00-17:30, Fri 07:00-11:00. That resource has no hours in the planned window, so P6's import leaves the assignment with no units and no duration. Early, the work runs Tue 15 Dec 10:00 to 18:00, and the assignment with no duration sits at Mon 14 Dec 11:30.

- **A1**, H25-01 A1310's shape: S held to Wed 16 Dec 06:00. No working time lies between the early finish and the bound.
- **A2**: S held to Thu 17 Dec 06:00, a slide of 12 working hours.
- **A3**: A2 without the assignment with no duration.
- **A4**: A2 with that assignment lagged 2 h.
- **A5**: A1 without the assignment with no duration.

## What P6 does

- **ZF.** A lagged assignment with no work that takes the bound runs back from the activity's late finish, which another assignment can set later than its own landing. Its start is the earlier of the bound and its lag back from that late finish. B4: the work under the bound finishes Mon 14 Dec 12:00, the lagged assignment sits there, and its lag back reaches Sun 13 Dec 08:00. The late start is the bound, Fri 11 Dec 17:00, where the engine had Thu 10 Dec 13:00, 16 h back from the landing. Where the landing is the late finish (B3, B5), ZL stands: Thu 10 Dec 13:00. B7, whose lag lands on the activity calendar's hours, keeps the bound, Wed 9 Dec 12:00, either way.
- **BM.** The bound binds only where it moves an assignment's late finish earlier than its own calendar's last working time at or before the late finish requirement. In B1, B2 and B6 the work under the bound ends where it ends without one, Mon 14 Dec 17:00, and so does the lagged assignment. P6 places the work as with no bound: the late start is the lagged assignment's lag back from the late finish, Sun 13 Dec 13:00 (B2: 15:00). That is past the bound, and it is not printed at the bound's close. H25-02 A1460 binds: its late finish requirement is Tue 2 Jun 00:00, and its lagged resource works to 18:00 on Mon 1 Jun, an hour past the close the bound puts it at. Its late start is then the bound, Fri 29 May 17:00 (ZF).
- **AG.** As Late As Possible resource dependent work does not slide where no working time of its calendar lies between its early finish and the bound. A1 keeps its early start, Mon 14 Dec 11:30, the assignment with no duration's. The engine slid it anyway, and the early start moved to Tue 15 Dec 06:00. A real slide moves the assignment with no duration with the work: A2 starts Wed 16 Dec 06:00, and A4 has its assignment at Wed 16 Dec 09:00, after its lag.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.11 | 33 of 47 |
| The v2.10.12 candidate H24 scored (`2010c955`) | 38 of 47 |
| The candidate H25 scored (`9587baa0`) | 37 of 47: ZL put B3 and B5 on P6, and B4, which the build before matched, off |
| This candidate | 47 of 47 |

The rules are in `cpm-engine.js` (`_hrRsrcBackward` and the As Late As Possible slide of `computeCPMHours`) and `python_reference/cpm_hours.py`, in the hours pass only:

- **ZF.** Under a bound another assignment takes, a lagged assignment with no work that took the bound runs back from the activity's late finish, and its start is the earlier of the bound and its lag back from there.
- **BM.** A start-to-start or start-to-finish bound binds only where it moves an assignment's late finish earlier than its own calendar's last working time at or before the late finish requirement; where it moves none, the work is placed as with no bound.
- **AG.** The As Late As Possible slide of resource dependent work does not move it where no working time of the activity calendar lies between its early finish and the slide's bound.

On the same bytes:

| Set | This candidate |
|---|---|
| H1 to H24 | 5,614 of 5,614 unfinished activities match P6 on all seven fields, as before |
| H25 | 391 of 391 (fitted, not held out: the rules were taken after its score) |
| The replays of the earlier P6 probes | all pass, as before |

The builder is in the P6 oracle repository (`h25_shapes_2026_10_19/build_h25a.py`).
