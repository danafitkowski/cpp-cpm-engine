# Validation summary — `cpm-engine` v2.9.45

| Field | Value |
|---|---|
| Tag | `v2.9.45` (not yet created — see `PENDING-CI.md`) |
| Commit | `34de18fb2672b68c4315a89f2bd6bb863611ad5b` |
| Release date | 2026-09-21 |
| Engine SHA-256 | `96ff9986700189e0ab48027795eae80196f41705ca4d7b2f543577073a07e4eb` |
| Engine bytes | 548300 |
| Python reference SHA-256 | `34dbc2aa0966f133207be405fb09951a7027b5ae2b515b43b4ab211e83a0c895` |
| Python reference bytes | 160472 |
| Unit tests | 1306 / 1306 passing |
| Cross-validation | 1009 of 1015 defined comparisons executed and bit-identical, 0 failures, across 46 fixtures; 6 skipped rather than compared (3 `ff_signed`, 3 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | not yet produced — see `PENDING-CI.md` |
| CI run | not yet produced — see `PENDING-CI.md` |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1306 passed, 0 failed |
| `node cpm-engine.crossval.js` | 46 fixtures passed, 0 failed; 1009 of 1015 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS (4 fixtures) |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS (7 sub-suites) |
| P6 comparison validator | PASS (7 scenarios — 1 real + 6 synthetic) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, recomputed under v2.9.45 against the same 2026-08-11 capture (fitted, not held out); every engine column identical to v2.9.44's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-09-21) | 93.87% statements (9,939 / 10,588), 83.09% branches (2,129 / 2,562), 94.92% functions (131 / 138) |
| `npm run verify` verdict | PASS |

## What changed in this release

- **Engine math changed.** Every finish-side constraint clamp moves, in both
  passes, on any network whose constraint dates carry a time of day. A result
  computed on v2.9.44 or earlier can differ on any constrained activity, so a
  deliverable already issued from an earlier tagged build is inside the
  supersession window and needs the re-check step in the operator procedure.
- **What P6 does.** A constraint date is an INSTANT, and the time of day is
  load-bearing. "Finish no later than 2026-01-16 17:00" on a calendar that
  closes at 17:00 names the END of Friday, which in this engine's boundary
  space is Monday's opening.
- **What the engine did.** `_normalizeConstraint` truncated the stored value
  with `slice(0, 10)` and threw the time away, and the clamp then compared
  that bare date against `ef` / `lf`, which since v2.9.44 are EXCLUSIVE
  boundaries — the opening of the working day AFTER the last day worked. A
  finish constraint written at the close of its own working day therefore
  bound on that day's boundary instead of the next one: one working day
  early, in both passes. An activity finishing exactly ON its own
  finish-no-later-than was reported at tf -1, a constraint violation on a
  schedule that meets it.
- **The rule.** The bare constraint date, advanced ONE working day on the
  activity's own calendar if and only if the constraint instant falls at or
  after the close of that day's shift. The close is read hour-accurately out
  of `CALENDAR.clndr_data`; the day model the caller supplied stays
  authoritative and `raw` is read for the shift close and nothing else. This
  is not the clock: the same 16:00 is the close on an `08:00-16:00` calendar
  and one working hour INSIDE the day on an `08:00-12:00 + 13:00-17:00`
  calendar, and both shapes occur — 128 rows of the first and 28 of the
  second in the measured population. A noon heuristic gets the second group
  wrong. Where no hour detail is available the answer is identical to v2.9.44
  and the engine emits `constraint-instant-unresolved` rather than guessing;
  a constraint with no time at all is untouched.
- **Start constraints were measured over the same population, found already
  correct, and are not touched** — `es` / `ls` ARE the start instant.
  Mandatory start tokens do not occur in that population and are untouched.
- **Empirical basis.** Measured P6 against P6 over 205 real exports and 2,032
  constrained rows. Before the change, 113 of the 796 rows whose early finish
  P6 pinned at a constraint, and 151 of the 254 whose late finish it pinned
  there, were exactly one working day out. The new rule fixes all 264 and
  regresses none. On the 36 gate-strict files — the only ones whose stored
  dates are an exact solution of their own network — it fixes 603 es, 603 ef,
  1,018 ls, 1,022 lf, 807 tf and 109 ff cells and regresses none. The exports
  are client files and are not part of this repository; the fixtures that
  ship replicate the discriminating shapes under neutral codes.
- **Zero regressions, proven rather than asserted.** Re-run over the whole
  corpus in the configuration the previous release was validated under, the
  engine's output is identical to v2.9.44: a cell-by-cell diff found 0
  differences in 278,868 cells across every gate-strict and gate-pass file.
- **The change, paired in `cpm-engine.js` and `python_reference/cpm.py`.**
  `_normalizeConstraint` / `_normalizeConstraint2` carry `time_minutes`
  beside the unchanged `date`; `_constraintFinishNum` resolves a finish-side
  constraint onto the activity's own exclusive boundary; the forward EF
  clamp, the backward LF clamp and the finish-pin back-compute all read that
  one number, so the two walks stay inverses. The `clndr_data` grammar
  helpers are hoisted to module level verbatim so one parser serves both the
  decoder and the resolver.
- **Three JS-only sites the Python reference does not have.**
  `_checkFinalEFDeadline` compared `node.ef` against the bare constraint date
  and so raised `constraint-violated` on every schedule that MEETS an
  end-of-day finish constraint exactly; `_preResolveCalendars` dropped `raw`
  and hid the shift hours from the resolver on every real file; `parseXER`
  truncated `cstr_date` / `cstr_date2` before the engine ever saw them and
  did not keep `clndr_data` on its calMap entries. All three fixed.
- **Tests.** CI-1..CI-18 added to `cpm-engine.test.js`, taking the unit suite
  from 1,288 to 1,306. Every existing expectation passes unchanged.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 46 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository; the 205-export measurement above was made outside it and is not reproducible from it.
- The P6 comparison matrix is fitted to one capture and was recomputed, not re-captured, for this release; no held-out capture exists.
- The engine works in whole days. The constraint resolver reads the hour only to decide which working-day boundary the instant names; it does not make the engine sub-day. A constraint stamped mid-shift resolves to the same boundary as a bare date.
- The shift close is read from `CALENDAR.clndr_data`. On a calendar that carries no hour detail the result is unchanged from v2.9.44 and a `constraint-instant-unresolved` alert is raised; it is disclosed, not guessed.
- This packet is missing its cryptographic layer — see `PENDING-CI.md`. Layer 2 of `VERIFY_RELEASE.md` cannot be exercised against v2.9.45 until CI signs the tag.
