# P6 probes: the two differences held-out set H4 left

The held-out set H4 ([`../../held-out/H4/RESULT.md`](../../held-out/H4/RESULT.md)) scored engine v2.10.4 at 233 of 237 unfinished activities on all seven fields. Its four differing activities came from two situations, both already present in v2.10.3:

- **H4-08 A1060:** As Late As Possible work under way, under progress override, with a finish-to-start link into a successor that has also started;
- **H4-07 A1120, A1050, A1040:** a Mandatory Start tied in working time with a start-to-start bound that falls on a weekend.

These four synthetic probe projects measure the two situations in Primavera P6 beyond the H4 examples. The engine was then changed to reproduce what P6 does, so the probes are **fitted**: they are not a held-out test.

Each probe was imported into Primavera P6 Professional 23.12.1 on its own (Create New Project) and scheduled once with F9 on its own data date (Wed 11 March 2026 08:00), on 14 October 2026. P6's values were read back read-only from its database. [`p6-values.json`](p6-values.json) holds them for every unfinished activity, along with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API, the way [`score_held_out.js`](../../held-out/score_held_out.js) runs a case.

| Probe (file) | What it measures | Rows |
|---|---|---|
| `ZZ-CPP-H4S-A` (`h4s-a`) | An As Late As Possible activity, under way or not started, with an FS, SS, FF or SF link into a successor already under way: no lag, an 8-hour lag, beside a successor not started that binds, and H4-08's own calendars (A1-A12). Progress override. | 29 |
| `ZZ-CPP-H4S-AR` (`h4s-ar`) | The same under retained logic (control). | 29 |
| `ZZ-CPP-H4S-M` (`h4s-m`) | A Mandatory Start against an SS bound on a Saturday (H4-07's tie), SS and FS bounds strictly earlier, an SF tie, a tie across a lunch break, a start milestone, a Mon-Fri calendar, H4-07's predecessor chain; a Mandatory Finish against an earlier FS bound; Start On or Before and Start On in the same tie and strictly earlier, and a later bound (M1-M16). Retained logic. | 43 |
| `ZZ-CPP-H4S-MO` (`h4s-mo`) | The same under progress override. | 43 |

## What P6 does

**As Late As Possible work and a successor already under way.**

- Under progress override an FS or SS link into a successor that has already started holds the work back no more than it binds the late dates: P6 slides the work past it, whether the work itself is under way or not started (A1, A2, A5, A6, A10; H4-08 A1060). A successor not started still binds (A9, A12: the slide stops at its early start).
- FF and SF links into a started successor still bind (A3, A7, A8, A11).
- Under retained logic the started successor holds the work, as before (AR: every row as the engine already gave it).

**A Mandatory Start or Mandatory Finish against a link bound.**

- A Mandatory Start sets the late start to its date whatever the successors need, where a link bound is strictly earlier (M2 by SS, M3 by FS) or the same working time at an earlier instant (M1, M11, M15 over a weekend, M7 across a lunch break, M10 on a start milestone; H4-07 A1120). A Mandatory Finish sets the late finish the same way (M8). The predecessors take their late dates from the mandatory date (M12; H4-07 A1050, A1040).
- A Start On or Before or a Start On keeps the earlier bound (M4, M5, M9), as the engine already did.
- The P6 23.12 help says the same: a Mandatory Start "sets its early and late start dates equal to the date you specify".
- With both a Mandatory Start and a Mandatory Finish on one activity, the earlier of the two sets the late dates. This is not from these probes. For engine v2.10.4, P6's own F9 of a renamed copy of a real export, which carries both constraints on every activity and has no relationships, matched the engine on all seven fields for all 1,040 activities compared (14 October 2026). In that output the start pin holds the late dates of 195 tasks and the finish pin those of 72, so both orderings occur. This release keeps those values, where its first draft let the start pin win: the census over the XER files on the measuring machine caught it.

## Result

| Engine | Rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.5 | 99 of 144 |
| with these rules | 144 of 144 |
