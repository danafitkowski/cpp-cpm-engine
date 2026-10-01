# release-evidence/v2.9.32/

Forensic verification packet for `cpm-engine` v2.9.32. Self-contained — every receipt anyone needs to verify the v2.9.32 release without trusting Critical Path Partners is in this folder.

**Start with `validation-summary.md`.**

## v2.9.32 in one line

Audit-response wave + version-drift regression gate. 8 strict-mode hardening tests added (1,104 → 1,112 unit tests). computeCPMSalvaging refuses forensic_strict at function entry. Engine math byte-identical on non-strict path to v2.9.27–v2.9.31.

Engine SHA-256: `885947b5fa9eb6e84ebe500ee7472a4f6778244fcec3543398b5d58ea4fc5f69`
Python ref SHA-256: `50ddea54d9098395199e808a037b4dde70b13e1373db79bcf12957c05e80d8d7`
Sigstore Rekor logIndex: `1623848107`
GitHub Actions run: <https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/26363369806>

Pair with [`../../DAUBERT.md`](../../DAUBERT.md) and [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md).
