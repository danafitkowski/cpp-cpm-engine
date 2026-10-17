# Held-out set H14: protocol

H13 ([`../H13/RESULT.md`](../H13/RESULT.md)) scored the v2.10.8 candidate once, at 255 of 259 unfinished activities on all seven fields. v2.10.7, diagnosed after the score, gives 218: 37 activities moved onto P6 and none away.

**Its four differences, all also present in v2.10.7, fell in two shapes no probe had measured.** Thirteen P6 probe projects then measured them. Each is a clone of H13-06 or H13-09 with one change: ZZ-CPP-RDZA to -RDZD and ZZ-CPP-SSNA to -SSNI ([`../../p6-probes/h13-followups-2026-10-17/`](../../p6-probes/h13-followups-2026-10-17/), 349 rows). The candidate engine was changed to reproduce them:

- **RZ.** An assignment with no work left sits at its resource's next opening at or after the activity's start. A finish requirement moves it only where no assignment has work left (H13-06 A1230).
- **RG.** A start-to-start or start-to-finish bound on resource dependent work, a lag's as a lead's, moves to each assignment's next opening off its working time (H13-09 A1130).

The probes and H13 are therefore **fitted** for this engine: on the same bytes H13 scores 259 of 259, which is not a test. H14 is the held-out test of the engine as it now stands, the candidate for release as v2.10.8.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H13 in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `dc5b16361f8388ea5361ec8b668a24fca29f779594c3a171edec2d37c9bfef71`, first committed in `511f984` on this branch. Its version string reads 2.10.8. These are the bytes a v2.10.8 release would ship.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H14 after this commit.
2. **The seed** is round **6561340** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-17 21:07:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H14 --round 6561340 --count 12 --features wide2`. It adds `H14/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H14` writes `H14/import/H14-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H14 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H14`, then `node score_whole_day.js H14`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H14/import/`, `H14/p6-imported/`, `H14/p6-results.csv`, `H14/p6-capture.json` and `H14/results/`, and `H14/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two earlier engines are run on the same cases, through the same scorer:
   - the released v2.10.7 (SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`);
   - the candidate H13 scored (`f07a6ee83592a5ab5c04e67c70d45487eda765dfd9dc6976511ccb2b48ec277f`).

   That shows where the rules taken since moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H14 --count 12 --features wide2`, drawn as H10's to H13's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports, for each rule taken since v2.10.7, whether the draw gave it anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H13:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H14's result stays as published.

The engine is not changed against H14. A difference in H14 is reported against the rule or feature it falls in.
