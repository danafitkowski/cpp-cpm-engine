// crypto-signoff.test.js
//
// v2.9.34 — exercises scripts/crypto-signoff.js. Closes
// AUDIT_LEDGER_v2.9.34.md row #16 (cryptographic signoff stub +
// schema-v2 design).
//
// Test plan:
//   1. Round-trip: generate → sign → verify must return ok=true.
//   2. Payload tamper: any payload mutation must regress to ok=false.
//   3. Signature tamper: signature zeroing must regress to ok=false.
//   4. Public-key swap: replacing public_key_b64 but keeping signature
//      must regress (key_id mismatch).
//   5. Schema mismatch: wrong schema_version must regress.
//   6. Canonicalize stability: two payloads with reordered object keys
//      must produce the same canonical string.
//   7. Cross-keypair: a signature from keypair A must NOT verify against
//      keypair B's public key.

'use strict';

const c = require('../scripts/crypto-signoff.js');

const failures = [];
function check(label, cond, msg) {
    if (!cond) {
        failures.push(label + (msg ? ' — ' + msg : ''));
    }
}

// =====================================================================
// Fixture
// =====================================================================

const signerA = { name: 'Jane Analyst', credential: 'PSP' };
const signerB = { name: 'John Reviewer', credential: 'PMP' };

const payload = {
    engine_version: '2.9.34',
    case_id: 'test-case-01',
    deliverable_id: 'EOT-v1',
    nested: { foo: 'bar', baz: [1, 2, 3] },
};

// =====================================================================
// 1. Round-trip
// =====================================================================

const kpA = c.generateKeypairStub(signerA);
check('signing: keypair has key_id', typeof kpA.key_id === 'string' && kpA.key_id.startsWith('sha256-'));

const signed = c.signManifest(payload, kpA);
check('signing: wrapper has schema_version', signed.schema_version === 'cpp-skill-manifest/v2');
check('signing: wrapper has signature block', !!signed.signature);
check('signing: signature has algorithm Ed25519', signed.signature.algorithm === 'Ed25519');
check('signing: signature has payload_sha256', /^[0-9a-f]{64}$/.test(signed.signature.payload_sha256));
check('signing: signer identity preserved',
    signed.signature.signer.name === signerA.name &&
    signed.signature.signer.credential === signerA.credential);

const v = c.verifySignature(signed);
check('verify (untampered): ok=true', v.ok === true,
    v.reason ? 'reason=' + v.reason : '');

// =====================================================================
// 2. Payload tamper
// =====================================================================

const tamperedPayload = JSON.parse(JSON.stringify(signed));
tamperedPayload.payload.case_id = 'attacker-changed';
const vp = c.verifySignature(tamperedPayload);
check('payload tamper: ok=false', vp.ok === false);
check('payload tamper: reason mentions payload',
    /payload/i.test(vp.reason || ''),
    'got reason=' + JSON.stringify(vp.reason));

// Deep nested tamper
const tamperedNested = JSON.parse(JSON.stringify(signed));
tamperedNested.payload.nested.baz[1] = 999;
const vn = c.verifySignature(tamperedNested);
check('nested tamper: ok=false', vn.ok === false);

// =====================================================================
// 3. Signature tamper
// =====================================================================

const tamperedSig = JSON.parse(JSON.stringify(signed));
tamperedSig.signature.signature_b64 = Buffer.alloc(64, 0).toString('base64');
const vs = c.verifySignature(tamperedSig);
check('signature zeroed: ok=false', vs.ok === false);

// =====================================================================
// 4. Public-key swap (key_id must catch)
// =====================================================================

const kpB = c.generateKeypairStub(signerB);
const pubBb64 = c.signManifest(payload, kpB).signature.public_key_b64;

const tamperedKey = JSON.parse(JSON.stringify(signed));
tamperedKey.signature.public_key_b64 = pubBb64;
// key_id NOT updated — should fail on key_id check
const vk = c.verifySignature(tamperedKey);
check('public-key swap: ok=false', vk.ok === false);
check('public-key swap: reason mentions key_id',
    /key_id/i.test(vk.reason || ''),
    'got reason=' + JSON.stringify(vk.reason));

// And even if attacker updates key_id to match the new pubkey, the
// signature still won't verify against the wrong key.
const fullSwap = JSON.parse(JSON.stringify(signed));
fullSwap.signature.public_key_b64 = pubBb64;
const crypto = require('crypto');
fullSwap.signature.signer.key_id = 'sha256-' + crypto
    .createHash('sha256')
    .update(Buffer.from(pubBb64, 'base64'))
    .digest('hex');
const vfs = c.verifySignature(fullSwap);
check('full key swap: ok=false', vfs.ok === false);

// =====================================================================
// 5. Schema mismatch
// =====================================================================

const wrongSchema = JSON.parse(JSON.stringify(signed));
wrongSchema.schema_version = 'cpp-skill-manifest/v1';
const vsc = c.verifySignature(wrongSchema);
check('schema mismatch: ok=false', vsc.ok === false);

// =====================================================================
// 6. Canonicalize stability
// =====================================================================

const payloadOrderA = { engine_version: '2.9.34', case_id: 'X', meta: { a: 1, b: 2 } };
const payloadOrderB = { meta: { b: 2, a: 1 }, case_id: 'X', engine_version: '2.9.34' };
const canA = c.canonicalize(payloadOrderA);
const canB = c.canonicalize(payloadOrderB);
check('canonicalize: key order independent', canA === canB,
    'A=' + canA + ' B=' + canB);

// =====================================================================
// 7. Cross-keypair signature must not verify
// =====================================================================

const signedByA = c.signManifest(payload, kpA);
// Replace public_key_b64 + key_id with B's, keep A's signature
const crossSigned = JSON.parse(JSON.stringify(signedByA));
crossSigned.signature.public_key_b64 = c.signManifest(payload, kpB).signature.public_key_b64;
crossSigned.signature.signer.key_id = 'sha256-' + crypto
    .createHash('sha256')
    .update(Buffer.from(crossSigned.signature.public_key_b64, 'base64'))
    .digest('hex');
const vcross = c.verifySignature(crossSigned);
check('cross-keypair: ok=false', vcross.ok === false);

// =====================================================================
// Result
// =====================================================================

if (failures.length === 0) {
    console.log('crypto-signoff.test.js — PASS (7 sub-suites, all expectations met)');
    process.exit(0);
}
console.error('crypto-signoff.test.js — FAIL — ' + failures.length + ' failure(s):');
for (const f of failures) console.error('  - ' + f);
process.exit(1);
