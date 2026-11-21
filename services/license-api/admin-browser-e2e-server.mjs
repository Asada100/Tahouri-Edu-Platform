import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { generateKeyPairSync } from "node:crypto";

const db = new DatabaseSync(":memory:");
for (const name of [
  "0001_initial_schema.sql",
  "0002_admin_login_attempts.sql",
  "0003_activation_integrity_indexes.sql",
  "0004_student_accounts.sql",
  "0005_student_activation_status.sql",
  "0006_one_phone_one_computer.sql",
  "0007_device_slot_public_keys.sql", "0008_pairing_request_identity.sql", "0009_pairing_signed_decisions.sql", "0010_pairing_entitlement_delivery.sql", "0011_device_slot_history.sql", "0012_device_revocation_challenges.sql"
]) db.exec(await readFile(new URL("./migrations/" + name, import.meta.url), "utf8"));

class TestD1Statement {
  constructor(sql) { this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() { return db.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: db.prepare(this.sql).all(...this.values) }; }
  async run() {
    const result = db.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes || 0), last_row_id: Number(result.lastInsertRowid || 0) } };
  }
}
const D1 = {
  prepare(sql) { return new TestD1Statement(sql); },
  async batch(statements) {
    db.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) {
        const result = db.prepare(statement.sql).run(...statement.values);
        results.push({ meta: { changes: Number(result.changes || 0), last_row_id: Number(result.lastInsertRowid || 0) } });
      }
      db.exec("COMMIT");
      return results;
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
};

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const env = {
  DB: D1,
  LICENSE_PRIVATE_KEY_PEM: keys.privateKey.export({ type: "pkcs8", format: "pem" }),
  LICENSE_PUBLIC_KEY_PEM: keys.publicKey.export({ type: "spki", format: "pem" }),
  ADMIN_PASSWORD: "browser-e2e-only-password",
  ADMIN_ORIGIN: "http://127.0.0.1:8787",
  APP_ORIGIN: "http://127.0.0.1:8787"
};
const source = await readFile(new URL("./worker.js", import.meta.url), "utf8");
const { default: worker } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}
const server = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.url === "/__test/seed-recovery" && incoming.method === "POST") {
      const payload = JSON.parse((await readBody(incoming)).toString("utf8"));
      const license = db.prepare("SELECT license_id FROM licenses WHERE license_id = ? AND status = 'active'").get(payload.licenseId);
      if (!license) { outgoing.writeHead(404); outgoing.end(JSON.stringify({ ok: false })); return; }
      const now = new Date().toISOString();
      db.prepare("INSERT INTO license_device_slots (license_id,device_type,installation_id,bound_at,public_key_pem,key_fingerprint) VALUES (?,'phone',?,?,NULL,?)")
        .run(payload.licenseId, "synthetic-phone-installation", now, "synthetic-phone-fingerprint");
      db.prepare("INSERT INTO device_pairing_requests (pairing_id,license_id,requester_device_type,requester_installation_id,token_hash,created_at,expires_at) VALUES (?,?,'phone',?,?,?,?)")
        .run("synthetic-recovery-pairing", payload.licenseId, "synthetic-pending-phone", "synthetic-recovery-token-hash", now, new Date(Date.now()+600000).toISOString());
      outgoing.writeHead(200, {"content-type":"application/json"}); outgoing.end(JSON.stringify({ok:true})); return;
    }
    if (incoming.url.startsWith("/__test/recovery-state?")) {
      const licenseId = new URL(incoming.url,"http://127.0.0.1").searchParams.get("licenseId");
      const slots = db.prepare("SELECT device_type AS deviceType,installation_id AS installationId,revoked_at AS revokedAt FROM license_device_slots WHERE license_id=? ORDER BY device_type").all(licenseId);
      const pairing = db.prepare("SELECT cancelled_at AS cancelledAt FROM device_pairing_requests WHERE pairing_id='synthetic-recovery-pairing'").get() || null;
      const audit = db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type='device.admin_recovered' AND license_id=?").get(licenseId);
      outgoing.writeHead(200, {"content-type":"application/json"}); outgoing.end(JSON.stringify({slots,pairing,auditCount:Number(audit?.count||0)})); return;
    }
    if (incoming.url === "/__test/health") {
      outgoing.writeHead(200, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ ok: true, database: "sqlite-memory", environment: "synthetic-only" }));
      return;
    }
    const method = incoming.method || "GET";
    const headers = new Headers(incoming.headers);
    for (const name of ["host", "connection", "content-length", "transfer-encoding", "accept-encoding"]) headers.delete(name);
    if (!headers.has("cf-connecting-ip")) headers.set("cf-connecting-ip", "127.0.0.1");
    const body = ["GET", "HEAD"].includes(method) ? undefined : await readBody(incoming);
    const request = new Request("http://127.0.0.1:8787" + incoming.url, {
      method, headers, body: body?.length ? body : undefined
    });
    const response = await worker.fetch(request, env);
    const responseHeaders = {};
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });
    if (typeof response.headers.getSetCookie === "function") {
      const cookies = response.headers.getSetCookie();
      if (cookies.length) responseHeaders["set-cookie"] = cookies;
    }
    outgoing.writeHead(response.status, responseHeaders);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ ok: false, message: "Test harness failure", detail: String(error) }));
  }
});
server.listen(8787, "127.0.0.1", () => process.stdout.write("Synthetic Worker E2E ready on 127.0.0.1:8787\n"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
