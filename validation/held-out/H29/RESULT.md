# Held-out set H29: result

**673 of the 676 unfinished activities match P6 on all seven fields; 9 of the 12 cases match on every field.** This is the first and only score of the v2.10.13 candidate (`e605a226`, [`PROTOCOL.md`](PROTOCOL.md)) on this set. It was run as the protocol set out, with no deviation.

The three activities that differ fall under two causes, each a shape no probe had measured. None is a fault in the scorer, the overlay or the capture.

| Case | Unfinished | Match P6 on all seven |
|---|---|---|
| H29-01, -02, -03, -04, -07, -08, -09, -10, -11 | 56, 71, 50, 43, 58, 54, 53, 48, 53 | all |
| H29-05 | 64 | 63 |
| H29-06 | 70 | 69 |
| H29-12 | 56 | 55 |
| **12 cases** | **676** | **673** |

## The capture

The capture ran on 21-Oct-2026 with one import into EPS ZZ-CPP-TEST (projects 5614 to 5625).

The three cases that name an end of the float paths had it set in P6 before the F9, and P6 held each as set:
- H29-02: A1770;
- H29-06: A1400;
- H29-11: A1400.

On 20-Oct a first attempt was interrupted between the import and the ends. Another session found H29-02's options dialog still open. It closed the dialog without saving and without scheduling, so the ends were set again on 21-Oct.

Every case was recorded before its F9 and scheduled once, opened on its own. 691 unfinished activities were read back, none left out.

## The rules' shapes

| Shape | Rule | Drawn | v2.10.12 | Candidate H28 scored | Candidate |
|---|---|---|---|---|---|
| As Late As Possible resource dependent work, start-to-start into a held or As Late As Possible task (wide11 and wide12) | AW | 23 | 13 | 13 | 23 |
| The same, start-to-finish | AW | 12 | 6 | 7 | 12 |
| As Late As Possible resource dependent work with no work left | AZ | 10 | 0 | 5 | 8 |
| A finish floor on resource dependent work | MW | 10 | 8 | 8 | 10 |
| A Mandatory Start on resource dependent work with a second constraint | LR | 10 | 9 | 9 | 9 |
| Resource dependent work beside an assignment with no work and a 24 h lag | ZQ | 4 | 1 | 2 | 4 |
| Finish milestone after a task finishing at the 24:00 close before a day off | MZ | 12 | 2 | 12 | 12 |
| As Late As Possible work in the three cases with an end of the float paths set in P6 | FK | 25 | 6 | 14 | 24 |

AW and MW are now held out. AW covers its second placement, a finish-to-start bound beside the start bound (6), a lag on the assignment (5) and 2 units an hour. Every activity they govern matches P6.

AZ matches 8 of 10. LR matches 9 of 10, as v2.10.12 does: it moves none of H29's other nine. Eight cases ran under "Start Float".

## The three activities that differ, by cause

1. **As Late As Possible work with no work left on an activity calendar that does not work the day (2 activities).**
   - H29-06 A1700 leads start-to-start into a task held at Sun 11-Oct 00:00. H29-12 A1560 leads finish-to-start into one held at Sat 10-Oct 06:00.
   - Both sit on wide11's calendar that works every day 00:00-24:00 but one day, and in H29-06 that day is Mon 12-Oct.
   - Their resources open Mon 12-Oct 08:00. P6 places both there, though the activity calendar does not work that day.
   - The engine applies AV after AZ and runs the start on to the activity calendar's next opening: Tue 13-Oct 08:00, a day later. That also takes 8 h off each total float.
   - Probes come before any rule.
2. **A Mandatory Start with a Finish On or Before second, on a resource off around the Mandatory Start (1 activity).**
   - H29-05 A1710: 24 h on the case's calendar, Mandatory Start Wed 7-Oct 08:00 and Finish On or Before Sat 10-Oct 16:00. Its one resource works Mon-Thu 07:00-12:00 and 13:00-17:30 and Fri 07:00-11:00, and is off around the Mandatory Start.
   - P6's late dates are Tue 6-Oct 07:00 to Thu 8-Oct 11:00; the engine's are Thu 8-Oct 07:00 to Fri 9-Oct 11:00. Total float is -21 h in P6 and -13 h in the engine.
   - LR's probes capped the pin with a Start On or Before (RE1, RE2) or a Finish On or Before before the pin (RE3). This one's Finish On or Before falls after it.
   - Probes come before any rule.

## The import model

Measured apart from the score, the model matches P6's import on 257 of 260 resource dependent activities and 356 of 365 assignments.

`node model_p6_import.js H29` lists every miss:
- **Remaining durations** of three activities: H29-01 A1600, H29-03 A1380 and H29-06 A1550.
- **Remaining dates** of nine assignments, mostly a finish P6 put later: the three activities above, and H29-02 A1700, H29-05 A1550, H29-08 A1510, H29-10 A1600, H29-11 A1010 and H29-12 A1470.

The model holds no end of the float paths; P6 held the three set in P6. The score lays P6's own record over each case, so none of these enters it.

## Diagnoses

Three runs were made after the score, each beside it.

- **The released v2.10.12** (`d71920a9`) matches 579 of 676. The candidate moves 94 activities onto P6 and none away.
- **The candidate H28 scored** (`b9f825d2`) matches 625 of 676. Rounds 17 and 18's rules move 48 activities onto P6 and none away.
- **The production Python engine** (the canonical tree) ran on H29's projects as P6's database holds them, with the resource sizing P6's F9 rewrote set back to its import. It matches 639 of 676.
  - It has the same three differences.
  - The other 35 are in the three cases whose end was set in P6.
  - P6's Schedule Options dialog stored those cases' float type as FT_SS. The production path does not read that code and falls back to finish float.
  - P6 probe round 21 (the oracle's round21_2026_10_21, 21-Oct-2026) showed that FT_SS is P6's code for plain start float. The dialog writes it on saving where an imported file said FT_Start, so the scorer, which reads the case file's FT_Start, is not affected.

## Next

The engine is not changed against H29. Causes 1 and 2 go to P6 probes first, together with round 21's finding:
- FT_SS is plain start float.
- FT_Total is read as FT_Start.
- Rule ET reproduces the dialog's rewrite of FT_Start to FT_SS, not an effect of the end activity.
