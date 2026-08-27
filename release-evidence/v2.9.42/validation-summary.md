# Validation summary — `cpm-engine` v2.9.42

| Field | Value |
|---|---|
| Tag | `v2.9.42` |
| Commit | `e2c81a7f91e5abe96d1e7455bd753e6cf76a5a1b` |
| Release date | 2026-08-27 |
| Engine SHA-256 | `d388909da75e096da3a6978f3c4ba0269272dc546c1479c41a284061f45009a7` |
| Engine bytes | 502060 |
| Python reference SHA-256 | `76cff49530497bd1c6b9a68cb68a3fa6996660d50249708176a86aa0616a77b0` |
| Python reference bytes | 116747 |
| Unit tests | 1216 / 1216 passing |
| Cross-validation | 1009 of 1015 defined comparisons executed and bit-identical, 0 failures, across 46 fixtures; 6 skipped rather than compared (3 `ff_signed`, 3 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 2617696051 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/33086619973 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1216 passed, 0 failed |
| `node cpm-engine.crossval.js` | 46 fixtures passed, 0 failed; 1009 of 1015 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| P6 comparison matrix | 13 / 13, fitted to a single capture |

## What changed in this release

- **Engine math changed.** The forward pass, the backward pass, free float,
  relationship-lag arithmetic and constraint handling all move, and `parseXER`
  reads the constraint date columns differently.
  A result computed on v2.9.41 or earlier can differ, so a deliverable already
  issued from an earlier tagged build is inside the supersession window and
  needs the re-check step in the operator procedure.
- **Constraint pairing.** `parseXER` read the primary constraint TYPE from
  `cstr_type` but its DATE from `cstr_date2`, and the secondary type from
  `cstr_type2` with its date from `cstr_date`. Where a schedule carried a
  primary constraint and no secondary one the primary date came back empty and
  the network scheduled as though it carried no constraints at all. Measured
  across the author's exports: with `cstr_type` set the date is in `cstr_date`
  6,394 times against 9 in `cstr_date2`.
- **The same transposition survived on the public input contract.** Both
  fallback resolvers, and the JSDoc documenting the activities shape, still
  crossed the columns, so a caller handing `computeCPM` a constraint object with
  raw P6 column names hit the original defect. Fixed with the crossed column
  kept as a last fallback for callers built against the old JSDoc.
- **SS/SF late-finish conversion restored in the backward pass.** A bound on
  late start is equally a bound on late finish one duration later; without the
  conversion SS and SF predecessors did not constrain late finish.
- Cross-validation grew from 931 of 995 across 45 fixtures to 1009 of 1015
  across 46, and the skipped comparisons fell from 64 to 6. None of the 6 is an
  open port gap: the 58 that were closed when the has-successors branch was
  ported.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 45 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated.
- The engine works in whole days. Sub-day lags round and raise an alert that is fatal in strict mode.
