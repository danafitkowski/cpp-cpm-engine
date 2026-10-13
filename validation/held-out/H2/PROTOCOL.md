# Held-out set H2: protocol

H1 ([`../H1/RESULT.md`](../H1/RESULT.md)) scored engine v2.10.1 once: 195 of 206 unfinished activities matched P6 on all seven fields. Its 11 differences were read as three P6 rules:

- start constraints on work under way;
- As Late As Possible under way and past its late finish;
- free float across a lag on another calendar.

Those rules were then measured on P6 probes ([`../../p6-probes/h1-situations-2026-10-13/`](../../p6-probes/h1-situations-2026-10-13/)), and the engine was changed to reproduce them. Both the probes and H1 are therefore **fitted** for the changed engine. H2 is the held-out test of that change: new schedules, drawn the same way as H1, that nobody could know when the engine was frozen.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol. The engine is `cpm-engine.js` 2.10.2 (release candidate), SHA-256 `b0fb8089c58123a8f2bb316bc47a7511ba5ba49d7076aaab7a91c79bcfbbdfec`, first committed in `71425fc` on this branch. Neither the engine nor any script here may change for H2 after this commit.
2. **The seed** is round **6549541** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-13 18:47:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** adds `H2/cases/`:
   - the 12 XER files;
   - `cases.json`;
   - `manifest.json`, recording the round, the engine's SHA-256 and the SHA-256 of every script, of this protocol and of every case.

   It is pushed before P6 sees any case.
4. **The P6 capture** follows [`../PROTOCOL.md`](../PROTOCOL.md) unchanged. Each case is imported on its own into P6 Professional 23.12.1 and scheduled once with F9, with no other project open. `readback_p6_sqlite.py` then reads P6's results back.
5. **The score** is `node score_held_out.js H2`, run once. The results commit adds `H2/p6-results.csv`, `H2/p6-capture.json` and `H2/results/`, and `H2/RESULT.md` reports them.

## What is the same as H1

- **The generator, the scorer and the P6 read-back** are byte-identical to H1's: `generate_held_out.py`, `score_held_out.js` and `readback_p6_sqlite.py`, with the SHA-256s recorded in `../H1/cases/manifest.json`.
- **The cases** are 12 synthetic projects from `generate_held_out.py --set H2 --count 12`, drawn from the same distribution as H1's.
- **The fields compared** are the same seven, for every unfinished activity.
- **`freeze.py`** changed in one respect since H1's freeze. It now reads the engine version from the engine file, where H1's freeze wrote `2.10.1` as a literal, and it also hashes this protocol. Its own SHA-256 goes into `manifest.json`.

## Where this runs

The engine under test is a release candidate. It sits on this public branch, not on `main`, because publishing an engine release is a separate decision.

- **If the candidate is released,** the release must ship exactly the bytes named above. H2 then speaks for that release.
- **If any engine byte changes before release,** H2 does not speak for the changed engine, and the release says so.

## Commitments

They are the same as H1's:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H2's result stays as published.

A difference in H2 that falls in one of the three situations above counts against the change it tests. One in any other situation is reported for what it is.
