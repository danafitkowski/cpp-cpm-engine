# P6 probes: resource dependent work under way

Held-out set H8 ([`../../held-out/H8/RESULT.md`](../../held-out/H8/RESULT.md)) scored engine v2.10.7 at 247 of 248 unfinished activities on all seven fields. Its one difference is **H8-11 A1040**, resource dependent work under way:

- **The resource's calendar puts the early start off the activity's calendar.** The resource opens at 06:00, but the activity's calendar opens at 07:00.
- **P6 starts the remaining work at the activity calendar's next opening.** The engine applied that rule only to work not started.

These two synthetic probe projects measure the situation in Primavera P6 beyond the H8 example. The engine was then changed to reproduce what P6 does, so the probes are **fitted**: they are not a held-out test.

**How they were captured.**
- Each probe was imported into Primavera P6 Professional 23.12.1 on its own (Create New Project, the Default Configuration).
- P6's import re-sizes resource dependent work. `validation/held-out/import_p6_sqlite.py` recorded what P6 held after the import and before the F9: `p6-imported-rdu.json` and `p6-imported-rdu2.json`. The test lays that over each file, as the H8 scorers do.
- Each was scheduled once with F9 on its own data date (Fri 4 December 2026 08:00), on 17 October 2026, under retained logic.
- P6's values were read back read-only from its database, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-rd-underway.test.js`).

**The calendars**, in both probes:
- **The activity calendar:** Monday to Thursday, 07:00–12:00 and 12:30–17:30.
- **R6:** every day 06:00–18:00, with holidays on Monday 7 and Monday 14 December. It opens before the activity calendar.
- **R8:** every day 08:00–18:00, with the same holidays. It opens after the activity calendar.
- **RW:** Saturday and Sunday only, 06:00–18:00.

| Probe (file) | What it measures | Rows |
|---|---|---|
| `ZZ-CPP-RDU` (`rdu`) | Resource dependent work under way restarting from the data date (U1), behind an unfinished predecessor (U2, A1040's shape), and past a completed one (U6); on the late-opening resource (U3, a control); on the weekend resource (U4); and with two assignments (U5). Not-started controls N1 and N2, a task under way (T1), and successors on a 24-hour calendar (S1, S2). | 13 |
| `ZZ-CPP-RDU2` (`rdu2`) | A predecessor's free float into resource dependent work whose remaining dates differ from its early dates: SS, FF, SF and FS links into work not started and work under way. | 17 |

## What P6 does

**The remaining dates of resource dependent work under way.** The rule for work not started (rule 8 of the 13-Oct-2026 resource dependent probes) holds for work under way too, whatever drives the restart.

- **Restart from the data date (U1), behind an unfinished predecessor (U2) or past a completed one (U6):**
  - The resource's calendar puts the early start at Tue 06:00, off the activity's calendar.
  - P6 starts the remaining work at the activity calendar's next opening, 07:00, and runs each assignment again from there on its own calendar.
  - The remaining finish is 07:00 the next day; the early pair is 06:00 to 18:00.
- **Two assignments (U5):** the R6 assignment restarts at 07:00 and the R8 one at its own opening, 08:00.
- **The weekend resource (U4):** the remaining work moves to the next Saturday, 06:00–18:00, with total float of −40 h.
- **The control (U3):** the early start, 08:00, is already on the activity's calendar, and nothing moves.
- **What P6 prints and where its float runs from:** the remaining dates. Successors follow the early finish: S1 starts at 18:00, not at 07:00 the next day.

**Free float into such work** runs to the successor's remaining dates. That is its remaining start for an FS or SS link and its remaining finish for an FF or SF link, for work not started and work under way alike. On FS, PX carries 85 h to the remaining start of 07:00, not 84 h to the early start of 06:00. On FF, QF carries 109 h to the remaining finish of 07:00 the next day, not 96 h to 18:00.

## The engine

Engine v2.10.7 matches P6 on 12 of the 30 rows. The candidate matches all 30. It changes three things, in both ports:

- **RU:** resource dependent work under way takes the remaining dates where its early start falls off its calendar, and its printed restart is the remaining start.
- **RF:** a predecessor's free float runs to a successor's remaining dates.

Successors keep following the early dates, as before.

On the same bytes, H8 (now fitted) scores 248 of 248, and the 13-Oct-2026 resource dependent probes stay at 126 of 126.
