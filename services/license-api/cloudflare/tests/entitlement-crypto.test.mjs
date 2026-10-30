/**
 * Cross-runtime compatibility test for Tahouri signed-entitlement envelopes.
 *
 * Run: node --test services/license-api/cloudflare/tests/entitlement-crypto.test.mjs
 * Uses only ephemeral test keys. Never uses production secrets or D1.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createPrivateKey, createPublicKey, createSign, createVerify, webcrypto } from "node:crypto";

const encoder = new TextEncoder();
const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

function pem(label, bytes) {
  const body = Buffer.from(bytes).toString("base64").match(/.{1,64}/g).join("\\n");
  return `-----BEGIN ${label}-----\\n${body}\\n-----END ${label}-----`;
}

function verifierPemToArrayBuffer(publicKeyPem) {
  // Mirrors tahouriEntitlementVerifier.js: strip PUBLIC KEY delimiters + whitespace.
  const encoded = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\\s+/g, "");
  return Uint8Array.from(Buffer.from(encoded, "base64")).buffer;
}

function nodeSign(claims, privateKey) {
  const signer = createSign("RSA-SHA256");
  signer.update(JSON.stringify(claims));
  signer.end();
  return signer.sign(privateKey).toString("base64");
}

function nodeVerify(claims, signature, publicKey) {
  const verifier = createVerify("RSA-SHA256");
  verifier.update(JSON.stringify(claims));
  verifier.end();
  return verifier.verify(publicKey, Buffer.from(signature, "base64"));
}

test("Node server.js signatures verify in the app's WebCrypto PEM/SPKI path", async () => {
  const pair = await webcrypto.subtle.generateKey(
    { ...algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ["sign", "verify"]
  );
  const spki = await webcrypto.subtle.exportKey("spki", pair.publicKey);
  const pkcs8 = await webcrypto.subtle.exportKey("pkcs8", pair.privateKey);
  const publicKeyPem = pem("PUBLIC KEY", spki);
  const privateKeyPem = pem("PRIVATE KEY", pkcs8);
  const nodePrivateKey = createPrivateKey({ key: privateKeyPem, format: "pem", type: "pkcs8" });
  const nodePublicKey = createPublicKey({ key: publicKeyPem, format: "pem", type: "spki" });

  // Property names and insertion order match server.js createEntitlement().
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

  // Direction 1: exact Node.js server.js signing -> app's WebCrypto verification.
  const nodeSignature = nodeSign(claims, nodePrivateKey);
  const importedSpki = await webcrypto.subtle.importKey(
    "spki",
    verifierPemToArrayBuffer(publicKeyPem),
    algorithm,
    false,
    ["verify"]
  );
  assert.equal(
    await webcrypto.subtle.verify(algorithm, importedSpki, Buffer.from(nodeSignature, "base64"), canonical),
    true,
    "Node RSA-SHA256 signature must verify through the app's PEM/SPKI WebCrypto path"
  );

  // Direction 2: Worker WebCrypto signing -> exact Node.js server.js verification.
  const importedPkcs8 = await webcrypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    algorithm,
    false,
    ["sign"]
  );
  const webCryptoSignature = Buffer.from(
    await webcrypto.subtle.sign(algorithm, importedPkcs8, canonical)
  ).toString("base64");
  assert.equal(
    nodeVerify(claims, webCryptoSignature, nodePublicKey),
    true,
    "WebCrypto signature must verify through Node RSA-SHA256"
  );

  const changedClaims = { ...claims, gradeScope: "grade5" };
  assert.equal(
    await webcrypto.subtle.verify(
      algorithm,
      importedSpki,
      Buffer.from(nodeSignature, "base64"),
      encoder.encode(JSON.stringify(changedClaims))
    ),
    false,
    "changing a signed claim must invalidate the signature"
  );
  assert.match(publicKeyPem, /^-----BEGIN PUBLIC KEY-----/);
  assert.match(privateKeyPem, /^-----BEGIN PRIVATE KEY-----/);
  assert.ok(createPublicKey(publicKeyPem).asymmetricKeyDetails.modulusLength >= 2048);
});
