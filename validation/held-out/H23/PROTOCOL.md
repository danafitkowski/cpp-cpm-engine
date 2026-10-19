# Held-out set H23: protocol

H22 ([`../H22/RESULT.md`](../H22/RESULT.md)) scored the released v2.10.11 once, at 268 of 271 unfinished activities on all seven fields. Its three differences were one: H22-06 A1120, work not yet started with a Mandatory Finish and an expected finish in force, whose successor needs it finished earlier than the Mandatory Finish date. Eight synthetic P6 probes in three rounds ([`../../p6-probes/xf-mandatory-2026-10-18/`](../../p6-probes/xf-mandatory-2026-10-18/), 307 rows) measured that shape and its neighbours. The v2.10.12 candidate takes four rules from them:

- **XP**: an expected finish in force on work not yet started lifts the Mandatory Finish pin. The date caps the late finish, as a Finish On does.
- **XC on finish milestones**: a finish milestone with an expected finish drops the early side of Finish On or After, Finish On and Mandatory Finish, and sits at its expected finish.
- **MR**: resource dependent work not yet started takes the mandatory pin, as a task does.
- **PC**: only the primary constraint pins. A second constraint caps the late dates, a Mandatory Start or Mandatory Finish in the second slot as a Start On or Before or a Finish On or Before does.

The candidate also keeps a milestone with an expected finish at zero duration in the whole-day pass, and gives the Python reference the JS engine's input checks. Neither moves a printed value of the hours pass on H1 to H22.

The rules are fitted on the probes and on H22. H22 gave XP one activity to decide, and no held-out set has drawn PC's shape. H23 is the held-out test of the candidate, drawn on H22's population with `--features wide5`, which adds the four rules' shapes.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H22 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `5b9a7c2db6365e60587b307ead46d577d9ae0c09c6417e695167b7fb53d35864`, the v2.10.12 candidate (`38c750a`). Its version string reads 2.10.12.
   - **Scripts:** the scripts in this folder at this commit. Two changed since H22's protocol, in this commit:
     - `generate_held_out.py` gains `--features wide5` (below). `wide`, `wide2`, `wide3` and `wide4` cases come out byte for byte as before: the new draws come last in the second stream. Regenerated from their seeds, H22, H21, H20, H19, H8 and H1 match their frozen files.
     - `freeze.py`: its usage note names `wide5`.
   - Neither the engine nor any script may change for H23 after this commit.
2. **The seed** is round **6565800** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-19 10:17:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H23 --round 6565800 --count 12 --features wide5`. It adds `H23/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's, into the EPS kept for synthetic test projects:
   - `python merge_cases.py H23` writes `H23/import/H23-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under EPS ZZ-CPP-TEST, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H23 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H23`, then `node score_whole_day.js H23`, each run once, on the v2.10.12 candidate. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H23/import/`, `H23/p6-imported/`, `H23/p6-results.csv`, `H23/p6-capture.json` and `H23/results/`, and `H23/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.11 (SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`) is run through the same scorer. That shows where the four rules moved a value on this set.
   - The production Python engine (the candidate's canonical tree) is run on H23's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H23 --count 12 --features wide5`:

- everything `wide4` draws, as H22 drew it;
- then, in about 85 cases in 100, the shapes of the four rules:
  - one to three tasks or resource dependent activities not yet started, each with a Mandatory Finish one to six days after its early finish and an expected finish near that finish; one finish-to-start successor of each gets a Finish On or Before near the Mandatory Finish date, so it needs the work earlier;
  - one to three resource dependent activities not yet started, each with a Mandatory Start or a Mandatory Finish (about half each), an expected finish on about four in ten, and, on about six in ten, a successor that needs it earlier;
  - one or two milestones hung off the network, each with an expected finish: finish milestones (about eight in ten) with Finish On or After, Finish On, Mandatory Finish or no constraint, start milestones with Start On or After, Mandatory Start or none; each runs into an 8 or 16 h task with a Finish On or Before, then into the project's finish milestone;
  - one or two activities not yet started with a mandatory date beside a second constraint: a Mandatory Finish then a Finish On or Before, a Mandatory Start then a Start On or Before, a Finish On or Before then a Mandatory Finish, a Start On or After then a Mandatory Finish, or a Mandatory Start then a Mandatory Finish; on about half, a successor needs the work earlier.

The draw is steered towards the four rules' shapes, and towards nothing else. The result reports what the draw gave each rule to decide.

## Commitments

They are the same as for H1 to H22:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H23's result stays as published.

The engine is not changed against H23. A difference in H23 is reported against the rule or feature it falls in.
