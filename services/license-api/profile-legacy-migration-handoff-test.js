"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
    path.join(__dirname, "../../engine/ui/profileScreen.js"),
    "utf8"
);

const elements = new Map();
function element(id, extra = {}) {
    const value = {
        id,
        textContent: "",
        value: "",
        hidden: false,
        disabled: false,
        textContent: "",
        ...extra
    };
    elements.set(id, value);
    return value;
}

const status = element("profileLicenseStatus");
const activateButton = element("activateCurrentProfileBtn");
const migrationPanel = element("legacyDeviceMigrationPanel", { hidden: true });
const installationId = element("legacyMigrationInstallationId");
const message = element("legacyMigrationMessage");
const challengeInput = element("legacyMigrationChallengeInput");
const claimButton = element("claimLegacyMigrationBtn");

let currentProfile = {
    studentId: "profile-student-1",
    grade: "grade6"
};
let licenseStatus = {
    status: "renewal_required",
    reason: "تکمیل مهاجرت مجوز قدیمی لازم است"
};
let identityCalls = 0;
let claimCalls = [];
let refreshCalls = 0;
let statusLookups = 0;
let storedResult = { entitlementStored: true };

const ProfileManager = { get: () => currentProfile };
const window = {
    LicenseManager: {
        getProfileEntitlementStatus: async () => { statusLookups += 1; return licenseStatus; },
        initializeRemoteEntitlement: async () => { refreshCalls += 1; return true; }
    },
    ActivationGate: {
        refreshActiveProfileEntitlement: async () => { refreshCalls += 1; return true; }
    },
    TahouriDeviceIdentity: {
        getOrCreate: async () => {
            identityCalls += 1;
            return { installationId: "synthetic-installation-123" };
        }
    },
    TahouriLicenseClient: {
        claimLegacyMigration: async challenge => {
            claimCalls.push(challenge);
            return storedResult;
        }
    }
};

const document = {
    getElementById: id => elements.get(id) || null
};

const context = {
    window,
    document,
    ProfileManager,
    ActivationGate: window.ActivationGate,
    console: { log() {}, warn() {}, error() {} },
    Date,
    Intl,
    setTimeout,
    clearTimeout
};

vm.runInNewContext(source, context);
vm.runInNewContext("globalThis.__testProfileScreen = ProfileScreen;", context);
const ProfileScreen = context.__testProfileScreen;

async function main() {
    assert.ok(ProfileScreen, "ProfileScreen must load in the isolated browser context.");

    await ProfileScreen.refreshProfileLicenseStatus(currentProfile);
    assert.equal(migrationPanel.hidden, false,
        "The migration panel must appear only for the explicit legacy renewal state.");
    assert.equal(installationId.textContent, "synthetic-installation-123",
        "The profile screen must show the current device installation ID.");
    assert.equal(identityCalls, 1);

    licenseStatus = { status: "renewal_required", reason: "تمدید عادی مجوز" };
    await ProfileScreen.refreshProfileLicenseStatus(currentProfile);
    assert.equal(migrationPanel.hidden, true,
        "Ordinary renewal must not expose the legacy migration panel.");

    licenseStatus = {
        status: "renewal_required",
        reason: "تکمیل مهاجرت مجوز قدیمی لازم است"
    };
    await ProfileScreen.refreshProfileLicenseStatus(currentProfile);
    assert.equal(migrationPanel.hidden, false);

    challengeInput.value = JSON.stringify({
        challengeId: "synthetic-challenge",
        studentId: "another-student",
        gradeId: "grade6"
    });
    const beforeMismatch = claimCalls.length;
    const mismatchResult = await ProfileScreen.claimLegacyMigrationFromProfile(
        currentProfile.studentId, currentProfile.grade, claimButton
    );
    assert.equal(mismatchResult, false);
    assert.equal(claimCalls.length, beforeMismatch,
        "A challenge for another student must never reach the migration client.");
    assert.match(message.textContent, /چالش برای این دانش‌آموز/);
    assert.equal(claimButton.disabled, false);

    challengeInput.value = JSON.stringify({
        challengeId: "synthetic-challenge-valid",
        studentId: currentProfile.studentId,
        gradeId: currentProfile.grade
    });
    const statusLookupsBeforeSuccess = statusLookups;
    const success = await ProfileScreen.claimLegacyMigrationFromProfile(
        currentProfile.studentId, currentProfile.grade, claimButton
    );
    assert.equal(success, true);
    assert.equal(claimCalls.length, beforeMismatch + 1);
    assert.equal(claimCalls.at(-1).challengeId, "synthetic-challenge-valid");
    assert.equal(challengeInput.value, "",
        "The challenge input must be cleared only after verified storage succeeds.");
    assert.match(message.textContent, /اتصال امن انجام شد/);
    assert.equal(claimButton.disabled, false);
    assert.ok(refreshCalls >= 1,
        "Successful migration must refresh the selected profile entitlement.");
    assert.ok(statusLookups > statusLookupsBeforeSuccess,
        "Successful migration must refresh the displayed profile license status.");

    challengeInput.value = JSON.stringify({
        challengeId: "synthetic-challenge-not-stored",
        studentId: currentProfile.studentId,
        gradeId: currentProfile.grade
    });
    storedResult = { entitlementStored: false };
    const failure = await ProfileScreen.claimLegacyMigrationFromProfile(
        currentProfile.studentId, currentProfile.grade, claimButton
    );
    assert.equal(failure, false);
    assert.notEqual(challengeInput.value, "",
        "An unconfirmed migration must preserve the challenge input for diagnosis/retry.");
    assert.match(message.textContent, /ذخیره مجوز تأیید نشد/);
    assert.equal(claimButton.disabled, false);
    assert.equal(claimButton.textContent, "تکمیل اتصال امن این دستگاه");

    const priorCalls = claimCalls.length;
    currentProfile = { studentId: "different-profile", grade: "grade6" };
    const staleProfileResult = await ProfileScreen.claimLegacyMigrationFromProfile(
        "profile-student-1", "grade6", claimButton
    );
    assert.equal(staleProfileResult, false);
    assert.equal(claimCalls.length, priorCalls,
        "A stale profile button must not submit a challenge after profile switching.");
    assert.match(message.textContent, /پروفایل فعال تغییر کرده است/);

    console.log("Profile legacy migration handoff behavior test: PASS");
}

main().catch(error => {
    console.error("Profile legacy migration handoff behavior test: FAIL", error);
    process.exitCode = 1;
});
