# Held-out set H18: protocol

H17 ([`../H17/RESULT.md`](../H17/RESULT.md)) scored the released v2.10.9 once, at 207 of 208 unfinished activities on all seven fields. v2.10.8, diagnosed after the score, gives the same 207.

**The one difference is H17-10 A1070's early finish:** the engine printed Thu 10 Dec 2026 08:00, where P6 has 07:00. A1070 is resource dependent work whose start a finish-to-finish requirement sets. Its finish comes from an assignment with no work, which sits at its resource's next opening after the requirement. Seven P6 probe projects then measured the shape. Each is a clone of H17-10, as it is or with one change: the empty assignment's resource opening earlier or later, working the day the requirement falls on, the scheduling mode, the link type, or the requirement off the activity calendar's working time (ZZ-CPP-RZFA to -RZFS, [`../../p6-probes/h17-followups-2026-10-18/`](../../p6-probes/h17-followups-2026-10-18/), 168 rows). The candidate engine was changed to reproduce them:

- **ZP.** Where a finish requirement sets the start of resource dependent work and no activity working time separates its finish from the requirement, the finish prints at the later of itself and the requirement as it stands on the activity calendar. So an assignment with no work that sits later keeps its own time. RQ's last clause had printed the activity calendar's next opening there.

The probes and H17 are therefore **fitted** for this engine: on the same bytes H17 scores 208 of 208, which is not a test. H18 is the held-out test of the engine as it now stands, the candidate for release as v2.10.10.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H17 in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `14e2f392e75b998ba130fb73754ac609158d51ea3d2a6dc84543b1cbf20ff5c0`, first committed in `7033dc2` on this branch. Its version string reads 2.10.10. These are the bytes a v2.10.10 release would ship.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H18 after this commit.
2. **The seed** is round **6563835** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-18 17:54:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H18 --round 6563835 --count 12 --features wide2`. It adds `H18/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H18` writes `H18/import/H18-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H18 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H18`, then `node score_whole_day.js H18`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H18/import/`, `H18/p6-imported/`, `H18/p6-results.csv`, `H18/p6-capture.json` and `H18/results/`, and `H18/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, the released v2.10.9 (SHA-256 `46bfd975bd77991089ce98b50b771f63733cab89e6ec494a7597bfcfed16a050`, the engine H17 scored) is run on the same cases, through the same scorer. That shows where ZP moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H18 --count 12 --features wide2`, drawn as H10's to H17's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports whether the draw gave ZP anything to decide, resource dependent work whose start a finish requirement sets with a finish it moves, with what the score shows about it.

## Commitments

They are the same as for H1 to H17:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H18's result stays as published.

The engine is not changed against H18. A difference in H18 is reported against the rule or feature it falls in.
