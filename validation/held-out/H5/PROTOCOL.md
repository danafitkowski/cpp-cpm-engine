# Held-out set H5: protocol

H4 ([`../H4/RESULT.md`](../H4/RESULT.md)) scored engine v2.10.4 once: 233 of 237 unfinished activities matched P6 on all seven fields. Its four differing activities came from two situations, both already present in v2.10.3:

- As Late As Possible work under way, under progress override, with a finish-to-start link into a successor that has also started;
- a Mandatory Start tied in working time with a start-to-start bound that falls on a weekend.

Four P6 probe projects then measured the two situations ([`../../p6-probes/h4-situations-2026-10-14/`](../../p6-probes/h4-situations-2026-10-14/)). Under progress override, an FS or SS link into a successor already under way holds As Late As Possible work back no more than it binds the late dates. A Mandatory Start or Mandatory Finish sets its own late date whatever its successors need, and with both on one activity the earlier pin does. The engine was changed to reproduce them. The probes and H4 are therefore **fitted** for the changed engine. H5 is the held-out test of that change: new schedules, drawn the same way as H1 to H4, that nobody could know when the engine was frozen.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol. The engine is `cpm-engine.js` 2.10.6 (release candidate), SHA-256 `cf33847c5338573ec562d28a0ac6aca6e428e344fbd1d1d837b54f979f23bca8`, first committed in `786afab` on this branch. Neither the engine nor any script here may change for H5 after this commit.
2. **The seed** is round **6552540** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-14 19:47:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** adds `H5/cases/`:
   - the 12 XER files;
   - `cases.json`;
   - `manifest.json`, recording the round, the engine's SHA-256 and the SHA-256 of every script, of this protocol and of every case.

   It is pushed before P6 sees any case.
4. **The P6 capture** follows [`../PROTOCOL.md`](../PROTOCOL.md) unchanged. Each case is imported on its own into P6 Professional 23.12.1 and scheduled once with F9, with no other project open. `readback_p6_sqlite.py` then reads P6's results back.
5. **The score** is `node score_held_out.js H5`, run once. The results commit adds `H5/p6-results.csv`, `H5/p6-capture.json` and `H5/results/`, and `H5/RESULT.md` reports them.

## What is the same as H1 to H4

- **The generator and the scorer** are byte-identical to H1's to H4's: `generate_held_out.py` and `score_held_out.js`, with the SHA-256s recorded in `../H1/cases/manifest.json`.
- **The cases** are 12 synthetic projects from `generate_held_out.py --set H5 --count 12`, drawn from the same distribution.
- **The fields compared** are the same seven, for every unfinished activity.
- **`freeze.py`** and **`readback_p6_sqlite.py`** are H4's.

## Where this runs

The engine under test is a release candidate. It sits on this public branch, not on `main`, because publishing an engine release is a separate decision.

- **If the candidate is released,** the release must ship exactly the bytes named above. H5 then speaks for that release.
- **If any engine byte changes before release,** H5 does not speak for the changed engine, and the release says so.

## Commitments

They are the same as for H1 to H4:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H5's result stays as published.

A difference in H5 that falls in one of the situations above counts against the change it tests. One in any other situation is reported for what it is.
