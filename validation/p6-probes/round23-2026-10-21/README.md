# P6 probes, round 23 (21 October 2026): what a Mandatory Start pins on resource dependent work

Round 22 ([`../round22-2026-10-21/`](../round22-2026-10-21/)) found that where a resource has the Mandatory Start's day
off as a holiday, P6 runs the work, on the late side, from the resource's last working day before (LC1, held-out H29-05
A1710). H24's probe ZZ-CPP-MXR ([`../h24-shapes-2026-10-19/`](../h24-shapes-2026-10-19/)) has a Mandatory Start on a
Friday its Mon-Thu resources never work, and an expected finish in force, and there P6 keeps the pin's finish on the
activity calendar. These ten synthetic probes separate those two differences and try the edges.

R is LC1's: 24 h of resource dependent work on a Mon-Sat 08:00-16:00 calendar, 24 units on a resource that works
Mon-Thu 07:00-12:00 and 13:00-17:30 and Fri 07:00-11:00, planned at the Mandatory Start. Retained logic, "Start Float".
They were built with `build_r23.py` in the P6 oracle and committed with three engines' predictions before P6 saw them,
imported once into EPS ZZ-CPP-TEST (projects 5657 to 5666), recorded before the F9, opened alone and scheduled once. 30
unfinished activities; none left out.

| Probe | Shape | R's late dates in P6 |
|---|---|---|
| MW1 | Mandatory Start Sat 13-Mar 08:00, a day the resource never works | Thu 11-Mar 11:00 to Mon 15-Mar 16:00 |
| MW2 | MW1 with 4 units | Fri 12-Mar 08:00 to 11:00 |
| MX1 | LC1 (the resource's holiday on Wed 10-Mar, the Mandatory Start's day) with an expected finish | Thu 11-Mar 07:00 to Fri 12-Mar 11:00 |
| MX2 | MW1 with an expected finish | Thu 11-Mar 11:00 to Wed 17-Mar 16:00 |
| MX3 | LC1 with "Use Expected Finish Dates" on and no expected finish | Tue 9-Mar 07:00 to Thu 11-Mar 11:00 |
| MP1 | LC1 under progress override | Tue 9-Mar 07:00 to Thu 11-Mar 11:00 |
| MM1 | LC1 with the Mandatory Start at 13:00 | Tue 9-Mar 11:00 to Thu 11-Mar 16:00 |
| MM2 | Mandatory Start Fri 12-Mar 12:00, after the resource's Friday close; no holiday | Wed 10-Mar 16:30 to Fri 12-Mar 11:00 |
| MT1 | LC1 with a second resource that works Wed 10-Mar | Wed 10-Mar 08:00 to Fri 12-Mar 16:00 |
| MT2 | LC1 with a second resource off Wed 10-Mar too | Tue 9-Mar 07:00 to Thu 11-Mar 11:00 |

## What P6 does

On resource dependent work with no expected finish in force, the Mandatory Start does not pin the stored remaining
duration. P6 places the work forward from the Mandatory Start on its resources' own calendars, as the early pass would.
The pin then runs from the Mandatory Start for the span that work covers on the activity calendar. The work is placed
back from the end of that span. Every probe here fits it:

- **LC1, MX3, MP1, MT2:** the work runs Thu 07:00 to Fri 11:00, 11 h of the activity calendar. The pin ends Thu 11:00,
  and the work placed back from there starts Tue 07:00.
- **MM1:** the same span from 13:00 ends Thu 16:00, and the work starts Tue 11:00.
- **MM2:** the work runs Mon 07:00 to Tue 12:00, 12 h. The pin ends Sat 16:00, where the resource does not work, so the
  work ends at its Friday close, 11:00, and starts Wed 16:30.
- **MW1, MW2, MT1:** the span gives the same dates as the stored duration did.

With an expected finish in force, the pin keeps the stored remaining duration (MX1, MX2, and H24's MXR X1 and X3).

Round 22's reading, that the work runs from the resource's last working day before, is what the span gives on a
holiday at the activity calendar's opening. It does not give MM1 or MM2.

## The engine

Rule MO now pins the span. It sits in `computeCPMHours` (the Mandatory Start pin) and `python_reference/cpm_hours.py`.

| Engine | Rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.12 | 25 of 30 |
| FT (public 6d68629) | 25 of 30 |
| Round 22's MO (public 4964b42) | 28 of 30 (MM1, MM2 differ) |
| MO as the span | 30 of 30, in both engines |

Round 22's 80 rows, the earlier probe replays, and H24's MXR still match. `tests/p6-round23.test.js` replays these.
