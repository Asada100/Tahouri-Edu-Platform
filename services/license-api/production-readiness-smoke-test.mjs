import assert from "node:assert/strict";
import { createPublicKey } from "node:crypto";

const apiBase = "https://tahouri-license-api.asadtahouri1986.workers.dev/api";
const expectedOrigin = "https://asada100.github.io";

async function getJson(path) {
  const response = await fetch(apiBase + path, {
    method: "GET",
    headers: { Origin: expectedOrigin, Accept: "application/json" },
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  assert.equal(response.headers.get("access-control-allow-origin"), expectedOrigin,
    `${path} must allow only the configured Pages origin`);
  const payload = await response.json();
  assert.equal(typeof payload, "object");
  assert.ok(payload && !Array.isArray(payload));
  return payload;
}

// Read-only GET checks only. This test never creates accounts, codes, or licenses.
const health = await getJson("/health");
assert.equal(health.ok, true, "Production Worker health must report ok=true");
assert.equal(health.status, "healthy", "Production Worker must be healthy");
assert.equal(health.service, "tahouri-license-api");
assert.equal(health.runtime, "cloudflare-workers");
assert.equal(health.database, "connected", "Production D1 schema must be fully connected");
assert.ok(Number(health.schemaVersion) >= 5, "Production D1 schema version must be at least 5");
assert.equal(health.capabilities?.licenseActivation, true,
  "Production license signing and activation must be ready");
assert.equal(health.capabilities?.licenseVerification, true,
  "Production license verification must be ready");

// Health performs a sign/verify challenge with the configured private/public key pair.
// Fetching the public endpoint separately confirms the exact public trust anchor served to clients.
const keyPayload = await getJson("/public-key");
assert.equal(typeof keyPayload.publicKeyPem, "string");
assert.match(keyPayload.publicKeyPem,
  /-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----/);
const publicKey = createPublicKey(keyPayload.publicKeyPem);
assert.equal(publicKey.asymmetricKeyType, "rsa");
assert.ok((publicKey.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048,
  "Production RSA public key must be at least 2048 bits");

console.log("Production read-only readiness gate PASS:", JSON.stringify({
  service: health.service,
  version: health.version,
  database: health.database,
  schemaVersion: health.schemaVersion,
  licenseActivation: health.capabilities.licenseActivation,
  licenseVerification: health.capabilities.licenseVerification,
  publicKeyType: publicKey.asymmetricKeyType,
  publicKeyBits: publicKey.asymmetricKeyDetails.modulusLength
}));
