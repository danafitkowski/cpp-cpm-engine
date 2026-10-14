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
| H2 | Scored once on 13 Oct 2026 against engine 2.10.2, released with exactly the bytes H2 scored: **169 of 171** on all seven fields on the 11 cases the read-back kept; **174 of 176** on all 12 with the read-back's false alarm on H2-09 corrected. [Result](H2/RESULT.md) |
| H3 | Scored once on 13 Oct 2026 against engine 2.10.3, released with exactly the bytes H3 scored: **244 of 253** unfinished activities match P6 on all seven fields; 9 of 12 cases match on every field. Its three differences were all present in v2.10.2, which a diagnosis after the score puts at 226 of 253. [Result](H3/RESULT.md) · [Protocol](H3/PROTOCOL.md) |
| H4 | Scored once on 14 Oct 2026 against engine 2.10.4, released with exactly the bytes H4 scored: **233 of 237** unfinished activities match P6 on all seven fields; 10 of 12 cases match on every field. v2.10.3, diagnosed after the score, gives the same 233: the draw gave none of the rules v2.10.4 changed a value to decide. Its two differences were both present in v2.10.3. [Result](H4/RESULT.md) |
