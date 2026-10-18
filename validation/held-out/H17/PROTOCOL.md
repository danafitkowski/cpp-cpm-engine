# Held-out set H17: protocol

H16 ([`../H16/RESULT.md`](../H16/RESULT.md)) scored the v2.10.8 candidate once, at 217 of 217 unfinished activities on all seven fields, all 12 cases clean. Those bytes were released as v2.10.8.

**v2.10.9 then took one rule, from P6 probes rather than from a held-out difference.** Five synthetic probe projects were measured in P6 ([`../../p6-probes/susp-lag-rb-break-2026-10-18/`](../../p6-probes/susp-lag-rb-break-2026-10-18/), 92 rows):

- three measured the lag off a suspended predecessor: ZZ-CPP-SPLR under retained logic, ZZ-CPP-SPLO under progress override, and ZZ-CPP-SPLN under retained logic with "SS lag from Actual Start";
- two measured a start-to-start bound in a midday break on resource dependent work: ZZ-CPP-RBMR and ZZ-CPP-RBMO. Rule RB (v2.10.8) already gave P6's values there.

The engine was changed to reproduce the first three:

- **SU.** The elapsed part of a start-to-start or start-to-finish lag off progressed work is the working time from the predecessor's actual start to the data date, less the time it sat suspended in between: from its suspend date to its resume date, or to the data date when it has none. The forward drive, free float and the As Late As Possible slide count it so. The backward pass counts the whole elapsed time, as P6 does. Held-out cases H13-03 and H13-10 showed that: a first draft that left the suspension out on the late side too moved four late dates there away from P6.

The probes are therefore **fitted** for this engine, and so are H13-03 and H13-10 for the backward count. H1 to H16, re-scored on the release bytes, give 3,741 of 3,741 unfinished activities, which is not a test. H17 is the held-out test of the engine as released, v2.10.9.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H16 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `46bfd975bd77991089ce98b50b771f63733cab89e6ec494a7597bfcfed16a050`, first committed in `eb5b649` and released as v2.10.9 (the tag names `c540095`). Its version string reads 2.10.9.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H17 after this commit.
2. **The seed** is round **6563706** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-18 16:50:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H17 --round 6563706 --count 12 --features wide2`. It adds `H17/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H17` writes `H17/import/H17-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H17 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H17`, then `node score_whole_day.js H17`, each run once, on the released engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H17/import/`, `H17/p6-imported/`, `H17/p6-results.csv`, `H17/p6-capture.json` and `H17/results/`, and `H17/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, the released v2.10.8 (SHA-256 `bbdf1b95a9cc43aa51c5b0ed51b7c721ac5785a4049b22ff1481f4fabf0cbbee`, the engine H16 scored) is run on the same cases, through the same scorer. That shows where SU moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H17 --count 12 --features wide2`, drawn as H10's to H16's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports whether the draw gave SU anything to decide, a start-to-start or start-to-finish lag off a started predecessor with a suspend date, with what the score shows about it.

## Commitments

They are the same as for H1 to H16:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H17's result stays as published.

The engine is not changed against H17. A difference in H17 is reported against the rule or feature it falls in.
