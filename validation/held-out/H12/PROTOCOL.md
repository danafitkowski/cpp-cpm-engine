# Held-out set H12: protocol

H11 ([`../H11/RESULT.md`](../H11/RESULT.md)) scored the v2.10.8 candidate once, at 230 of 231 unfinished activities on all seven fields, every date among them. v2.10.7, diagnosed after the score, gives 208.

**Its one difference came from rule RT.** H11-07 A1260 is resource dependent work under way, under retained logic, with total float the smaller of start and finish float. RT gives the finish float there; P6 gives the start float from its own late start. RT's clause for work under way had been measured only under progress override.

Two P6 probe projects then measured it: ZZ-CPP-RDTR, the progress override probe ZZ-CPP-RDTF under retained logic, and ZZ-CPP-RDTS, the same under Start Float ([`../../p6-probes/h11-followups-2026-10-17/`](../../p6-probes/h11-followups-2026-10-17/), 28 rows). The candidate engine was changed to reproduce them:

- **RT, narrowed.** On resource dependent work, start float runs to the late finish less the remaining span on the activity calendar, and so equals finish float, under Start Float in every mode. It does the same on work under way under progress override. Under retained logic, work under way with the smaller-float option keeps the start float its own late start gives.

The probes and H11 are therefore **fitted** for this engine: on the same bytes H11 scores 231 of 231, which is not a test. H12 is the held-out test of the engine as it now stands, the candidate for release as v2.10.8.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H11 in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `fa8850b53a58f18c80b70f5e5ed2ece1d6fd219247439208c81a6abd7138d4c8`, first committed in `63b915e` on this branch. Its version string reads 2.10.8. These are the bytes a v2.10.8 release would ship.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H12 after this commit.
2. **The seed** is round **6560909** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-17 17:31:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H12 --round 6560909 --count 12 --features wide2`. It adds `H12/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H12` writes `H12/import/H12-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H12 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H12`, then `node score_whole_day.js H12`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H12/import/`, `H12/p6-imported/`, `H12/p6-results.csv`, `H12/p6-capture.json` and `H12/results/`, and `H12/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two earlier engines are run on the same cases, through the same scorer:
   - the released v2.10.7 (SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`);
   - the candidate H11 scored (`a24270c3f44f125223e19e76e40a9ded0de06c2b833088028379243645782414`).

   That shows where the rules taken since moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H12 --count 12 --features wide2`, drawn as H10's and H11's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports, for each rule taken since v2.10.7, whether the draw gave it anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H11:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H12's result stays as published.

The engine is not changed against H12. A difference in H12 is reported against the rule or feature it falls in.
