# P6 probes: the seven shapes held-out H23 found

Held-out set H23 ([`../../held-out/H23/RESULT.md`](../../held-out/H23/RESULT.md)) scored the v2.10.12 candidate at 262 of 289. Its 27 differences came from seven shapes, each new to the held-out sets. These 13 probes measured each shape and its neighbours, in two rounds, on 19 October 2026, imported into EPS ZZ-CPP-TEST.

## The probes

Synthetic projects built from scratch, plus H23-12 itself renamed. Each probe activity sits in a chain P -> Q -> S -> FIN beside a long chain L -> FIN that sets the project's finish, unless said otherwise.

### Round 1

**ZZ-CPP-HLA, -HLP and -HL4** (shape 1; retained logic, finish float; the lag calendar the Successor's, the Predecessor's and 24 hours). The data date is Mon 3 Aug 2026 08:00. Calendar A works every day 06:00-18:00 and has Mon 17 Aug off; A0 is A without it; W works Mon-Thu 07:00-12:00 and 12:30-17:30. Resources R1 and R2 work Mon-Fri 08:00-12:00 and 13:00-17:00; R1 has Tue 18 and Fri 21 Aug off, R2 Thu 13 Aug. Each P is 8 h on W from Tue 18 Aug 11:00 and finishes Wed 19 Aug 09:00. Resource dependent work is planned as H23-12 A1230 was, from Sun 2 Aug 06:00 for 40 h, so P6's import gives each assignment 18 h.

| Activity | The work | The link from P |
|---|---|---|
| Q1 | resource dependent on A, R1 and R2 (H23-12 A1230) | FS -16 h |
| Q2, Q3 | as Q1 with R2 only, with R1 only | FS -16 h |
| Q4 | as Q1 on A0 | FS -16 h |
| Q5 | as Q1, its P on A finishing Sun 16 Aug 17:00 | FS 0 |
| Q6, Q8 | 26 h tasks on A and on A0 | FS -16 h |
| Q7 | as Q1 | FS -4 h |
| Q9 | as Q1, its P on A from Tue 18 Aug 13:00, finishing Wed 19 Aug 09:00 too | FS -16 h |

**ZZ-CPP-SSM** (shape 2; retained logic). The data date is Mon 7 Dec 2026 08:00 on a Mon-Fri 08:00-12:00 and 13:00-17:00 calendar. Each Q is 24 h after an 8 h P, so logic puts it Tue 8 to Thu 10 Dec.

| Activity | Primary constraint | Second constraint, or the predecessor that pulls |
|---|---|---|
| M1 | Finish On or Before Thu 10 17:00 | Mandatory Finish Mon 14 17:00 (later than logic) |
| M2 | Finish On or Before Mon 14 17:00 | Mandatory Finish Wed 9 17:00 (earlier than logic) |
| M3 | Mandatory Start Wed 9 08:00 | Mandatory Finish Thu 10 17:00 (earlier than the start allows) |
| M4 | Mandatory Start Wed 9 08:00 | Mandatory Finish Mon 14 17:00 (later) |
| M5, M6 | Start On or After Tue 8 08:00 | Mandatory Finish Wed 9 17:00, then Mon 14 17:00 |
| M7, M8 | Mandatory Start Wed 9 08:00 | an FF predecessor finishing Mon 14 17:00; an SF predecessor starting Mon 14 08:00 |
| M9 | Mandatory Start Wed 9 08:00 | Mandatory Finish Mon 14 17:00, and an FF predecessor finishing Tue 15 17:00 (H23-08 A1250) |
| M10 | Finish On or After Thu 10 17:00 | Mandatory Start Fri 11 08:00 |
| M11 | Start On or After Tue 8 08:00 | Mandatory Start Mon 7 08:00 |
| M12 | Finish On or Before Mon 21 17:00 | Mandatory Finish Wed 9 17:00; its successor starts no earlier than Mon 21 08:00 |
| M13, M14, M15 | Mandatory Finish Mon 14 17:00; Mandatory Start Wed 9 08:00; the same with an FS predecessor finishing Fri 11 | (controls) |

**ZZ-CPP-MXE** (shape 4; as SSM, "Use Expected Finish Dates" on): a Mandatory Start against a later and an earlier external early start (E1, E2); resource dependent work with a Mandatory Start, a later external early start and an expected finish (E3, H23-03 A1260) and without the expected finish (E9); a Mandatory Finish against an external early start (E4, and E10 on resource dependent work); a Start On or After against one (E5); a Mandatory Start and a Mandatory Finish against an earlier external late finish (E6, E7); a Finish On or Before against one (E8).

**ZZ-CPP-XFO and -XFR** (shape 5; progress override and retained logic; "Use Expected Finish Dates" on, the 24-hour lag calendar, open ends critical). The data date is Mon 9 Nov 2026 08:00 on Mon-Thu 07:00-12:00 and 13:00-17:30, Fri 07:00-11:00. Each Q is 8 h with an expected finish Wed 11 Nov 17:30.

| Activity | What drives its finish |
|---|---|
| X1 | FF +16 h from a P finishing Fri 13 11:00: Sat 14 03:00; and a Finish On Mon 9 17:30 (H23-03 A1190) |
| X2 | the same, no Finish On |
| X3 | FF +1.5 h from a P finishing Thu 12 17:30: Thu 19:00 |
| X4 | FF +4 h from a P finishing Thu 12 13:30: Thu 17:30, a close (control) |
| X5 | as X2 with no expected finish (control) |
| X6 | SF +20 h from a P starting Fri 13 07:00: Sat 03:00 |
| X7 | as X2, resource dependent |
| X8 | FF 0 from a P finishing Mon 9 17:30, before the expected finish (control) |

**ZZ-CPP-ARU** (shape 6; progress override, open ends critical). The data date is Mon 7 Dec 2026 08:00; activities on the Mon-Thu / Fri calendar above; resource RE works every day 06:00-18:00. L finishes Fri 25 Dec 11:00. A1 is resource dependent work under way (suspended Thu 3 Dec 17:30, resumed Tue 8 Dec 13:00), As Late As Possible, 70 h left on RE, with a start-to-start successor only (H23-05 A1060). A2 is the same not yet started, with no successor; A3 is 60 h not yet started, into a task held to Mon 21 Dec 07:00; A4 is A3 at 24 h with its resource on the activity's calendar (control); A5 is A1 with 60 h left, into the held task.

**ZZ-CPP-AFF** (shape 7; retained logic, the Successor lag calendar). The data date is Mon 1 Mar 2027 08:00; activities on the Mon-Thu / Fri calendar above; resource RS works Mon-Sat 08:00-16:00. Each Q's successor is held to Wed 17 Mar 15:00 and linked FS +16 h, so it needs Q by Tue 16 Mar 07:30. F1 is 3 h of resource dependent work on RS, As Late As Possible (H23-02 A1220); F2 the same not As Late As Possible; F3 a 3 h task As Late As Possible; F4 as F1 with its resource on the activity's calendar.

**ZZ-CPP-ZLA** (shape 3; retained logic, start float, the Successor lag calendar). The data date is Mon 13 Jul 2026 08:00; activities work every day 06:00-18:00, resources Mon-Fri 08:00-12:00 and 13:00-17:00. Each Q is resource dependent work planned as H23-08 A1340, so P6's import gives R2z 10 h and leaves R3z, lagged 16 h, no work; P -> Q and Q -> S are start-to-start and S is a 32 h open end. Z1 is H23-08 A1340; Z2 the same with R3z's units zero in the file; Z3 as Z2 with no lag; Z4 as Z1 with Q -> S finish-to-start; Z5 as Z1 with an 8 h lag (R3z keeps 2 h of work).

### Round 2

P6 kept a first placement for ZZ-CPP-HLA's Q1, as it does for H20-03 A1060, and stored none for H23-12 A1230. **ZZ-CPP-HLX** (H23-12's options: retained logic, the smaller float, open ends critical, "Use Expected Finish Dates", the Successor lag calendar; data date Sat 25 Jul 2026 08:00) toggles, one at a time, what A1230 had that Q1 lacked: an expected finish in force before the work can start (K1), a Finish On or Before (K2), both (K3), a resource dependent predecessor (K4), a level of effort successor (K5), all four (K6), none (K0). **ZZ-CPP-HLN** is K0 and K1 with the option off. **ZZ-CPP-H12C** is H23-12's own case file renamed, with fresh resource GUIDs, as a control.

## What P6 does

- **Shape 1 (XE).** HLA Q1, every K in HLX and HLN, and H12C A1230 print the same dates, Tue 18 Aug 08:00 to Mon 24 Aug 10:00: the remaining work starts at calendar A's next opening after its day off. Where the successor starts is what differs. With an expected finish in force on the work not yet started (HLX K1, K3, K6; H12C A1230), P6 keeps no first placement, and the successor starts at the printed finish, Mon 24 Aug 10:00. Without one (HLX K0, K2, K4, K5; HLN K0, K1; HLA Q1), P6 drives the successor from a first placement on the resources' calendars that runs through the activity's day off and finishes Thu 20 Aug 10:00: the successor starts there. Under the Predecessor lag calendar the lead lands on the day off itself (HLP), the work starts at the calendar's next opening with no first placement, and the successor starts Mon 24 Aug 10:00, as the engine already had it.
- **Shape 2 (SL, MG).** A Mandatory Finish or Mandatory Start in the second slot pins nothing. Forward it is a floor: later than where the work would otherwise be, it moves the work out to its date, off a primary Mandatory Start too (M1, M4, M6, M10; M4 runs Thu 10 to Mon 14); earlier, it leaves the work where it would be without it (M2, M3, M5, M11). On the late side it caps, as PC has it. The work's free float is not held at zero (M12: 48 h). A Mandatory Start ignores its finish-to-finish and start-to-finish predecessors: M7 and M8 run Wed 9 to Fri 11 against predecessors that would hold their finish to Mon 14, and M9 finishes at its second-slot floor, Mon 14 17:00, not at its predecessor's Tue 15 17:00.
- **Shape 3 (ZB).** Under a start-to-start bound, the assignment with no work left starts at the activity's late start, which the bound sets, and finishes its 16 h lag later on its own calendar. That is the activity's late finish, Fri 31 Jul 10:00, where the work itself finishes Thu 30 Jul 12:00 (Z1, Z2). Without a lag (Z3), or with work left (Z5), the late finish is the work's own, Thu 30 Jul 12:00; under a finish-to-start bound (Z4) it is the bound, Wed 29 Jul 10:00.
- **Shape 4 (MX).** An external early start moves neither a Mandatory Start (E1, E3, E9 start Wed 9 08:00 against Thu 10 and Fri 11) nor a Mandatory Finish (E4, E10), and an external late finish caps neither (E6, E7). A soft constraint takes both (E5 starts Thu 10 08:00; E8's late finish is Fri 11 17:00).
- **Shape 5 (XO).** A finish-to-finish or start-to-finish requirement beyond the expected finish that falls off working time prints at the next opening: Mon 16 Nov 07:00 for Sat 03:00 (X1, X2, X6, X7), Fri 13 Nov 07:00 for Thu 19:00 (X3), as it does with no expected finish (X5). At a close it stays (X4). XFO and XFR print the same.
- **Shape 6 (AV).** The As Late As Possible slide of resource dependent work under way restarts at the activity calendar's next opening when it lands on a day only its resource works, and the resource runs on from there, past the slide's bound. A1's late start is Sat 19 Dec 13:00; A1 runs Mon 21 Dec 07:00 to Sat 26 Dec 17:00, past its late finish, Fri 25 Dec 11:00. A5 runs Mon 14 Dec 07:00 to Sat 19 Dec 07:00, past the Friday close before its held successor.
- **Shape 7 (FZ).** As Late As Possible work holds no free float. F1 finishes Mon 15 Mar 16:00, when its resource closes, though its successor needs it only by Tue 16 Mar 07:30, and P6 prints its free float as 0 h. F2, not As Late As Possible, keeps 80.5 h; F3, a task, slides to Tue 16 Mar 07:30.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.11 | 266 of 326 |
| The v2.10.12 candidate H23 scored (`5b9a7c2d`) | 269 of 326 |
| This candidate | 326 of 326 |

The rules are in `cpm-engine.js` (`computeCPMHours`, and the whole-day pass of `computeCPM` where it schedules the shape), `python_reference/cpm_hours.py` and `python_reference/cpm.py`:

- **SL**, in both passes. Only the primary slot pins, and holds free float at zero. A Mandatory Start in the second slot is a Start On or After forward, a Mandatory Finish a Finish On or After; on the late side PC caps. This withdraws the half of the JS whole-day pass's v2.9.16 rule F5-B that restored a mandatory second constraint's pin over a soft primary; the Python reference never had it.
- **MG**, in both passes. A Mandatory Start ignores its finish-to-finish and start-to-finish predecessors, and an expected finish's floor from them.
- **MX**, in both passes. A Mandatory Start ignores an external early start; a mandatory pin ignores an external late finish (the hours pass already did; the whole-day pass capped the pin).
- **FZ**, in both passes. As Late As Possible work holds no free float. P6 prints zero on all 88 unfinished As Late As Possible activities in H1 to H23.
- **XO**, **AV**, **ZB** and **XE**, in the hours pass: they turn on times of day and on the resources' own calendars, which the whole-day pass does not schedule.

On the same bytes:

| Set | This candidate |
|---|---|
| H1 to H22 | 5,047 of 5,047 unfinished activities match P6 on all seven fields, as before: no value moves |
| H23 | 289 of 289 (fitted, not held out: the rules were taken after its score) |
| The replays of the earlier P6 probes | all pass, as before |

Across H1 to H23, 73 of 37,352 printed values moved, all onto P6, all in H23. The whole-day pass moved 10 of 21,344 values, all in H23: 6 onto P6's day, 4 moved but still off it. On these probes the whole-day pass puts 99 of 326 activities on P6's day for all four dates (the candidate H23 scored: 84): 82 of the 83 in SSM and MXE, on a Monday to Friday calendar of 8 h days, and 17 of the other 243, which run on calendars of 12 h every day, of 10 h Monday to Thursday, or of 9.5 h Monday to Thursday and 4 h on Friday.

**Not measured:**
- a Start On or After, or a Mandatory Start, in the second slot later than a primary Mandatory Start. The hours passes and the Python whole-day pass move the start out to it; the JS whole-day pass keeps the primary date (the other half of F5-B). M4 points to the move: P6 took its start off the Mandatory Start for a later finish floor;
- an expected finish on resource dependent work already under way (XE is taken on work not yet started);
- the As Late As Possible slide of resource dependent work not yet started landing on a day only its resource works. P6's import re-sized A2's and A3's assignments to 119.5 h and 105.5 h on RE, and their slides start on working days, Tue 15 Dec 11:30 and Wed 9 Dec 13:30.

The builders are in the P6 oracle repository (`h23_shapes_2026_10_19/build_h23p.py`, `build_h23q.py`).
