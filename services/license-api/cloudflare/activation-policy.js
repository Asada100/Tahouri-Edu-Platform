/**
 * Pure activation policy shared by the development API and the future Worker.
 * No database, request, clock, or cryptographic dependencies.
 */
export function evaluateActivationPolicy(input) {
  const {
    requestedAcademicYear,
    currentAcademicYear,
    codeRenewalMode,
    requestedRenewalMode = "promotion",
    currentLicense = null,
    now = new Date().toISOString(),
  } = input || {};

  const targetYear = Number(requestedAcademicYear);
  const activeYear = Number(currentAcademicYear);
  if (!Number.isInteger(targetYear) || !Number.isInteger(activeYear)) {
    return { ok: false, reason: "invalid_academic_year" };
  }
  if (targetYear < activeYear || targetYear > activeYear + 1) {
    return { ok: false, reason: "academic_year_out_of_range" };
  }

  // Current-year activation does not depend on a renewal mode or an old license.
  if (targetYear === activeYear) {
    return { ok: true, status: "active", isFutureRenewal: false };
  }

  if (!["promotion", "repeat"].includes(requestedRenewalMode)) {
    return { ok: false, reason: "invalid_renewal_mode" };
  }
  if (codeRenewalMode !== requestedRenewalMode) {
    return { ok: false, reason: "renewal_mode_mismatch" };
  }
  if (!currentLicense) {
    return { ok: false, reason: "current_license_required" };
  }
  if (currentLicense.status !== "active") {
    return { ok: false, reason: "current_license_not_active" };
  }

  const nowMs = Date.parse(now);
  const fromMs = Date.parse(currentLicense.validFrom);
  const untilMs = Date.parse(currentLicense.validUntil);
  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(fromMs) ||
    !Number.isFinite(untilMs) ||
    untilMs <= fromMs ||
    fromMs > nowMs ||
    untilMs <= nowMs
  ) {
    return { ok: false, reason: "current_license_not_currently_valid" };
  }

  const currentMatch = String(currentLicense.gradeId || "").match(/^(?:grade)?(\d+)$/i);
  const targetMatch = String(input.gradeId || "").match(/^(?:grade)?(\d+)$/i);
  if (!currentMatch || !targetMatch) {
    return { ok: false, reason: "unrecognized_grade" };
  }

  const currentLevel = Number(currentMatch[1]);
  const targetLevel = Number(targetMatch[1]);
  if (!Number.isSafeInteger(currentLevel) || !Number.isSafeInteger(targetLevel)) {
    return { ok: false, reason: "unrecognized_grade" };
  }

  if (requestedRenewalMode === "promotion" && targetLevel !== currentLevel + 1) {
    return { ok: false, reason: "promotion_must_be_next_grade" };
  }
  if (requestedRenewalMode === "repeat" && targetLevel !== currentLevel) {
    return { ok: false, reason: "repeat_must_keep_same_grade" };
  }

  return { ok: true, status: "future", isFutureRenewal: true };
}
