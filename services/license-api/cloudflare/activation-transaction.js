/**
 * Atomic D1 activation persistence primitive.
 *
 * This module does not expose an HTTP route and does not sign entitlements.
 * Call only after all request, grade-progression, date and signature checks.
 */
export function buildActivationBatch(db, input) {
  const {
    codeHash, gradeId, academicYear, renewalMode, licenseId,
    studentId, validFrom, validUntil, installationBinding,
    status, entitlementJson, now, currentLicenseId = null,
    currentAcademicYear = null, currentGradeId = null,
  } = input;

  if (!db || typeof db.prepare !== "function") throw new TypeError("D1 database binding is required.");
  for (const [name, value] of Object.entries({
    codeHash, gradeId, academicYear, renewalMode, licenseId,
    studentId, validFrom, validUntil, installationBinding,
    status, entitlementJson, now,
  })) {
    if (typeof value !== "string" || !value.trim()) throw new TypeError(name + " is required.");
  }
  if (!["active", "future"].includes(status)) throw new TypeError("status must be active or future.");
  if (status === "future" && (!currentLicenseId || !currentAcademicYear || !currentGradeId)) {
    throw new TypeError("A current active license is required for a future reservation.");
  }

  const claimCode = db.prepare(`
    UPDATE activation_codes
    SET status = 'used', used_at = ?, license_id = ?
    WHERE code_hash = ?
      AND product_id = 'tahouri-edu'
      AND grade_id = ?
      AND academic_year = ?
      AND renewal_mode = ?
      AND status = 'active'
      AND used_at IS NULL
      AND (
        ? = 0 OR EXISTS (
          SELECT 1 FROM licenses current
          WHERE current.license_id = ?
            AND current.product_id = activation_codes.product_id
            AND current.student_id = ?
            AND current.grade_id = ?
            AND current.academic_year = ?
            AND current.status = 'active'
            AND current.valid_from <= ?
            AND current.valid_until > ?
        )
      )
  `).bind(
    now, licenseId, codeHash, gradeId, academicYear, renewalMode,
    status === "future" ? 1 : 0,
    currentLicenseId || "", studentId, currentGradeId || "",
    currentAcademicYear || "", now, now
  );

  const createLicense = db.prepare(`
    INSERT INTO licenses (
      license_id, code_hash, product_id, student_id, grade_id, academic_year,
      valid_from, valid_until, installation_binding, status, entitlement_json, created_at
    )
    SELECT ?, code_hash, product_id, ?, ?, ?, ?, ?, ?, ?, ?, ?
    FROM activation_codes
    WHERE code_hash = ?
      AND status = 'used'
      AND license_id = ?
      AND used_at = ?
  `).bind(
    licenseId, studentId, gradeId, academicYear, validFrom, validUntil,
    installationBinding, status, entitlementJson, now,
    codeHash, licenseId, now
  );

  const writeAudit = db.prepare(`
    INSERT INTO audit_log (event_type, actor, license_id, code_hash, created_at, metadata_json)
    SELECT 'license.activated', 'system', ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM licenses WHERE license_id = ? AND code_hash = ?
    )
  `).bind(
    licenseId, codeHash, now,
    JSON.stringify({ gradeId, academicYear, status }),
    licenseId, codeHash
  );

  return [claimCode, createLicense, writeAudit];
}

/**
 * Execute the three statements as one D1 batch transaction.
 * D1 batch rolls back the whole batch when a statement fails.
 */
export async function persistActivation(db, input) {
  const statements = buildActivationBatch(db, input);
  const results = await db.batch(statements);
  const changes = results.map(result => Number(result?.meta?.changes || 0));
  if (changes[0] !== 1) return { ok: false, reason: "code_not_available", changes };
  if (changes[1] !== 1 || changes[2] !== 1) {
    throw new Error("Activation batch invariant failed; expected code, license and audit changes.");
  }
  return { ok: true, changes };
}
