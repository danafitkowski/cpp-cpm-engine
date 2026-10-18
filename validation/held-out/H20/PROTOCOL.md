# Held-out set H20: protocol

H19 ([`../H19/RESULT.md`](../H19/RESULT.md)) scored the v2.10.10 candidate once, at 216 of 216 unfinished activities on all seven fields, all 12 cases clean. Those bytes were released as v2.10.10.

H19 gave neither of v2.10.10's changes anything to move. Rule ZP rests on its seven probe projects and on held-out case H17-10; the Python engine's RL correction rests on held-out case H18-08, where it was found, and on fixture F178. H20 is the held-out test of the engine as released, v2.10.10, on the population the misses of H10 to H17 came from: the default date window, with the features H10 to H19 drew (`--features wide2`).

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H19 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `691105fd5275680252afa6a2beadceaa35f466333cc21f97fe7b31b06a1ec572`, first committed in `41d7e33` and released as v2.10.10 (the tag names `33a9985`). Its version string reads 2.10.10.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H20 after this commit.
2. **The seed** is round **6564238** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-18 21:16:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H20 --round 6564238 --count 12 --features wide2`. It adds `H20/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H20` writes `H20/import/H20-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H20 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H20`, then `node score_whole_day.js H20`, each run once, on the released engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H20/import/`, `H20/p6-imported/`, `H20/p6-results.csv`, `H20/p6-capture.json` and `H20/results/`, and `H20/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.9 (SHA-256 `46bfd975bd77991089ce98b50b771f63733cab89e6ec494a7597bfcfed16a050`) is run through the same scorer. That shows where ZP moved a value on this set.
   - The production Python engine, whose hours pass is `python_reference/cpm_hours.py` at this commit, is run on H20's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H20 --count 12 --features wide2`, drawn as H10's to H18's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports whether the draw gave ZP or the RL correction anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H19:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H20's result stays as published.

The engine is not changed against H20. A difference in H20 is reported against the rule or feature it falls in.
