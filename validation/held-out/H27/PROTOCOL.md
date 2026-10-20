# Held-out set H27: protocol

**Revised before its round was published.** The first version of this protocol (`de06028`) named drand round 6568076 and described the fourth shape below as float paths ending at an activity of the network. Before that round was published, the record of P6's own behaviour showed that its import keeps the file's task id for that option and does not map it to the activity it imports: probe project ZZ-CPP-HSK (round 7) holds 9495006, which is no task in P6's database. So the shape names an activity P6 cannot resolve. This version says so, corrects the generator's comments and the README to match, and names a later round. The draw is unchanged: the trial and all 312 cases of H1 to H26 regenerate byte for byte. No case was drawn from the first round.

H26 ([`../H26/RESULT.md`](../H26/RESULT.md)) scored the v2.10.12 candidate once, at 407 of 407 unfinished activities on all seven fields, through one deviation committed before any value was compared, and v2.10.12 was released with exactly those bytes. Its validation summary lists four shapes as not measured:

- **a start milestone with an expected finish in a held-out set**: the P6 probes measured it, and the rule that leaves it as it was rests on them, but no held-out set has drawn one;
- **a second constraint on work under way beside a mandatory date**;
- **an assignment with no units per hour on work under way**;
- **float paths ending at an activity chosen in P6**, rather than at the project's finish. This can be set only in P6 itself, so no held-out case can carry it.

H27 is the held-out test of the released v2.10.12 on the first three. For the fourth it draws what an XER can carry: an activity named in the file as the end of the float paths, which P6's import leaves unresolved, as in any XER imported into another database. It is drawn on H26's population with `--features wide10`, which draws what `wide9` draws (`wide8`, with no activity given two assignments of one resource) and then the four shapes. No rule is added for H27: the engine is the release.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H26 in every respect not stated here.

## Order of events

1. **This commit** adds this version of the protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `d71920a9e3c444ccbd21ef7e418f0d1c2446a89b770054432b7ceb9fefdc43b2`, the released v2.10.12 (tag `v2.10.12`, `fc4915d`). Its version string reads 2.10.12.
   - **Scripts:** the scripts in this folder at this commit. Six changed since H26's protocol:
     - `p6_imported_overlay.js`: where P6's record holds one assignment of a resource on an activity and the case file more, P6's values go over the first row and the others are dropped, as P6's import dropped them (`7fcd9a2`).
     - `score_held_out.js` and `score_whole_day.js` record how many were dropped, where any were (`7fcd9a2`). Under the old and the new scripts H24 and H25 score byte for byte as before, and H26 scores whole, 407 of 407, what its deviation scored in parts.
     - `model_p6_import.js` keeps the first assignment of a resource on an activity, as P6's import does (`7fcd9a2`).
     - `generate_held_out.py` gains `--features wide9` (`7fcd9a2`) and `--features wide10` (`d6b0c88`, below); this commit corrects the comments that describe wide10's fourth shape, and no draw changes. Regenerated from their seeds, all 312 cases of H1 to H26 match their frozen files byte for byte.
     - `freeze.py`: its usage note names `wide9` and `wide10`.
     - The held-out README describes wide10, its fourth shape corrected in this commit.
   - Neither the engine nor any script may change for H27 after this commit.
2. **The seed** is round **6568106** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`). That round is published at **2026-10-20 05:30:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H27 --round 6568106 --count 12 --features wide10`. It adds `H27/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is the same as H26's, into the EPS kept for synthetic test projects:
   - `python merge_cases.py H27` writes `H27/import/H27-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once. Each project goes to Create New Project under EPS ZZ-CPP-TEST, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H27 <case>` records what the import made of each case, including each assignment's remaining start and finish. The scheduling options P6's import stored for each project are read from P6's database at the same point, so the result can say what P6 holds as the end of each case's float paths once imported.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H27`, then `node score_whole_day.js H27`, each run once, on the released v2.10.12.
   - The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out.
   - The results commit adds `H27/import/`, `H27/p6-imported/`, `H27/p6-results.csv`, `H27/p6-capture.json` and `H27/results/`. `H27/RESULT.md` reports them.
6. **The import model is measured as well, apart from the score.** `node model_p6_import.js H27` compares the frozen model's record of each case with what P6's import recorded. The model's bytes and the cases are frozen before the capture, so its prediction is fixed before P6 sees the set. `RESULT.md` reports the comparison, every difference included. Neither the model nor its result enters the score.
7. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.11 (SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`) is run through the same scorer. It shows where this set's values were moved by v2.10.12's rules.
   - The production Python engine (the released canonical tree) is run on H27's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H27 --count 12 --features wide10`:

- everything `wide8` draws, as H26 drew it, except that no activity gets two assignments of one resource (`wide9`);
- then, in about 90 cases in 100, from the same stream, the four shapes:
  - **one or two start milestones with an expected finish.** Each follows unfinished work of the network finish-to-start, on one of the case's calendars, with an expected finish half a day to six days after that work's planned finish and at least a day after the data date. It carries a Start On or After (about 3 in 10), a Mandatory Start (about 3 in 10) or no constraint. Its finish-to-start successor is a task held by a Finish On or Before, which runs into the project's finish milestone. "Use Expected Finish Dates" keeps `wide4`'s draw, on in about four cases in five.
  - **one or two tasks under way with a primary and a second constraint, one of them a mandatory date.** The pairs are drawn evenly from: Mandatory Finish then Finish On or After, Mandatory Finish then Finish On or Before, Mandatory Finish then Start On or After, Finish On or Before then Mandatory Finish, Finish On or After then Mandatory Finish, Mandatory Start then Mandatory Finish, Mandatory Start then Finish On or Before, and Start On or After then Mandatory Finish. A start constraint is drawn about the task's actual start, a finish constraint about the data date plus the work left.
  - **one task under way made resource dependent.** It has an assignment with work, its units per hour 1 or 2, and an assignment with no units and no units per hour on a resource that works other days or hours (every day 06:00-18:00, Mon-Thu 08:00-16:00, Mon-Sat 08:00-16:00 or around the clock), with a 4 or 8 h lag about half the time.
  - **where "Calculate multiple float paths" is on, about three times in five, an activity of the network named as the end of the float paths**, drawn at random from the unfinished tasks, resource dependent work and milestones other than the project's finish milestone. The case's SCHEDOPTIONS name it by its task id in the file, which P6's import keeps without mapping it, so in P6 it names no activity.

Where the earlier draws leave too few free tasks under way for the second and third shapes, new ones are added. Each starts start-to-start after work that has started, before the data date, on that work's calendar about half the time, with 30 to 90 per cent of its 16, 24 or 40 h left (8 h at least), and runs finish-to-start into the project's finish milestone.

The draw is steered towards these shapes and towards nothing else. Before this commit, a trial of 8 sets of 12 (seeds `trial-wide10-1` to `-8`, not held out) drew 133 start milestones with an expected finish, 125 tasks under way with two constraints, 82 assignments with no units per hour on work under way, and 29 named float-path end activities, in 89 of the 96 cases. Every case ran through v2.10.12 with the import model laid over it. The result reports what the draw gave each shape, and what P6's import holds as the end of the float paths.

## Commitments

They are the same as for H1 to H26:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H27's result stays as published.

The engine is not changed against H27. A difference in H27 is reported against the shape or rule it falls in.
