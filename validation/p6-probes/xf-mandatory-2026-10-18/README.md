# P6 probes: a Mandatory Finish under an expected finish, and mandatory dates on resource dependent work

Held-out set H22 ([`../../held-out/H22/RESULT.md`](../../held-out/H22/RESULT.md)) scored the released v2.10.11 at 268 of 271. Its three differences were one: **H22-06 A1120**, work not yet started with a Mandatory Finish and an expected finish in force. Its successor needs it finished a working day before the Mandatory Finish date. P6 took that earlier finish. The engine kept the Mandatory Finish date, as rule MP pins a mandatory date on work not yet started whatever its successors need. P6 measured MP without an expected finish (`ZZ-CPP-H4S-M`). The XC probes ([`../oc-edges-xc-2026-10-18/`](../oc-edges-xc-2026-10-18/)) could not tell a cap from a pin: their successors ran two weeks later.

These five probes measured that shape and its neighbours, in two rounds, on 18 October 2026.

## The probes

Five synthetic projects, built from scratch, plus one chain shaped like H22-06's. The calendar works Mon-Fri 08:00-12:00 and 13:00-17:00, and the data date is Mon 7 Dec 2026 08:00. A chain L of 120 h runs into the finish milestone FIN, Fri 25 Dec 17:00. Each probe activity follows an 8 h predecessor P (so it can start Tue 8 Dec 08:00) and has one 8 h successor S into FIN. Each S carries a Finish On or Before that makes it need its predecessor earlier than that predecessor's own constraint date. All five run on finish float, with the open-ended option off.

**ZZ-CPP-XMR** (retained logic) and **ZZ-CPP-XMO** (progress override) have "Use Expected Finish Dates" on. **ZZ-CPP-XMN** (retained logic) carries the same activities with it off, so no expected finish is in force there.

| Activity | The work | The constraint | Expected finish | Its successor needs it by |
|---|---|---|---|---|
| M1 | 24 h | Mandatory Finish Mon 14 Dec 17:00 | Wed 9 Dec 17:00 | Thu 10 Dec 17:00 |
| M2 | 24 h | Mandatory Finish Mon 14 Dec 17:00 | none (the control) | Thu 10 Dec 17:00 |
| M3 | 24 h | Mandatory Finish Mon 14 Dec 17:00 | Fri 11 Dec 17:00, after its successor needs it | Thu 10 Dec 17:00 |
| M4 | 24 h | Mandatory Finish Wed 9 Dec 17:00, before its successor needs it | Tue 8 Dec 17:00 | Thu 10 Dec 17:00 |
| M5 | 24 h | Mandatory Start Wed 9 Dec 08:00 | Thu 10 Dec 17:00 | Wed 9 Dec 17:00 |
| M6 | 24 h | Mandatory Start Wed 9 Dec 08:00 | none (the control) | Wed 9 Dec 17:00 |
| M7 | 24 h | Finish On Mon 14 Dec 17:00 | Wed 9 Dec 17:00 | Thu 10 Dec 17:00 |
| M8 | 24 h | Finish On Mon 14 Dec 17:00 | none (the control) | Thu 10 Dec 17:00 |
| M9 | a finish milestone | Mandatory Finish Mon 14 Dec 17:00 | Wed 9 Dec 17:00 | Thu 10 Dec 17:00 |
| M10 | resource dependent, 24 h, one resource on the same hours | Mandatory Finish Mon 14 Dec 17:00 | Wed 9 Dec 17:00 | Thu 10 Dec 17:00 |
| M11 | 24 h, its successor linked finish-to-finish | Mandatory Finish Mon 14 Dec 17:00 | Wed 9 Dec 17:00 | Fri 11 Dec 17:00 |

**CA -> CB -> CC -> CD** is H22-06's chain:
- CA is under way since Thu 3 Dec, with 40 h of 56 h left. It has a Finish On or After Fri 11 Dec 17:00 and an expected finish Fri 4 Dec 17:00, before the data date.
- CB is not started, 16 h, with a Finish On or After Fri 11 Dec 17:00 and an expected finish Tue 15 Dec 17:00.
- CC is not started, 8 h, with a Mandatory Finish Thu 17 Dec 17:00 and an expected finish Wed 16 Dec 17:00.
- CD is 8 h with a Finish On or Before Thu 17 Dec 17:00, into FIN.

The second round, after the first three answered, measured milestones and resource dependent work. **ZZ-CPP-XNR** has "Use Expected Finish Dates" on and **ZZ-CPP-XNN** off, both under retained logic:

| Activity | The work | The constraint | Expected finish | Its successor needs it by |
|---|---|---|---|---|
| F1 | a finish milestone | Finish On or After Mon 14 Dec 17:00 | Wed 9 Dec 17:00 | Thu 10 Dec 17:00 |
| F2 | a finish milestone | Finish On Mon 14 Dec 17:00 | Wed 9 Dec 17:00 | Thu 10 Dec 17:00 |
| F3 | a finish milestone | Mandatory Finish Mon 14 Dec 17:00 | Wed 9 Dec 17:00 | nothing earlier: its successor runs into FIN |
| F4 | a finish milestone | Finish On or After Mon 14 Dec 17:00 | none (the control) | Thu 10 Dec 17:00 |
| G1 | a start milestone | Mandatory Start Mon 14 Dec 08:00 | Wed 9 Dec 17:00 | Thu 10 Dec 17:00 |
| R1 | resource dependent, 24 h | Mandatory Start Wed 9 Dec 08:00 | none | Wed 9 Dec 17:00 |
| R2 | resource dependent, 24 h | Mandatory Start Wed 9 Dec 08:00 | Thu 10 Dec 17:00 | Wed 9 Dec 17:00 |
| R3 | resource dependent, 24 h | Mandatory Finish Mon 14 Dec 17:00 | none | Thu 10 Dec 17:00 |
| R4 | resource dependent, 24 h | Mandatory Finish Mon 14 Dec 17:00 | Fri 11 Dec 17:00, after its successor needs it | Thu 10 Dec 17:00 |

Each resource works the activity's own hours.

**How they were captured.**
- Each round was imported into Primavera P6 Professional 23.12.1 in one import (Create New Project, the Default Configuration): ZZ-CPP-XMR, -XMO and -XMN together, then ZZ-CPP-XNR and -XNN together.
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). P6's import changed nothing: each resource dependent activity kept 24 h and its assignment 1 unit an hour.
- Each project was then scheduled once with F9 on its own, at its own data date.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 175 rows, with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-xf-mandatory.test.js`). P6's import is laid over each file as the held-out scorers lay it.

## What P6 does

ZZ-CPP-XMO gives the same values as ZZ-CPP-XMR on all 39 rows.

**A Mandatory Finish under an expected finish caps the late finish; it does not pin it.**

| Activity | Early finish | Late finish | Total float |
|---|---|---|---|
| M1, expected finish Wed 9 Dec | Wed 9 Dec 17:00 | Thu 10 Dec 17:00, what its successor needs | 8 h |
| M3, expected finish Fri 11 Dec | Fri 11 Dec 17:00 | Thu 10 Dec 17:00 | -8 h |
| M11, finish-to-finish successor | Wed 9 Dec 17:00 | Fri 11 Dec 17:00 | 16 h |
| M10, resource dependent | Wed 9 Dec 17:00 | Thu 10 Dec 17:00 | 8 h |
| R4, resource dependent, expected finish Fri 11 Dec | Fri 11 Dec 17:00 | Thu 10 Dec 17:00 | -8 h |
| CC, H22-06's A1120 | Wed 16 Dec 17:00 | Wed 16 Dec 17:00, the close before CD's late start | 0 h |
| M2, no expected finish (the control) | Mon 14 Dec 17:00 | Mon 14 Dec 17:00, the pin | 0 h |

- **The late finish is the earlier of what the successors need and the Mandatory Finish date**, as with a Finish On or Before. A successor that needs an earlier finish gets it (M1, M3, M11, CC). M4's Mandatory Finish is earlier than what its successor needs, so it gives the late finish either way.
- **The early side is dropped**, as XC already had it (v2.10.11): the work finishes at its expected finish.
- **CA, CB and CC follow**, as H22-06's A1090, A1100 and A1120 did: each has zero float in P6.
- **With "Use Expected Finish Dates" off** (ZZ-CPP-XMN) every one of them is pinned: M1, M3, M10, M11 and CC take the Mandatory Finish date on both sides, as M2 does.

**A Mandatory Start keeps its pin under an expected finish.** M5 starts Wed 9 Dec 08:00, finishes at its expected finish Thu 10 Dec 17:00, and keeps its late start at Wed 9 Dec 08:00 (0 h), though its successor needs it finished a day earlier. So do the start milestone G1 (Mon 14 Dec 08:00, 0 h) and the resource dependent R2 (0 h).

**A finish milestone sits at its expected finish.** An expected finish in force drops the early side of Finish On or After (F1), Finish On (F2) and Mandatory Finish (F3, M9), as XC drops it on other work not yet started. The milestone sits at Wed 9 Dec 17:00. The late side caps as above: F1, F2 and M9 at Thu 10 Dec 17:00 (8 h), F3 at its Mandatory Finish date Mon 14 Dec 17:00 (24 h), which is earlier than its successor needs. With the option off (ZZ-CPP-XNN) the constraint holds the milestone at Mon 14 Dec 17:00, as the control F4 shows in both projects.

**Resource dependent work takes the mandatory pin.** With no expected finish in force, P6 pins resource dependent work as it pins a task. R1 and R2 under ZZ-CPP-XNN start Wed 9 Dec 08:00 and keep that late start. R3 and R4 finish Mon 14 Dec 17:00 and keep that late finish. M10 under ZZ-CPP-XMN does the same. All have 0 h, whatever their successors need. Under ZZ-CPP-XNR, R1 and R2 keep the Mandatory Start pin, and R3 keeps the Mandatory Finish pin, because no expected finish is in force on it. R4 caps, as M10 does under ZZ-CPP-XMR. Rule MP had left resource dependent work out, as not measured.

The rules these give:

| Rule | What P6 does | Rows |
|---|---|---|
| XP | An expected finish in force on work not yet started (a task, resource dependent work or a finish milestone) lifts the Mandatory Finish pin: the date caps the late finish | ZZ-CPP-XMR, -XMO M1, M3, M9, M10, M11, CC (and CA, CB); ZZ-CPP-XNR R4 |
| XC, finish milestones | An expected finish in force drops the early side of Finish On or After, Finish On and Mandatory Finish on a finish milestone too; it sits at its expected finish | ZZ-CPP-XMR, -XMO M9; ZZ-CPP-XNR F1, F2, F3 (and their successors) |
| MR | Resource dependent work not yet started takes the mandatory pin, as a task does | ZZ-CPP-XMN M10; ZZ-CPP-XNR R1, R2, R3; ZZ-CPP-XNN R1 to R4 (and their predecessors) |

A Mandatory Start keeps its pin (M5, G1, R2) and Finish On caps (M7, M8), as the engine already had them.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.11 | 126 of 175 |
| This candidate | 175 of 175 |

The rules are in both passes, in both ports: `cpm-engine.js` (`computeCPMHours`, the whole-day pass of `computeCPM`), `python_reference/cpm_hours.py` and `python_reference/cpm.py`.

- **XP.** Rule MP skips a Mandatory Finish when an expected finish is in force on the activity. The Mandatory Finish then caps the late finish as Finish On does. A Mandatory Start keeps its pin. The whole-day pass reads such a Mandatory Finish as a Finish On or Before on the late side.
- **XC** drops the early side on a finish milestone too. A start milestone is left as it was. It applies no Finish On or After or Finish On (MC, v2.10.4), and P6's import cannot carry a Mandatory Finish on one (`ZZ-CPP-H3S-M` S3).
- **MR.** Rule MP pins resource dependent work too. The pin is taken on the activity's calendar from its remaining duration, and its assignments then run back from the pinned late finish, as they run back from any late finish.
- **A milestone with an expected finish in the whole-day pass.** Through v2.10.11 the whole-day pass stretched such a milestone to its expected finish as a multi-day activity (v2.10.4 disclosed this). The hours pass sat it at the expected finish (XM, v2.10.4). Now the whole-day pass does the same, and the milestone keeps zero duration. On these probes the whole-day pass puts 173 of 175 activities on P6's day for all four dates (v2.10.11: 137). The two left are CA under ZZ-CPP-XMR and -XMO: work under way that its expected finish leaves no time. P6 puts its early finish at the data date, Mon 7 Dec 08:00, and its late start at the close before, Fri 4 Dec 17:00. The whole-day pass prints those two the other way round, on Fri 4 Dec and Mon 7 Dec.

On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H1 to H21 | unchanged, every row: 4,776 of 4,776 |
| H22 | 271 of 271 (fitted, not held out: the rules were taken after its score) |
| The probes of earlier rules | every row, unchanged |

Across H1 to H22, 12 of 35,329 printed values moved, all onto P6, all in H22-06 (A1090, A1100, A1120). The whole-day pass moved 6 of 20,188 values, all in H22-06. Five moved onto P6's day. The sixth, A1090's late finish, moved off: the late finish now sits at the data date's 08:00 opening, which the whole-day pass prints on the working day before.

**Not measured:**
- resource dependent work whose resource works hours other than the activity's;
- a Mandatory Start beside a Mandatory Finish under an expected finish;
- the second round's shapes under progress override.

The builder is in the P6 oracle repository (`xf_mandatory_2026_10_18/build_xm.py`).
