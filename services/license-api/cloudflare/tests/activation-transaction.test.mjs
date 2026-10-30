import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { persistActivation } from "../activation-transaction.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(resolve(root, "migrations/0003_unique_future_license_reservation.sql"), "utf8");

function makeDb() {
  const raw = new DatabaseSync(":memory:");
  raw.exec(`
    CREATE TABLE activation_codes (
      code_hash TEXT PRIMARY KEY, code_preview TEXT NOT NULL, product_id TEXT NOT NULL,
      grade_id TEXT NOT NULL, academic_year TEXT NOT NULL,
      renewal_mode TEXT NOT NULL DEFAULT 'promotion', status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL, used_at TEXT, license_id TEXT
    );
    CREATE TABLE licenses (
      license_id TEXT PRIMARY KEY, code_hash TEXT, product_id TEXT NOT NULL,
      student_id TEXT NOT NULL, grade_id TEXT NOT NULL, academic_year TEXT NOT NULL,
      valid_from TEXT NOT NULL, valid_until TEXT NOT NULL, installation_binding TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', entitlement_json TEXT NOT NULL,
      created_at TEXT NOT NULL, revoked_at TEXT
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, actor TEXT NOT NULL,
      license_id TEXT, code_hash TEXT, created_at TEXT NOT NULL, metadata_json TEXT
    );
  `);
  raw.exec(migration);
  const db = {
    prepare(sql) {
      return { sql, bind(...values) { return { sql, values }; } };
    },
    async batch(statements) {
      raw.exec("BEGIN");
      try {
        const results = statements.map(statement => {
          const result = raw.prepare(statement.sql).run(...statement.values);
          return { meta: { changes: Number(result.changes) } };
        });
        raw.exec("COMMIT");
        return results;
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { db, raw };
}

function seedCode(raw, hash, { grade = "grade7", year = "1406", mode = "promotion" } = {}) {
  raw.prepare(`INSERT INTO activation_codes
    (code_hash,code_preview,product_id,grade_id,academic_year,renewal_mode,status,created_at)
    VALUES (?, ?, 'tahouri-edu', ?, ?, ?, 'active', ?)`)
    .run(hash, hash.slice(0, 6), grade, year, mode, "2026-10-30T00:00:00.000Z");
}

function input(hash, overrides = {}) {
  return {
    codeHash: hash, gradeId: "grade7", academicYear: "1406", renewalMode: "promotion",
    licenseId: "lic-" + hash, studentId: "student-1",
    validFrom: "2026-10-30T00:00:00.000Z", validUntil: "2027-10-30T00:00:00.000Z",
    installationBinding: "install-1", status: "future", entitlementJson: "{}",
    now: "2026-10-30T12:00:00.000Z",
    currentLicenseId: "current-1", currentAcademicYear: "1405", currentGradeId: "grade6",
    ...overrides,
  };
}

test("activation consumes code, creates license and audit as one batch", async () => {
  const { db, raw } = makeDb();
  try {
    seedCode(raw, "code-a");
    raw.prepare(`INSERT INTO licenses
      (license_id,product_id,student_id,grade_id,academic_year,valid_from,valid_until,
       installation_binding,status,entitlement_json,created_at)
      VALUES ('current-1','tahouri-edu','student-1','grade6','1405',
      '2025-10-30','2026-10-31','install-1','active','{}','2025-10-30')`).run();

    const result = await persistActivation(db, input("code-a"));
    assert.equal(result.ok, true);
    assert.deepEqual(result.changes, [1, 1, 1]);
    assert.equal(raw.prepare("SELECT status FROM activation_codes WHERE code_hash='code-a'").get().status, "used");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM licenses WHERE license_id='lic-code-a'").get().n, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE license_id='lic-code-a'").get().n, 1);
  } finally { raw.close(); }
});

test("a repeated activation cannot consume the same code twice", async () => {
  const { db, raw } = makeDb();
  try {
    seedCode(raw, "code-b");
    raw.prepare(`INSERT INTO licenses
      (license_id,product_id,student_id,grade_id,academic_year,valid_from,valid_until,
       installation_binding,status,entitlement_json,created_at)
      VALUES ('current-1','tahouri-edu','student-1','grade6','1405',
      '2025-10-30','2026-10-31','install-1','active','{}','2025-10-30')`).run();
    assert.equal((await persistActivation(db, input("code-b"))).ok, true);
    const second = await persistActivation(db, input("code-b", { licenseId: "lic-replay" }));
    assert.equal(second.ok, false);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM licenses").get().n, 2);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM audit_log").get().n, 1);
  } finally { raw.close(); }
});

test("a duplicate future reservation rolls back code consumption and audit", async () => {
  const { db, raw } = makeDb();
  try {
    seedCode(raw, "code-c");
    raw.prepare(`INSERT INTO licenses
      (license_id,product_id,student_id,grade_id,academic_year,valid_from,valid_until,
       installation_binding,status,entitlement_json,created_at)
      VALUES ('current-1','tahouri-edu','student-1','grade6','1405',
      '2025-10-30','2026-10-31','install-1','active','{}','2025-10-30'),
      ('existing-future','tahouri-edu','student-1','grade8','1406',
      '2026-10-30','2027-10-30','install-1','future','{}','2026-10-30')`).run();
    await assert.rejects(() => persistActivation(db, input("code-c")), /UNIQUE constraint failed/);
    assert.equal(raw.prepare("SELECT status FROM activation_codes WHERE code_hash='code-c'").get().status, "active");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM licenses").get().n, 2);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM audit_log").get().n, 0);
  } finally { raw.close(); }
});

test("future reservation requires the exact current active license", async () => {
  const { db, raw } = makeDb();
  try {
    seedCode(raw, "code-d");
    const result = await persistActivation(db, input("code-d", { currentLicenseId: "missing-current" }));
    assert.equal(result.ok, false);
    assert.equal(raw.prepare("SELECT status FROM activation_codes WHERE code_hash='code-d'").get().status, "active");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM licenses").get().n, 0);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM audit_log").get().n, 0);
  } finally { raw.close(); }
});
