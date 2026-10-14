# P6 probes: the three differences held-out set H3 left

The held-out set H3 ([`../../held-out/H3/RESULT.md`](../../held-out/H3/RESULT.md)) scored engine v2.10.3 at 244 of 253 unfinished activities on all seven fields. Its nine differences came from three situations, all already present in v2.10.2:

- **H3-04 A1230:** under progress override with lag counted from Early Start, a start-to-start link out of work under way, the data date at the end of the predecessor's working day;
- **H3-11 A1150:** a Start On or Before on a finish milestone;
- **H3-11 A1270 / A1210, H3-12 A1220:** a late start set by a start-to-start successor with a negative lag that lands exactly at a lunch break.

These eighteen synthetic probe projects measure the three situations in Primavera P6 beyond the H3 examples. Two further situations turned up while the changed engine was checked against every project P6 had scheduled in the local database, and were probed too: a lead tied in working time with the late finish (4899 P21170, 4911 / 4912 P9720), and an expected finish on a milestone (4910 A1030). The engine was then changed to reproduce what P6 does, so the probes are **fitted**: they are not a held-out test. The held-out test of the changed engine is set H4.

Each probe was imported into Primavera P6 Professional 23.12.1 on its own (Create New Project) and scheduled once with F9 on its own data date, on 14 October 2026. P6's values were read back read-only from its database. [`p6-values.json`](p6-values.json) holds them for every unfinished activity, along with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API, the way [`score_held_out.js`](../../held-out/score_held_out.js) runs a case. A project with no data date (`h3s-nn`) is read from its planned start, as the parser reads it.

| Probe (file) | What it measures | Rows |
|---|---|---|
| `ZZ-CPP-H3S-PE` (`h3s-pe`) | SS, SF and FS links out of work under way under progress override, lag from Early Start, the data date Fri 17:00 at the end of the predecessor's day: no lag, expired, part-unexpired and long lags, a lead, a driven and a pinned successor, a predecessor on a Mon-Thu calendar (P1-P12). | 24 |
| `ZZ-CPP-H3S-PE24` (`h3s-pe24`) | The same with the lag on a 24-hour calendar (H3-04's setting). | 24 |
| `ZZ-CPP-H3S-PW` (`h3s-pw`) | The same with the data date Wed 08:00, in working time. | 24 |
| `ZZ-CPP-H3S-RE` (`h3s-re`) | The same under retained logic (control). | 24 |
| `ZZ-CPP-H3S-PA` (`h3s-pa`) | The same under progress override, lag from Actual Start (control). | 24 |
| `ZZ-CPP-H3S-M` (`h3s-m`) | Every start and finish constraint type on finish and start milestones, binding the early or the late side, primary or secondary; a task and zero-length tasks as controls (F1-F10, S1-S8, T1-T3). Retained logic. | 58 |
| `ZZ-CPP-H3S-MO` (`h3s-mo`) | The same under progress override. | 58 |
| `ZZ-CPP-H3S-N` (`h3s-n`) | Constraints of a milestone's other end with no predecessor, on working and non-working instants (N1-N13). | 30 |
| `ZZ-CPP-H3S-NN` (`h3s-nn`) | The same in a project with no data date. | 30 |
| `ZZ-CPP-H3S-L` (`h3s-l`) | A lead landing on a close: a 1 h and a 30-minute lunch break, the end of a day, a week and a short Friday, by SS and SF, with mid-period and positive-lag controls and both H3 shapes (L1-L12); early-side controls (E1-E5). Retained logic. | 48 |
| `ZZ-CPP-H3S-LO` (`h3s-lo`) | The same under progress override. | 48 |
| `ZZ-CPP-H3S-T` (`h3s-t`) | A lead tied in working time with the late finish an FS or FF successor sets: SS and SF leads, both orders of the links and of the successors, with and without negative float (T1-T20). | 61 |
| `ZZ-CPP-H3S-TP`, `-TN`, `-TC`, `-TM` (`h3s-tp`, `h3s-tn`, `h3s-tc`, `h3s-tm`) | A lead tied with the project finish, the activity's own Finish On or Before, Finish On and Mandatory Finish. | 25 |
| `ZZ-CPP-H3S-TF` (`h3s-tf`) | A tie between a bound at a close and the FF partner's late finish, the partner the same successor or another, the bound a lead or a link with no lag falling on a weekend (A-H). | 16 |
| `ZZ-CPP-H3S-X` (`h3s-x`) | An expected finish on start and finish milestones, before and after logic and the data date, on working and non-working instants, beside constraints; a task and a zero-length task as controls (X1-X19). | 43 |

Left out of the comparison: in `-M` and `-MO`, F3 and S3 (a Mandatory Start on a finish milestone, a Mandatory Finish on a start milestone), which P6's XER import stored as completed with no dates, and the rows next to them. In `-TM` and `-TN` C4 the tie the row was built for did not form (a setup error): the rows are kept as ordinary rows.

## What P6 does

**SS and SF links out of work under way, under progress override.**

- P6 lays the successor from the data date, the unexpired lag on from there, under either "lag from" setting (PE, PE24, PA: P1, P3, P5, P6, P8, P9 at Fri 17:00 where the engine laid them at the Mon 08:00 restart; H3-04 A1230). SF links follow the same rule.
- Under retained logic, "lag from Early Start" keeps the restart and SF stays on the restart under either setting (RE).

**A constraint of a milestone's other end.**

- P6 keeps a Start On, Start On or Before or Start On or After on a finish milestone, and a Finish On, Finish On or Before or Finish On or After on a start milestone, but applies none of them, early or late side, primary or secondary slot (F1, F2, F4, F9, F10, S1, S2, S4; N1-N11; H3-11 A1150).
- A milestone with a constraint of its own end applies it (F5-F8, S5-S8, N12, N13), and so does a zero-length task (T2, T3).

**A late start a lead lands on a close.**

- A lead that lands on a close (a lunch break, the end of a day, a week or a short Friday) stays there as the late start (L1-L5, L7, L11, L12: P6 12:00 where the engine moved it to the next opening; H3-11 A1270, H3-12 A1220).
- Tied in working time with the late finish, P6 prints the opening out of the late finish when an FS or FF successor or a Mandatory Finish sets it at the same instant the lead ends the activity, whichever link comes first (T1-T20, TF A-H, TC C3, L10). It keeps the close when the project finish, a Finish On or Before or a Finish On sets it (TP, TN C6, TC C1, C2), and when the successor's bound is the same working time but a later instant, the next opening (4899 P21170).

**An expected finish on a milestone.**

- Under "Use Expected Finish Dates", a milestone with an expected finish sits no earlier than it: a start milestone at the next opening (X2, X3: Wed 17:00 gives Thu 08:00), a finish milestone at the instant itself when it is working time, at the next opening when it is not (X9-X11). Logic later than it wins (X6, X13); the data date floors it (X7, X14); the late side keeps its own dates (4910 A1030).

## Result

| Engine | Rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.3 | 372 of 537 |
| with these rules | 537 of 537 |

The same rules are pinned in the unit suite (HR-52 to HR-58, whole days HR-56 and HR-57) and cross-validated against the Python reference (F156-F162).
