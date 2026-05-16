---
name: Bug report
about: Report a defect in the CPM engine — forensic-correctness issues get top priority
title: "[BUG] "
labels: bug
assignees: ''
---

## What happened

<!-- A clear, factual description of the defect. State the observation, not a guess at the cause. -->

## Reproduction

- **Engine version:** <!-- e.g. v2.9.9 — run `node -e "console.log(require('./package.json').version)"` -->
- **Node version:** <!-- e.g. 20.11.1 — `node --version` -->
- **OS:** <!-- e.g. macOS 14.4, Windows 11 Pro 26200, Ubuntu 22.04 -->
- **Minimal code snippet (preferred over prose):**

```js
// paste the smallest snippet that triggers the bug
```

- **Input XER (if applicable and not confidential):** <!-- attach the file, paste a redacted excerpt, or note "confidential — withholding" -->

## Expected behavior

<!-- What the engine should produce. Cite an AACE RP, SCL section, or Daubert source if the expectation is methodology-driven. -->

## Actual behavior

<!-- What the engine actually produces. Paste the output verbatim, including any alerts or stack trace. -->

## `npm run verify` output

<!-- If the bug is reproducible against the public fixtures, paste the failing tail. Skip if not applicable. -->

```
paste output here
```

## Severity

- [ ] **CRIT** — produces a finish date / float value that is mathematically wrong; could mislead a court
- [ ] **HIGH** — alert/disclosure missing, miscategorized, or fires on a clean schedule
- [ ] **MED** — non-forensic defect (perf, ergonomics, error message clarity)
- [ ] **LOW** — cosmetic / typo / docs

## Daubert-relevant?

- [ ] **Yes** — this defect could affect the conclusions in a forensic delay report, EOT submission, or expert-witness testimony.
- [ ] **No** — defect is in tooling, ergonomics, or non-forensic surface area.

<!-- If yes, please also note which AACE RP / SCL section / case law the affected behavior is supposed to track. The maintainer will treat Daubert-relevant defects as release-blocking. -->
