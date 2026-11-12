"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
    path.resolve(__dirname, "../../engine/core/licenseManager.js"),
    "utf8"
);
const values = new Map();
const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
};
const profile = { studentId: "license-mode-test-student", grade: "grade6", gradeId: "grade6", name: "آزمون" };
const window = {
    ProfileManager: { get: () => profile },
    TahouriServiceConfig: { mode: "test" },
    localStorage: storage
};
const context = {
    window,
    localStorage: storage,
    console: { log() {}, warn() {}, error() {} }
};
vm.runInNewContext(source, context);

async function main() {
    const manager = window.LicenseManager;
    assert(manager, "LicenseManager must initialize.");

    const demoCode = "GRADE6-" + manager.getAcademicYear() + "-TEST";
    const localActivation = manager.activate(
        demoCode, "grade6", profile.studentId
    );
    assert.equal(localActivation.valid, true, "The existing test-mode activation path must remain functional.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), true);
    assert.equal(manager.isActivated(profile.studentId), true);

    window.TahouriServiceConfig.mode = "production";
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), false,
        "Unsigned LocalStorage licenses must not authorize a production profile.");
    assert.equal(manager.isActivated(profile.studentId), false,
        "Generic production activation status must not trust unsigned LocalStorage licenses.");

    function makeClaims(studentId, gradeScope, licenseId) {
        return {
            licenseId,
            productId: "tahouri-edu",
            academicYear: String(manager.getAcademicYear()),
            gradeScope,
            studentId,
            validFrom: new Date(Date.now() - 60000).toISOString(),
            validUntil: new Date(Date.now() + 86400000).toISOString(),
            installationBinding: undefined,
            entitlementVersion: 1
        };
    }
    const claims = makeClaims(profile.studentId, "grade6", "lic_remote_test");
    const envelope = value => ({ claims: value, signature: "test" });
    window.TahouriEntitlementStore = { readAll: () => [envelope(claims)] };
    window.TahouriEntitlementVerifier = {
        verifyEnvelope: async item => ({ valid: true, claims: item.claims })
    };

    assert.equal(await manager.initializeRemoteEntitlement(), true,
        "A verifier-approved entitlement matching the active profile must initialize.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), true,
        "A verified remote entitlement must authorize its bound grade.");
    assert.equal(manager.isGradeActivated("grade5", profile.studentId), false,
        "A verified entitlement must not authorize a different grade.");
    assert.equal(manager.isActivated(profile.studentId), true,
        "Generic activation status must reflect a verified remote entitlement.");

    // The first stored entitlement may belong to another student. The active
    // student's matching entitlement must still be found later in the store.
    const studentA = { studentId: "student-A", grade: "grade6" };
    const studentB = { studentId: "student-B", grade: "grade6" };
    const claimsA = makeClaims(studentA.studentId, "grade6", "lic_student_A");
    const claimsB = makeClaims(studentB.studentId, "grade6", "lic_student_B");
    profile.studentId = studentB.studentId;
    profile.grade = "grade6";
    window.TahouriEntitlementStore.readAll = () => [envelope(claimsA), envelope(claimsB)];
    assert.equal(await manager.initializeRemoteEntitlement(), true,
        "The matching entitlement must be selected even when another student's envelope is first.");
    assert.equal(manager.isGradeActivated("grade6", studentB.studentId), true,
        "The active student's entitlement must be selected from a multi-profile store.");
    assert.equal(manager.isGradeActivated("grade6", studentA.studentId), false,
        "A different student's entitlement must never authorize the active profile.");

    // Reverse order and wrong-grade entries must not affect selection.
    profile.studentId = studentA.studentId;
    const wrongGrade = makeClaims(studentA.studentId, "grade5", "lic_student_A_wrong_grade");
    window.TahouriEntitlementStore.readAll = () => [
        envelope(claimsB), envelope(wrongGrade), envelope(claimsA)
    ];
    assert.equal(await manager.initializeRemoteEntitlement(), true,
        "Selection must skip other students and mismatched grades.");
    assert.equal(manager.isGradeActivated("grade6", studentA.studentId), true);
    assert.equal(manager.isGradeActivated("grade5", studentA.studentId), false);

    // Repeated profile switches must re-select the matching signed entitlement.
    profile.studentId = studentB.studentId;
    window.TahouriEntitlementStore.readAll = () => [envelope(claimsA), envelope(claimsB)];
    assert.equal(await manager.initializeRemoteEntitlement(), true);
    assert.equal(manager.isGradeActivated("grade6", studentB.studentId), true);
    profile.studentId = studentA.studentId;
    assert.equal(await manager.initializeRemoteEntitlement(), true);
    assert.equal(manager.isGradeActivated("grade6", studentA.studentId), true);

    // An older, slower verification must not overwrite a newer profile selection.
    let resolveA;
    let resolveB;
    profile.studentId = studentA.studentId;
    window.TahouriEntitlementStore.readAll = () => [envelope(claimsA)];
    window.TahouriEntitlementVerifier.verifyEnvelope = item => new Promise(resolve => {
        if (item.claims.studentId === studentA.studentId) resolveA = resolve;
        else if (item.claims.studentId === studentB.studentId) resolveB = resolve;
    });
    const staleSelection = manager.initializeRemoteEntitlement();
    await Promise.resolve();
    profile.studentId = studentB.studentId;
    window.TahouriEntitlementStore.readAll = () => [envelope(claimsB)];
    const currentSelection = manager.initializeRemoteEntitlement();
    await Promise.resolve();
    assert.equal(typeof resolveA, "function", "The first profile verification must be pending.");
    assert.equal(typeof resolveB, "function", "The second profile verification must be pending.");
    resolveB({ valid: true, claims: claimsB });
    assert.equal(await currentSelection, true,
        "The latest profile selection must complete successfully.");
    resolveA({ valid: true, claims: claimsA });
    assert.equal(await staleSelection, false,
        "A stale asynchronous selection must not replace the latest profile.");
    assert.equal(manager.isGradeActivated("grade6", studentB.studentId), true,
        "The latest active profile must retain its own entitlement after a stale result completes.");

    // Missing or mismatched profile binding must fail closed.
    window.TahouriEntitlementVerifier.verifyEnvelope = async item => ({ valid: true, claims: item.claims });
    const noGradeScope = makeClaims(studentB.studentId, "", "lic_missing_grade_scope");
    window.TahouriEntitlementStore.readAll = () => [envelope(noGradeScope)];
    assert.equal(await manager.initializeRemoteEntitlement(), false,
        "An entitlement without an exact grade binding must not be selected.");
    assert.equal(manager.isGradeActivated("grade6", studentB.studentId), false,
        "A missing grade binding must not authorize a profile.");

    console.log("License Manager mode and entitlement test: PASS");
}

main().catch(error => {
    console.error("License Manager mode and entitlement test: FAIL", error);
    process.exitCode = 1;
});
