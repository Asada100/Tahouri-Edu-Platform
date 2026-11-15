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
assert.equal(typeof payload.publicKeyPem, "string", "Worker publicKeyPem is missing");
assert.ok(payload.publicKeyPem.includes("-----BEGIN PUBLIC KEY-----") && payload.publicKeyPem.includes("-----END PUBLIC KEY-----"), "Worker did not return a PEM public key");

const source = await readFile(new URL("../../engine/core/tahouriServiceConfig.js", import.meta.url), "utf8");
const configLine = source.split("\\n").find(line => line.trim().startsWith("publicKeyPem:"));
assert.ok(configLine, "Client service config must declare publicKeyPem");
const pinned = JSON.parse(configLine.slice(configLine.indexOf(":") + 1).trim().replace(/,$/, ""));
assert.ok(pinned.trim(), "A production release must not rely on runtime key discovery without a pinned key");
assert.ok(!pinned.includes("BEGIN PRIVATE KEY"), "Private signing keys must never be shipped to the browser");

const normalize = value => value.replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n").trim();
assert.equal(normalize(pinned), normalize(payload.publicKeyPem), "Pinned client key does not match the live production Worker key");

const key = createPublicKey(pinned);
assert.equal(key.asymmetricKeyType, "rsa", "Pinned key must be RSA");
assert.ok((key.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048, "RSA key must be at least 2048 bits");

console.log("Production public-key pin verification: PASS");
