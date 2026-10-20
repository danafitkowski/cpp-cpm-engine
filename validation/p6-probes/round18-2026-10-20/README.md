# P6 probes, round 18 (20 October 2026): round 17's rules on new shapes, and three open questions

Round 17 ([`../h28-causes-2026-10-20/README.md`](../h28-causes-2026-10-20/README.md)) pointed to AW, AZ, MW, LR and
ET. These 26 synthetic probes (`build_r18.py` in the P6 oracle) try each on shapes it was not taken from and ask
three questions round 17 left open. They were committed with v2.10.12's, the candidate's and round 17's rules'
predictions before P6 saw them, imported once into EPS ZZ-CPP-TEST (projects 5582 to 5606), the float-path ends set
in P6 (RA1 E2; RA2, RA3, RA4 FIN), each recorded before its F9 (P6's import matched the import model on all 29
resource dependent activities and 31 assignments), opened alone and scheduled once. RA4 was scheduled before its
record was taken: a click meant for the Schedule dialog's Cancel ran the schedule after its end was set. It is left
out; RA4B, the same probe, was imported alone (project 5607), its end set, recorded and scheduled once. 112 unfinished
activities; none left out.

v2.10.12 and the candidate match 90 of 112; round 17's rules 106; with the three refinements below, 112.

| Probes | Shape | What P6 does |
|---|---|---|
| RB1-RB5 | AW on new shapes: a finish-to-start bound between the two placements (RB1), F on every-day hours with a Mon-Thu resource (RB2), two assignments (RB3), a 2 h start-to-start lag (RB4), start-to-finish (RB5) | AW holds on all five. RB2's second placement starts F two days after the bound (Wed 10-Mar 13:00); RB1's runs on past the finish-to-start bound through AV |
| RF1, RF2 | AZ: a bound before the resource opens that day; two assignments with no work on resources that open at 07:00 and 08:00 | AZ holds: Fri 5-Mar 08:00; RF2 starts at 07:00 and finishes at 08:00 |
| RD1-RD3 | MW: a Finish On or After, a Finish On, a second Mandatory Finish at 1 an hour | MW holds on all three |
| RE1-RE4 | LR: H28-11 A1210's shape, its resource's holiday on the Mandatory Start's day (RE1), the Start On or Before at 10:00 (RE2), a Finish On or Before second (RE3), the holiday a day later (RE4) | The pin placed on the resource falls back to the resource's last working day, Fri 5-Mar 07:00-11:00, a 3 h span of S6; the Start On or Before caps it with that span: Wed 3-Mar 07:00-11:00 (RE1). LR holds on all four |
| RA1-RA3, RA4B | ET's scope: the end on a branch R and U do not lead into (RA1), multiple float paths on total float (RA2), "Smallest" (RA3), retained logic (RA4B) | RT is set aside on every activity, whichever activity the paths end at and on either basis (RA1, RA2, RA4B), but only under "Start Float": under "Smallest" U, under way under progress override, keeps RT (RA3) |
| RG1-RG4 | QG6's total float (P6 124 h, the engine 112 h) under retained logic, without open ends critical, on RT, under "Smallest" | Under "Start Float" without multiple float paths, start float of work AW moved runs from the bound, not from the work's start (AT): 124 h, 124 h, 134 h. Under "Smallest" the finish float is the smaller (RG4) |
| RC1-RC3 | Which remaining duration the bound is carried on the second time: S As Late As Possible with its bound near F's early start (RC1, RC3 under way) or S held far (RC2) | Where the first placement starts after the bound (RC1, RC3) it stands on the 59 h span. Where it starts before (RC2), P6 carries the bound the stored 80 h, the longer of that and the placement's 72 h span (AW) |

The three refinements: AW's second placement takes the longer of the first placement's span and the stored remaining
duration; ET applies under "Start Float" only; AT.
