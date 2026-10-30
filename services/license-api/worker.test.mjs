import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.js";

function envWithVersion(version) {
  return { DB: { prepare(sql) {
    assert.match(sql, /schema_migrations/);
    return { async first() { return { version }; } };
  } } };
}

test("health is ready only after a D1 migration exists", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/health"), envWithVersion(2));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schemaVersion, 2);
  assert.equal(body.capabilities.licenseActivation, false);
});

test("health fails closed if the schema is missing", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/health"), envWithVersion(null));
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.ok, false);
});

test("unsupported activation returns 501 instead of false success", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/activate", { method: "POST" }), {});
  assert.equal(response.status, 501);
  assert.equal((await response.json()).error, "not_implemented");
});

test("admin UI is served from the Assets binding", async () => {
  let called = false;
  const env = { ASSETS: { async fetch(request) {
    called = true;
    assert.equal(new URL(request.url).pathname, "/");
    return new Response("admin asset");
  } } };
  const response = await worker.fetch(new Request("https://api.example.workers.dev/"), env);
  assert.equal(await response.text(), "admin asset");
  assert.equal(called, true);
});


function adminEnv(calls) {
  return {
    DB: {
      prepare(sql) {
        return {
          values: [],
          bind(...values) { this.values = values; return this; },
          async first() {
            if (sql.includes("SELECT expires_at FROM admin_sessions")) {
              return { expires_at: Date.now() + 60_000 };
            }
            return null;
          },
          async run() {
            calls.push({ sql, values: this.values });
            return { meta: { changes: 1 } };
          },
          async all() { return { results: [] }; }
        };
      }
    }
  };
}

test("admin code issuance requires a student ID", async () => {
  const calls = [];
  const env = adminEnv(calls);
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/codes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({ gradeId: "grade6", academicYear: "1405", renewalMode: "promotion" })
  }), env);
  assert.equal(response.status, 400);
  assert.equal(calls.some(call => call.sql.includes("INSERT INTO activation_codes")), false);
});

test("admin issues exactly one activation code bound to the requested student", async () => {
  const calls = [];
  const env = adminEnv(calls);
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/codes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({
      studentId: "student-123",
      gradeId: "grade6",
      academicYear: "1405",
      renewalMode: "promotion"
    })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.studentId, "student-123");
  assert.equal(body.codes.length, 1);
  const insert = calls.find(call => call.sql.includes("INSERT INTO activation_codes"));
  assert.ok(insert);
  assert.match(insert.sql, /student_id/);
  assert.ok(insert.values.includes("student-123"));
  const audit = calls.find(call => call.sql.includes("INSERT INTO audit_log"));
  assert.ok(audit);
  assert.match(audit.values.at(-1), /student-123/);
});

test("preflight allows same-origin and rejects foreign origin", async () => {
  const good = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/login", {
    method: "OPTIONS", headers: { Origin: "https://api.example.workers.dev" }
  }), {});
  assert.equal(good.status, 204);
  const bad = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/login", {
    method: "OPTIONS", headers: { Origin: "https://evil.example" }
  }), {});
  assert.equal(bad.status, 403);
});
