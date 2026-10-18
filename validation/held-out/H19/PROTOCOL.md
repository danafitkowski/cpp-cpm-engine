# Held-out set H19: protocol

H18 ([`../H18/RESULT.md`](../H18/RESULT.md)) scored the v2.10.10 candidate engine (`14e2f392`) once, at 208 of 208 unfinished activities on all seven fields, with all 12 cases clean.

**After that score, the release checks found one difference, in the Python engine, not in this one.** Those checks read every project in P6's own database through the production converter. They run the Python engine the analysis tools compute with, and check it against P6's dates and against this engine.

On H18-08 A1120 the Python engine printed the late finish at 17:30, where P6 and this engine have 18:00, and three predecessors followed. A1120 is resource dependent work with two assignments, one with no work, and no start-to-start or start-to-finish bound taken. In the Python backward pass (`cpm_hours.py`, `_rsrc_backward`), one name held two things: the empty assignment's finish cap was written into the flag that decides RL. This engine keeps them apart, so RL ran in Python where no bound was taken.

The Python hours pass was corrected. Cross-validation fixture F178 pins the case: it fails on the old port and passes on the corrected one. A JS-against-Python fuzz through the production converter then found no difference on 7,000 generated cases (189,441 activities).

**This engine changed only in the disclosure figures it reports**: the cross-validation counts, now 174 fixtures and 11,776 comparisons, with alert parity on 172 of the 174. Outside those strings its bytes are H18's. On the new bytes H1 to H18 give the same value on every field of every activity, 4,157 of 4,157.

H19 is the held-out test of the engine as it now stands, the candidate for release as v2.10.10. It draws the features H10 to H18 drew on a date window none of them used: schedules dated before or across 1 January 2020, the window of H6 and H7 (`--dates pre2020`). No set has yet drawn resource dependent work, level of effort, WBS summary, suspended work or external dates on that window.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H18 in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `691105fd5275680252afa6a2beadceaa35f466333cc21f97fe7b31b06a1ec572`, first committed in `41d7e33` on this branch. Its version string reads 2.10.10. These are the bytes a v2.10.10 release would ship.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H19 after this commit.
2. **The seed** is round **6563983** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-18 19:08:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H19 --round 6563983 --count 12 --dates pre2020 --features wide2`. It adds `H19/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H19` writes `H19/import/H19-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H19 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H19`, then `node score_whole_day.js H19`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H19/import/`, `H19/p6-imported/`, `H19/p6-results.csv`, `H19/p6-capture.json` and `H19/results/`, and `H19/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.9 (SHA-256 `46bfd975bd77991089ce98b50b771f63733cab89e6ec494a7597bfcfed16a050`) is run through the same scorer. That shows where ZP moved a value on this set.
   - The production Python engine, whose hours pass is `python_reference/cpm_hours.py` at this commit, is run on H19's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H19 --count 12 --dates pre2020 --features wide2`. They are drawn as H10's to H18's were, except for the dates:

- H6's date window: an odd-numbered case starts between 2 January 2012 and 31 December 2018, so all its work lies before 2020; an even-numbered one starts in December 2019, so its work runs across 1 January 2020;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports whether the draw gave ZP anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H18:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H19's result stays as published.

The engine is not changed against H19. A difference in H19 is reported against the rule or feature it falls in.
