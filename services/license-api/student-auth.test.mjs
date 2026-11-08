import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.js";

function authEnv() {
  const calls = [];
  const batches = [];
  const attempts = new Map();
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        sql,
        bind(...args) { values = args; return this; },
        async first() {
          calls.push({ type: "first", sql, values });
          if (sql.includes("FROM student_login_attempts")) return attempts.get(values[0]) || null;
          return null;
        },
        async run() {
          calls.push({ type: "run", sql, values });
          if (sql.includes("INSERT INTO student_login_attempts")) {
            const [key, count, started, locked] = values;
            attempts.set(key, { attempts: count ?? 0, window_started_at: started ?? Date.now(), locked_until: locked ?? 0 });
          }
          if (sql.includes("DELETE FROM student_login_attempts")) attempts.delete(values[0]);
          return { meta: { changes: 1 } };
        },
        async all() { return { results: [] }; }
      };
    },
    async batch(statements) {
      batches.push(statements.map(x => ({ sql: x.sql, values: x.values })));
      return statements.map(() => ({ meta: { changes: 1 } }));
    }
  };
  return { DB, calls, batches, attempts };
}

test("student self-registration creates a durable ID, password hash, session and audit event", async () => {
  const env = authEnv();
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/students/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://app.example.test", "CF-Connecting-IP": "192.0.2.10" },
    body: JSON.stringify({ fullName: "دانش‌آموز آزمایشی", gradeId: "grade6", password: "a-secure-test-password" })
  }), { ...env, APP_ORIGIN: "https://app.example.test" });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.match(body.student.studentId, /^stu_[a-f0-9]{32}$/);
  assert.equal(body.student.fullName, "دانش‌آموز آزمایشی");
  assert.equal(body.student.gradeId, "grade6");
  assert.match(response.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=None/);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://app.example.test");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 3);
  assert.match(env.batches[0][0].sql, /password_salt, password_hash, password_iterations/);
  assert.doesNotMatch(JSON.stringify(env.batches[0]), /a-secure-test-password/);
  assert.match(env.batches[0][1].sql, /INSERT INTO student_sessions/);
  assert.match(env.batches[0][2].sql, /student\.self_registered/);
  assert.ok(env.calls.some(call => call.type === "run" && call.sql.includes("DELETE FROM student_login_attempts")),
    "successful registration must clear, not increment, failed-attempt counters");
});

test("student registration rejects weak passwords and invalid grades before writing", async () => {
  for (const body of [
    { fullName: "آزمایشی", gradeId: "grade6", password: "12345" },
    { fullName: "آزمایشی", gradeId: "grade7", password: "a-secure-test-password" }
  ]) {
    const env = authEnv();
    const response = await worker.fetch(new Request("https://api.example.workers.dev/api/students/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }), env);
    assert.equal(response.status, 400);
    assert.equal(env.batches.length, 0);
  }
});

test("student login does not disclose whether a student ID exists", async () => {
  const env = authEnv();
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/students/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.11" },
    body: JSON.stringify({ studentId: "stu_not-found", password: "wrong-password" })
  }), env);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "شناسهٔ دانش‌آموز یا رمز عبور نادرست است.");
  assert.ok(env.calls.some(x => x.sql.includes("student_login_attempts")));
});

test("student preflight allows GitHub Pages origin with credentialed CORS", async () => {
  const env = { APP_ORIGIN: "https://asada100.github.io" };
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/students/session", {
    method: "OPTIONS",
    headers: {
      Origin: "https://asada100.github.io",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "content-type"
    }
  }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://asada100.github.io");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.match(response.headers.get("access-control-allow-methods"), /GET,POST,OPTIONS/);
});

test("student authentication rejects an untrusted browser origin", async () => {
  const env = authEnv();
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/students/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
    body: JSON.stringify({ fullName: "آزمایشی", gradeId: "grade6", password: "a-secure-test-password" })
  }), { ...env, APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 403);
  assert.equal(env.batches.length, 0);
});
