# P6 probes, round 19 (20 October 2026): a start-to-start or start-to-finish link into the float paths' end activity

FK ([`../key-activity-2026-10-20/README.md`](../key-activity-2026-10-20/README.md)) has two halves. With "Calculate
multiple float paths" ending at an activity set in P6, As Late As Possible work that neither is that activity nor leads
into it holds no free float. The end activity and the work leading into it keep theirs. Rounds 11 to 14 measured
finish-to-start and finish-to-finish links into the end. Start-to-start and start-to-finish links stayed unmeasured,
because the linked work had no free float even with no end set.

Round 17's QB1 and QB7 ([`../h28-causes-2026-10-20/`](../h28-causes-2026-10-20/)) are As Late As Possible resource
dependent work whose resource stops short of the start bound. The work starts before the bound and so keeps free float
where P6 prints it as it stands: under multiple float paths (FP).

These six synthetic probes run each with multiple float paths on. They were built with `build_r19.py` in the P6
oracle and committed with the candidate's and v2.10.12's predictions before P6 saw them. They were imported once into
EPS ZZ-CPP-TEST (projects 5608 to 5613), and the ends were set in P6 (SK2, SK5 and SK6 at S, SK3 at L). Each probe was
recorded before its F9: P6's import matched the import model on all 6 resource dependent activities and all 6
assignments. Each was then opened alone and scheduled once. 24 unfinished activities; none left out.

| Probe | Shape | F's free float in P6 |
|---|---|---|
| SK1 | QB1: F start-to-start, 4 h, into S; no end set | 4 h, as it stands (FP) |
| SK2 | SK1 with the end at S | 4 h: kept |
| SK3 | SK1 with the end at L, which F does not lead into | 0 (FK) |
| SK4 | QB7: F start-to-finish into S; no end set | 0.25 h (FP) |
| SK5 | SK4 with the end at S | 0.25 h: kept |
| SK6 | SK2 with the paths on free float | 4 h: kept |

A start-to-start or start-to-finish link into the end activity leads into it, as the other link types do. The engine's
walk to the end already followed every link type, so nothing was fitted on these answers. The candidate matches all 24
rows; v2.10.12, which does not read the end, matches 23 (SK3's F). `tests/p6-round19.test.js` replays them.
