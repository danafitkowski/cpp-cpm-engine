# release-evidence/v2.9.38/

Forensic verification packet for `cpm-engine` v2.9.38.

**Start with `validation-summary.md`.**

## v2.9.38 in one line

Attestation-and-accuracy release (v2.9.37 → v2.9.38 supersession): the engine SHA-256 now matches the shipped bytes (the prior attestation chain pinned a stale engine hash), every unit-test count in the docs is reconciled to the live 1,129, and the DAUBERT §E methodology-status disclosure is corrected to describe the fields the engine actually emits. Engine math byte-identical to v2.9.37; cross-validation stays 43 / 747 byte-identical. Self-tests 1129 / 0.

Engine SHA-256: `6bf24fb038657945478cf40c92273d8dc0bec7312e79eab8c8129667c356d045`
Python ref SHA-256: `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68`
Sigstore Rekor logIndex: 2073912299 (rekor.sigstore.dev)
GitHub Actions run: https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/28724785215

Pair with [`../../DAUBERT.md`](../../DAUBERT.md), [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md), [`../../CLAUDE.md`](../../CLAUDE.md), and [`../../ROADMAP_OPEN.md`](../../ROADMAP_OPEN.md).
