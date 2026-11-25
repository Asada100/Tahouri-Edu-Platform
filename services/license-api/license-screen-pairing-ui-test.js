"use strict";

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const sourcePath = path.join(__dirname, "../../engine/ui/licenseScreen.js");
const source = fs.readFileSync(sourcePath, "utf8");
const start = source.indexOf("function renderAddForm(");
assert.notEqual(start, -1, "renderAddForm must exist");

const activationMarker = source.indexOf("// Activation", start);
assert.notEqual(activationMarker, -1, "renderAddForm activation binding section must exist");
const formSection = source.slice(start, activationMarker);

assert.match(
    formSection,
    /getElementById\(["']tahouriPairingPollButton["']\)/,
    "pairing result button must be located inside renderAddForm"
);
assert.match(
    formSection,
    /pairingPollButton\.addEventListener\(["']click["'],\s*pollPairingRequest\)/,
    "pairing result button must invoke pollPairingRequest"
);
assert.match(
    formSection,
    /if\s*\(pendingPairing\)\s*\{[\s\S]*?pairingPollButton\.style\.display\s*=\s*["']block["']/,
    "reopening the form in the same page session must reveal an existing pending poll"
);

console.log("PASS: pairing result button is bound inside the form");
assert.match(formSection, /getElementById\(["']tahouriPairingRecoverButton["']\)/,
    "the device recovery button must be present in the license form");
assert.match(formSection, /pairingRecoverButton\.addEventListener\(["']click["'],\s*recoverApprovedPairingEntitlement\)/,
    "the recovery button must invoke the signed recovery flow");
assert.match(source, /async function recoverApprovedPairingEntitlement\(\)[\s\S]*?recoverApprovedPairingEntitlement\(\)/,
    "the UI must implement an approved-entitlement recovery action");
console.log("PASS: existing in-memory pairing request remains pollable after reopening the form");
console.log("PASS: approved entitlement recovery control is rendered and bound");

function extractFunction(name, nextName) {
    const start = source.indexOf("async function " + name + "(");
    assert.notEqual(start, -1, name + " must exist");
    const end = source.indexOf("async function " + nextName + "(", start);
    assert.notEqual(end, -1, "next function after " + name + " must exist");
    return source.slice(start, end).trim();
}

async function runPairingUiInteractionTests() {
    const elements = {
        tahouriActivationCode: { value: "TEST-ACTIVATION-CODE" },
        tahouriLicenseGradeSelect: { value: "grade6" },
        tahouriPairingRequestButton: { disabled: false },
        tahouriPairingPollButton: { disabled: false, style: {} },
        tahouriPairingRecoverButton: { disabled: false, style: {} }
    };
    const messages = [];
    const alerts = [];
    let storedEntitlement = null;
    let initialized = 0;
    let statusResponse = null;
    let pairingSequence = 0;
    const profile = { studentId: "student-ui", grade: "grade6" };
    const identity = { installationId: "install-ui-phone" };
    const entitlement = { payload: "signed-entitlement-for-ui-phone" };
    const client = {
        async requestPairing(input) {
            assert.deepEqual(input, {
                code: "TEST-ACTIVATION-CODE", studentId: "student-ui", gradeId: "grade6"
            });
            pairingSequence += 1;
            return { pairingId: "pairing-ui-" + pairingSequence, token: "opaque-ui-token" };
        },
        async pairingStatus(pairingId, token) {
            assert.equal(pairingId, "pairing-ui-1");
            assert.equal(token, "opaque-ui-token");
            return statusResponse;
        },
        async recoverApprovedPairingEntitlement() {
            return { status: "approved", entitlement };
        },
        async requestPairingChallenge(pairingId, licenseId) {
            assert.equal(pairingId, "pairing-ui-1");
            assert.equal(licenseId, "license-ui");
            return { challengeId: "challenge-ui" };
        },
        async decidePairing(challenge, decision) {
            assert.deepEqual(challenge, { challengeId: "challenge-ui" });
            assert.equal(decision, "approved");
            return { status: "approved" };
        }
    };
    const windowStub = {
        TahouriLicenseClient: client,
        TahouriEntitlementVerifier: {
            async verifyEnvelope(value) {
                return value === entitlement
                    ? { valid: true, claims: {
                        installationBinding: identity.installationId,
                        deviceType: "phone"
                    } }
                    : { valid: false, claims: null };
            }
        },
        TahouriDeviceIdentity: { async getOrCreate() { return identity; } },
        TahouriEntitlementStore: {
            write(value) { storedEntitlement = value; return true; }
        },
        confirm() { return true; },
        prompt() { return "pairing-ui-1"; },
        alert(message) { alerts.push(message); }
    };
    const dependencies = {
        getActiveProfile: () => profile,
        document: { getElementById: id => elements[id] || null },
        window: windowStub,
        navigator: { userAgent: "Android Mobile" },
        TahouriLicenseClient: client,
        LicenseManager: { async initializeRemoteEntitlement() { initialized += 1; } },
        showManagementError: message => messages.push({ message, success: false }),
        pairingMessage: (message, success) => messages.push({ message, success }),
        renderList() {},
        getActiveSignedLicenseClaims: async () => ({ licenseId: "license-ui" }),
        loadPendingPairings: async () => { initialized += 10; }
    };
    const begin = extractFunction("beginPairingRequest", "pollPairingRequest");
    const poll = extractFunction("pollPairingRequest", "recoverApprovedPairingEntitlement");
    const recover = extractFunction("recoverApprovedPairingEntitlement", "loadBoundDeviceSlots");
    const decide = extractFunction("decidePairingFromPrimary", "loadPendingPairings");
    const factory = new Function(
        "getActiveProfile", "document", "window", "navigator", "TahouriLicenseClient",
        "LicenseManager", "showManagementError", "pairingMessage", "renderList",
        "getActiveSignedLicenseClaims", "loadPendingPairings",
        "let pendingPairing = null; return {" +
            "begin: " + begin + "," +
            "poll: " + poll + "," +
            "recover: " + recover + "," +
            "decide: " + decide + "," +
            "getPending: () => pendingPairing" +
        "};"
    );
    const ui = factory(
        dependencies.getActiveProfile, dependencies.document, dependencies.window,
        dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
        dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
        dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
    );

    await ui.begin();
    assert.deepEqual(ui.getPending(), { pairingId: "pairing-ui-1", token: "opaque-ui-token" });
    assert.equal(elements.tahouriPairingPollButton.style.display, "block");
    assert.equal(elements.tahouriPairingRequestButton.disabled, false);
    assert.equal(messages.at(-1).success, true,
        "requesting a replacement device must display a successful pending status");

    statusResponse = { status: "approved", entitlement };
    await ui.poll();
    assert.equal(storedEntitlement, entitlement,
        "the UI must store the approved signed entitlement after verifying its device binding");
    assert.equal(initialized, 1, "successful polling must initialize the remote entitlement");
    assert.equal(ui.getPending(), null, "successful polling must clear the pending request");
    assert.equal(messages.at(-1).success, true);

    storedEntitlement = null;
    await ui.recover();
    assert.equal(storedEntitlement, entitlement,
        "the recovery button must store the approved entitlement returned for this device");
    assert.equal(initialized, 2, "successful recovery must initialize the remote entitlement");
    assert.equal(elements.tahouriPairingRecoverButton.disabled, false);

    await ui.decide("approved", "pairing-ui-1");
    assert.equal(initialized, 12,
        "approving a request on the primary device must refresh the pending request list");
    assert(alerts.some(message => message.includes("تأیید")),
        "the primary device must report the approval result to the user");

    console.log("PASS: pairing request, approved polling, entitlement recovery, and primary-device approval interactions");
}

runPairingUiInteractionTests().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
