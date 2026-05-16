<!--
Thank you for the PR. The cpp-cpm-engine is a forensic-correctness project — every
change is reviewed against AACE / SCL citation discipline and against the Daubert
disclosure in DAUBERT.md. Please fill out every section. Sections marked "REQUIRED"
will block review if blank.
-->

## Summary

<!-- One paragraph describing what this PR changes and why. State the user-visible effect, not the internal mechanic. -->

## Test plan (REQUIRED)

- [ ] `npm run verify` passes locally (unit + crossval + citation regression)
- [ ] `npm run crossval` matches the pinned Python reference hash printed at the head of the run
- [ ] New behavior is exercised by at least one new or updated fixture / unit test

**Which fixtures cover this change?**

<!-- List the fixture files (e.g. `fixtures/hammock-ss-ff.json`) or test files (e.g. `cpm-engine.test.js` "hammock SS predecessor" block) that exercise the new code path. If no test covers it, explain why and propose a follow-up. -->

## Citation impact (REQUIRED)

- [ ] **No citation change** — this PR does not add, remove, or modify any AACE RP, SCL section, case-law cite, FRCP rule, or textbook reference.
- [ ] **Citation changed** — see below.

If citations changed:

- **Files touched:** <!-- e.g. `DAUBERT.md` §3.1, `docs/citations.md` row 14, `cpm-engine.js:1142` -->
- **Primary-source verification:** <!-- describe how you verified the new/changed cite against the primary source. WebSearch hit alone is NOT sufficient — you must have eyes on the cited page. -->
- [ ] `tests/no-fabricated-citations.test.js` still PASS

## Daubert impact (REQUIRED)

- [ ] **No Daubert impact** — pure ergonomics, perf, tooling, or docs that do not affect forensic computation.
- [ ] **Daubert-relevant** — see below.

If Daubert-relevant, answer:

- **Does this change any forensic computation?** <!-- finish dates, float, slip attribution, concurrency apportionment, criticality flags, etc. -->
- **Does this change any alert behavior?** <!-- alert IDs added/removed/retiered, severity thresholds moved, suppression rules changed -->
- **Does this change any disclosure shape?** <!-- DAUBERT.md sections, expert-witness report fields, output JSON keys consumed by downstream skills -->
- **Has DAUBERT.md been updated to reflect the change?** <!-- if yes, point to the section; if no, justify why the existing disclosure still covers the new behavior -->

## Crossval impact

- [ ] JS and Python references still agree on all fixtures (`npm run crossval` PASS)
- [ ] If the Python reference (`python_reference/cpm.py`) was modified, the new SHA-256 hash is recorded in DAUBERT.md §3.1 and the bytes have been re-pinned

<!-- If the JS-Python crossval drift count changed, list the delta — added fixtures, removed fixtures, or known-disagreement entries. -->

## Backward-compat impact

- [ ] Pure addition — no existing caller affected
- [ ] Additive with new opt-in flag — defaults preserve current behavior
- [ ] Changes default behavior — CHANGELOG updated, SemVer minor bump
- [ ] Breaking change — CHANGELOG migration notes added, SemVer major bump

<!-- If breaking, describe the migration path. The engine is in production use in forensic submissions; breaking changes are accepted only when forensic correctness demands it. -->
