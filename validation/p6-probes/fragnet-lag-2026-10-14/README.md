# P6 probe: which calendar turns a lag entered in days into hours

The engine's hours pass gives a relationship that carries only `lag_days` (a tie a pipeline adds, such as a time
impact analysis fragnet's, with no P6 `lag_hours`) its hours by multiplying the days by a calendar's hours per day.
Through v2.10.4 it took the successor's hours per day under the Successor lag calendar and the predecessor's under
every other setting.

The Primavera P6 23.12 help, topic "Choose a calendar for relationship lag", says: "Lag entered in a unit other than
hours is converted to hours based on the predecessor activity's calendar." This probe measures that in P6.

**Setup.** Primavera P6 Professional 23.12.1, 14 October 2026. Admin Preferences: 8 hours per day, and "Use assigned
calendar to specify the number of work hours for each time period" on, so P6 converts on calendars. Two synthetic
projects in [`flag.xer`](flag.xer), imported together (Create New Project):

| Probe | Lag calendar | Predecessor A | Successor B | Project calendar |
|---|---|---|---|---|
| `ZZ-CPP-FLAG-S` | Successor (`rcal_Successor`) | Mon-Fri 07:00-17:00, 10 h/day | Mon-Fri 08:00-14:00, 6 h/day | every day 06:00-18:00, 12 h/day |
| `ZZ-CPP-FLAG-J` | Project Default (`rcal_ProjDefault`) | the same | the same | the same |

A -> B is finish-to-start with no lag in the file. In each project the lag was typed as `1d` in A's Successors tab
and committed, and `TASKPRED.lag_hr_cnt` was read from P6's database ([`p6-values.json`](p6-values.json)).

**What P6 does.** P6 stored **10.0 hours** in both projects: one day of the predecessor's 10-hour calendar. The
successor's calendar would give 6, the project calendar 12 and the admin default 8. The lag calendar setting does
not change the conversion. It decides only which calendar the 10 hours are then walked on (probes `h1s-fs`,
`h1s-fj` and `h1s-f24` in [`../h1-situations-2026-10-13`](../h1-situations-2026-10-13)).

**The engine since this probe.** A tie carrying only `lag_days` gets `lag_days` x the predecessor's hours per day,
whatever the lag calendar, then walks them on the lag calendar. This changes results only under the Successor
setting, and only where the two calendars' hours per day differ. Tests LD-1 to LD-4 in `cpm-engine.test.js` pin it
on these calendars. A relationship carrying P6's own `lag_hours`, as every relationship read from an XER does, is
unaffected.

The probes are **fitted**: the engine was changed to reproduce them, so they are not a held-out test.
