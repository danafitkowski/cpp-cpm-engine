# P6 probes, round 16 (20 October 2026): As Late As Possible resource dependent work under a start bound

Round 15 (`h27-causes-2026-10-20`, rule AR) measured that P6 starts As Late As Possible resource dependent work under a
start-to-start or start-to-finish bound at the bound and runs it forward on its resources' calendars, where the work so
placed finishes on the activity calendar's working time. Two answers did not fit: round 14's ZZ-CPP-KH2C (FB0 on X, a
4 h start-to-start lag: P6 places it on Fri 5-Mar-27 08:00-16:00) and held-out H27-11 A1220 (P6 follows the reading
before AR). These 10 probes were built for them, committed with v2.10.12's and the candidate's predictions before P6
saw them, imported once into EPS ZZ-CPP-TEST (projects 5515 to 5524), each recorded before its F9, opened alone and
scheduled once.

Each probe: F (As Late As Possible, resource dependent, one assignment at 1 an hour) start-to-start into S (4 h, held
by a Start On or After; on M, but every day 00:00-24:00 in KR4, KR5, KR6 and KR10; KR9 start-to-finish) and
finish-to-start into FIN, with L (200 h on X) into FIN. Data date Mon 1-Mar-27 08:00; lags on the successor's calendar.
Calendars: X Mon-Thu 07:00-12:00 and 13:00-17:30, Fri 07:00-11:00; M Mon-Fri 08:00-12:00 and 13:00-17:00; T Mon-Thu
07:00-17:00. Resources: RT Mon-Fri 08:00-16:00, RE every day 06:00-18:00. Where RE works more than the activity
calendar, P6's import keeps the activity's duration and lowers the units an hour, so the assignment runs longer on RE
(KR4: 38 h of work, 44 h on RE). Where RT works through the activity calendar's 12:00-13:00 break (KR1, KR2, KR7,
KR9, on X or M), the import sets the activity's duration to the activity calendar's working time that RT's 8 h span,
Mon 08:00-16:00: 7 h. The assignment keeps its 8 h.

| Probe | F: calendar, resource, work | Start bound | Started there, the work finishes | P6 places F |
|---|---|---|---|---|
| KR1 | X, RT, 8 h | Thu 4-Mar 13:00 | Fri 5-Mar 13:00, off X | Fri 5-Mar 08:00-16:00 |
| KR2 | X, RT, 8 h, a 4 h lag (KH2C's network) | Thu 4-Mar 13:00 | Fri 5-Mar 13:00, off X | Fri 5-Mar 08:00-16:00 |
| KR3 | X, RT, 3 h | Thu 4-Mar 13:00 | Thu 4-Mar 16:00, on X | Thu 4-Mar 13:00-16:00 |
| KR4 | T, RE, 38 h (H27-11 A1220's shape) | Thu 4-Mar 16:00 | Mon 8-Mar 12:00, on T | Mon 8-Mar 07:00 to Thu 11-Mar 15:00 |
| KR5 | T, RE, 12 h | Thu 4-Mar 16:00 | Fri 5-Mar 18:00, off T | Mon 8-Mar 07:00 to Tue 9-Mar 09:00 |
| KR6 | T, RE, 2 h | Thu 4-Mar 16:00 | Thu 4-Mar 18:00, off T | Mon 8-Mar 07:00-09:00 |
| KR7 | M, RT, 8 h | Fri 5-Mar 15:00 | Mon 8-Mar 15:00, on M | Fri 5-Mar 15:00 to Mon 8-Mar 15:00 |
| KR8 | M, RE, 8 h | Fri 5-Mar 15:00 | Sat 6-Mar 12:00, off M | Mon 8-Mar 08:00-17:00 |
| KR9 | X, RT, 8 h, start-to-finish | Fri 5-Mar 12:00, off X | Mon 8-Mar 16:00, on X | Mon 8-Mar 08:00-16:00 |
| KR10 | T, RE, 38 h | Wed 3-Mar 16:00 | Sun 7-Mar 12:00, off T | Mon 8-Mar 07:00 to Thu 11-Mar 15:00 |

**AR, as round 16 has it.** P6 places the work two ways and keeps the later:

- the reading before AR: the start bound carried to a finish on the activity calendar's remaining duration, and the
  work placed back from there (where it then starts off the activity calendar, it runs on from the calendar's next
  opening, rule AV: KR4, KR5, KR6, KR8, KR10);
- AR's: the work started at the bound and run forward on its own calendars (KR3, KR7, KR9). Where that forward finish
  falls off the activity calendar's working time, the finish moves on to the calendar's next opening and the work is
  placed back from there, each assignment to its own calendar's last close before it: KR1 and KR2 finish at Fri 13:00,
  X opens next on Mon 8-Mar 07:00, and RT's last close before that is Fri 16:00.

In KR4 AR's placement finishes on Mon 8-Mar 12:00, before the other reading's (Thu 11-Mar), so that one holds; in KR7
AR's finish, Mon 15:00, is the later. Held-out H27-11 A1220 is KR10's case: started at its bound the work would finish
on a Sunday its activity calendar does not work, and placed back from the next opening it finishes before the other
reading's. The engine still caps AR's placement at any finish-to-start or finish-to-finish bound, as round 15 took it.

v2.10.12 matches 37 of the 40 unfinished activities (F in KR1, KR2 and KR7), the round 15 candidate 37 (F in KR1, KR2
and KR4), the candidate all 40. With it round 14's KH2 and KH2C match too (`key-activity-2026-10-20`, 299 of 299), round
15 is unchanged (109 of 109), and so is every held-out set run as a diagnosis (H1 to H27, 6,936 of 6,936).

`p6-values.json` holds, for each probe, the file, its SHA-256, P6's record of the import before the F9
(`p6-imported-*`, laid over the file as the held-out scorer lays it) and P6's values for every unfinished activity.
`tests/p6-alap-rd.test.js` replays them. The rule is fitted on these probes and rounds 14 and 15; no held-out set is
used to fit it. A new held-out set scores it.
