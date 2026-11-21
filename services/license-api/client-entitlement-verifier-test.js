"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const verifierSource = fs.readFileSync(
    path.resolve(__dirname, "../../engine/core/tahouriEntitlementVerifier.js"),
    "utf8"
);
const configSource = fs.readFileSync(
    path.resolve(__dirname, "../../engine/core/tahouriServiceConfig.js"),
    "utf8"
);

const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = pair.publicKey.export({ type: "spki", format: "pem" });
const claims = {
    licenseId: "lic_public_key_bootstrap_test",
    productId: "tahouri-edu",
    academicYear: "1405",
    gradeScope: "grade6",
    studentId: "student-public-key-test",
    installationBinding: "installation-public-key-test",
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    entitlementVersion: 1
};
function signedEnvelope(value) {
    const signature = crypto.sign(
        "RSA-SHA256",
        Buffer.from(JSON.stringify(value)),
        pair.privateKey
    ).toString("base64");
    return { claims: value, signature };
}
const envelope = signedEnvelope(claims);

function createVerifierContext(config, fetchImpl) {
    const window = { TahouriServiceConfig: config, crypto: crypto.webcrypto };
    const context = {
        window,
        crypto: crypto.webcrypto,
        fetch: fetchImpl,
        atob,
        TextEncoder,
        Uint8Array,
        Date,
        console: { log() {}, error() {} }
    };
    vm.runInNewContext(verifierSource, context);
    return window.TahouriEntitlementVerifier;
}

async function main() {
    const configuredWindow = {};
    vm.runInNewContext(configSource, { window: configuredWindow, console: { log() {} } });
    assert.equal(configuredWindow.TahouriServiceConfig.mode, "production");
    assert.equal(
        configuredWindow.TahouriServiceConfig.apiBaseUrl,
        "https://tahouri-license-api.asadtahouri1986.workers.dev/api"
    );

    let requests = [];
    const productionVerifier = createVerifierContext({
        mode: "production",
        apiBaseUrl: "https://tahouri-license-api.asadtahouri1986.workers.dev/api",
        publicKeyPem: "",
        productId: "tahouri-edu",
        entitlementVersion: 1
    }, async (url, options) => {
        requests.push({ url, options });
        return { ok: true, json: async () => ({ publicKeyPem: publicPem }) };
    });

    const productionResult = await productionVerifier.verifyEnvelope(envelope);
    assert.equal(productionResult.valid, true, "A correctly signed production entitlement must verify.");
    assert.equal(requests.length, 1, "Production must retrieve its public key when no static key is pinned.");
    assert.equal(
        requests[0].url,
        "https://tahouri-license-api.asadtahouri1986.workers.dev/api/public-key"
    );
    assert.equal(requests[0].options.method, "GET");
    assert.equal(requests[0].options.cache, "no-store");
    assert.equal(requests[0].options.credentials, "omit");
    assert.equal(requests[0].options.redirect, "error");

    const invalidClaimCases = [
        { label: "missing grade", mutate: value => { value.gradeScope = ""; } },
        { label: "missing student", mutate: value => { value.studentId = ""; } },
        { label: "missing installation", mutate: value => { delete value.installationBinding; } },
        { label: "missing academic year", mutate: value => { value.academicYear = ""; } },
        { label: "missing license ID", mutate: value => { value.licenseId = ""; } },
        { label: "invalid date range", mutate: value => { value.validFrom = new Date(Date.now() + 86400000).toISOString(); value.validUntil = new Date(Date.now() - 60000).toISOString(); } }
    ];
    for (const scenario of invalidClaimCases) {
        const invalidClaims = { ...claims };
        scenario.mutate(invalidClaims);
        const invalidResult = await productionVerifier.verifyEnvelope(signedEnvelope(invalidClaims));
        assert.equal(invalidResult.valid, false,
            "A correctly signed entitlement with " + scenario.label + " must be rejected.");
    }

    const leasedClaims = {
        ...claims,
        deviceSlotId: "a".repeat(64),
        revocationEpoch: Date.now() - 1000,
        offlineLeaseExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
    assert.equal(
        (await pinnedVerifier.verifyEnvelope(signedEnvelope(leasedClaims))).valid,
        true,
        "A correctly signed device entitlement with a valid bounded offline lease must verify."
    );
    const expiredLeaseClaims = {
        ...leasedClaims,
        offlineLeaseExpiresAt: new Date(Date.now() - 1000).toISOString()
    };
    assert.equal(
        (await pinnedVerifier.verifyEnvelope(signedEnvelope(expiredLeaseClaims))).valid,
        false,
        "An entitlement with an expired offline lease must be rejected."
    );
    const malformedSlotClaims = { ...leasedClaims, deviceSlotId: "not-a-slot-id" };
    assert.equal(
        (await pinnedVerifier.verifyEnvelope(signedEnvelope(malformedSlotClaims))).valid,
        false,
        "A leased entitlement without a valid slot identity must be rejected."
    );

    let insecureFetchCount = 0;
    const insecureVerifier = createVerifierContext({
        mode: "production",
        apiBaseUrl: "http://localhost:8787/api",
        publicKeyPem: "",
        productId: "tahouri-edu",
        entitlementVersion: 1
    }, async () => {
        insecureFetchCount++;
        return { ok: true, json: async () => ({ publicKeyPem: publicPem }) };
    });
    const insecureResult = await insecureVerifier.verifyEnvelope(envelope);
    assert.equal(insecureResult.valid, false, "Production must reject an HTTP key endpoint.");
    assert.equal(insecureFetchCount, 0, "Production must not contact an insecure key endpoint.");

    let pinnedFetchCount = 0;
    const pinnedVerifier = createVerifierContext({
        mode: "production",
        apiBaseUrl: "https://unused.example/api",
        publicKeyPem: publicPem,
        productId: "tahouri-edu",
        entitlementVersion: 1
    }, async () => {
        pinnedFetchCount++;
        throw new Error("Pinned-key mode must not fetch.");
    });
    assert.equal((await pinnedVerifier.verifyEnvelope(envelope)).valid, true);
    assert.equal(pinnedFetchCount, 0, "A configured public key must be used without a network request.");

    const tamperedEnvelope = {
        claims: { ...claims, studentId: "different-student" },
        signature: envelope.signature
    };
    const tamperedVerifier = createVerifierContext({
        mode: "production",
        apiBaseUrl: "https://tahouri-license-api.asadtahouri1986.workers.dev/api",
        publicKeyPem: publicPem,
        productId: "tahouri-edu",
        entitlementVersion: 1
    }, async () => {
        throw new Error("Pinned-key mode must not fetch.");
    });
    assert.equal(
        (await tamperedVerifier.verifyEnvelope(tamperedEnvelope)).valid,
        false,
        "A changed student binding must invalidate the entitlement signature."
    );


    // Characterization guard for the currently confirmed revocation gap.
    // A legacy signed entitlement without device-slot/revocation metadata is
    // still accepted by the offline verifier; startup selects it locally.
    const managerSource = fs.readFileSync(
        path.resolve(__dirname, "../../engine/core/licenseManager.js"),
        "utf8"
    );
    const licenseClientSource = fs.readFileSync(
        path.resolve(__dirname, "../../engine/core/tahouriLicenseClient.js"),
        "utf8"
    );
    const legacyDeviceClaims = { ...claims };
    delete legacyDeviceClaims.deviceSlotId;
    delete legacyDeviceClaims.deviceKeyFingerprint;
    delete legacyDeviceClaims.revocationEpoch;
    const legacyDeviceResult = await pinnedVerifier.verifyEnvelope(signedEnvelope(legacyDeviceClaims));
    assert.equal(
        legacyDeviceResult.valid,
        true,
        "Characterization: offline signature verification currently accepts an entitlement without device revocation metadata."
    );

    const startupStart = managerSource.indexOf("async function initializeRemoteEntitlement()");
    const startupEnd = managerSource.indexOf("async function getProfileEntitlementStatus", startupStart);
    const startupSource = managerSource.slice(startupStart, startupEnd);
    assert(startupStart >= 0 && startupEnd > startupStart);
    assert(
        startupSource.includes("window.TahouriEntitlementVerifier.verifyEnvelope(envelope)") &&
        startupSource.includes("verifiedRemoteEntitlement = claims") &&
        startupSource.includes("TahouriLicenseClient.status") &&
        startupSource.includes("offlineLeaseExpiresAt") &&
        startupSource.includes("TahouriEntitlementStore.write"),
        "Startup must renew an expired device lease online and persist the newly signed lease before selecting it."
    );

    const statusStart = licenseClientSource.indexOf("async function status(licenseId)");
    const statusEnd = licenseClientSource.indexOf("window.TahouriLicenseClient", statusStart);
    const statusSource = licenseClientSource.slice(statusStart, statusEnd);
    assert(statusStart >= 0 && statusEnd > statusStart);
    assert(
        statusSource.includes('return request("/licenses/device-status"') &&
        statusSource.includes("deviceSignature") &&
        statusSource.includes("keyFingerprint") &&
        statusSource.includes("tahouri-device-bound-license-status-v1"),
        "Online status requests must prove possession of the private key bound to the exact device slot."
    );

    console.log("Production entitlement public-key verification test: PASS");
}

main().catch(error => {
    console.error("Production entitlement public-key verification test: FAIL", error);
    process.exitCode = 1;
});
