# P6 probes: the seven shapes held-out H23 found

Held-out set H23 ([`../../held-out/H23/RESULT.md`](../../held-out/H23/RESULT.md)) scored the v2.10.12 candidate at 262 of 289. Its 27 differences came from seven shapes, each new to the held-out sets. These 28 probes measured each shape and its neighbours, in seven rounds, on 19 October 2026, imported into EPS ZZ-CPP-TEST. Rounds 3 to 5 followed one shape, the free float of As Late As Possible work, after the rule taken from rounds 1 and 2 (FZ) moved one row of an earlier P6 probe, ZZ-CPP-RSRC H1-S (13 October 2026), off P6. Round 6 measured the three neighbours rounds 1 to 5 left open, before held-out H24 draws them; the JS = Python parity fuzz on the H24 generator had just found the first of them. Round 7 measured the two H24 draws that were still open after it.

## The probes

Synthetic projects built from scratch, plus H23-12 and ZZ-CPP-RSRC renamed. Each probe activity sits in a chain P -> Q -> S -> FIN beside a long chain L -> FIN that sets the project's finish, unless said otherwise.

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

### Round 3

FZ, taken from ZZ-CPP-AFF F1, moved ZZ-CPP-RSRC H1-S off P6: there P6 prints 1 h, the gap between the work's finish at its resource's close and what its successor needs. F1's successor needs it by Tue 07:30 through an FS +16 h link on the Successor lag calendar; H1-S's needs it by the next morning's opening through an FS 0 link. Each chain here is P (8 h) -> F (3 h of resource dependent work, As Late As Possible) -> S (1 h, held to a start) -> FIN; the data date is Mon 1 Mar 2027 08:00.

**ZZ-CPP-AFX** (retained logic, the Successor lag calendar): activities on X, Mon-Thu 07:00-12:00 and 13:00-17:30, Fri 07:00-11:00; resource RS Mon-Sat 08:00-16:00; week of Mon 15 Mar. G0 as F1 (FS +16 h, S held to Wed 17 15:00, so S needs F by Tue 07:30); G1 FS 0, S held to Tue 16 07:30; G2 to Tue 07:00 (X's opening); G3 to Tue 08:00 (RS's opening); G4 to Tue 09:00 (inside RS's shift); G5 FS +16 h, S held to Wed 14:30 (needs F by Tue 07:00); G6 FS +2 h, S held to Tue 09:30 (needs F by Tue 07:30); G7 and G8 as G1 and G0 with F not As Late As Possible; G9 as G1 with F a task; G10 as G1 with F on M, Mon-Fri 08:00-12:00 and 13:00-17:00. **ZZ-CPP-AFP** is G0, G1 and G5 under the Predecessor lag calendar, **ZZ-CPP-AF4** G0 and G5 under the 24-hour one. **ZZ-CPP-HSR** (retained logic, the Predecessor lag calendar) replicates H1-S: activities on M, resource RT Mon-Fri 08:00-16:00, F 8 h with no predecessor, S 4 h held to Fri 5 Mar 08:00 (J0); J1 adds P; J2 links F to S FS +8 h with S held to Fri 17:00.

### Round 4

**ZZ-CPP-RSRCR** is the ZZ-CPP-RSRC file P6 scheduled from on 13 October, renamed and nothing else. **ZZ-CPP-HSB** is J0 again (B0), then with what H1-S has that the replicas lack: a successor with no successor of its own (B1), a holiday on the work's calendar after its successor's start (B2), the Duration percent complete type (B3), and all three (B4).

### Round 5

ZZ-CPP-RSRC has "Calculate multiple float paths" on (SCHEDOPTIONS enable_multiple_longest_path_calc Y; P6 stores float path 31 on H1-S); the replicas and every held-out set have it off. **ZZ-CPP-RSRCN** is ZZ-CPP-RSRC with the option off and nothing else changed. **ZZ-CPP-HSM** has it on: B0 (J0), G1, G0 and G7 as above, on the Successor lag calendar.

### Round 6

**ZZ-CPP-MSS** (as SSM: retained logic, data date Mon 7 Dec 2026 08:00, each Q 24 h after an 8 h P) puts a primary Mandatory Start Wed 9 08:00 beside a second constraint: a Start On or After later (N1, Thu 10 08:00) and earlier (N2, Tue 8 08:00); a Mandatory Start later (N3, Fri 11 08:00) and earlier (N4, Tue 8 08:00); N1 on resource dependent work (N5); a Start On or After Thu 10 13:00 (N6); a Finish On or After Mon 14 17:00 (N7). **ZZ-CPP-XEU** (retained logic, "Use Expected Finish Dates" on, data date Sat 5 Dec 2026 08:00; activities on Mon-Fri 08:00-12:00 and 13:00-17:00, resource RE every day 06:00-18:00, so the work could start on the Saturday) has resource dependent work under way with an expected finish Thu 10 Dec 17:00 (U1) and without (U2), and not started with (U3) and without (U4). **ZZ-CPP-HSF** is HSM with the paths calculated on free float (SCHEDOPTIONS use_total_float_multiple_longest_paths N).

### Round 7

**ZZ-CPP-AVN** (retained logic; data date Mon 7 Dec 2026 08:00; activities on the Mon-Thu / Fri calendar above; resource RE every day 06:00-18:00) has As Late As Possible resource dependent work not yet started, each A planned for as many hours on RE as RE works in its planned window, so P6's import re-sizes nothing. A1 (12 h on RE) and A2 (24 h) come before a successor held to Tue 15 Dec 07:00, so their slides land on Sun 13 Dec 17:30 and Sat 12 Dec 17:30; A3 (4 h) slides onto working time, Mon 14 Dec 13:30 (control); A4 (4 h) comes before a successor held to Fri 11 Dec 10:00, so its slide lands on Fri 11 Dec 06:00, before the activity calendar opens that day. **ZZ-CPP-XEV** (as XEU) has an expected finish, Tue 8 Dec 17:00, earlier than its resource would finish the work, on work under way (V1; the resource alone finishes Wed 9 Dec 08:00) and not started (V2). **ZZ-CPP-HSP** is HSM with one float path to calculate, so every As Late As Possible chain is off it. **ZZ-CPP-HSK** is HSM with the paths ending at SG1; P6's import kept the file's task id as the key activity (key_activity_for_multiple_longest_paths 9495006), which no activity in P6 has, so P6 chose where the paths end and calculated ten.

## What P6 does

- **Shape 1 (XE).** HLA Q1, every K in HLX and HLN, and H12C A1230 print the same dates, Tue 18 Aug 08:00 to Mon 24 Aug 10:00: the remaining work starts at calendar A's next opening after its day off. Where the successor starts is what differs. With an expected finish in force on the work not yet started (HLX K1, K3, K6; H12C A1230), P6 keeps no first placement, and the successor starts at the printed finish, Mon 24 Aug 10:00. Without one (HLX K0, K2, K4, K5; HLN K0, K1; HLA Q1), P6 drives the successor from a first placement on the resources' calendars that runs through the activity's day off and finishes Thu 20 Aug 10:00: the successor starts there. Under the Predecessor lag calendar the lead lands on the day off itself (HLP), the work starts at the calendar's next opening with no first placement, and the successor starts Mon 24 Aug 10:00, as the engine already had it. An expected finish holds resource dependent work under way as it holds work not yet started (XEU): U1 and U3 finish on it, Thu 10 Dec 17:00, and their successors start Fri 11 Dec 08:00. Without one, U2's 24 h left run on RE from the activity calendar's opening, Mon 7 Dec 08:00, to Wed 9 Dec 08:00, and U4's 24 h, re-sized by P6's import to 0.42 an hour, to Fri 11 Dec 17:00; each successor starts at that finish. An expected finish earlier than the resource would finish the work holds the finish too (XEV): V1, under way, and V2, not started, finish Tue 8 Dec 17:00, and their successors start Wed 9 Dec 08:00.
- **Shape 2 (SL, MG).** A Mandatory Finish or Mandatory Start in the second slot pins nothing. Forward it is a floor: later than where the work would otherwise be, it moves the work out to its date, off a primary Mandatory Start too (M1, M4, M6, M10; M4 runs Thu 10 to Mon 14); earlier, it leaves the work where it would be without it (M2, M3, M5, M11). A Start On or After or Mandatory Start in the second slot later than a primary Mandatory Start moves the start out to it as well (MSS N1, N3, N5, N6; N7, a later Finish On or After, moves it so the finish meets its date); an earlier one leaves the start on the Mandatory Start (N2, N4). On the late side it caps, as PC has it. The work's free float is not held at zero (M12: 48 h). A Mandatory Start ignores its finish-to-finish and start-to-finish predecessors: M7 and M8 run Wed 9 to Fri 11 against predecessors that would hold their finish to Mon 14, and M9 finishes at its second-slot floor, Mon 14 17:00, not at its predecessor's Tue 15 17:00.
- **Shape 3 (ZB).** Under a start-to-start bound, the assignment with no work left starts at the activity's late start, which the bound sets, and finishes its 16 h lag later on its own calendar. That is the activity's late finish, Fri 31 Jul 10:00, where the work itself finishes Thu 30 Jul 12:00 (Z1, Z2). Without a lag (Z3), or with work left (Z5), the late finish is the work's own, Thu 30 Jul 12:00; under a finish-to-start bound (Z4) it is the bound, Wed 29 Jul 10:00.
- **Shape 4 (MX).** An external early start moves neither a Mandatory Start (E1, E3, E9 start Wed 9 08:00 against Thu 10 and Fri 11) nor a Mandatory Finish (E4, E10), and an external late finish caps neither (E6, E7). A soft constraint takes both (E5 starts Thu 10 08:00; E8's late finish is Fri 11 17:00).
- **Shape 5 (XO).** A finish-to-finish or start-to-finish requirement beyond the expected finish that falls off working time prints at the next opening: Mon 16 Nov 07:00 for Sat 03:00 (X1, X2, X6, X7), Fri 13 Nov 07:00 for Thu 19:00 (X3), as it does with no expected finish (X5). At a close it stays (X4). XFO and XFR print the same.
- **Shape 6 (AV).** The As Late As Possible slide of resource dependent work under way restarts at the activity calendar's next opening when it lands on a day only its resource works, and the resource runs on from there, past the slide's bound. A1's late start is Sat 19 Dec 13:00; A1 runs Mon 21 Dec 07:00 to Sat 26 Dec 17:00, past its late finish, Fri 25 Dec 11:00. A5 runs Mon 14 Dec 07:00 to Sat 19 Dec 07:00, past the Friday close before its held successor. Work not yet started does the same (AVN): A1 runs Mon 14 Dec 07:00 to Tue 15 Dec 07:00 and A2 Mon 14 Dec 07:00 to Wed 16 Dec 07:00, though A2's successor still starts Tue 15 Dec 07:00; A4, whose slide lands before the activity calendar opens on Fri 11 Dec, runs Fri 11 Dec 07:00 to 11:00, past its successor's start at 10:00. A3, landing on working time, runs Mon 14 Dec 13:30 to 17:30.
- **Shape 7 (FZ, FP).** With "Calculate multiple float paths" off, P6's default, As Late As Possible work holds no free float. F1 finishes Mon 15 Mar 16:00, when its resource closes, though its successor needs it only by Tue 16 Mar 07:30, and P6 prints its free float as 0 h. F2, not As Late As Possible, keeps 80.5 h; F3, a task, slides to Tue 16 Mar 07:30. So does every As Late As Possible F of rounds 3 and 4, where the gap is 1 h to 2.5 h, whatever the lag, the lag calendar, where the requirement falls, an open-ended successor, a holiday or the percent complete type; G4 and G9 slide to their requirement and have no gap; G7 and G8 keep 80.5 h. With the option on, P6 prints the free float as it stands: H1-S prints 1 h in RSRCR, as on 13 October, and 0 h in RSRCN, where the option is off; in HSM, B0 prints 1 h, G0 and G1 2 h, G7 80.5 h. HSF, with the paths calculated on free float, prints the same, and so does work off every calculated path: in HSP, P6 stores float path 1 on L and FIN only, and B0, G0 and G1 print 1 h, 2 h and 2 h; in HSK, where P6 put them on paths 8, 3 and 6, the same.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.11 | 555 of 642 |
| The v2.10.12 candidate H23 scored (`5b9a7c2d`) | 558 of 642 |
| The candidate with FZ and without FP (`1efe5eda`) | 629 of 642 |
| This candidate | 642 of 642 |

The rules are in `cpm-engine.js` (`computeCPMHours`, and the whole-day pass of `computeCPM` where it schedules the shape), `python_reference/cpm_hours.py` and `python_reference/cpm.py`:

- **SL**, in both passes. Only the primary slot pins, and holds free float at zero. A Mandatory Start in the second slot is a Start On or After forward, a Mandatory Finish a Finish On or After; on the late side PC caps. This withdraws the JS whole-day pass's v2.9.16 rule F5-B, both halves: the one that restored a mandatory second constraint's pin over a soft primary, and the one that held the start on a primary Mandatory Start against a later second constraint (MSS). The Python reference never had either. Printed values do not move: the hours pass already scheduled these as P6 does.
- **MG**, in both passes. A Mandatory Start ignores its finish-to-finish and start-to-finish predecessors, and an expected finish's floor from them.
- **MX**, in both passes. A Mandatory Start ignores an external early start; a mandatory pin ignores an external late finish (the hours pass already did; the whole-day pass capped the pin).
- **FZ**, in both passes. As Late As Possible work holds no free float. P6 prints zero on all 88 unfinished As Late As Possible activities in H1 to H23, none of which has "Calculate multiple float paths" on.
- **FP**, in both passes. The engine reads "Calculate multiple float paths" for the first time: `parseXER` hands SCHEDOPTIONS enable_multiple_longest_path_calc on as `multiple_float_paths`, `computeCPM` takes it as `opts.multipleFloatPaths`, the Python reference as `multiple_float_paths`. Default off, as P6's is. Under it FZ does not apply.
- **XO**, **AV**, **ZB** and **XE**, in the hours pass: they turn on times of day and on the resources' own calendars, which the whole-day pass does not schedule.

On the same bytes:

| Set | This candidate |
|---|---|
| H1 to H22 | 5,047 of 5,047 unfinished activities match P6 on all seven fields, as before: no value moves |
| H23 | 289 of 289 (fitted, not held out: the rules were taken after its score) |
| The replays of the earlier P6 probes | all pass, as before |

Across H1 to H23, 73 of 37,352 printed values moved, all onto P6, all in H23. The whole-day pass moved 10 of 21,344 values, all in H23: 6 onto P6's day, 4 moved but still off it. On these probes the whole-day pass puts 158 of 642 activities on P6's day for all four dates (the candidate H23 scored: 137): 103 of the 106 in SSM, MXE and MSS, which run on a Monday to Friday calendar of 8 h days, their resource on the same hours, and 55 of the other 536.

**Not measured:** float paths ending at an activity chosen in P6. P6's import does not carry a file's key activity over (HSK), so a probe built as a file cannot set one.

The builders are in the P6 oracle repository (`h23_shapes_2026_10_19/build_h23p.py`, `build_h23q.py`, `build_h23r.py`, `build_h23s.py`, `build_h23t.py`, `build_h23u.py`, `build_h23v.py`).
