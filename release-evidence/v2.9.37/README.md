# release-evidence/v2.9.37/

Forensic verification packet for `cpm-engine` v2.9.37.

**Start with `validation-summary.md`.**

## v2.9.37 in one line

Engine-sync release — brings the public engine current with the maintained source line, absorbing the `computeTIA` `alerts` channel and the unresolved-finish guard. The prior engine math is a strict subset of v2.9.37; cross-validation (43 / 747) and the P6-comparison / corpus-DAG captures are byte-identical at v2.9.37, so no validation data was re-captured — only version labels advanced. Self-tests 1128 / 0 (the repo's `forensic_strict` strict-mode suite preserved).

Engine SHA-256: `f2f767110087b4f0969738f6d7a971fcf0c3ed2f43b10a02242dc8fc5fc9d8ed`
Python ref SHA-256: `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68`
Sigstore Rekor logIndex: `1979959741`
GitHub Actions run: <https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/28287289406>

Pair with [`../../DAUBERT.md`](../../DAUBERT.md), [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md), [`../../CLAUDE.md`](../../CLAUDE.md), and [`../../ROADMAP_OPEN.md`](../../ROADMAP_OPEN.md).
