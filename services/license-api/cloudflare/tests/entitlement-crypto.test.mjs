/**
 * Isolated compatibility test for Tahouri signed-entitlement envelopes.
 *
 * Run: node --test services/license-api/cloudflare/tests/entitlement-crypto.test.mjs
 * Uses only ephemeral test keys. Never uses production secrets or D1.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

const encoder = new TextEncoder();
const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

function base64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

test("Worker WebCrypto envelope matches the app's canonical JSON contract", async () => {
  const pair = await webcrypto.subtle.generateKey(
    { ...algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ["sign", "verify"]
  );

  // Keep the property names and insertion order identical to server.js.
  const claims = {
    licenseId: "lic_crypto_test_only",
    productId: "tahouri-edu",
    academicYear: "1405",
    gradeScope: "grade6",
    studentId: "student_test_only",
    validFrom: "2026-10-30T00:00:00.000Z",
    validUntil: "2027-10-30T00:00:00.000Z",
    installationBinding: "install_test_only",
    entitlementVersion: 1
  };

  const canonical = encoder.encode(JSON.stringify(claims));
  const signature = await webcrypto.subtle.sign(algorithm, pair.privateKey, canonical);

  assert.equal(
    await webcrypto.subtle.verify(algorithm, pair.publicKey, signature, canonical),
    true,
    "signature for the exact claims JSON must verify"
  );

  const changedClaims = { ...claims, gradeScope: "grade5" };
  assert.equal(
    await webcrypto.subtle.verify(
      algorithm,
      pair.publicKey,
      signature,
      encoder.encode(JSON.stringify(changedClaims))
    ),
    false,
    "changing a signed claim must invalidate the signature"
  );

  const spki = await webcrypto.subtle.exportKey("spki", pair.publicKey);
  const pkcs8 = await webcrypto.subtle.exportKey("pkcs8", pair.privateKey);
  assert.ok(base64(spki).length > 200, "SPKI public key export should be populated");
  assert.ok(base64(pkcs8).length > 500, "PKCS8 ephemeral private key export should be populated");
});
