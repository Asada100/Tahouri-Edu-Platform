"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../engine/ui/profileScreen.js"), "utf8");
assert.match(source, /id="legacyMigrationChallengeInput" type="text"/,
    "Student UI must accept a single transfer code, not a JSON challenge textarea.");
assert.doesNotMatch(source, /JSON\.parse\(String\(input && input\.value/,
    "Student UI must not parse administrator JSON.");
assert.match(source, /claimLegacyMigrationCode/,
    "The profile screen must use the one-time transfer-code client method.");
assert.match(source, /typeof window\.TahouriLicenseClient\.claimLegacyMigrationCode === "function"/,
    "The migration panel must be gated on the transfer-code client method.");

const elements = new Map();
function element(id, extra = {}) {
    const value = { id, textContent: "", value: "", hidden: false, disabled: false, ...extra };
    elements.set(id, value);
    return value;
}
element("profileLicenseStatus");
element("activateCurrentProfileBtn");
const migrationPanel = element("legacyDeviceMigrationPanel", { hidden: true });
const installationId = element("legacyMigrationInstallationId");
const message = element("legacyMigrationMessage");
const challengeInput = element("legacyMigrationChallengeInput");
const claimButton = element("claimLegacyMigrationBtn");

let currentProfile = { studentId: "profile-student-1", grade: "grade6" };
let licenseStatus = { status: "renewal_required", reason: "تکمیل مهاجرت مجوز قدیمی لازم است" };
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
    ActivationGate: { refreshActiveProfileEntitlement: async () => { refreshCalls += 1; return true; } },
    TahouriDeviceIdentity: {
        getOrCreate: async () => {
            identityCalls += 1;
            return { installationId: "synthetic-installation-123" };
        }
    },
    TahouriLicenseClient: {
        claimLegacyMigrationCode: async code => {
            if (!/^[a-f0-9]{64}$/i.test(code)) throw new Error("کد انتقال معتبر نیست.");
            claimCalls.push(code);
            return storedResult;
        }
    }
};
const document = { getElementById: id => elements.get(id) || null };
const context = {
    window, document, ProfileManager, ActivationGate: window.ActivationGate,
    console: { log() {}, warn() {}, error() {} }, Date, Intl, setTimeout, clearTimeout
};
vm.runInNewContext(source, context);
vm.runInNewContext("globalThis.__testProfileScreen = ProfileScreen;", context);
const ProfileScreen = context.__testProfileScreen;

async function main() {
    await ProfileScreen.refreshProfileLicenseStatus(currentProfile);
    assert.equal(migrationPanel.hidden, false);
    assert.equal(installationId.textContent, "synthetic-installation-123");
    assert.equal(identityCalls, 1);

    licenseStatus = { status: "renewal_required", reason: "تمدید عادی مجوز" };
    await ProfileScreen.refreshProfileLicenseStatus(currentProfile);
    assert.equal(migrationPanel.hidden, true, "Ordinary renewal must not expose migration UI.");

    licenseStatus = { status: "renewal_required", reason: "تکمیل مهاجرت مجوز قدیمی لازم است" };
    await ProfileScreen.refreshProfileLicenseStatus(currentProfile);
    assert.equal(migrationPanel.hidden, false);

    challengeInput.value = "invalid";
    const invalid = await ProfileScreen.claimLegacyMigrationFromProfile(currentProfile.studentId, currentProfile.grade, claimButton);
    assert.equal(invalid, false);
    assert.equal(claimCalls.length, 0);
    assert.match(message.textContent, /کد انتقال معتبر نیست/);

    challengeInput.value = "a".repeat(64);
    const statusBefore = statusLookups;
    const success = await ProfileScreen.claimLegacyMigrationFromProfile(currentProfile.studentId, currentProfile.grade, claimButton);
    assert.equal(success, true);
    assert.deepEqual(claimCalls, ["a".repeat(64)]);
    assert.equal(challengeInput.value, "");
    assert.match(message.textContent, /اتصال امن انجام شد/);
    assert.ok(refreshCalls >= 1);
    assert.ok(statusLookups > statusBefore);

    challengeInput.value = "b".repeat(64);
    storedResult = { entitlementStored: false };
    const failure = await ProfileScreen.claimLegacyMigrationFromProfile(currentProfile.studentId, currentProfile.grade, claimButton);
    assert.equal(failure, false);
    assert.notEqual(challengeInput.value, "", "Unconfirmed migration must preserve the code for retry.");
    assert.match(message.textContent, /ذخیره مجوز تأیید نشد/);
    assert.equal(claimButton.disabled, false);

    const callsBeforeSwitch = claimCalls.length;
    currentProfile = { studentId: "different-profile", grade: "grade6" };
    const stale = await ProfileScreen.claimLegacyMigrationFromProfile("profile-student-1", "grade6", claimButton);
    assert.equal(stale, false);
    assert.equal(claimCalls.length, callsBeforeSwitch);
    assert.match(message.textContent, /پروفایل فعال تغییر کرده است/);

    console.log("Profile legacy migration single-code handoff test: PASS");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
