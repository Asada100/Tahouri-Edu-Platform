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
    let storeWriteCalls = 0;
    let initialized = 0;
    let statusResponse = null;
    let statusCalls = 0;
    let pairingSequence = 0;
    let verificationValid = true;
    let claimBindingOverride = null;
    let claimDeviceType = "phone";
    let storeAccepts = true;
    const profile = { studentId: "student-ui", grade: "grade6" };
    const identity = { installationId: "install-ui-phone" };
    const entitlement = { payload: "signed-entitlement-for-ui-phone" };
    let recoveryResponse = { status: "approved", entitlement };
    const client = {
        async requestPairing(input) {
            assert.deepEqual(input, {
                code: "TEST-ACTIVATION-CODE", studentId: "student-ui", gradeId: "grade6"
            });
            pairingSequence += 1;
            return { pairingId: "pairing-ui-" + pairingSequence, token: "opaque-ui-token" };
        },
        async pairingStatus(pairingId, token) {
            statusCalls += 1;
            assert.match(pairingId, /^pairing-ui-/);
            assert.equal(token, "opaque-ui-token");
            return statusResponse;
        },
        async recoverApprovedPairingEntitlement() {
            return recoveryResponse;
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
        LicenseManager: null,
        TahouriEntitlementVerifier: {
            async verifyEnvelope(value) {
                return value === entitlement && verificationValid
                    ? { valid: true, claims: {
                        installationBinding: claimBindingOverride || identity.installationId,
                        deviceType: claimDeviceType
                    } }
                    : { valid: false, claims: null };
            }
        },
        TahouriDeviceIdentity: { async getOrCreate() { return identity; } },
        TahouriEntitlementStore: {
            write(value) { storeWriteCalls += 1; if (!storeAccepts) return false; storedEntitlement = value; return true; }
        },
        confirm() { return true; },
        prompt() { return "pairing-ui-1"; },
        alert(message) { alerts.push(message); }
    };
    windowStub.LicenseManager = { async initializeRemoteEntitlement() { initialized += 1; } };
    const dependencies = {
        getActiveProfile: () => profile,
        document: { getElementById: id => elements[id] || null },
        window: windowStub,
        navigator: { userAgent: "Android Mobile" },
        TahouriLicenseClient: client,
        LicenseManager: windowStub.LicenseManager,
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

    const beforeReload = factory(
        dependencies.getActiveProfile, dependencies.document, dependencies.window,
        dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
        dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
        dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
    );
    await beforeReload.begin();
    const pendingBeforeReload = beforeReload.getPending();
    assert(pendingBeforeReload && pendingBeforeReload.token,
        "the active page must retain the opaque pairing token in runtime memory");
    assert.doesNotMatch(begin + poll, /\b(?:localStorage|sessionStorage)\b/,
        "pairing bearer tokens must not be persisted in browser storage");

    const statusCallsBeforeReload = statusCalls;
    const afterReload = factory(
        dependencies.getActiveProfile, dependencies.document, dependencies.window,
        dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
        dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
        dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
    );
    assert.equal(afterReload.getPending(), null,
        "a fresh page context must not inherit the previous page's in-memory pairing token");
    await afterReload.poll();
    assert.equal(statusCalls, statusCallsBeforeReload,
        "the reloaded page must not poll using a missing or reconstructed bearer token");
    await afterReload.begin();
    assert.notEqual(afterReload.getPending().pairingId, pendingBeforeReload.pairingId,
        "the user can create a fresh pairing request after reload");
    console.log("PASS: reload drops the in-memory pairing secret, performs no unauthenticated poll, and permits a fresh request");

    for (const terminalStatus of ["rejected", "expired"]) {
        const terminalUi = factory(
            dependencies.getActiveProfile, dependencies.document, dependencies.window,
            dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
            dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
            dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
        );
        await terminalUi.begin();
        statusResponse = { status: terminalStatus };
        await terminalUi.poll();
        assert.equal(terminalUi.getPending(), null,
            terminalStatus + " pairing must clear the unusable pending request");
        assert.equal(messages.at(-1).success, false,
            terminalStatus + " pairing must show a failure message");
    }

    const invalidUi = factory(
        dependencies.getActiveProfile, dependencies.document, dependencies.window,
        dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
        dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
        dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
    );
    await invalidUi.begin();
    storedEntitlement = null;
    verificationValid = false;
    statusResponse = { status: "approved", entitlement };
    await invalidUi.poll();
    assert.equal(storedEntitlement, null,
        "an entitlement that fails signature verification must never be stored");
    assert(invalidUi.getPending(),
        "a verification failure must leave the request available for a safe retry");
    verificationValid = true;

    const storeFailureUi = factory(
        dependencies.getActiveProfile, dependencies.document, dependencies.window,
        dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
        dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
        dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
    );
    await storeFailureUi.begin();
    storeAccepts = false;
    await storeFailureUi.poll();
    assert.equal(storedEntitlement, null,
        "a failed secure-store write must not report a saved entitlement");
    assert(storeFailureUi.getPending(),
        "a failed secure-store write must retain the request for retry");
    storeAccepts = true;

    for (const mismatch of [
        { binding: "install-another-device", deviceType: "phone", label: "different installation" },
        { binding: identity.installationId, deviceType: "computer", label: "different device type" }
    ]) {
        const mismatchUi = factory(
            dependencies.getActiveProfile, dependencies.document, dependencies.window,
            dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
            dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
            dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
        );
        await mismatchUi.begin();
        storedEntitlement = null;
        const writesBeforeMismatch = storeWriteCalls;
        const initializationsBeforeMismatch = initialized;
        claimBindingOverride = mismatch.binding;
        claimDeviceType = mismatch.deviceType;
        await mismatchUi.poll();
        assert.equal(storedEntitlement, null,
            "entitlement bound to a " + mismatch.label + " must not be stored");
        assert.equal(storeWriteCalls, writesBeforeMismatch,
            "identity mismatch must be rejected before the secure store is called");
        assert.equal(initialized, initializationsBeforeMismatch,
            "identity mismatch must never initialize the remote entitlement");
        assert(mismatchUi.getPending(),
            "identity mismatch must leave the request available for safe retry");
    }
    for (const mismatch of [
        { binding: "install-another-device", deviceType: "phone", label: "different installation" },
        { binding: identity.installationId, deviceType: "computer", label: "different device type" }
    ]) {
        const recoveryUi = factory(
            dependencies.getActiveProfile, dependencies.document, dependencies.window,
            dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
            dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
            dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
        );
        storedEntitlement = null;
        const writesBeforeRecovery = storeWriteCalls;
        const initializationsBeforeRecovery = initialized;
        claimBindingOverride = mismatch.binding;
        claimDeviceType = mismatch.deviceType;
        await recoveryUi.recover();
        assert.equal(storedEntitlement, null,
            "recovery must reject an entitlement bound to a " + mismatch.label);
        assert.equal(storeWriteCalls, writesBeforeRecovery,
            "recovery identity mismatch must be rejected before secure storage");
        assert.equal(initialized, initializationsBeforeRecovery,
            "recovery identity mismatch must not initialize the remote entitlement");
        assert.equal(elements.tahouriPairingRecoverButton.disabled, false,
            "recovery control must be re-enabled after identity mismatch");
    }
    claimBindingOverride = null;
    claimDeviceType = "phone";

    for (const failure of [
        {
            label: "invalid signature",
            response: { status: "approved", entitlement },
            validSignature: false
        },
        {
            label: "not-yet-approved status",
            response: { status: "pending", entitlement },
            validSignature: true
        },
        {
            label: "approved status without an entitlement",
            response: { status: "approved", entitlement: null },
            validSignature: true
        }
    ]) {
        const failedRecoveryUi = factory(
            dependencies.getActiveProfile, dependencies.document, dependencies.window,
            dependencies.navigator, dependencies.TahouriLicenseClient, dependencies.LicenseManager,
            dependencies.showManagementError, dependencies.pairingMessage, dependencies.renderList,
            dependencies.getActiveSignedLicenseClaims, dependencies.loadPendingPairings
        );
        await failedRecoveryUi.begin();
        const pendingBeforeFailure = failedRecoveryUi.getPending();
        storedEntitlement = null;
        recoveryResponse = failure.response;
        verificationValid = failure.validSignature;
        const writesBeforeFailure = storeWriteCalls;
        const initializationsBeforeFailure = initialized;
        const messageCountBeforeFailure = messages.length;
        elements.tahouriPairingRecoverButton.disabled = false;

        await failedRecoveryUi.recover();

        assert.equal(storedEntitlement, null,
            failure.label + " must never store an entitlement");
        assert.equal(storeWriteCalls, writesBeforeFailure,
            failure.label + " must be rejected before secure-store write");
        assert.equal(initialized, initializationsBeforeFailure,
            failure.label + " must never initialize the remote entitlement");
        assert.equal(messages.length, messageCountBeforeFailure + 1,
            failure.label + " must display a failure message");
        assert.equal(messages.at(-1).success, false,
            failure.label + " must report recovery failure");
        assert.equal(elements.tahouriPairingRecoverButton.disabled, false,
            failure.label + " must re-enable the recovery control");
        assert.deepEqual(failedRecoveryUi.getPending(), pendingBeforeFailure,
            failure.label + " must preserve the existing pending pairing request");
    }
    verificationValid = true;
    recoveryResponse = { status: "approved", entitlement };
    console.log("PASS: recovery rejects invalid signatures, non-approved status, and missing entitlements without storage, initialization, or losing pending requests");
    console.log("PASS: recovery rejects another installation or device type before storage and initialization");
    console.log("PASS: entitlements bound to another installation or device type are rejected before secure storage");
    console.log("PASS: rejected and expired requests terminate; invalid entitlements and failed secure-store writes are never accepted");
}

runPairingUiInteractionTests().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
