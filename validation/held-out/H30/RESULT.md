# Held-out set H30: result

**All 675 unfinished activities match P6 on all seven fields, and all 12 cases match on every field.** This is the first and only score of the v2.10.13 candidate (`28c7db99`, [`PROTOCOL.md`](PROTOCOL.md)) on this set. It was run as the protocol set out, with no deviation in what was scored.

| Case | Unfinished | Match P6 on all seven |
|---|---|---|
| H30-01 to H30-12 | 675 | 675 |

The 14 level of effort and WBS summary rows are out of scope, as for every set since H8. The whole-day pass puts 109 of the 675 on P6's day for all four dates; it is reported as for earlier sets and does not enter the score.

## The capture

The capture ran on 21-Oct-2026 with one import into EPS ZZ-CPP-TEST (projects 5667 to 5678).

The four cases that name an end of the float paths had it set in P6 before the F9, and P6 held each as set:
- H30-02: A1280;
- H30-03: A1200;
- H30-04: A1280;
- H30-12: A1240.

Saving those options through P6's dialog stored the float type the dialog shows. H30-04's FT_Start and H30-03's FT_Total were both stored as FT_SS, and H30-02 and H30-12 kept FT_FF. Every other case kept its imported code. The record holds each code as P6 stored it, and the score lays it over the case, as the protocol sets out.

Every case was recorded before its F9 and scheduled once, opened on its own. 689 unfinished activities were read back, none left out.

Two things happened during the F9s. Neither touched a case:
- Between H30-01 and H30-02, the Open Project dialog opened at the top of its list, and a project outside the test EPS was opened by mistake. Its Schedule dialog was left without scheduling and the project was closed. The database shows that project unchanged: no project, task or relationship row updated.
- After H30-10, input that was not the capture's was seen. The capture paused, and went on once it was confirmed that nobody else was using the PC.

From H30-02 on, each case was found by its row from the top of the list, and its title was checked before the F9. Outside the test projects, the only rows added are the cases' own resources and calendars and P6's session record of those resources.

## The rules' shapes

| Shape | Rule | Drawn | v2.10.12 | Candidate H29 scored | Candidate |
|---|---|---|---|---|---|
| As Late As Possible resource dependent work with no work left on a calendar that has its resource's opening day off, or opens after it | AZ, without AV | 12 | 1 | 11 | 12 |
| A Mandatory Start on resource dependent work on its resource's holiday | MO | 9 | 4 | 4 | 9 |
| The same after the resource's Friday close | MO | 3 | 3 | 3 | 3 |
| The same on a Saturday the resource never works | MO | 1 | 1 | 1 | 1 |
| The same on a plain day | MO | 3 | 3 | 3 | 3 |
| Every activity in the four cases under FT_SS | FT | 213 | 144 | 167 | 213 |
| Every activity in the two cases under FT_Total | FT | 120 | 110 | 118 | 120 |

AZ's exception to AV, MO as the span and FT are now held out. Four of the 16 Mandatory Starts have an expected finish; all four match.

## The import model

Measured apart from the score, the model matches P6's import on 296 of 298 resource dependent activities and 391 of 402 assignments.

`node model_p6_import.js H30` lists every miss:
- **Remaining durations** of two activities: H30-07 A1550 and H30-09 A1560.
- **Remaining dates** of eleven assignments, each a remaining start P6 put earlier or a remaining finish it put later than the model: the two activities above, and H30-01 A1380, H30-02 A1490, H30-03 A1350, H30-04 A1540, H30-05 A1440, H30-06 A1050, H30-08 A1390, H30-11 A1500 and H30-12 A1510.

The model holds no end of the float paths and no float type set in P6; P6 held the four ends and the stored codes. The score lays P6's own record over each case, so none of these enters it.

## Diagnoses

Three runs were made after the score, each beside it.

- **The released v2.10.12** (`d71920a9`) matches 559 of 675.
- **The candidate H29 scored** (`e605a226`) matches 625 of 675. Rounds 21 to 23's rules move 50 activities onto P6 and none away.
- **The production Python engine** (the canonical tree) ran on H30's projects as P6's database holds them, with the resource sizing P6's F9 rewrote set back to its import. It matches all 675 on the four dates and both floats.

## Next

H30 is clean: no difference goes to P6 probes, and no rule changes. The candidate goes to the release checks, and the release itself waits for the owner's go.
