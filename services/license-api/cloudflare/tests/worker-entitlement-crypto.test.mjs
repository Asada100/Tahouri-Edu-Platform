import test from "node:test";
import assert from "node:assert/strict";
import {
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  webcrypto
} from "node:crypto";
import { signEntitlement, verifyEntitlement } from "../entitlement-crypto.js";

function pem(label, bytes) {
  const body = Buffer.from(bytes).toString("base64").match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
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

test("Worker WebCrypto envelope is byte-compatible with Node server.js RSA-SHA256", async () => {
  const pair = await webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ["sign", "verify"]
  );
  const publicKeyPem = pem("PUBLIC KEY", await webcrypto.subtle.exportKey("spki", pair.publicKey));
  const privateKeyPem = pem("PRIVATE KEY", await webcrypto.subtle.exportKey("pkcs8", pair.privateKey));
  const nodePrivateKey = createPrivateKey({ key: privateKeyPem, format: "pem", type: "pkcs8" });
  const nodePublicKey = createPublicKey({ key: publicKeyPem, format: "pem", type: "spki" });

  // Property order mirrors server.js createEntitlement() and is part of the signature.
  const claims = {
    licenseId: "lic_worker_crypto_test",
    productId: "tahouri-edu",
    academicYear: "1405",
    gradeScope: "grade6",
    studentId: "student_worker_test",
    validFrom: "2026-10-30T00:00:00.000Z",
    validUntil: "2027-10-30T00:00:00.000Z",
    installationBinding: "install_worker_test",
    entitlementVersion: 1
  };

  const workerEnvelope = await signEntitlement(claims, privateKeyPem);
  assert.deepEqual(workerEnvelope.claims, claims);
  assert.equal(workerEnvelope.algorithm, "RSASSA-PKCS1-v1_5-SHA256");
  assert.equal(nodeVerify(claims, workerEnvelope.signature, nodePublicKey), true);

  const serverSignature = nodeSign(claims, nodePrivateKey);
  assert.equal(await verifyEntitlement(claims, serverSignature, publicKeyPem), true);
  assert.equal(await verifyEntitlement({ ...claims, gradeScope: "grade5" }, serverSignature, publicKeyPem), false);
  assert.equal(await verifyEntitlement(claims, "not base64!", publicKeyPem), false);
});

test("Worker crypto rejects wrong PEM labels and non-object claims", async () => {
  const pair = await webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ["sign", "verify"]
  );
  const publicKeyPem = pem("PUBLIC KEY", await webcrypto.subtle.exportKey("spki", pair.publicKey));
  const privateKeyPem = pem("PRIVATE KEY", await webcrypto.subtle.exportKey("pkcs8", pair.privateKey));
  await assert.rejects(() => signEntitlement(null, privateKeyPem), /claims must be an object/i);
  await assert.rejects(() => signEntitlement({}, publicKeyPem), /Expected a PRIVATE KEY PEM key/i);
  await assert.rejects(() => verifyEntitlement({}, "AA==", privateKeyPem), /Expected a PUBLIC KEY PEM key/i);
});
