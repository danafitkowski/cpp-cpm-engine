# P6 probes, round 17 (20 October 2026): the six causes of held-out H28's differences

Held-out H28 ([`../../held-out/H28/RESULT.md`](../../held-out/H28/RESULT.md)) scored 537 of 563 on the v2.10.13
candidate; its 26 differences fell under six causes. These 45 synthetic probes were built for them
(`build_r17.py` in the P6 oracle), committed with v2.10.12's, the candidate's and a hypothesis engine's predictions
before P6 saw them, imported once into EPS ZZ-CPP-TEST (projects 5537 to 5581), FIN set in P6 as QA5's float-path end,
each recorded before its F9 (`import_p6_sqlite.py`; P6's import matched the import model on all 51 resource dependent
activities and 51 assignments), opened alone and scheduled once. 195 unfinished activities; none left out.

v2.10.12 matches 173 of 195, the candidate 174. With the rules below (and round 18's three refinements), 195.

Calendars: W Mon-Fri 07:00-17:00; M Mon-Fri 08:00-12:00 and 13:00-17:00; X Mon-Thu 07:00-12:00 and 13:00-17:30, Fri
07:00-11:00; E every day 06:00-18:00; D24 every day 00:00-24:00; S6 Mon-Sat 08:00-16:00. Resources: RT Mon-Fri
08:00-16:00; MT8 Mon-Thu 08:00-16:00; MS8 Mon-Sat 08:00-16:00; RE every day 06:00-18:00; MT10 Mon-Thu 07:00-12:00 and
12:30-17:30; RX on X.

| Family | Cause (H28) | Probes | What P6 does |
|---|---|---|---|
| QA | 1: start float of resource dependent work under "Start Float" (H28-07) | QA1-QA7: multiple float paths on free float, total float, off; open ends critical; an end set in P6 (QA5); "Smallest"; retained logic | RT holds in every probe but QA5: there, with the float paths ending at FIN, start float runs to the late start the assignments set, on R (not started) and U (under way under progress override) alike (ET) |
| QB | 2: As Late As Possible resource dependent work under a start bound (H28-02 A1410, A1430, H28-09 A1580; H27-04 A1220) | QB1-QB10, pairs that move only the bound | P6 places the work back from the bound carried to a finish on its remaining duration; where that starts before the bound, it places it back once more from the bound carried the span that placement gives (AW). Where the resource does not reach the first finish (QB1, QB4, QB6, QB7, QB10), the span equals the duration and the first placement stands |
| QG | 2: the two answers that matched neither reading (H28-03 A1450, H28-07 A1680) | QG1-QG8: copies, then without multiple float paths, S on another calendar, the units on RT | P6 reproduces both answers (QG1 Mon 8-Mar 13:00 to Thu 11-Mar 09:00; QG5 Tue 9-Mar 09:00 to Wed 10-Mar 14:00) whatever the change but RT; AW gives them: the second placement starts at 12:00 on X's lunch break in QG1, and AV runs it on from 13:00. Under "Start Float" without multiple float paths QG6's total float runs from the bound (AT, round 18) |
| QC | 3: As Late As Possible resource dependent work start-to-start into a successor (H28-03 A1140) | QC1-QC6 | F on X with RE (every day) has a remaining duration of 80 h stored and spans 59 h of X from its early start. Where the first placement starts before the bound (QC1, QC5, S As Late As Possible and far), P6 carries the bound the stored 80 h, longer than that placement's span (AW); where it does not (QC6, the bound near), the 59 h stand |
| QD | 4: a finish floor on resource dependent work (H28-09 A1220) | QD1-QD5 | A second Mandatory Finish less the stored remaining duration starts R at Tue 2-Mar 13:00, later than the start the finish-to-finish requirement gives (Tue 08:00): P6 starts it there (QD1). On RT the requirement's start is later and stands (QD4). Compared by start, not finish (MW) |
| QE | 5: a late start constraint on resource dependent work (H28-11 A1210) | QE1-QE5 | All five match the candidate; H28-11's difference needs the resource's holiday on the Mandatory Start's day (round 18, RE1) |
| QF | 6: As Late As Possible resource dependent work with no work left (H28-12 A1080) | QF1-QF4 | P6 places it at the resources' next opening at or after the bound (Mon 8-Mar 08:00 for a Sunday bound), finish-to-start or start-to-start (AZ); a bound on a working hour (QF2) is kept |

Not measured here: AW with assignment lags; ET on a project where the end activity is not an activity of the network
(P6 holds the file's id unresolved after an import, rule FK).
