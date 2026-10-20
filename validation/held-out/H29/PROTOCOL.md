# Held-out set H29: protocol

H28 ([`../H28/RESULT.md`](../H28/RESULT.md)) scored the v2.10.13 candidate as it then stood (`b9f825d2`) at 537 of 563 unfinished activities on all seven fields. Its 26 differences fell under six causes, and each went to synthetic P6 probes before any rule: round 17 ([`../../p6-probes/h28-causes-2026-10-20/`](../../p6-probes/h28-causes-2026-10-20/), 45 probes, 195 rows) and round 18 ([`../../p6-probes/round18-2026-10-20/`](../../p6-probes/round18-2026-10-20/), 25 probes scored, 112 rows). The candidate now takes these rules from them:

- **AW**, in place of AR: As Late As Possible resource dependent work under a start-to-start or start-to-finish bound is placed back from the bound carried to a finish on its remaining duration. Where it then starts before the bound on the activity calendar, it is placed back once more from the bound carried the span that placement gives, or the stored remaining duration where that is longer, no later than a finish-to-start or finish-to-finish bound (round 17: ZZ-CPP-QB1 to QB10, QG1 to QG8, QC1 to QC6; round 18: RB1 to RB5, RC1 to RC3).
- **AZ:** such work with no work left sits at its resources' next opening at or after the bound (QF1, QF3, QF4, RF1, RF2).
- **MW:** a finish floor on resource dependent work is compared by start, not by finish (QD1, RD1 to RD3 against QD4).
- **LR:** the late pin of resource dependent work is placed on its assignments before a second constraint caps it with the span that placement gives (RE1, RE2).
- **ET:** under "Start Float", where "Calculate multiple float paths" ends at an activity set in P6, start float on resource dependent work runs to the late start its assignments set, on every activity and on either basis of the paths (QA5, RA1, RA2, RA4B); under "Smallest" nothing changes (RA3).
- **AT:** under "Start Float" without multiple float paths, start float of work AW moved runs from the bound (QG6, RG1 to RG3).

The rules are fitted on the probes; H28 is not used to fit them. Run on H28 as a diagnosis, the candidate matches all 563. It matches all 524 of H27, whose records of H27-05 and H27-07 now hold no end of the float paths, as P6 held none ([`../H27/RESULT.md`](../H27/RESULT.md), "Records amended after the score"). H1 to H26 are unchanged (6,412 of 6,412). H29 is the held-out test of the candidate. It is drawn on H28's population with `--features wide12`, which draws what `wide11` draws and then the rules' shapes.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H28 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `e605a2263ae5929f1ce97ef4b90a5ad24c489be0d2960b536251834a06e18d89`, the v2.10.13 candidate (`303718c`). Its version string reads 2.10.13.
   - **Scripts:** the scripts in this folder at this commit. Two changed since H28's protocol, and the held-out README describes wide12 (this commit):
     - `generate_held_out.py` gains `--features wide12` (`cd8c653`). Regenerated from their seeds, all 336 cases of H1 to H28 match their frozen files byte for byte.
     - `freeze.py`: its usage note names `wide12` (this commit).
   - Neither the engine nor any script may change for H29 after this commit.
2. **The seed** is round **6569006** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`). That round is published at **2026-10-20 13:00:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H29 --round 6569006 --count 12 --features wide12`. It adds `H29/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H28's, into the EPS kept for synthetic test projects:
   - `python merge_cases.py H29` writes `H29/import/H29-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once. Each project goes to Create New Project under EPS ZZ-CPP-TEST, with the Default Configuration.
   - For each case whose SCHEDOPTIONS name an end of the float paths, that end is set in P6. The project is opened on its own; in the Schedule dialog's Options, on the Advanced tab, "Display multiple float paths ending with activity" is given the activity whose code is the code of the activity the file's task id names; the options are closed and saved, the Schedule dialog is cancelled without scheduling, and the project is closed. Nothing else is changed.
   - Before any F9, `python import_p6_sqlite.py <db> H29 <case>` records what the import made of each case, each assignment's remaining start and finish, and the end of the float paths P6 holds. It must find no case scheduled yet.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H29`, then `node score_whole_day.js H29`, each run once, on the v2.10.13 candidate.
   - The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out; the end of the float paths P6 held is laid over as H28's protocol set out.
   - The results commit adds `H29/import/`, `H29/p6-imported/`, `H29/p6-results.csv`, `H29/p6-capture.json` and `H29/results/`. `H29/RESULT.md` reports them.
6. **The import model is measured as well, apart from the score.** `node model_p6_import.js H29` compares the frozen model's record of each case with what P6's import recorded, the end activity set in P6 aside. The model's bytes and the cases are frozen before the capture, so its prediction is fixed before P6 sees the set. `RESULT.md` reports the comparison, every difference included. Neither the model nor its result enters the score.
7. **Diagnoses come after the score, not instead of it.** After the score, three runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.12 (SHA-256 `d71920a9e3c444ccbd21ef7e418f0d1c2446a89b770054432b7ceb9fefdc43b2`) is run through the same scorer.
   - The candidate H28 scored (SHA-256 `b9f825d2554bf4be76852b412c13b8a35a9f0458e0c05865050185cbeac47ebd`) is run through the same scorer. Against it, the set shows where rounds 17 and 18's rules moved this set's values, onto P6 or away.
   - The production Python engine (the candidate's canonical tree) is run on H29's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H29 --count 12 --features wide12`:

- everything `wide11` draws, as H28 drew it: everything `wide10` draws, then, in about 90 cases in 100, H28's shapes: As Late As Possible resource dependent work under a start-to-start or start-to-finish bound (AR's shapes, now under AW), resource dependent work placed back from a finish requirement beside an assignment with no work and a lag (ZQ), and a task finishing at the 24:00 close of the day before a day off with a finish milestone after it (MZ);
- then, in about 90 cases in 100, from the same stream, the rules' shapes, each new work not yet started hung into the network:
  - **AW and AT:** one or two As Late As Possible resource dependent activities after the project's start milestone. Each is on a calendar of the case's that works Fridays or, about half the time, on a new calendar that works Mon-Thu 07:00-12:00 and 13:00-17:30 and Fri 07:00-11:00. Each has one resource at 1 an hour (2 about one time in five) that works Mon-Thu 08:00-16:00, Mon-Thu 07:00-12:00 and 12:30-17:30, every day 06:00-18:00, Mon-Fri 08:00-16:00 or Mon-Sat 08:00-16:00, 8 to 80 h of work, and a 4 or 8 h lag on the assignment about one time in four.
    - Each leads start-to-start (no lag, or 2, 4 or 8 h about a third of the time) or, about one time in four, start-to-finish into a 4 h task held by a Start On or After two to eight days after the data date, on a shift edge, mid-shift or off working time.
    - About one time in five, it leads start-to-start into a 4 h task that is As Late As Possible itself and held by nothing.
    - About one time in three, beside a held task, it also leads finish-to-start into a second task held a few hours to two days later.
    - Each runs finish-to-start into the project's finish milestone.
  - **AZ:** one As Late As Possible resource dependent activity with no work left. It has 8 h planned on a Sunday, on a calendar of the case's that works that day or on a new calendar that works around the clock. Its one assignment has no units at 1 an hour, on a resource that works Mon-Sat, Mon-Fri or Mon-Thu 08:00-16:00. The resource has no hours in the planned window, so P6's import, as the import model has it from wide7's shape of the same kind, leaves the assignment no units and its units per hour, and the activity no duration. The activity runs finish-to-start or start-to-start into a task held by a Start On or After.
  - **MW:** one resource dependent activity of 16 to 40 h with a finish floor: a Finish On or After, a Finish On, or a Start On or After with a Mandatory Finish second. Its one resource works Mon-Thu, Mon-Sat or every day. It comes after a task held by a Start On or After, finish-to-finish with an 8 h lag or none, or finish-to-start.
  - **LR:** one resource dependent activity of 4 to 24 h held by a Mandatory Start, with a Start On or Before, a Finish On or Before or a Mandatory Finish second. Its one resource works Mon-Thu 07:00-12:00 and 13:00-17:30 and Fri 07:00-11:00. About three times in five the resource is off on the Mandatory Start's day, and about one time in five on the day before.
  - **ET and AT, the options:** "Start Float" replaces the float type the default stream drew about 45 times in 100. Where "Calculate multiple float paths" is on and wide10 named no end of the float paths, an unfinished activity of the network is named as that end about one time in two. The capture sets it in P6, as in H28.

The draw is steered towards these shapes and towards nothing else. One shape no probe measured is drawn here on purpose: a lag on the assignment of As Late As Possible resource dependent work under a start bound.

Before this commit, a trial of 8 sets of 12 was drawn (seeds `trial-wide12-1` to `-8`, not held out). It drew the shapes in 87 of the 96 cases:

- 141 As Late As Possible activities under a start bound: 91 start-to-start, 27 start-to-finish and 23 into an As Late As Possible task. 43 of them had a finish-to-start bound beside, and 40 a lag on the assignment. Wide11 drew 134 more.
- 87 with no work left (AZ). Each has no duration once the import model has sized it.
- 87 finish floors (MW).
- 87 Mandatory Starts with a second constraint (LR), 69 of them with the resource off.
- 45 cases under "Start Float" and 36 named ends of the float paths. That gives 15 cases under "Start Float" with multiple float paths ending at a named activity (ET), and 24 under "Start Float" without multiple float paths (AT).

Every case ran through the candidate with the import model laid over it and the named end handed on, with no error. Against the candidate H28 scored, the rules moved 293 of the 5,078 unfinished activities on at least one field.

A parity run of 7,000 cases drawn by the generator (wide12 in two of every six, then wide11, wide10, wide2 and the default) read each case through the production converter. It changed resource dependent work as P6's import changes it and ran each case through this engine and the production Python engine. The end of the float paths the converter resolves was handed to both engines; 1,484 cases name one. All 338,950 activities are equal on every field.

## Commitments

They are the same as for H1 to H28:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H29's result stays as published.

The engine is not changed against H29. A difference in H29 is reported against the shape or rule it falls in.
