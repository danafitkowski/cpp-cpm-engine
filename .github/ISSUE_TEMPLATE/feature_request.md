---
name: Feature request
about: Propose new engine behavior — forensic features require a citation
title: "[FEATURE] "
labels: enhancement
assignees: ''
---

## Use case

<!-- What forensic problem does this solve? Describe a real expert-witness, EOT, or claim-preparation workflow that needs this. Avoid "would be nice" framing — say which deliverable cannot be produced today without it. -->

## AACE / SCL citation supporting the methodology

<!--
REQUIRED for forensic features. Cite the primary source that authorizes the proposed behavior. Examples:
  - AACE RP 29R-03 §3.7 (MIP 3.7 — Modeled/Additive/Multiple-Base TIA)
  - SCL Delay & Disruption Protocol (2nd ed.) §11.5 (collapsed as-built)
  - AACE RP 52R-06 (Time Impact Analysis as a Forensic Technique)
  - SCL Protocol §10.4 (concurrent delay — Keating apportionment)

Citations must be verifiable against the primary source. Fabricated citations are
release-blocking — see `tests/no-fabricated-citations.test.js`.

If the feature is non-forensic (ergonomics, perf, tooling), write "N/A — non-forensic".
-->

## Proposed API

```js
// sketch the public surface — function signature, options object, return shape
```

<!-- If this adds a new alert type, declare the alert ID, severity tier, and disclosure-shape impact. -->

## Backward-compat impact

- [ ] Pure addition — no existing caller affected
- [ ] Additive with a new opt-in flag — defaults preserve current behavior
- [ ] Changes default behavior — requires SemVer minor bump and CHANGELOG entry
- [ ] Breaking change — requires SemVer major bump and migration notes

<!-- If breaking, describe the migration path. The engine is in production use in forensic submissions; breaking changes are accepted only when forensic correctness demands it. -->
