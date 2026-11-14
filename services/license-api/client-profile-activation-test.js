"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../../engine/core");
const managerSource = fs.readFileSync(path.join(root, "licenseManager.js"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "tahouriLicenseClient.js"), "utf8");

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
        validFrom: new Date(Date.now() - 60000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        entitlementVersion: 1
    },
    signature: "test-signature"
};

let capturedRequest = null;
let storedEntitlement = null;

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
            valid: envelope === entitlement,
            claims: envelope.claims
        })
    },
    TahouriEntitlementStore: {
        write: envelope => {
            storedEntitlement = envelope;
            return true;
        }
    },
    crypto: { randomUUID: () => "e2e-installation-id" }
};

const context = {
    window,
    localStorage,
    fetch: async (url, options) => {
        capturedRequest = { url, options };
        return {
            ok: true,
            status: 200,
            json: async () => ({ valid: true, entitlement })
        };
    },
    AbortController,
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

    assert.equal(storedEntitlement, entitlement,
        "Only the verifier-approved entitlement should be stored.");
    assert.equal(result.license.studentId, profile.studentId,
        "The returned entitlement must remain bound to the active profile.");

    console.log("Client-to-profile activation flow test: PASS");
}

main().catch(error => {
    console.error("Client-to-profile activation flow test: FAIL", error);
    process.exitCode = 1;
});
