import assert from "node:assert/strict";
import { createPublicKey } from "node:crypto";

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
assert.ok((key.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048, "RSA public key must be at least 2048 bits");

console.log("Production public-key endpoint PASS: HTTPS response, PEM parsing, RSA key type, and key size verified.");
