# P6 probes: the four situations held-out set H1 found

The held-out set H1 ([`../../held-out/H1/RESULT.md`](../../held-out/H1/RESULT.md)) scored engine v2.10.1 at 195 of 206 unfinished activities on all seven fields. Read on the H1 data, its 11 differences come down to three P6 rules. These seven synthetic probe projects measure those rules in Primavera P6 beyond the H1 examples, and the engine was then changed to reproduce them. Because the rules were written to these answers, the probes are **fitted**: they are not a held-out test. The held-out test of the changed engine is set H2.

Each probe was imported into Primavera P6 Professional 23.12.1 on its own (Create New Project, Default Configuration) and scheduled once with F9, on its own data date, on 13 October 2026. P6's values were read back read-only from its database. [`p6-values.json`](p6-values.json) holds them for every unfinished activity, along with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API, the way [`score_held_out.js`](../../held-out/score_held_out.js) runs it.

| Probe (file) | What it measures | Rows |
|---|---|---|
| `ZZ-CPP-H1S-C` (`h1s-c`) | Start and finish constraints on work already under way, before and after the data date (K1-K13). As Late As Possible started and not, with positive and negative float, open ends and SS successors (L1-L8). Retained logic. | 45 |
| `ZZ-CPP-H1S-O` (`h1s-o`) | The same activities under progress override. | 45 |
| `ZZ-CPP-H1S-FP` / `-FS` / `-F24` / `-FJ` (`h1s-fp`, `h1s-fs`, `h1s-f24`, `h1s-fj`) | Free float across a lag, 15 pairs over five calendars (FS, SS, FF, SF; positive, negative and zero lags). Predecessor, successor, 24-hour and project-default lag calendar. | 46 each |
| `ZZ-CPP-H1S-P` (`h1s-p`) | Secondary constraints: every type paired with a binding secondary, started and not (P1-P18). | 19 |

## What P6 does

**Start constraints on work under way.**

- P6 ignores Start On or Before, Start On and Mandatory Start on the late side once an activity has started, whether they are dated before or after the data date. The late dates come from the network, and the late start of the activity's predecessors follows them (K1-K6).
- Finish On or Before and Finish On still cap the late finish (K8, K9).
- When either constraint slot holds Start On or Before or Mandatory Start, P6 applies neither constraint on the late side, so a Finish On or Before beside them is dropped too (P7, P10, P14).
- A Finish On or Before beside Start On or After, Start On, As Late As Possible or Finish On or After still applies (P8, P9, P13, P17).
- On work not started, every secondary constraint applies (P1-P6, P12, P15, P16, P18).

**As Late As Possible.**

- P6 moves the early dates of As Late As Possible work as late as they can go without delaying any successor's early dates (its free float). Work already under way moves too, with its remaining work starting from the restart (L3, L4, L5, L8).
- Nothing caps the move at the activity's own late finish. With negative float the early dates go past the late ones, and total float goes negative (L2, L4: -24 h).
- An open end moves to the project's early finish (L5).
- Under progress override, an SS link out of work already started holds nothing back (ZZ-CPP-H1S-O L8 moves to the project's finish).

**Free float across a lag.**

- The slack to each successor runs from the activity's own date to the successor's date less the lag. The lag is walked back on the lag calendar, and the slack is counted on the activity's calendar.
- Engine v2.10.1 instead walked the lag forward from the activity's date. The two differ where a lag crosses time one calendar works and the other does not.

## Result

| Engine | Rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.1 | 231 of 293 |
| with these rules | 293 of 293 |

The same engine, run against every unfinished activity P6 last scheduled in the measuring machine's database, moved no row either way: 95,015 of 95,017 matched on all seven fields before and after. The two rows that do not match are the P6 non-fixed points documented with v2.10.1.

The project-default lag calendar (`-FJ`) is scored with the project's calendar handed to the engine (`opts.projectCalendar`), as the held-out scorer hands it.
