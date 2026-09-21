# What is missing from this packet, and what produces it

This packet was assembled on a developer machine before the `v2.9.45` tag
existed. Everything that a local run can measure is here and was recomputed
from the files as they now stand — no figure, hash or date in this packet was
carried forward from v2.9.44.

Four files that every prior packet carries are **absent**, because each one
can only be produced by GitHub Actions or by a signing key held by CI. None
of them is reconstructible locally, and a hand-written stand-in would not be
independently checkable, so none was written.

Until they land, **Layer 2 of [`VERIFY_RELEASE.md`](VERIFY_RELEASE.md) cannot
be exercised against v2.9.45.** Layers 1, 3 and 4 can: the two SHA-256
sidecars in this packet pin the released bytes, and `npm run verify`
reproduces the counts in `npm-run-verify-output.txt` on any machine.

## The four missing files

| File | What it is | What produces it |
|---|---|---|
| `witness-v2.9.45.json` | The canonical witness JSON, generated on Linux / Node 20 by the CI runner — the artifact the Sigstore signature is bound to. It must be copied **byte-for-byte** from CI and never re-serialised, or the signature binding breaks and `gh attestation verify` 404s on the digest. | The `attest` job of [`.github/workflows/verify.yml`](../../.github/workflows/verify.yml), step "Generate canonical witness (Linux/Node 20)", which runs `node scripts/attestation.js --output attestations/latest.json`. Retrieve with:<br>`gh run download <RUN_ID> --name witness-canonical --dir release-evidence/v2.9.45/`<br>then rename `latest.json` to `witness-v2.9.45.json`. |
| `sigstore-attestation-output.txt` | The full signed Sigstore bundle (~13 KB on prior releases), carrying the witness digest as its subject. The version gate checks that this file contains the witness's own SHA-256 and rejects a bundle under 2,000 bytes as a hand-written summary. | The `attest` job's "Attest witness via Sigstore" step (`actions/attest-build-provenance`), signed through GitHub OIDC. Retrieve with:<br>`gh attestation verify release-evidence/v2.9.45/witness-v2.9.45.json --owner danafitkowski --format json > release-evidence/v2.9.45/sigstore-attestation-output.txt` |
| `rekor-entry.txt` | The transparency-log pointer: the `logIndex` the signature was recorded at on `rekor.sigstore.dev`, plus the command that verifies it. The version gate cross-checks any `logIndex` quoted in prose against the signed bundle, so this file can only be written once the bundle above exists. | Read the `logIndex` out of the attestation metadata returned by the `gh attestation verify ... --format json` call above, or look it up with `rekor-cli search --sha256 96ff9986700189e0ab48027795eae80196f41705ca4d7b2f543577073a07e4eb`. |
| `github-actions-run-url.txt` | The URL of the workflow run that produced and signed the witness — the evidence that the witness came from GitHub infrastructure and not from the proponent's laptop. | The run id of the `verify.yml` run triggered by the `v2.9.45` tag push. Retrieve with:<br>`gh run list --workflow verify.yml --branch v2.9.45 --limit 1 --json url` |

## Order of operations

The tag does not exist yet and this branch has not been pushed. The four
files above become available only after `v2.9.45` is tagged and pushed,
because the `attest` job is gated on `startsWith(github.ref, 'refs/tags/')`
for the release-asset step and on a main-branch or tag push for signing at
all. So:

1. Review and merge `release/v2.9.45`.
2. Tag and push `v2.9.45`.
3. Wait for `verify.yml` to finish (9 matrix legs, then the `attest` job).
4. Add the four files above to this directory using the commands in the
   table, and delete this note.
5. Re-run `CHECK_RELEASE_EVIDENCE=1 npm run test:version-refs` — with the
   tag in place, the gate also checks that the packet's published commit and
   release date match the tag, that the Python-reference sidecar describes
   the tagged bytes, and that the bundle carries the witness digest.

## What is present and how it was produced

| File | How it was produced |
|---|---|
| `cpm-engine.js.sha256` | `sha256` recomputed from `cpm-engine.js` as committed at `34de18f` — 548,300 bytes. |
| `python_reference-cpm.py.sha256` | `sha256` recomputed from `python_reference/cpm.py` as committed at `34de18f` — 160,472 bytes. |
| `npm-run-verify-output.txt` | The verbatim transcript of `npm run verify` at `34de18f` on this machine (Windows / Node v22.23.2). Verdict PASS, 1,306 unit checks, 46 fixtures, 1009 of 1009 comparisons executed. Its `workflow_run_url` and `runner` are `null` precisely because it is a local run. |
| `validation-summary.md` | Written from the measured results of this release's gate runs; its Rekor and CI rows point here rather than quoting a figure that does not exist. |
| `README.md`, `VERIFY_RELEASE.md` | Byte copies of the repository-root files as committed at `34de18f`. |
