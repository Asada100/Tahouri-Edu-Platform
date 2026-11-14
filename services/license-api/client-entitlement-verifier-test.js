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
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    entitlementVersion: 1
};
const signature = crypto.sign(
    "RSA-SHA256",
    Buffer.from(JSON.stringify(claims)),
    pair.privateKey
).toString("base64");
const envelope = { claims, signature };

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
        signature
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

    console.log("Production entitlement public-key verification test: PASS");
}

main().catch(error => {
    console.error("Production entitlement public-key verification test: FAIL", error);
    process.exitCode = 1;
});
