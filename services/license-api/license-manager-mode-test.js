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
const profile = { studentId: "license-mode-test-student", gradeId: "grade6", name: "آزمون" };
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

    const localActivation = manager.activate(
        "GRADE6-1405-TEST", "grade6", profile.studentId
    );
    assert.equal(localActivation.valid, true, "The existing test-mode activation path must remain functional.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), true);
    assert.equal(manager.isActivated(profile.studentId), true);

    window.TahouriServiceConfig.mode = "production";
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), false,
        "Unsigned LocalStorage licenses must not authorize a production profile.");
    assert.equal(manager.isActivated(profile.studentId), false,
        "Generic production activation status must not trust unsigned LocalStorage licenses.");

    const claims = {
        licenseId: "lic_remote_test",
        productId: "tahouri-edu",
        academicYear: "1405",
        gradeScope: "grade6",
        studentId: profile.studentId,
        validFrom: new Date(Date.now() - 60000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        entitlementVersion: 1
    };
    window.TahouriEntitlementStore = { readAll: () => [{ claims, signature: "test" }] };
    window.TahouriEntitlementVerifier = {
        verifyEnvelope: async () => ({ valid: true, claims })
    };

    assert.equal(await manager.initializeRemoteEntitlement(), true,
        "A verifier-approved remote entitlement must initialize.");
    assert.equal(manager.isGradeActivated("grade6", profile.studentId), true,
        "A verified remote entitlement must authorize its bound grade.");
    assert.equal(manager.isGradeActivated("grade5", profile.studentId), false,
        "A verified entitlement must not authorize a different grade.");
    assert.equal(manager.isActivated(profile.studentId), true,
        "Generic activation status must reflect a verified remote entitlement.");

    console.log("License Manager mode and entitlement test: PASS");
}

main().catch(error => {
    console.error("License Manager mode and entitlement test: FAIL", error);
    process.exitCode = 1;
});
