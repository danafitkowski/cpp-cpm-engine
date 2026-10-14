# Held-out set H4: protocol

H3 ([`../H3/RESULT.md`](../H3/RESULT.md)) scored engine v2.10.3 once: 244 of 253 unfinished activities matched P6 on all seven fields. Its nine differences came from three situations, all already present in v2.10.2:

- under progress override with lag from Early Start, a start-to-start link out of work under way, the data date at the end of the predecessor's working day;
- a Start On or Before on a finish milestone;
- a late start set by a start-to-start successor with a negative lag, landing exactly at a lunch break.

Eighteen P6 probe projects then measured the three situations ([`../../p6-probes/h3-situations-2026-10-14/`](../../p6-probes/h3-situations-2026-10-14/)). Checking the changed engine against every project P6 had scheduled in the local database showed two more rules, which were probed as well: how P6 breaks a tie between a lead landing on a close and the late finish, and an expected finish on a milestone. The engine was changed to reproduce all of them. The probes and H3 are therefore **fitted** for the changed engine. H4 is the held-out test of that change: new schedules, drawn the same way as H1 to H3, that nobody could know when the engine was frozen.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol. The engine is `cpm-engine.js` 2.10.4 (release candidate), SHA-256 `c730158210afcef9969140659c0fdcf3c642a2fd0f13d96c47b20de4c4c93881`, first committed in `16f89c7` on this branch. Neither the engine nor any script here may change for H4 after this commit.
2. **The seed** is round **6551257** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-14 09:05:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** adds `H4/cases/`:
   - the 12 XER files;
   - `cases.json`;
   - `manifest.json`, recording the round, the engine's SHA-256 and the SHA-256 of every script, of this protocol and of every case.

   It is pushed before P6 sees any case.
4. **The P6 capture** follows [`../PROTOCOL.md`](../PROTOCOL.md) unchanged. Each case is imported on its own into P6 Professional 23.12.1 and scheduled once with F9, with no other project open. `readback_p6_sqlite.py` then reads P6's results back.
5. **The score** is `node score_held_out.js H4`, run once. The results commit adds `H4/p6-results.csv`, `H4/p6-capture.json` and `H4/results/`, and `H4/RESULT.md` reports them.

## What is the same as H1 to H3

- **The generator and the scorer** are byte-identical to H1's, H2's and H3's: `generate_held_out.py` and `score_held_out.js`, with the SHA-256s recorded in `../H1/cases/manifest.json`.
- **The cases** are 12 synthetic projects from `generate_held_out.py --set H4 --count 12`, drawn from the same distribution.
- **The fields compared** are the same seven, for every unfinished activity.
- **`freeze.py`** and **`readback_p6_sqlite.py`** are H3's.

## Where this runs

The engine under test is a release candidate. It sits on this public branch, not on `main`, because publishing an engine release is a separate decision.

- **If the candidate is released,** the release must ship exactly the bytes named above. H4 then speaks for that release.
- **If any engine byte changes before release,** H4 does not speak for the changed engine, and the release says so.

## Commitments

They are the same as for H1 to H3:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H4's result stays as published.

A difference in H4 that falls in one of the situations above counts against the change it tests. One in any other situation is reported for what it is.
