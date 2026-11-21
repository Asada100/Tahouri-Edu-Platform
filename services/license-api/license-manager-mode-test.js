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
    crypto: { randomUUID: () => "install-test-profile-status" },
    TahouriDeviceIdentity: {
        getOrCreate: async () => ({ installationId: "install-test-profile-status" })
    },
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
            validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
            installationBinding: undefined,
            deviceSlotId: "a".repeat(64),
            revocationEpoch: Date.now() - 1000,
            offlineLeaseExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            entitlementVersion: 1
        };
    }
    const claims = makeClaims(profile.studentId, "grade6", "lic_remote_test");
    const envelope = value => ({ claims: value, signature: "test" });
    window.TahouriEntitlementStore = { readAll: () => [envelope(claims)] };
    window.TahouriEntitlementVerifier = {
        verifyEnvelope: async item => ({ valid: true, claims: item.claims })
    };

    window.TahouriEntitlementStore.write = item => Boolean(item && item.claims);
    function makeDeviceLeaseStatus(licenseId) {
        const selected = window.TahouriEntitlementStore.readAll()
            .find(item => item.claims.licenseId === licenseId);
        if (!selected) return { valid: false };
        const leaseClaims = {
            ...selected.claims,
            deviceSlotId: "a".repeat(64),
            revocationEpoch: Date.now() - 1000,
            offlineLeaseExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
        };
        return { valid: true, entitlement: envelope(leaseClaims) };
    }

    assert.equal(await manager.initializeRemoteEntitlement(), true,
        "A verifier-approved entitlement matching the active profile must initialize.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), true,
        "A verified remote entitlement must authorize its bound grade.");
    assert.equal(manager.isGradeActivated("grade5", profile.studentId), false,
        "A verified entitlement must not authorize a different grade.");
    const originalLeaseExpiry = claims.offlineLeaseExpiresAt;
    claims.offlineLeaseExpiresAt = new Date(Date.now() - 1000).toISOString();
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), false,
        "An entitlement must stop authorizing immediately after its offline lease expires.");
    claims.offlineLeaseExpiresAt = originalLeaseExpiry;
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), true,
        "A restored unexpired device lease must remain eligible for offline authorization.");
    assert.equal(manager.isActivated(profile.studentId), true,
        "Generic activation status must reflect a verified remote entitlement.");

    let refreshedLicenseId = null;
    window.TahouriLicenseClient = {
        status: async licenseId => {
            refreshedLicenseId = licenseId;
            return makeDeviceLeaseStatus(licenseId);
        }
    };
    const refreshResult = await manager.refreshRemoteLicenseStatus();
    assert.equal(refreshResult.valid, true,
        "Remote status refresh must accept the verified claims object selected from storage.");
    assert.equal(refreshedLicenseId, claims.licenseId,
        "Remote status refresh must query the selected active profile's license ID.");

    window.TahouriLicenseClient.status = async () => {
        throw new Error("offline");
    };
    const offlineStatus = await manager.refreshRemoteLicenseStatus();
    assert.equal(offlineStatus.reason, "network_error",
        "A network outage must be reported without discarding the locally verified entitlement.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), true,
        "A locally verified, unexpired entitlement must continue to authorize offline.");

    // A legacy signed envelope without a bounded device lease must not
    // authorize offline when its proof-bound online upgrade is unavailable.
    const legacyWithoutLeaseClaims = { ...claims };
    delete legacyWithoutLeaseClaims.deviceSlotId;
    delete legacyWithoutLeaseClaims.revocationEpoch;
    delete legacyWithoutLeaseClaims.offlineLeaseExpiresAt;
    window.TahouriEntitlementStore.readAll = () => [envelope(legacyWithoutLeaseClaims)];
    const legacyOffline = await manager.initializeRemoteEntitlement();
    assert.equal(legacyOffline, false,
        "A legacy entitlement without an offline lease must fail closed during a network outage.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), false,
        "A legacy entitlement without a lease must never authorize offline.");

    window.TahouriEntitlementStore.readAll = () => [envelope(claims)];
    window.TahouriLicenseClient.status = async licenseId => makeDeviceLeaseStatus(licenseId);
    assert.equal(await manager.initializeRemoteEntitlement(), true,
        "A valid device-bound entitlement must remain usable after the legacy offline rejection.");

    window.TahouriLicenseClient.status = async () => ({ valid: false });
    const revokedStatus = await manager.refreshRemoteLicenseStatus();
    assert.equal(revokedStatus.valid, false,
        "A definitive server rejection must invalidate the local remote entitlement.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), false,
        "A revoked or missing server license must not remain authorized.");

    window.TahouriLicenseClient.status = async licenseId => makeDeviceLeaseStatus(licenseId);
    assert.equal(await manager.initializeRemoteEntitlement(), true,
        "A still-valid signed local entitlement can be selected again before subsequent profile-switch tests.");

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
    window.TahouriLicenseClient.status = async licenseId => makeDeviceLeaseStatus(licenseId);

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
    await new Promise(resolve => setTimeout(resolve, 0));
    profile.studentId = studentB.studentId;
    window.TahouriEntitlementStore.readAll = () => [envelope(claimsB)];
    const currentSelection = manager.initializeRemoteEntitlement();
    await new Promise(resolve => setTimeout(resolve, 0));
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

    // Remote activation must validate all signed bindings before storage.
    let activationWrites = 0;
    let activationPayload = null;
    window.TahouriEntitlementStore.write = item => {
        activationWrites++;
        return Boolean(item && item.claims);
    };
    window.TahouriLicenseClient.activate = async payload => {
        activationPayload = payload;
        const validClaims = makeClaims(payload.studentId, payload.gradeId, "lic_activation_valid");
        validClaims.installationBinding = payload.installationId;
        return { valid: true, entitlement: envelope(validClaims) };
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
        { label: "wrong installation", mutate: c => { c.installationBinding = "another-installation"; } },
        { label: "missing academic year", mutate: c => { c.academicYear = ""; } },
        { label: "missing license ID", mutate: c => { c.licenseId = ""; } },
        { label: "invalid date range", mutate: c => { c.validFrom = new Date(Date.now() + 86400000).toISOString(); c.validUntil = new Date(Date.now() - 60000).toISOString(); } }
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

    // Profile cards must be able to inspect every locally stored entitlement
    // without changing the currently selected profile or contacting the API.
    window.TahouriServiceConfig.mode = "production";
    const currentYear = String(manager.getAcademicYear());
    const statusClaimsA = makeClaims(studentA.studentId, "grade6", "lic_status_A");
    statusClaimsA.academicYear = currentYear;
    statusClaimsA.installationBinding = "install-test-profile-status";
    statusClaimsA.validFrom = new Date(Date.now() - 60000).toISOString();
    statusClaimsA.validUntil = new Date(Date.now() + 86400000).toISOString();

    const statusClaimsB = makeClaims(studentB.studentId, "grade6", "lic_status_B");
    statusClaimsB.academicYear = currentYear;
    statusClaimsB.installationBinding = "install-test-profile-status";
    statusClaimsB.validFrom = new Date(Date.now() - 60000).toISOString();
    statusClaimsB.validUntil = new Date(Date.now() + 86400000).toISOString();

    window.TahouriEntitlementStore.readAll = () => [
        envelope(statusClaimsA),
        envelope(statusClaimsB)
    ];
    window.TahouriEntitlementVerifier.verifyEnvelope = async item => ({
        valid: true,
        claims: item.claims
    });

    const profileAStatus = await manager.getProfileEntitlementStatus(studentA.studentId, "grade6");
    assert.equal(profileAStatus.active, true,
        "A valid locally stored entitlement must be reported active for its matching profile.");
    assert.equal(profileAStatus.status, "active");

    const profileBStatus = await manager.getProfileEntitlementStatus(studentB.studentId, "grade6");
    assert.equal(profileBStatus.active, true,
        "The status lookup must find another profile's entitlement in the same local store.");

    const wrongGradeStatus = await manager.getProfileEntitlementStatus(studentA.studentId, "grade5");
    assert.equal(wrongGradeStatus.active, false,
        "A signed entitlement must not activate a different grade.");
    assert.equal(wrongGradeStatus.status, "inactive");

    const wrongInstallation = { ...statusClaimsA, installationBinding: "another-device" };
    window.TahouriEntitlementStore.readAll = () => [envelope(wrongInstallation)];
    const wrongDeviceStatus = await manager.getProfileEntitlementStatus(studentA.studentId, "grade6");
    assert.equal(wrongDeviceStatus.active, false,
        "A profile entitlement bound to another installation must not be shown as active.");
    assert.equal(wrongDeviceStatus.status, "invalid");

    const oldYear = { ...statusClaimsA, academicYear: String(Number(currentYear) - 1) };
    window.TahouriEntitlementStore.readAll = () => [envelope(oldYear)];
    const oldYearStatus = await manager.getProfileEntitlementStatus(studentA.studentId, "grade6");
    assert.equal(oldYearStatus.active, false);
    assert.equal(oldYearStatus.status, "renewal_required",
        "An entitlement from a previous academic year must be shown as requiring renewal.");

    const futureStart = {
        ...statusClaimsA,
        validFrom: new Date(Date.now() + 86400000).toISOString(),
        validUntil: new Date(Date.now() + 172800000).toISOString()
    };
    window.TahouriEntitlementStore.readAll = () => [envelope(futureStart)];
    const futureStatus = await manager.getProfileEntitlementStatus(studentA.studentId, "grade6");
    assert.equal(futureStatus.active, false);
    assert.equal(futureStatus.status, "pending",
        "A future entitlement must be shown as pending rather than active.");

    const expired = {
        ...statusClaimsA,
        validFrom: new Date(Date.now() - 172800000).toISOString(),
        validUntil: new Date(Date.now() - 86400000).toISOString()
    };
    window.TahouriEntitlementStore.readAll = () => [envelope(expired)];
    const expiredStatus = await manager.getProfileEntitlementStatus(studentA.studentId, "grade6");
    assert.equal(expiredStatus.active, false);
    assert.equal(expiredStatus.status, "expired",
        "An expired entitlement must be reported as expired.");

    // A previously activated installation may have a signed entitlement
    // bound to the legacy LocalStorage installation ID. Preserve that exact
    // entitlement locally during the transition, without treating the legacy
    // ID as proof for pairing or device replacement.
    const legacyInstallationId = "legacy-installation-for-migration-test";
    storage.setItem("Tahouri_Installation_Id_v1", legacyInstallationId);
    const legacyMigrationClaims = makeClaims(profile.studentId, "grade6", "lic_legacy_offline");
    legacyMigrationClaims.academicYear = currentYear;
    legacyMigrationClaims.installationBinding = legacyInstallationId;
    legacyMigrationClaims.validFrom = new Date(Date.now() - 60000).toISOString();
    legacyMigrationClaims.validUntil = new Date(Date.now() + 86400000).toISOString();
    window.TahouriEntitlementStore.readAll = () => [envelope(legacyMigrationClaims)];

    assert.equal(await manager.initializeRemoteEntitlement(), true,
        "A valid signed legacy-bound entitlement must remain selectable during offline migration.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), true,
        "A valid legacy-bound entitlement must preserve access during the transition.");
    const legacyStatus = await manager.getProfileEntitlementStatus(profile.studentId, "grade6");
    assert.equal(legacyStatus.active, true,
        "Profile status must recognize the matching legacy installation binding.");

    const unrelatedLegacyClaims = {
        ...legacyMigrationClaims,
        installationBinding: "different-legacy-installation"
    };
    window.TahouriEntitlementStore.readAll = () => [envelope(unrelatedLegacyClaims)];
    assert.equal(await manager.initializeRemoteEntitlement(), false,
        "A legacy entitlement bound to a different installation must remain rejected.");
    const unrelatedLegacyStatus = await manager.getProfileEntitlementStatus(profile.studentId, "grade6");
    assert.equal(unrelatedLegacyStatus.active, false,
        "A different legacy installation must not inherit the entitlement.");

    console.log("License Manager mode and entitlement test: PASS");
}

main().catch(error => {
    console.error("License Manager mode and entitlement test: FAIL", error);
    process.exitCode = 1;
});
