"use strict";

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

const root = dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(":memory:");
const migrationsDir = join(root, "migrations");
for (const file of readdirSync(migrationsDir).filter(name => /^\d+_.*\.sql$/.test(name)).sort()) {
  db.exec(readFileSync(join(migrationsDir, file), "utf8"));
}

let databaseError = null;
const envDb = {
  prepare(sql) {
    return {
      async first() {
        try { return db.prepare(sql).get() || null; }
        catch (error) { databaseError = error.message; throw error; }
      }
    };
  }
};

const keys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKeyPem = keys.privateKey.export({ type: "pkcs8", format: "pem" });
const publicKeyPem = keys.publicKey.export({ type: "spki", format: "pem" });
const workerSource = readFileSync(join(root, "worker.js"), "utf8");
const workerUrl = "data:text/javascript;base64," + Buffer.from(workerSource).toString("base64");
const worker = (await import(workerUrl)).default;
const env = {
  DB: envDb,
  LICENSE_PRIVATE_KEY_PEM: privateKeyPem,
  LICENSE_PUBLIC_KEY_PEM: publicKeyPem,
  ADMIN_PASSWORD: "http-e2e-test-only-password",
  ADMIN_ORIGIN: "https://asada100.github.io",
  APP_ORIGIN: "https://asada100.github.io"
};

const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) headers.set(name, value.join(", "));
      else if (value !== undefined) headers.set(name, value);
    }
    const request = new Request("https://worker-http-e2e.local" + incoming.url, {
      method: incoming.method,
      headers,
      body: ["GET", "HEAD"].includes(incoming.method) ? undefined : body
    });
    const response = await worker.fetch(request, env, {});
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ ok: false, error: "test_adapter_error", message: error.message }));
  }
});

let address;
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  address = server.address();
  const base = "http://127.0.0.1:" + address.port;

  const healthResponse = await fetch(base + "/api/health");
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200, "HTTP health route must return 200: " + JSON.stringify({ health, databaseError }));
  assert.equal(health.ok, true);
  assert.equal(health.database, "connected");
  assert.equal(health.schemaVersion, 14);
  assert.equal(health.capabilities.learningDataSync, true);
  assert.equal(health.capabilities.signedEntitlementExtension, true);

  const keyResponse = await fetch(base + "/api/public-key");
  assert.equal(keyResponse.status, 200, "HTTP public-key route must return 200.");
  const keyBody = await keyResponse.json();
  assert.equal(String(keyBody.publicKeyPem || "").trim(), publicKeyPem.trim(), "HTTP route must return the configured public key.");

  const adminResponse = await fetch(base + "/admin");
  assert.equal(adminResponse.status, 200, "HTTP admin page route must return 200.");
  assert.match(await adminResponse.text(), /پنل مدیریت طهوری/);

  console.log("Local HTTP Worker E2E (health, public key, admin page; in-memory SQLite): PASS");
} finally {
  await new Promise(resolve => server.close(resolve));
  db.close();
}
