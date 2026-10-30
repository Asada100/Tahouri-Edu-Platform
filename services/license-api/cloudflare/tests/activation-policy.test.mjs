import test from "node:test";
import assert from "node:assert/strict";
import { evaluateActivationPolicy } from "../activation-policy.js";

const NOW = "2026-10-30T12:00:00.000Z";
const CURRENT = {
  gradeId: "grade6",
  status: "active",
  validFrom: "2026-10-01T00:00:00.000Z",
  validUntil: "2027-09-30T23:59:59.000Z",
};

function evaluate(overrides = {}) {
  return evaluateActivationPolicy({
    requestedAcademicYear: "1406",
    currentAcademicYear: 1405,
    codeRenewalMode: "promotion",
    requestedRenewalMode: "promotion",
    gradeId: "grade7",
    currentLicense: CURRENT,
    now: NOW,
    ...overrides,
  });
}

test("current academic year activation does not require a current license", () => {
  assert.deepEqual(evaluate({
    requestedAcademicYear: "1405",
    currentLicense: null,
    codeRenewalMode: "legacy-value",
  }), { ok: true, status: "active", isFutureRenewal: false });
});

test("rejects past and more-than-one-year-ahead academic years", () => {
  assert.equal(evaluate({ requestedAcademicYear: "1404" }).reason, "academic_year_out_of_range");
  assert.equal(evaluate({ requestedAcademicYear: "1407" }).reason, "academic_year_out_of_range");
});

test("promotion accepts exactly the next grade", () => {
  assert.equal(evaluate().ok, true);
  assert.equal(evaluate({ gradeId: "grade8" }).reason, "promotion_must_be_next_grade");
  assert.equal(evaluate({ gradeId: "grade6" }).reason, "promotion_must_be_next_grade");
});

test("repeat accepts only the same grade and matching repeat code", () => {
  assert.equal(evaluate({
    requestedRenewalMode: "repeat",
    codeRenewalMode: "repeat",
    gradeId: "grade6",
  }).ok, true);
  assert.equal(evaluate({
    requestedRenewalMode: "repeat",
    codeRenewalMode: "repeat",
    gradeId: "grade7",
  }).reason, "repeat_must_keep_same_grade");
  assert.equal(evaluate({
    requestedRenewalMode: "repeat",
    codeRenewalMode: "promotion",
    gradeId: "grade6",
  }).reason, "renewal_mode_mismatch");
});

test("future renewal requires an active current license", () => {
  assert.equal(evaluate({ currentLicense: null }).reason, "current_license_required");
  assert.equal(evaluate({
    currentLicense: { ...CURRENT, status: "revoked" },
  }).reason, "current_license_not_active");
});

test("rejects a current license that is not valid at the policy timestamp", () => {
  assert.equal(evaluate({
    currentLicense: { ...CURRENT, validUntil: "2026-10-30T11:59:59.000Z" },
  }).reason, "current_license_not_currently_valid");
  assert.equal(evaluate({
    currentLicense: { ...CURRENT, validFrom: "2026-10-30T12:00:01.000Z" },
  }).reason, "current_license_not_currently_valid");
});

test("rejects malformed years, modes and grade identifiers", () => {
  assert.equal(evaluate({ requestedAcademicYear: "14x6" }).reason, "invalid_academic_year");
  assert.equal(evaluate({ requestedRenewalMode: "skip" }).reason, "invalid_renewal_mode");
  assert.equal(evaluate({
    currentLicense: { ...CURRENT, gradeId: "six" },
  }).reason, "unrecognized_grade");
});

test("grade six can promote to grade seven for the reserved next academic year", () => {
  assert.deepEqual(evaluate(), { ok: true, status: "future", isFutureRenewal: true });
});
