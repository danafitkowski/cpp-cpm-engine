# release-evidence/v2.9.30/

This folder is the forensic verification packet for `cpm-engine` v2.9.30. It is self-contained: anyone hostile to the engine should be able to open this folder and follow the full integrity chain without hunting through GitHub.

**Start with `validation-summary.md`.** It is the orientation map. After that:

- `VERIFY_RELEASE.md` — the citation-ready expert-report packet
- `witness-v2.9.30.json` — the CI-signed canonical witness
- `sigstore-attestation-output.txt` — Sigstore verification proof
- `rekor-entry.txt` — Rekor transparency-log entry
- `github-actions-run-url.txt` — CI run URL + 9-matrix outcomes
- `cpm-engine.js.sha256`, `python_reference-cpm.py.sha256` — SHA pins
- `npm-run-verify-output.txt` — local reproduction output

Each tagged release of `cpm-engine` carries its own `release-evidence/<tag>/` folder with the same structure.

For the unscoped engine disclosure, see [`../../DAUBERT.md`](../../DAUBERT.md).
