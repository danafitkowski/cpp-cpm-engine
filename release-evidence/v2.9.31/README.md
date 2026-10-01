# release-evidence/v2.9.31/

This folder is the forensic verification packet for `cpm-engine` v2.9.31. It is self-contained: anyone hostile to the engine should be able to open this folder and follow the full integrity chain without hunting through GitHub.

**Start with `validation-summary.md`.** It is the orientation map. After that:

- `VERIFY_RELEASE.md` — the citation-ready expert-report packet
- `witness-v2.9.31.json` — the CI-signed canonical witness
- `sigstore-attestation-output.txt` — Sigstore verification proof
- `rekor-entry.txt` — Rekor transparency-log entry
- `github-actions-run-url.txt` — CI run URL + 9-matrix outcomes
- `cpm-engine.js.sha256`, `python_reference-cpm.py.sha256` — SHA pins
- `npm-run-verify-output.txt` — local reproduction output

## v2.9.30 → v2.9.31 in one line

v2.9.31 added Forensic Strict Mode (Section Q public API + 33 new unit tests). Engine math byte-identical on the non-strict path. New strict-mode-fatal taxonomy disclosed in [DAUBERT.md §9](../../DAUBERT.md#9-forensic-strict-mode-shipped-v2931).

For the unscoped engine disclosure, see [`../../DAUBERT.md`](../../DAUBERT.md). For the analyst-application discipline, see [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md).
