# Held-out set H30: protocol

H29 ([`../H29/RESULT.md`](../H29/RESULT.md)) scored the v2.10.13 candidate as it then stood (`e605a226`) at 673 of 676 unfinished activities on all seven fields. Its 3 differences fell under two causes, and each went to synthetic P6 probes before any rule, together with round 21's finding on the float-type codes: round 21 ([`../../p6-probes/round21-2026-10-21/`](../../p6-probes/round21-2026-10-21/), 6 probes, 24 rows), round 22 ([`../../p6-probes/round22-2026-10-21/`](../../p6-probes/round22-2026-10-21/), 18 probes, 80 rows) and round 23 ([`../../p6-probes/round23-2026-10-21/`](../../p6-probes/round23-2026-10-21/), 10 probes, 30 rows). The candidate now takes these rules from them:

- **FT:** P6 keeps an imported float-type code as written and schedules three behaviours. FT_FF is finish float. FT_Start, and FT_Total read the same way, is start float with RT and AT. FT_SS, the code P6's own Schedule Options dialog writes for "Start Float" (over an imported FT_Start too, when the options are saved there), is start float from early start to late start with neither (round 21: ZZ-CPP-FA1 to FA6; round 22: FC1 to FC7). FT replaces ET, which had taken the dialog's rewrite for an effect of the end of the float paths.
- **AZ, without AV:** As Late As Possible resource dependent work with no work left stays at its resources' opening. AV no longer runs it on to the activity calendar's next opening, on a day that calendar has off or before it opens (ZB1, ZB2, ZB4 against ZB3, ZB5).
- **MO:** a Mandatory Start on resource dependent work with no expected finish in force pins the span, on the activity calendar, of the work placed forward from it on its resources' own calendars, not the stored remaining duration. The work is placed back from the end of that span (LC1, LC2, LC5, LC6, MM1, MM2, MP1, MX3, MT2 against LC3, LC4, MW1, MW2, MT1; an expected finish in force keeps the stored duration, MX1, MX2).

The rules are fitted on the probes; H29 is not used to fit them. Run on H29 as a diagnosis, the candidate matches all 676. H1 to H28 are unchanged (7,499 of 7,499). H30 is the held-out test of the candidate. It is drawn on H29's population with `--features wide13`, which draws what `wide12` draws and then the rules' shapes.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H29 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `28c7db990723c39957becc117e527812b4069f767880c5b1311d9b1d775ccbd5`, the v2.10.13 candidate (`c5394c7`). Its version string reads 2.10.13.
   - **Scripts:** the scripts in this folder at this commit. Four changed since H29's protocol, and the held-out README describes wide13 (this commit):
     - `import_p6_sqlite.py` records `sched_float_type`, the float type P6 holds after the import and any options saved in P6 (`6d68629`).
     - `p6_imported_overlay.js` lays that float type over the case: the record's `sched_float_type`, or, in a record made before it, the difference the record names (`6d68629`).
     - `generate_held_out.py` gains `--features wide13` (this commit). Regenerated from their seeds, all 348 cases of H1 to H29 match their frozen files byte for byte.
     - `freeze.py`: its usage note names `wide13` (this commit).
   - Neither the engine nor any script may change for H30 after this commit.
2. **The seed** is round **6572006** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`). That round is published at **2026-10-21 14:00:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H30 --round 6572006 --count 12 --features wide13`. It adds `H30/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H29's, into the EPS kept for synthetic test projects:
   - `python merge_cases.py H30` writes `H30/import/H30-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once. Each project goes to Create New Project under EPS ZZ-CPP-TEST, with the Default Configuration.
   - For each case whose SCHEDOPTIONS name an end of the float paths, that end is set in P6 as in H29: the project is opened on its own; in the Schedule dialog's Options, on the Advanced tab, "Display multiple float paths ending with activity" is given the activity whose code is the code of the activity the file's task id names; the options are closed and saved, the Schedule dialog is left without scheduling, and the project is closed. Nothing else is changed. Saving the options writes the float type P6's dialog shows, which for an imported FT_Start is FT_SS; the record holds what P6 stored.
   - Before any F9, `python import_p6_sqlite.py <db> H30 <case>` records what the import made of each case, each assignment's remaining start and finish, the end of the float paths and the float type P6 holds. It must find no case scheduled yet.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H30`, then `node score_whole_day.js H30`, each run once, on the v2.10.13 candidate.
   - The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out; the end of the float paths P6 held is laid over as H28's protocol set out; the float type P6 held is laid over as this protocol sets out.
   - The results commit adds `H30/import/`, `H30/p6-imported/`, `H30/p6-results.csv`, `H30/p6-capture.json` and `H30/results/`. `H30/RESULT.md` reports them.
6. **The import model is measured as well, apart from the score.** `node model_p6_import.js H30` compares the frozen model's record of each case with what P6's import recorded, the end activity and the float type set in P6 aside. The model's bytes and the cases are frozen before the capture, so its prediction is fixed before P6 sees the set. `RESULT.md` reports the comparison, every difference included. Neither the model nor its result enters the score.
7. **Diagnoses come after the score, not instead of it.** After the score, three runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.12 (SHA-256 `d71920a9e3c444ccbd21ef7e418f0d1c2446a89b770054432b7ceb9fefdc43b2`) is run through the same scorer.
   - The candidate H29 scored (SHA-256 `e605a2263ae5929f1ce97ef4b90a5ad24c489be0d2960b536251834a06e18d89`) is run through the same scorer. Against it, the set shows where rounds 21 to 23's rules moved this set's values, onto P6 or away.
   - The production Python engine (the candidate's canonical tree) is run on H30's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H30 --count 12 --features wide13`:

- everything `wide12` draws, as H29 drew it;
- then, in about 90 cases in 100, from the same stream, the rules' shapes, each new work not yet started hung into the network:
  - **AZ, without AV:** one As Late As Possible resource dependent activity with no work left: 8 h planned on a Sunday, its one assignment with no units at 1 an hour on a resource that works Mon-Sat, Mon-Fri or Mon-Thu 08:00-16:00, finish-to-start or start-to-start into a 4 h task of the case's held by a Start On or After two to eight days after the data date. About three times in five it is on a new calendar that works every day 00:00-24:00 but the day its resource next opens at or after that hold; otherwise on one that works every day 09:00-17:00, after the resource opens.
  - **MO:** one or two resource dependent activities of 16, 24 or 40 h on a new calendar that works Mon-Sat 08:00-16:00, at 1 an hour on a resource that works Mon-Thu 07:00-12:00 and 13:00-17:30 and Fri 07:00-11:00, planned at a Mandatory Start drawn three to ten days after the data date and moved on to the next day of the kind its shape needs. The Mandatory Start falls on a Mon-Thu with the resource's holiday that day, at 08:00 or later in the day (about 45 in 100); on a Saturday, which the resource never works (20); on a Friday after the resource's 11:00 close (20); or on a Mon-Thu with no holiday (15). About one time in three it has an expected finish two to six days after the Mandatory Start, in force where the case has "Use Expected Finish Dates" on; about one time in two a Finish On or Before second, two to six days after it.
  - **FT, the options:** about half the time the float type is FT_SS (55) or FT_Total (45), in place of the one drawn before.

The draw is steered towards these shapes and towards nothing else.

Before this commit, a trial of 8 sets of 12 was drawn (seeds `trial-wide13-1` to `-8`, not held out). It drew the shapes in 85 of the 96 cases:

- 85 As Late As Possible activities with no work left on the new calendars: 51 with the resource's opening day off, 34 opening at 09:00. Each has no duration once the import model has sized it.
- 130 Mandatory Starts on resource dependent work: 59 on the resource's holiday, 21 on a Saturday, 34 after the Friday close and 16 on a plain day; 41 with an expected finish and 60 with a Finish On or Before second.
- 47 cases with the float type FT_SS or FT_Total in place of the one drawn before (24 FT_SS and 23 FT_Total among the 96).

Every case ran through the candidate with the import model laid over it and the named end handed on, with no error. Against the candidate H29 scored, the rules moved 455 of the 5,617 unfinished activities on at least one field: 50 on the Mandatory Start shapes, 15 on work with no work left, 10 on wide12's Mandatory Starts and 380 elsewhere. Of those 380:

- 255 moved on float alone in cases under FT_SS and 13 in cases under FT_Total;
- 108 moved on float alone in cases under FT_Start with multiple float paths ending at a named activity, where ET no longer sets RT aside. The trial lays no dialog over them; in P6, setting the end through the dialog stores FT_SS, and the record lays that over the case;
- 4 moved on dates.

A parity run of 3,000 cases drawn by the generator (wide13 in two of every six, then wide12, wide11, wide2 and the default) read each case through the production converter. It changed resource dependent work as P6's import changes it and ran each case through this engine and the production Python engine (the candidate's canonical tree, `de4cbae`). The end of the float paths the converter resolves was handed to both engines; 664 cases name one. All 156,438 activities are equal on every field.

## Commitments

They are the same as for H1 to H29:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H30's result stays as published.

The engine is not changed against H30. A difference in H30 is reported against the shape or rule it falls in.
