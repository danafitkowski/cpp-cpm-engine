# P6 probes: the two differences held-out set H2 left

The held-out set H2 ([`../../held-out/H2/RESULT.md`](../../held-out/H2/RESULT.md)) scored engine v2.10.2 at 174 of 176 unfinished activities on all seven fields. Its two differences were already present in v2.10.1:

- **H2-06 A1130:** a Mandatory Start dated before the data date, on work not started;
- **H2-03 A1160:** free float to a start-to-start successor out of work under way, under "lag from Actual Start".

These six synthetic probe projects measure both situations in Primavera P6 beyond the H2 examples. The engine was then changed to reproduce them, so the probes are **fitted**: they are not a held-out test. The held-out test of the changed engine is set H3.

Each probe was imported into Primavera P6 Professional 23.12.1 on its own (Create New Project, Default Configuration) and scheduled once with F9, on its own data date (Wed 11 Mar 2026 08:00), on 13 October 2026. P6's values were read back read-only from its database. [`p6-values.json`](p6-values.json) holds them for every unfinished activity, along with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API, the way [`score_held_out.js`](../../held-out/score_held_out.js) runs a case.

| Probe (file) | What it measures | Rows |
|---|---|---|
| `ZZ-CPP-H2S-M` (`h2s-m`) | Mandatory Start and Mandatory Finish dated before, on and after the data date, on work not started: with and without logic, mid-period, on a start or finish milestone, on a zero-length task, on a 10-hour calendar, with a secondary constraint; Start On, Start On or Before, Finish On or Before and Finish On before the data date as controls (M1-M18). Retained logic. | 39 |
| `ZZ-CPP-H2S-MO` (`h2s-mo`) | The same under progress override. | 39 |
| `ZZ-CPP-H2S-RN` (`h2s-rn`) | SS, SF, FS and FF links out of work under way, its restart at the data date or pushed past it by a started predecessor or through a completed one; no, short, long and unexpired lags; a started successor; a successor on another calendar (R1-R14). "Lag from Actual Start". | 54 |
| `ZZ-CPP-H2S-RN2` (`h2s-rn2`) | The same rows again, plus R15-R20, where the SS / SF link itself drives the successor. "Lag from Actual Start". | 71 |
| `ZZ-CPP-H2S-RY` (`h2s-ry`) | R1-R20 under "lag from Early Start". | 71 |
| `ZZ-CPP-H2S-RO` (`h2s-ro`) | R1-R20 under progress override, "lag from Actual Start". | 71 |

## What P6 does

**A mandatory date before the data date.**

- P6 does not schedule work that has not started before the data date. A Mandatory Start dated earlier starts the work at the data date; a Mandatory Finish the work cannot meet from the data date also starts it there, and the finish falls where the work takes it (M1, M5-M8, M15, M17).
- The mandatory date still overrides logic: a predecessor finishing after the data date does not hold the work (M2).
- The mandatory date stays on the late side, so total float goes negative: -24 h for M1, mandated to start Fri 6 Mar, three working days before the data date.
- Successors follow the moved finish. Dated on or after the data date, a mandatory date pins as before (M3, M4). The same holds under progress override.

**SS and SF links out of work under way.**

- Free float to an SS successor runs from the activity's restart plus the part of the lag the data date has not used up, under either "lag from" setting (R2-R14: 36 h where the engine measured 40 h from the data date). The setting moves only the forward drive: under "lag from Actual Start" the successor is still laid from the data date plus the unexpired lag (R15-R20).
- Under progress override an SS or SF link out of work under way drives its successor from the same anchor plus the unexpired lag (R16: Fri 13 Mar 08:00 with 16 h of a 48 h lag left; R17: the data date) and bounds the activity's late dates the same way (R4: late start Fri 10 Apr 08:00), but holds no free float: the activity's free float runs to the project's finish, as an open end's does (184 h).

## Result

| Engine | Rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.2 | 268 of 345 |
| with these rules | 345 of 345 |

The same rules are pinned in the whole-day pass by the unit suite (HR-50, HR-51) and cross-validated against the Python reference (F148-F155).
