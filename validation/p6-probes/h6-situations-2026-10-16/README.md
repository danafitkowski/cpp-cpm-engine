# P6 probes: the two situations held-out set H6 left

Held-out set H6 ([`../../held-out/H6/RESULT.md`](../../held-out/H6/RESULT.md)) scored the engine 2.10.7 candidate at 255 of 260 unfinished activities on all seven fields. Its five differing activities are all in one case, H6-07, from two situations that were already present in v2.10.6:

- **H6-07 A1010:** As Late As Possible work under way, with a start-to-finish link and a lag into a successor that has also started;
- **H6-07 A1190, A1240, A1300 and A1030:** the date of unfinished work carried through completed work, over a start-to-start link, under "Calculate start-to-start lag from: Actual Start".

These eight synthetic probe projects measure the two situations in Primavera P6 beyond the H6 example. The engine was then changed to reproduce what P6 does, so the probes are **fitted**: they are not a held-out test.

**How they were captured.**
- Each probe was imported into Primavera P6 Professional 23.12.1 on its own (Create New Project).
- Each was scheduled once with F9 on its own data date (Wed 11 March 2026 08:00), on 16 October 2026. All schedule under retained logic.
- P6's values were read back read-only from its database.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-h6-situations.test.js`).

| Probe (file) | What it measures | Rows |
|---|---|---|
| `ZZ-CPP-H6S-AN` (`h6s-an`) | As Late As Possible work under way (started Mon 2 March) with an SF link into a successor under way: no lag, a lag that ran out before the data date, one that runs out at it, and one with 8 or 24 hours left; FF, FS and SS controls, work not started, and H6-07's own shape (A1-A10). SS lag from the Actual Start. | 21 |
| `ZZ-CPP-H6S-AY` (`h6s-ay`) | The same, SS lag from the Early Start. | 21 |
| `ZZ-CPP-H6S-AS` (`h6s-as`) | The same, with H6-07's options: start float, the project-default lag calendar, SS lag from the Actual Start, Use Expected Finish Dates. | 21 |
| `ZZ-CPP-H6S-BN` (`h6s-bn`) | As Late As Possible work under way with SS and SF lags into a successor not started (B1-B6). SS lag from the Actual Start. | 19 |
| `ZZ-CPP-H6S-BY` (`h6s-by`) | The same, SS lag from the Early Start. | 19 |
| `ZZ-CPP-H6S-PN` (`h6s-pn`) | Completed work that carries an unfinished activity's date, with an FS, SS, FF or SF link into a successor not started, under way since after it started, or under way since before; a milestone carrier; H6-07's own chain; and free float into completed work that does or does not carry a date (P1-P11, F1-F4). SS lag from the Actual Start. | 17 |
| `ZZ-CPP-H6S-PY` (`h6s-py`) | The same, SS lag from the Early Start. | 17 |
| `ZZ-CPP-H6S-PS` (`h6s-ps`) | The same, with H6-07's options. | 17 |

## What P6 does

**As Late As Possible work under way, and a lag that counts from its actual start.**

- P6 slides As Late As Possible work by its free float. For work already under way, an SS or SF link out of it bounds the slide with only the unexpired part of its lag. The lag counts from the actual start, and the working time between that start and the data date is used up.
  - A lag that ran out before the data date holds the work no more than no lag at all (A2, A3, B1, B2; H6-07 A1010, whose 40 hours ran out a week before the data date).
  - A lag with hours left after the data date holds it back by those hours (A4, A5, B3, B4).
- FS and FF lags count in full; they run from the finish (A6, A7, B5, B6).
- The same holds under either "SS lag from" option, under start or finish float and either lag calendar, and into a successor under way or not started.
- The engine's free float already counted the lag this way. Its slide did not: it subtracted the whole lag and stopped early.

**A start-to-start link out of completed work, under "SS lag from Actual Start".**

- Under retained logic, completed work carries the date of unfinished work before it on to its successors (engine v2.9.46).
- With start-to-start lag calculated from the Actual Start, an SS link out of completed work starts from that work's actual start, plus whatever lag the data date has not used up. It carries no date through. This applies:
  - into work not started (P2) and into work under way (P4, P5, P9);
  - from a milestone (P10);
  - along a chain of completed activities (P11; H6-07 A1190).
- FS, FF and SF links still carry the date (P1, P3, P6, P7, P8).
- With lag from the Early Start, SS links carry it as well (all of `h6s-py`).
- Late dates do not change: U, the unfinished activity, has the same late dates and 333 hours of total float under both options.
- Free float into completed work counts to the date that work carries (F1, F2) or to the data date (F3, F4). H6-07 A1030's free float follows from the rule above: the date reached its successor over an SS link.

## Result

| Engine | Rows matching P6 on the four dates and both floats |
|---|---|
| 2.10.7 as H6 scored it | 117 of 152 |
| with these rules | 152 of 152 |
