import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./worker.js", import.meta.url), "utf8");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const worker = (await import(moduleUrl)).default;

async function sha256Hex(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
}

function mockDb(initialSessions) {
  const sessions = new Map(initialSessions);
  const auditRows = [];
  let batchCalls = 0;
  return {
    sessions, auditRows,
    get batchCalls() { return batchCalls; },
    prepare(sql) {
      let values = [];
      return {
        sql,
        bind(...args) { values = args; return this; },
        async first() {
          if (sql.includes("SELECT expires_at FROM admin_sessions")) {
            const expiresAt = sessions.get(values[0]);
            return expiresAt ? { expires_at: expiresAt } : null;
          }
          throw new Error("Unexpected first() SQL in test: " + sql);
        },
      };
    },
    async batch(statements) {
      batchCalls++;
      assert.equal(statements.length, 2);
      assert.equal(statements[0].sql, "DELETE FROM admin_sessions");
      assert.match(statements[1].sql, /INSERT INTO audit_log/);
      const removed = sessions.size;
      sessions.clear();
      auditRows.push({ eventType: "admin.sessions.revoked", actor: "admin" });
      return [{ meta: { changes: removed } }, { meta: { changes: 1 } }];
    },
  };
}

const token = "test-admin-session-token";
const sessionHash = await sha256Hex(token);
const DB = mockDb([[sessionHash, Date.now() + 60_000]]);
const env = { DB, ADMIN_ORIGIN: "https://admin.example.test" };

const denied = await worker.fetch(new Request(
  "https://worker.example.test/api/admin/sessions/revoke-all",
  { method: "POST", headers: { Origin: env.ADMIN_ORIGIN } }
), env);
assert.equal(denied.status, 401, "unauthenticated requests must be rejected");
assert.equal(DB.batchCalls, 0, "unauthenticated requests must not revoke sessions");
assert.equal(DB.sessions.size, 1);

const response = await worker.fetch(new Request(
  "https://worker.example.test/api/admin/sessions/revoke-all",
  { method: "POST", headers: {
    Origin: env.ADMIN_ORIGIN,
    Cookie: "tahouri_admin_session=" + token,
  } }
), env);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { ok: true, revokedSessions: 1 });
assert.equal(DB.sessions.size, 0, "all stored sessions must be invalidated");
assert.equal(DB.auditRows.length, 1, "the operation must be audited");
assert.match(response.headers.get("set-cookie") || "", /Max-Age=0/);

const oldSession = await worker.fetch(new Request(
  "https://worker.example.test/api/admin/session",
  { method: "GET", headers: {
    Origin: env.ADMIN_ORIGIN,
    Cookie: "tahouri_admin_session=" + token,
  } }
), env);
assert.equal(oldSession.status, 401, "the initiating session must also be invalidated");

console.log("PASS: global admin-session revocation, audit, cookie clearing, and auth guard");
