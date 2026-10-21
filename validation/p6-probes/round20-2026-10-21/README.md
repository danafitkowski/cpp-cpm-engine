# P6 probes, round 20 (21 October 2026): AW with a lag on the assignment

AW ([`../round18-2026-10-20/README.md`](../round18-2026-10-20/README.md)) places As Late As Possible resource
dependent work under a start-to-start or start-to-finish bound. The work is placed back from the bound carried to a
finish on its remaining duration. Where it then starts before the bound on the activity calendar, it is placed back once
more from the bound carried the span that placement gives, or the stored remaining duration where that is longer. No
probe had a lag on the assignment, and held-out H29 draws one about one time in four.

These six synthetic probes copy round 17's shapes ([`../h28-causes-2026-10-20/`](../h28-causes-2026-10-20/)) with a lag
added to the assignment; the work's own quantity is unchanged, so the stored duration is the lag plus the work. They
were built with `build_r20.py` in the P6 oracle and committed with the candidate's and v2.10.12's predictions before P6
saw them. They were imported once, with round 21, into EPS ZZ-CPP-TEST (projects 5627 to 5632). Each probe was recorded
before its F9: P6's import matched the import model on all 6 resource dependent activities and all 6 assignments, dates
included. Each was then opened alone and scheduled once. 24 unfinished activities; none left out.

| Probe | Shape | F in P6 |
|---|---|---|
| LG1 | QB1 (F on W, 8 units on MT8, start-to-start 4 h into S) with a 4 h lag | Wed 3-Mar 15:00 to Thu 4-Mar 16:00 |
| LG2 | QB1 with an 8 h lag | Wed 3-Mar 11:00 to Thu 4-Mar 16:00 |
| LG3 | QG1 (F on X, 24 units on MT8, start-to-start into S, multiple float paths on) with a 4 h lag | Mon 8-Mar 11:00 to Thu 11-Mar 11:00 |
| LG4 | QG1 with an 8 h lag | Mon 8-Mar 11:00 to Thu 11-Mar 11:00 |
| LG5 | QB4 (F on E, 8 units on RT, start-to-start into S on X) with a 4 h lag | Tue 2-Mar 13:00 to Wed 3-Mar 13:00 |
| LG6 | QB7 (F on M, 2 units on MS8, start-to-finish into S, progress override) with a 2 h lag | Thu 4-Mar 14:15 to Fri 5-Mar 10:15 |

AW holds on all six. Nothing was fitted on these answers. The candidate matches all 24 rows; v2.10.12 matches 20 (F in
LG3 to LG6). `tests/p6-round20.test.js` replays them.
