# Held-out set H28: protocol

H27 ([`../H27/RESULT.md`](../H27/RESULT.md)) scored the released v2.10.12 at 507 of 524 unfinished activities on all seven fields. Its 17 differences fell under five causes, and each went to synthetic P6 probes before any rule: round 15 ([`../../p6-probes/h27-causes-2026-10-20/`](../../p6-probes/h27-causes-2026-10-20/), 30 probes, 109 rows) and round 16 ([`../../p6-probes/alap-rd-2026-10-20/`](../../p6-probes/alap-rd-2026-10-20/), 10 probes, 40 rows). The v2.10.13 candidate takes these rules from them:

- **MZ:** a finish milestone sits at the 24:00 close of a day before one not worked (round 15: ZZ-CPP-KE1, KE2, KE4).
- **UM:** on work under way a Mandatory Finish, in either slot, takes its partner off the late side (KB1 to KB5).
- **ZU:** on work under way the lag of an assignment with no units and no units per hour counts from the actual start (KA1 to KA6).
- **AR:** As Late As Possible resource dependent work under a start-to-start or start-to-finish bound is placed two ways and the later holds: the work started at the bound and run forward on its own calendars, its finish moved on to the activity calendar's next opening and the work placed back from there where that forward finish falls off the activity calendar; and the reading before AR (round 15: KC3, KC4, KC7; round 16: KR1 to KR10; round 14: KH1C, KH2C, KH4C).
- **ZQ:** beside work, an assignment with no work and a lag bounds the start of resource dependent work placed back from a finish requirement (KD2, KD3, KD4).

It also takes **FK** from P6 probe rounds 11 to 14 ([`../../p6-probes/key-activity-2026-10-20/`](../../p6-probes/key-activity-2026-10-20/), 23 probes, 299 rows): where "Calculate multiple float paths" ends at an activity set in P6, As Late As Possible work that is neither that activity nor leads into it holds no free float. An XER cannot carry that setting into P6 (H27's protocol), so from H28 on the capture sets it in P6, before the F9, for each case whose file names an end activity.

The rules are fitted on the probes; H27 is not used to fit them. Run on H27 as a diagnosis, the candidate matches all 524, and H1 to H26 are unchanged (6,412 of 6,412). H27's records of P6's import were taken before `import_p6_sqlite.py` recorded the end of the float paths, so the overlay leaves their key as the file has it. H28 is the held-out test of the candidate. It is drawn on H27's population with `--features wide11`, which draws what `wide10` draws and then the rules' shapes.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H27 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `b9f825d2554bf4be76852b412c13b8a35a9f0458e0c05865050185cbeac47ebd`, the v2.10.13 candidate (`6047449`). Its version string reads 2.10.13.
   - **Scripts:** the scripts in this folder at this commit. Seven changed since H27's protocol:
     - `import_p6_sqlite.py` also records the activity P6 holds as the end of the float paths (`float_path_end`), resolved among the project's activities, with the value P6 stored (`84f7a70`).
     - `p6_imported_overlay.js`: where the record holds `float_path_end`, it writes the case file's task id of that activity into SCHEDOPTIONS `key_activity_for_multiple_longest_paths`, or empties it where P6 held none (`84f7a70`).
     - `score_held_out.js` and `score_whole_day.js` hand the engine that end (`84f7a70`).
     - `model_p6_import.js` predicts that P6's import leaves no end, compared where P6's record holds one (`84f7a70`).
     - `generate_held_out.py` gains `--features wide11` (`d1d6381`). Regenerated from their seeds, all 324 cases of H1 to H27 match their frozen files byte for byte.
     - `freeze.py`: its usage note names `wide11` (this commit).
     - The held-out README describes wide11 (this commit) and the records of the end activity (`84f7a70`).
   - Neither the engine nor any script may change for H28 after this commit.
2. **The seed** is round **6568526** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`). That round is published at **2026-10-20 09:00:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H28 --round 6568526 --count 12 --features wide11`. It adds `H28/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H27's, into the EPS kept for synthetic test projects, with one step added:
   - `python merge_cases.py H28` writes `H28/import/H28-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once. Each project goes to Create New Project under EPS ZZ-CPP-TEST, with the Default Configuration.
   - **New:** for each case whose SCHEDOPTIONS name an end of the float paths, that end is set in P6. The project is opened on its own; in the Schedule dialog's Options, on the Advanced tab, "Display multiple float paths ending with activity" is given the activity whose code is the code of the activity the file's task id names; the options are closed and saved, the Schedule dialog is cancelled without scheduling, and the project is closed. Nothing else is changed.
   - Before any F9, `python import_p6_sqlite.py <db> H28 <case>` records what the import made of each case, each assignment's remaining start and finish, and the end of the float paths P6 holds. It must find no case scheduled yet.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H28`, then `node score_whole_day.js H28`, each run once, on the v2.10.13 candidate.
   - The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out; the end of the float paths P6 held is laid over as above.
   - The results commit adds `H28/import/`, `H28/p6-imported/`, `H28/p6-results.csv`, `H28/p6-capture.json` and `H28/results/`. `H28/RESULT.md` reports them.
6. **The import model is measured as well, apart from the score.** `node model_p6_import.js H28` compares the frozen model's record of each case with what P6's import recorded, the end activity set in P6 aside. The model's bytes and the cases are frozen before the capture, so its prediction is fixed before P6 sees the set. `RESULT.md` reports the comparison, every difference included. Neither the model nor its result enters the score.
7. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.12 (SHA-256 `d71920a9e3c444ccbd21ef7e418f0d1c2446a89b770054432b7ceb9fefdc43b2`) is run through the same scorer. It shows where this set's values were moved by the candidate's rules.
   - The production Python engine (the candidate's canonical tree) is run on H28's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H28 --count 12 --features wide11`:

- everything `wide10` draws, as H27 drew it: everything `wide8` draws with no activity given two assignments of one resource, start milestones with an expected finish, tasks under way with a primary and a second constraint one of which is a mandatory date, a task under way made resource dependent beside an assignment with no units per hour, and, where "Calculate multiple float paths" is on, about three times in five, an activity of the network named as the end of the float paths;
- then, in about 90 cases in 100, from the same stream, the rules' shapes, each new work not yet started hung into the network:
  - **AR:** one or two As Late As Possible resource dependent activities after the project's start milestone, each on one of the case's calendars, with one resource at 1 an hour that works every day 06:00-18:00, Mon-Fri 08:00-16:00, Mon-Sat 08:00-16:00 or Mon-Thu 08:00-16:00, and 2 to 40 h of work. Each leads start-to-start (no lag, or 4 h about a third of the time) or, about one time in four, start-to-finish into a 4 h task held by a Start On or After two to eight days after the data date, on a shift edge, mid-shift or off working time, and runs finish-to-start into the project's finish milestone.
  - **ZQ:** one resource dependent activity of 16 h, with an assignment with work at 1 an hour on a resource that works every day 06:00-18:00 and one with no units, 1 an hour and a 24 h lag on a Mon-Fri 07:00-17:00 resource, placed back from a start-to-finish (8 h or no lag) or finish-to-finish (8 h) requirement of an 8 h task held by a Start On or After.
  - **MZ:** a task of one to three whole days on a new calendar that works every day 00:00-24:00 except one day, held by a Start On or After at the midnight two to six days after the data date, so it finishes at the 24:00 close of the day before the day off. A finish milestone follows it, finish-to-start or finish-to-finish, on that calendar about three times in four and on another of the case's otherwise, and a 24 h task follows the milestone about half the time.

The draw is steered towards these shapes and towards nothing else. Before this commit, a trial of 8 sets of 12 (seeds `trial-wide11-1` to `-8`, not held out) drew the shapes in 85 of the 96 cases: 130 As Late As Possible activities under a start bound (55 placed forward from the bound, 5 placed back from the activity calendar's next opening, 70 by the reading before AR), 85 ZQ and 85 MZ shapes, and 33 named ends of the float paths. Every case ran through the candidate with the import model laid over it and the named end handed on, with no error. The result reports what the draw gave each shape and the end P6 held for each case.

## Commitments

They are the same as for H1 to H27:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H28's result stays as published.

The engine is not changed against H28. A difference in H28 is reported against the shape or rule it falls in.
