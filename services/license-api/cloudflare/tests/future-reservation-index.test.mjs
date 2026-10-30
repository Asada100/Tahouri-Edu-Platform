import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(here, "../migrations/0003_unique_future_license_reservation.sql");
const migration = readFileSync(migrationPath, "utf8");

function insertLicense(db, { id, product = "tahouri-edu", student, grade, year, status }) {
  db.prepare(`INSERT INTO licenses (
    license_id, product_id, student_id, grade_id, academic_year,
    valid_from, valid_until, installation_binding, status, entitlement_json, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, product, student, grade, String(year), "2026-10-30T00:00:00.000Z",
    "2027-10-30T00:00:00.000Z", "install-test", status, "{}", "2026-10-30T00:00:00.000Z"
  );
}

test("migration permits only one future reservation per student/product/year", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`CREATE TABLE licenses (
      license_id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      grade_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      installation_binding TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      entitlement_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);
    db.exec(migration);

    insertLicense(db, { id: "current", student: "student-1", grade: "grade6", year: 1405, status: "active" });
    insertLicense(db, { id: "future-a", student: "student-1", grade: "grade7", year: 1406, status: "future" });

    assert.throws(
      () => insertLicense(db, { id: "future-b", student: "student-1", grade: "grade6", year: 1406, status: "future" }),
      /UNIQUE constraint failed/
    );

    // The constraint is scoped: another year, student, or product remains valid.
    insertLicense(db, { id: "future-next-year", student: "student-1", grade: "grade8", year: 1407, status: "future" });
    insertLicense(db, { id: "future-other-student", student: "student-2", grade: "grade7", year: 1406, status: "future" });
    insertLicense(db, { id: "future-other-product", product: "other-product", student: "student-1", grade: "grade7", year: 1406, status: "future" });

    // Once a reservation is activated, it no longer occupies the future slot.
    db.prepare("UPDATE licenses SET status = 'active' WHERE license_id = ?").run("future-a");
    insertLicense(db, { id: "future-after-activation", student: "student-1", grade: "grade6", year: 1406, status: "future" });

    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM licenses WHERE status = 'future'").get().n, 4);
  } finally {
    db.close();
  }
});
