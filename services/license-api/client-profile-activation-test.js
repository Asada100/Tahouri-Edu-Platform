"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "../../engine/core");
const managerSource = fs.readFileSync(path.join(root, "licenseManager.js"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "tahouriLicenseClient.js"), "utf8");
const profileScreenSource = fs.readFileSync(path.join(__dirname, "../../engine/ui/profileScreen.js"), "utf8");

const storageValues = new Map();
const localStorage = {
    getItem(key) { return storageValues.has(key) ? storageValues.get(key) : null; },
    setItem(key, value) { storageValues.set(key, String(value)); },
    removeItem(key) { storageValues.delete(key); }
};

const profile = {
    studentId: "e2e-student-profile-001",
    name: "پروفایل آزمایشی",
    grade: "grade6",
    gradeId: "grade6"
};

const entitlement = {
    claims: {
        licenseId: "lic_client_activation_e2e",
        productId: "tahouri-edu",
        academicYear: "1405",
        gradeScope: "grade6",
        studentId: profile.studentId,
        installationBinding: "e2e-installation-id",
        validFrom: new Date(Date.now() - 60000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        entitlementVersion: 1
    },
    signature: "test-signature"
};

let capturedRequest = null;
let capturedDeviceProof = null;
let storedEntitlement = null;
const migrationFingerprint = crypto.createHash("sha256").update(Buffer.from([1, 0, 1])).digest("hex");
const migrationEntitlement = {
    claims: {
        licenseId: "lic_legacy_migration_e2e",
        studentId: profile.studentId,
        gradeScope: "grade6",
        academicYear: "1405",
        installationBinding: "e2e-installation-id",
        deviceType: "computer",
        deviceKeyFingerprint: migrationFingerprint,
        deviceSlotId: "a".repeat(64),
        revocationEpoch: Date.now(),
        offlineLeaseExpiresAt: new Date(Date.now() + 86400000).toISOString()
    },
    signature: "signed-migration-entitlement"
};
const devicePublicKeyPem = "-----BEGIN PUBLIC KEY-----\\nTEST-DEVICE-PUBLIC-KEY\\n-----END PUBLIC KEY-----";

const window = {
    ProfileManager: { get: () => profile },
    TahouriServiceConfig: {
        enabled: true,
        mode: "production",
        apiBaseUrl: "https://tahouri-license-api.asadtahouri1986.workers.dev/api",
        requestTimeoutMs: 3000,
        productId: "tahouri-edu",
        entitlementVersion: 1
    },
    TahouriEntitlementVerifier: {
        verifyEnvelope: async envelope => ({
            valid: envelope === entitlement || envelope === migrationEntitlement,
            claims: envelope.claims
        })
    },
    TahouriEntitlementStore: {
        write: envelope => {
            storedEntitlement = envelope;
            return true;
        }
    },
    crypto: { randomUUID: () => "e2e-installation-id" },
    TahouriDeviceIdentity: {
        getOrCreate: async () => ({
            installationId: "e2e-installation-id",
            publicKey: devicePublicKeyPem
        }),
        sign: async message => {
            capturedDeviceProof = message;
            return { installationId: "e2e-installation-id", signature: "test-device-signature" };
        }
    }
};

const context = {
    window,
    navigator: { userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
    localStorage,
    fetch: async (url, options) => {
        capturedRequest = { url, options };
        return {
            ok: true,
            status: 200,
            json: async () => String(url).endsWith("/licenses/legacy-migration/claim")
                ? ({ ok: true, status: "migrated", entitlement: migrationEntitlement })
                : ({ valid: true, entitlement })
        };
    },
    AbortController,
    crypto: crypto.webcrypto,
    atob: globalThis.atob,
    TextEncoder,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    console: { log() {}, warn() {}, error() {} }
};

vm.runInNewContext(clientSource, context);
vm.runInNewContext(managerSource, context);

async function main() {
    const result = await window.LicenseManager.activateRemote(
        "THR-E2E-TEST-CODE",
        "grade6",
        profile.studentId
    );

    assert.equal(result.valid, true, "The active profile should complete remote activation.");
    assert.equal(result.remote, true);
    assert.equal(capturedRequest.url,
        "https://tahouri-license-api.asadtahouri1986.workers.dev/api/licenses/activate");
    assert.equal(capturedRequest.options.method, "POST");

    const payload = JSON.parse(capturedRequest.options.body);
    assert.equal(payload.studentId, profile.studentId,
        "The exact active profile ID must be sent to the activation API.");
    assert.equal(payload.gradeId, "grade6");
    assert.equal(payload.code, "THR-E2E-TEST-CODE");
    assert.equal(payload.installationId, "e2e-installation-id");
    assert.equal(payload.deviceType, "computer");
    assert.equal(payload.devicePublicKeyPem, devicePublicKeyPem);
    assert.equal(payload.deviceSignature, "test-device-signature");
    const signedProof = JSON.parse(capturedDeviceProof);
    assert.deepEqual(signedProof, {
        purpose: "tahouri-device-activation-v1",
        installationId: "e2e-installation-id",
        deviceType: "computer",
        studentId: profile.studentId,
        gradeId: "grade6",
        codeHash: crypto.createHash("sha256").update("THR-E2E-TEST-CODE").digest("hex")
    }, "The client must sign the exact canonical activation context.");

    assert.equal(storedEntitlement, entitlement,
        "Only the verifier-approved entitlement should be stored.");
    assert.equal(result.license.studentId, profile.studentId,
        "The returned entitlement must remain bound to the active profile.");

    const migrationChallenge = {
        challengeId: "mig-client-test", nonce: "b".repeat(64),
        expiresAt: new Date(Date.now() + 120000).toISOString(),
        licenseId: "lic_legacy_migration_e2e", studentId: profile.studentId,
        gradeId: "grade6", academicYear: "1405", deviceType: "computer",
        installationId: "e2e-installation-id"
    };
    const migrationResult = await window.TahouriLicenseClient.claimLegacyMigration(migrationChallenge);
    assert.equal(migrationResult.entitlementStored, true,
        "The migration client must verify and store the signed device lease.");
    assert.equal(storedEntitlement, migrationEntitlement);
    assert.equal(capturedRequest.url,
        "https://tahouri-license-api.asadtahouri1986.workers.dev/api/licenses/legacy-migration/claim");
    const migrationRequestBody = JSON.parse(capturedRequest.options.body);
    assert.equal(migrationRequestBody.challengeId, migrationChallenge.challengeId);
    assert.equal(migrationRequestBody.nonce, migrationChallenge.nonce);
    assert.equal(migrationRequestBody.devicePublicKeyPem, devicePublicKeyPem);
    assert.equal(migrationRequestBody.deviceSignature, "test-device-signature");
    const migrationSignedProof = JSON.parse(capturedDeviceProof);
    assert.deepEqual(migrationSignedProof, {
        purpose: "tahouri-legacy-device-migration-v1",
        challengeId: migrationChallenge.challengeId,
        nonce: migrationChallenge.nonce,
        licenseId: migrationChallenge.licenseId,
        studentId: migrationChallenge.studentId,
        gradeId: migrationChallenge.gradeId,
        academicYear: migrationChallenge.academicYear,
        deviceType: "computer",
        installationId: "e2e-installation-id",
        keyFingerprint: migrationFingerprint,
        expiresAt: migrationChallenge.expiresAt
    }, "The migration client must sign the exact server challenge context.");

    assert.match(profileScreenSource, /legacyDeviceMigrationPanel/,
        "The profile screen must expose the legacy migration handoff only in its migration state.");
    assert.match(profileScreenSource, /claimLegacyMigrationFromProfile/,
        "The profile screen must submit the challenge through the device-bound client method.");

    console.log("Client-to-profile activation + legacy migration flow test: PASS");
}

main().catch(error => {
    console.error("Client-to-profile activation flow test: FAIL", error);
    process.exitCode = 1;
});
