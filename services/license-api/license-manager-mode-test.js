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

    let refreshedLicenseId = null;
    window.TahouriLicenseClient = {
        status: async licenseId => {
            refreshedLicenseId = licenseId;
            return { valid: true };
        }
    };
    const refreshResult = await manager.refreshRemoteLicenseStatus();
    assert.equal(refreshResult.valid, true,
        "Remote status refresh must accept the verified claims object selected from storage.");
    assert.equal(refreshedLicenseId, claims.licenseId,
        "Remote status refresh must query the selected active profile's license ID.");

    // The first stored entitlement may belong to another student. The active
    // student's matching entitlement must still be found later in the store.
    const studentA = { studentId: "student-A", grade: "grade6" };
    const studentB = { studentId: "student-B", grade: "grade6" };
    const claimsA = makeClaims(studentA.studentId, "grade6", "lic_student_A");
    const claimsB = makeClaims(studentB.studentId, "grade6", "lic_student_B");

    // A delayed invalid status response for the previous profile must not
    // clear the entitlement selected after switching to another profile.
    profile.studentId = studentA.studentId;
    window.TahouriEntitlementStore.readAll = () => [envelope(claimsA)];
    assert.equal(await manager.initializeRemoteEntitlement(), true);
    let resolveStaleStatus;
    window.TahouriLicenseClient.status = () => new Promise(resolve => {
        resolveStaleStatus = resolve;
    });
    const staleStatusCheck = manager.refreshRemoteLicenseStatus();
    await Promise.resolve();
    profile.studentId = studentB.studentId;
    window.TahouriEntitlementStore.readAll = () => [envelope(claimsB)];
    assert.equal(await manager.initializeRemoteEntitlement(), true);
    resolveStaleStatus({ valid: false, reason: "revoked" });
    const staleStatusResult = await staleStatusCheck;
    assert.equal(staleStatusResult.reason, "stale_status_check",
        "A delayed status response for a previous profile must be ignored.");
    assert.equal(manager.isGradeActivated("grade6", studentB.studentId), true,
        "A stale invalid status response must not clear the newly selected profile entitlement.");
    window.TahouriLicenseClient.status = async () => ({ valid: true });

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

    // Remote activation must reject incomplete or mismatched signed bindings
    // before writing an entitlement to local storage.
    let activationWrites = 0;
    let activationPayload = null;
    window.TahouriEntitlementStore.write = item => {
        activationWrites++;
        return Boolean(item && item.claims);
    };
    window.TahouriLicenseClient = {
        activate: async payload => {
            activationPayload = payload;
            const validClaims = makeClaims(payload.studentId, payload.gradeId, "lic_activation_valid");
            validClaims.installationBinding = payload.installationId;
            return { valid: true, entitlement: envelope(validClaims) };
        }
    };

    const validActivation = await manager.activateRemote("THR-TEST-CODE", "grade6", studentB.studentId);
    assert.equal(validActivation.valid, true,
        "A fully bound signed entitlement must activate successfully.");
    assert.equal(activationWrites, 1,
        "A valid entitlement must be persisted exactly once.");
    assert.equal(activationPayload.studentId, studentB.studentId);
    assert.equal(activationPayload.gradeId, "grade6");

    const rejectedClaims = [
        { label: "missing grade", mutate: c => { c.gradeScope = ""; } },
        { label: "wrong grade", mutate: c => { c.gradeScope = "grade5"; } },
        { label: "missing student", mutate: c => { c.studentId = ""; } },
        { label: "wrong student", mutate: c => { c.studentId = studentA.studentId; } },
        { label: "missing installation", mutate: c => { c.installationBinding = ""; } },
        { label: "wrong installation", mutate: c => { c.installationBinding = "another-installation"; } }
    ];
    for (const scenario of rejectedClaims) {
        window.TahouriLicenseClient.activate = async payload => {
            const claims = makeClaims(payload.studentId, payload.gradeId, "lic_rejected_" + scenario.label.replace(/ /g, "_"));
            claims.installationBinding = payload.installationId;
            scenario.mutate(claims);
            return { valid: true, entitlement: envelope(claims) };
        };
        const rejected = await manager.activateRemote("THR-TEST-CODE", "grade6", studentB.studentId);
        assert.equal(rejected.valid, false,
            "Remote activation must reject " + scenario.label + " claims.");
        assert.equal(activationWrites, 1,
            "Rejected " + scenario.label + " claims must never be persisted.");
    }

    console.log("License Manager mode and entitlement test: PASS");
}

main().catch(error => {
    console.error("License Manager mode and entitlement test: FAIL", error);
    process.exitCode = 1;
});
