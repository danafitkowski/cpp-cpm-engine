# release-evidence/v2.9.39/

Forensic verification packet for `cpm-engine` v2.9.39.

**Start with `validation-summary.md`.**

## v2.9.39 in one line

Attestation-and-accuracy release (v2.9.37 → v2.9.39 supersession): the engine SHA-256 now matches the shipped bytes (the prior attestation chain pinned a stale engine hash), every unit-test count in the docs is reconciled to the live 1,134, and the DAUBERT §E methodology-status disclosure is corrected to describe the fields the engine actually emits. Engine math byte-identical to v2.9.37; cross-validation stays 43 / 747 byte-identical. Self-tests 1134 / 0.

Engine SHA-256: `8dc37455f7dc76d88e761d73391b791cf9807e29157203e051977430490bd05b`
Python ref SHA-256: `da792b52c743b62dd71b4ea2ea1b1dcd724088fd230ab977171edd00aace4423`
Sigstore Rekor logIndex: 2425152069 (rekor.sigstore.dev)
GitHub Actions run: https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/31527272430

Pair with [`../../DAUBERT.md`](../../DAUBERT.md), [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md), [`../../CLAUDE.md`](../../CLAUDE.md), and [`../../ROADMAP_OPEN.md`](../../ROADMAP_OPEN.md).
