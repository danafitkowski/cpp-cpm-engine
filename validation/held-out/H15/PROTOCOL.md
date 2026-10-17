# Held-out set H15: protocol

H14 ([`../H14/RESULT.md`](../H14/RESULT.md)) scored the v2.10.8 candidate once, at 197 of 198 unfinished activities on all seven fields. v2.10.7, diagnosed after the score, gives 115: 82 activities moved onto P6 and none away.

**Its one difference, also present in v2.10.7, was a shape no probe had measured.** Six P6 probe projects then measured it. Each is a clone of H14-11, as it is or with its links to the completed successors, its external late finish or its suspension taken out: ZZ-CPP-ALCA to -ALCF ([`../../p6-probes/h14-followups-2026-10-17/`](../../p6-probes/h14-followups-2026-10-17/), 144 rows). The candidate engine was changed to reproduce them:

- **AC.** Under retained logic a completed successor bounds the As Late As Possible slide as it bounds free float (FC), at the date carried into it. It is not an open end (H14-11 A1010).

The probes and H14 are therefore **fitted** for this engine: on the same bytes H14 scores 198 of 198, which is not a test. H15 is the held-out test of the engine as it now stands, the candidate for release as v2.10.8.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H14 in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `4b87b66f39a3a566cd73a126557381b3d9bf750664d24ab0fa4362eb82df480d`, first committed in `b0e594c` on this branch. Its version string reads 2.10.8. These are the bytes a v2.10.8 release would ship.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H15 after this commit.
2. **The seed** is round **6561427** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-17 21:50:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H15 --round 6561427 --count 12 --features wide2`. It adds `H15/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H15` writes `H15/import/H15-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H15 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H15`, then `node score_whole_day.js H15`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H15/import/`, `H15/p6-imported/`, `H15/p6-results.csv`, `H15/p6-capture.json` and `H15/results/`, and `H15/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two earlier engines are run on the same cases, through the same scorer:
   - the released v2.10.7 (SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`);
   - the candidate H14 scored (`dc5b16361f8388ea5361ec8b668a24fca29f779594c3a171edec2d37c9bfef71`).

   That shows where the rules taken since moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H15 --count 12 --features wide2`, drawn as H10's to H14's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports, for each rule taken since v2.10.7, whether the draw gave it anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H14:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H15's result stays as published.

The engine is not changed against H15. A difference in H15 is reported against the rule or feature it falls in.
