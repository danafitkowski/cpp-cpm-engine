# `validation/held-out/`: the engine against P6 on schedules it was never fitted to

The P6 comparison matrix in [`../p6-comparison/`](../p6-comparison/) is fitted: the engine was corrected against the capture it passes. The sets here are held out. Each is generated from a public randomness-beacon round named before it was published, frozen, scheduled by Primavera P6, and scored against the engine once. The score is published as it comes out.

The rules are in [`PROTOCOL.md`](PROTOCOL.md).

| File | What it does |
|---|---|
| `generate_held_out.py` | Writes a set of synthetic P6 XER schedules from a seed (standard library only). |
| `freeze.py` | Fetches the named drand round, generates the set from it, and records every hash in `manifest.json`. |
| `readback_p6_sqlite.py` | Reads P6's own schedule of each case back from a P6 Professional SQLite database, read-only. |
| `score_held_out.js` | Runs `cpm-engine.js` on each frozen case through its public API and compares it with P6, field by field. |

## Sets

| Set | Status |
|---|---|
| H1 | Scored once on 13 Oct 2026: **195 of 206** unfinished activities match P6 on all seven fields; 7 of 12 projects match on every field. [Result](H1/RESULT.md) |
| H2 | Protocol committed on branch `v2.10.2-candidate` ([`H2/PROTOCOL.md`](H2/PROTOCOL.md)): engine 2.10.2 release candidate, seeded by drand round 6549541; frozen, captured and scored next. |
