"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(
    path.join(root, "engine/core/licenseManager.js"),
    "utf8"
);

function extractBetween(startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    assert.notEqual(start, -1, "Missing source marker: " + startMarker);
    assert.notEqual(end, -1, "Missing source marker: " + endMarker);
    return source.slice(start, end).trim();
}

const initializeSource = extractBetween(
    "async function initializeRemoteEntitlement()",
    "function hasValidRemoteEntitlement("
);
const refreshSource = extractBetween(
    "async function refreshRemoteLicenseStatus()",
    "function getActiveProfile("
);

let activeStudentId = "student-A";
let installationId = "device-A";
let verifiedRemoteEntitlement = null;
const statusCalls = [];
const envelopes = [
    { id: "wrong-student", claims: { studentId: "student-B", installationBinding: "device-A" } },
    { id: "wrong-device", claims: { studentId: "student-A", installationBinding: "device-B" } },
    { id: "correct", claims: {
        licenseId: "license-A",
        studentId: "student-A",
        installationBinding: "device-A",
        productId: "tahouri-edu",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z"
    } }
];

const context = {
    console: { log() {}, warn() {}, error() {} },
    window: {
        TahouriEntitlementStore: { readAll: () => envelopes },
        TahouriEntitlementVerifier: {
            verifyEnvelope: async envelope => ({ valid: true, claims: envelope.claims })
        },
        TahouriLicenseClient: {
            status: async (...args) => {
                statusCalls.push(args);
                return { valid: true, status: "active" };
            }
        }
    },
    getActiveStudentId: () => activeStudentId,
    getOrCreateInstallationId: () => installationId
};

vm.createContext(context);
vm.runInContext(
    "let verifiedRemoteEntitlement = null;\n" +
    initializeSource + "\n" +
    refreshSource + "\n" +
    "globalThis.__getEntitlement = () => verifiedRemoteEntitlement;\n" +
    "globalThis.__initialize = initializeRemoteEntitlement;\n" +
    "globalThis.__refresh = refreshRemoteLicenseStatus;",
    context
);

async function main() {
    assert.equal(await context.__initialize(), true);
    assert.equal(context.__getEntitlement().licenseId, "license-A");
    assert.equal(context.__getEntitlement().studentId, "student-A");

    const valid = await context.__refresh();
    assert.equal(valid.valid, true);
    assert.deepEqual(Array.from(statusCalls[0]), ["license-A", "student-A", "device-A"]);

    activeStudentId = "student-B";
    const wrongProfile = await context.__refresh();
    assert.equal(wrongProfile.reason, "not_active_student");
    assert.equal(statusCalls.length, 1, "A different active student must not query another student's license.");

    activeStudentId = "student-A";
    installationId = "device-B";
    const wrongDevice = await context.__refresh();
    assert.equal(wrongDevice.reason, "installation_binding_mismatch");
    assert.equal(statusCalls.length, 1, "A different installation must not query this entitlement.");

    console.log("Tahouri active-student entitlement context test: PASS");
}

main().catch(error => {
    console.error("Tahouri active-student entitlement context test: FAIL");
    console.error(error);
    process.exitCode = 1;
});
