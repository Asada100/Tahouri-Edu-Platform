import assert from "node:assert/strict";
import { createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";

const endpoint = "https://tahouri-license-api.asadtahouri1986.workers.dev/api/public-key";

const response = await fetch(endpoint, {
  method: "GET",
  cache: "no-store",
  redirect: "error",
  signal: AbortSignal.timeout(15000)
});

assert.equal(response.status, 200, `Public-key endpoint returned HTTP ${response.status}`);

const payload = await response.json();
assert.equal(typeof payload.publicKeyPem, "string", "publicKeyPem is missing");
assert.match(payload.publicKeyPem, /-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----/, "publicKeyPem is not a PEM public key");

const key = createPublicKey(payload.publicKeyPem);
assert.equal(key.asymmetricKeyType, "rsa", "Expected an RSA public key");

// A checked-in client pin is safe only when it matches the key served by the
// production Worker. This catches stale pins before a release can be approved.
const serviceConfigSource = await readFile(
  new URL("../../engine/core/tahouriServiceConfig.js", import.meta.url),
  "utf8"
);
const pinnedKeyMatch = serviceConfigSource.match(/publicKeyPem:\s*("[^"]*")/);
assert.ok(pinnedKeyMatch, "Service config must declare publicKeyPem.");
const pinnedPublicKeyPem = JSON.parse(pinnedKeyMatch[1]);
if (pinnedPublicKeyPem.trim()) {
  const normalizePem = value => value.replace(/\r/g, "").trim();
  assert.equal(
    normalizePem(pinnedPublicKeyPem),
    normalizePem(payload.publicKeyPem),
    "Pinned client public key must match the live production Worker public-key endpoint."
  );
  console.log("Pinned production public key matches the live Worker endpoint.");
}
assert.ok((key.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048, "RSA public key must be at least 2048 bits");

console.log("Production public-key endpoint PASS: HTTPS response, PEM parsing, RSA key type, and key size verified.");
