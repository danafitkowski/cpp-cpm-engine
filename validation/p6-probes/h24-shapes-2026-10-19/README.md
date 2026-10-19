# P6 probes: the shapes held-out H24 found

Held-out set H24 ([`../../held-out/H24/RESULT.md`](../../held-out/H24/RESULT.md)) scored the v2.10.12 candidate at 267 of 278. Its 11 differences came from five shapes, all resource dependent work. These four probes measured four of them and their neighbours on 19 October 2026, imported together into EPS ZZ-CPP-TEST. A fifth probe, ZZ-CPP-ZBZ (assignments with no work, H24-09 A1260), was captured in the same import; the rule it shows is not yet taken, and it is not in this folder.

## The probes

Synthetic projects built from scratch. Each probe activity sits in a chain P -> activity -> S -> FIN beside a long chain L -> FIN that sets the project's finish, unless said otherwise. Retained logic unless said otherwise.

**ZZ-CPP-AVR** (shape 4, H24-03 A1150). The data date is Mon 7 Dec 2026 07:00; activities on AC, Mon-Fri 07:00-17:00. Each A is 4 h of resource dependent work not yet started, planned so that P6's import re-sizes nothing. A1-A6 are As Late As Possible, before a successor held to Mon 14 Dec 10:00, so the slide lands where only the resource works: A1 on a resource Mon-Sat 08:00-16:00 (it lands Sat 12 Dec 14:00), A2 on one Mon-Sat 06:00-14:00 (Mon 14 Dec 06:00, before AC opens), A3 on one Tue-Sat 08:00-16:00 (Sat 12 Dec 12:00; the resource has AC's next day off), A4 on one every day 10:00-18:00 (Sun 13 Dec 14:00), A5 as A1 under way, A6 on AC's hours (control). A7-A10 are placed by a finish-to-finish requirement instead, from a task finishing Mon 14 Dec 10:00: A7 on the Mon-Sat 08:00-16:00 resource, A8 as A7 and As Late As Possible (H24-03's shape), A9 on the Tue-Sat one, A10 on the every-day 10:00-18:00 one.

**ZZ-CPP-FPF** (shape 3, H24-10 A1160). The data date is Mon 7 Dec 2026 08:00; activities on AF, Mon-Fri 08:00-12:00 and 13:00-17:00. Each F is 4 h of resource dependent work not yet started behind a task Q: F1 on a resource Mon-Thu 07:00-12:00 and 12:30-17:30 (H24-10's), linked finish-to-finish from a Q finishing Tue 8 Dec 11:00; F2 as F1 with the resource on AF's hours (control); F3 as F1 with a 16 h lead from a Q finishing Thu 10 Dec 11:00; F4 as F1 linked finish-to-start from a Q finishing Mon 7 Dec 17:00; F5 as F1 on a resource Mon-Fri 09:00-17:00, opening after AF; F6 as F1 linked start-to-finish from a Q starting Tue 8 Dec 11:00.

**ZZ-CPP-ZBS** (shape 2, H24-12 A1180). The data date is Mon 7 Dec 2026 08:00; activities on AZ, Mon-Sat 08:00-16:00; the Successor lag calendar. Each Z is resource dependent work not yet started: 16 units at 2 an hour on a resource on AZ's hours, and an assignment with no work left and a lag. Its start-to-start successor B is a finish milestone with a Finish On or Before Mon 14 Dec 16:00, so the bound falls at a close as H24-12's did. Z1: a 16 h lag on a resource every day 06:00-18:00 (H24-12's), which lands Wed 16 Dec 08:00, off AZ. Z2: Z1 with B an 8 h task held by a Start On or Before Mon 14 Dec 08:00, so the lag lands on AZ's hours (control). Z3: Z1 with the lagged resource on AZ's hours. Z4: an 8 h lag. Z5: a 14 h lag, which lands Tue 15 Dec 18:00, after AZ closes.

**ZZ-CPP-MXR** (shape 1, H24-10 A1130). Progress override, "Use Expected Finish Dates" on, the project default lag calendar. The data date is Fri 5 Feb 2027 00:00; activities on AM, Mon-Sat 08:00-16:00; resources Mon-Thu 07:00-12:00 and 12:30-17:30. Each X is resource dependent work not yet started, planned from Wed 17 Feb, with two assignments, 360 units at 3 an hour and 232 units at 2 an hour with a 4 h lag (H24-10's): X1 with a Mandatory Start Fri 19 Feb 08:00 and an expected finish Sat 6 Mar 16:00, days neither resource works; X2 with the expected finish Thu 4 Mar 16:00, a day they work; X3 as X1 with the first assignment alone; X4 as X1 without the Mandatory Start; X5 as X1 with both resources on AM's hours (control); X6 as X1 with the Mandatory Start Mon 22 Feb 08:00.

## What P6 does

- **Shape 4 (QS).** Work a finish-to-finish requirement places, and that lands where only its resource works, starts where its resource first works at or after the activity calendar's next opening: A7 and A8 Mon 14 Dec 08:00 to 12:00, A9 Tue 15 Dec 08:00 to 12:00, A10 Mon 14 Dec 10:00 to 14:00. The As Late As Possible slides start the same way: A1 at 08:00, A2 at 07:00 (its resource works from 06:00), A3 Tue 08:00, A4 Mon 10:00, A5 as A1. A6, the control, runs Fri 11 Dec 16:00 to Mon 14 Dec 10:00.
- **Shape 3.** All six F print as the engine had them: F1, F3, F4 and F6 Tue 8 Dec 08:00 to 12:00, from AF's opening, and their successors start at 13:00; F2 and F5 Mon 7 Dec 16:00 to Tue 8 Dec 11:00. H24-10 A1160 turned out to be shape 4: the placement its requirement gives starts at 07:00, before the activity calendar opens, and with QS the engine prints P6's dates, Tue 9 Mar 08:00 to 12:00, where it had printed Fri 5 Mar 08:00 to Tue 9 Mar 11:00; its successors still start at 11:00, in P6 and the engine alike.
- **Shape 2 (ZL).** The late finish the lag lands on takes the activity calendar's last working time at or before it, and the late start is the earlier of the bound and the lag back from that finish on the lagged assignment's calendar: Z1 Mon 14 Dec 12:00 to Tue 15 Dec 16:00; Z3 Mon 14 Dec 16:00 to Wed 16 Dec 16:00; Z5 Mon 14 Dec 14:00 to Tue 15 Dec 16:00. Where the lag lands on the activity calendar's hours, it is the late finish as before (Z2 Mon 14 Dec 08:00 to Tue 15 Dec 12:00); Z4's late finish, Tue 15 Dec 16:00, is the other assignment's.
- **Shape 1 (XW).** An expected finish sizes each assignment by its resource's working hours from the activity's own start (the Mandatory Start, or the start its predecessor gives) to the expected finish, the lagged one less its lag; the work then runs that size from where the activity calendar and the resources both work. X1 and X3 run Mon 22 Feb 08:00 to Mon 8 Mar 08:00, past the expected finish: 80 h, counted from the resources' Monday opening at 07:00. X2 runs to Thu 4 Mar 17:00, an hour past its expected finish. X4 runs Mon 8 Feb 08:00 to Mon 8 Mar 08:00. X6, whose Mandatory Start is Monday, runs to Thu 4 Mar 17:30, the resources' last hour before the expected finish, and X5, the control, to the expected finish itself, Sat 6 Mar 16:00; the engine had both. The Mandatory Start's pin then sets the late finish from that size: X1's late dates run Thu 18 Feb 16:00 to Thu 4 Mar 16:00, total float −16 h.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.11 | 58 of 89 |
| The v2.10.12 candidate H24 scored (`2010c955`) | 71 of 89 |
| This candidate | 89 of 89 |

The rules are in `cpm-engine.js` (`_hrRsrcForward`, `_hrRsrcBackward` and `_hrRsrcPlace` in `computeCPMHours`) and `python_reference/cpm_hours.py`, in the hours pass only: they turn on times of day and on the resources' own calendars, which the whole-day pass does not schedule.

- **QS.** Where a finish-to-finish or start-to-finish requirement sets the start of resource dependent work, the work starts where its resource first works at or after the activity calendar's opening, not at that opening.
- **ZL.** Under a start-to-start or start-to-finish bound, the late finish an assignment with no work lands its lag on takes the activity calendar's last working time at or before it, and the late start is the earlier of the bound and the lag back from that finish.
- **XW.** An expected finish sizes resource dependent work once, from its first placement; the remaining work runs that size from the activity calendar's opening and is not sized again.

On the same bytes:

| Set | This candidate |
|---|---|
| H1 to H23 | 5,336 of 5,336 unfinished activities match P6 on all seven fields, as before: no value moves |
| H24 | 277 of 278 (fitted, not held out: the rules were taken after its score); H24-09 A1260 differs as before |
| The replays of the earlier P6 probes | all pass, as before |

Across H1 to H24, 28 printed values moved, all onto P6, all in H24: 10 activities. The whole-day pass moves no value. On these probes it puts 28 of 89 activities on P6's day for all four dates.

**Not measured here:** resource dependent work whose assignments have no work (H24-09 A1260). ZZ-CPP-ZBZ, captured in the same import, shows P6 giving an assignment with no units and no units per hour a duration of its own; the rule is taken in a later round.

The builder is in the P6 oracle repository (`h24_shapes_2026_10_19/build_h24a.py`).
