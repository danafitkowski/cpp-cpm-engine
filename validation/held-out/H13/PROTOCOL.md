# Held-out set H13: protocol

H12 ([`../H12/RESULT.md`](../H12/RESULT.md)) scored the v2.10.8 candidate once, at 274 of 279 unfinished activities on all seven fields. v2.10.7, diagnosed after the score, gives 195: 79 activities moved onto P6 and none away.

**Its five differences, all also present in v2.10.7, fell in three shapes no probe had measured.** Five P6 probe projects then measured them: ZZ-CPP-RDXP, -RDXR, -MSNP, -MSNR and -RD2S ([`../../p6-probes/h12-followups-2026-10-17/`](../../p6-probes/h12-followups-2026-10-17/), 74 rows). The candidate engine was changed to reproduce them:

- **RX.** On resource dependent work, an FF or SF requirement later than the expected finish places the work as RQ does, against the requirement, and the expected finish re-sizes nothing (H12-06 A1210).
- **MC.** The project's late finish caps a Mandatory Start or Mandatory Finish pin. Where the pin would put the late finish after the Must Finish By, P6 keeps the late finish the Must Finish By gives, so the float goes negative (H12-09 A1330). This holds in both passes.
- **RA.** An SS or SF bound on resource dependent work, a lag's or a lead's, is held against the activity's late start, the earliest of its assignments' own (H12-11 A1160).

The probes and H12 are therefore **fitted** for this engine: on the same bytes H12 scores 279 of 279, which is not a test. H13 is the held-out test of the engine as it now stands, the candidate for release as v2.10.8.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H12 in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `f07a6ee83592a5ab5c04e67c70d45487eda765dfd9dc6976511ccb2b48ec277f`, first committed in `5025d1c` on this branch. Its version string reads 2.10.8. These are the bytes a v2.10.8 release would ship.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H13 after this commit.
2. **The seed** is round **6561230** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-17 20:12:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H13 --round 6561230 --count 12 --features wide2`. It adds `H13/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H13` writes `H13/import/H13-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H13 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H13`, then `node score_whole_day.js H13`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H13/import/`, `H13/p6-imported/`, `H13/p6-results.csv`, `H13/p6-capture.json` and `H13/results/`, and `H13/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two earlier engines are run on the same cases, through the same scorer:
   - the released v2.10.7 (SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`);
   - the candidate H12 scored (`fa8850b53a58f18c80b70f5e5ed2ece1d6fd219247439208c81a6abd7138d4c8`).

   That shows where the rules taken since moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H13 --count 12 --features wide2`, drawn as H10's to H12's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports, for each rule taken since v2.10.7, whether the draw gave it anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H12:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H13's result stays as published.

The engine is not changed against H13. A difference in H13 is reported against the rule or feature it falls in.
