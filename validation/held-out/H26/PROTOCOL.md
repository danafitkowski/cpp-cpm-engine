# Held-out set H26: protocol

H25 ([`../H25/RESULT.md`](../H25/RESULT.md)) scored the v2.10.12 candidate once, at 384 of 391 unfinished activities on all seven fields. Its 7 differences came from two shapes, both resource dependent work. Synthetic P6 probes measured both shapes and their neighbours in round 10: [`../../p6-probes/h25-shapes-2026-10-19/`](../../p6-probes/h25-shapes-2026-10-19/) (two probes, 47 rows). The candidate takes these rules from them, all in the hours pass:

- **ZF**: under a start-to-start or start-to-finish bound that another assignment takes, a lagged assignment with no work that took the bound runs back from the activity's late finish. That late finish can be later than its own landing. Its start is the earlier of the bound and its lag back from there.
- **BM**: such a bound binds only where it moves an assignment's late finish earlier than its own calendar's last working time at or before the late finish requirement. Where it moves none, the work is placed as with no bound.
- **AG**: the As Late As Possible slide of resource dependent work does not move it where no working time of the activity calendar lies between its early finish and the slide's bound.

The same round also measured the four duration types ([`../../p6-probes/duration-types-2026-10-19/`](../../p6-probes/duration-types-2026-10-19/), 108 rows). P6's import and its F9 gave identical values under all four, so no rule was taken from them.

The rules are fitted on the probes and on H25. H26 is the held-out test of the candidate. It is drawn on H25's population with `--features wide8`, which adds the rules' shapes.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H25 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `d71920a9e3c444ccbd21ef7e418f0d1c2446a89b770054432b7ceb9fefdc43b2`, the v2.10.12 candidate (`383414c`, unchanged since). Its version string reads 2.10.12.
   - **Scripts:** the scripts in this folder at this commit. Three changed since H25's protocol, one of them new:
     - `generate_held_out.py` gains `--features wide8` (below) (`be62a47`). The `wide` to `wide7` cases come out byte for byte as before, because the new draws come last. Regenerated from their seeds, all 300 cases of H1 to H25 match their frozen files.
     - `model_p6_import.js` is new (`76a8d2b`). It is a model of how P6's import sizes resource dependent work, and it plays no part in the score. It reproduces every import recorded so far: H8 to H25, and 59 probe sets.
     - `freeze.py`: its usage note names `wide8`, and the manifest records the model's SHA-256 (`be62a47`, `76a8d2b`).
   - Neither the engine nor any script may change for H26 after this commit.
2. **The seed** is round **6567266** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`). That round is published at **2026-10-19 22:30:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H26 --round 6567266 --count 12 --features wide8`. It adds `H26/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is the same as H25's, into the EPS kept for synthetic test projects:
   - `python merge_cases.py H26` writes `H26/import/H26-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once. Each project goes to Create New Project under EPS ZZ-CPP-TEST, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H26 <case>` records what the import made of each case, including each assignment's remaining start and finish.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H26`, then `node score_whole_day.js H26`, each run once, on the v2.10.12 candidate.
   - The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out.
   - The results commit adds `H26/import/`, `H26/p6-imported/`, `H26/p6-results.csv`, `H26/p6-capture.json` and `H26/results/`. `H26/RESULT.md` reports them.
6. **The import model is measured as well, apart from the score.** `node model_p6_import.js H26` compares the frozen model's record of each case with what P6's import recorded. Both the model's bytes and the cases are frozen before the capture, so its prediction is fixed before P6 sees the set. `RESULT.md` reports the comparison, every difference included. Neither the model nor its result enters the score.
7. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.11 (SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`) is run through the same scorer. The candidate H25 scored (`9587baa06402f9cb06d8b376ecad7c3b8c8a0d346eaecd0500003ae6704abe0f`) is run the same way. Together they show where this set's values were moved by the candidate's rules, and by ZF, BM and AG.
   - The production Python engine (the candidate's canonical tree) is run on H26's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H26 --count 12 --features wide8`:

- everything `wide7` draws, as H25 drew it;
- then, in about 90 cases in 100 and only where `wide7`'s shapes drew, the shapes of the rules taken after H25. Each is on new work not yet started, hung finish-to-start from an activity of the network and into the finish milestone:
  - where the case has a Mon-Fri calendar that closes by 17:00, one resource dependent activity on it with 4 or 8 h of work on the activity calendar's hours, planned from an opening. It has an assignment with no work and a 10 to 16 h lag on a resource that works every day 06:00-18:00. Its start-to-start successor is a finish milestone held by a Finish On or Before at a Friday close, so the lag lands over the weekend. Its finish-to-start successor is a finish milestone held by a Finish On or Before. About half the time that milestone holds the late finish where the work under the bound ends (BM); otherwise it holds it one to three days later (ZF).
  - one As Late As Possible resource dependent activity on a calendar that works every day 06:00-18:00 (added where the case has none), planned on a Saturday. It has 8 h of work, or 4 h after a 4 h lag, on a resource every day 10:00-18:00, and an assignment on a Mon-Fri resource that has no hours in its planned window, which P6's import leaves with no units and no duration. A predecessor held by a Start On or After at a weekday 06:00 puts its start at 08:00. Its finish-to-start successor is held by a Start On or After. About half the time that is the next opening after its early finish, 06:00 the next morning, with no working time between (AG); otherwise it is a day later.

The draw is steered towards these shapes, and towards nothing else. Before this commit, a trial of 8 sets of 12 (seeds `trial-wide8-1` to `-8`, not held out) checked that the shapes reach the rules once P6's import has sized them. With the import model laid over each case, ZF, BM and AG changed 28 of 37 ZF/BM shapes and 33 of 41 AG shapes against the candidate H25 scored. They changed 2 of the 29 shapes whose bound lies a day later. The result reports what the draw gave each rule to decide.

## Commitments

They are the same as for H1 to H25:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H26's result stays as published.

The engine is not changed against H26. A difference in H26 is reported against the rule or feature it falls in.
