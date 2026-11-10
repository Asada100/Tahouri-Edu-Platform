"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto, generateKeyPairSync, sign } = require("node:crypto");

const root = path.resolve(__dirname, "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const storeSource = read("engine/core/tahouriEntitlementStore.js");
const verifierSource = read("engine/core/tahouriEntitlementVerifier.js");
const managerSource = read("engine/core/licenseManager.js");

function extractFunction(source, name) {
    const marker = "async function " + name + "(";
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, "Missing source function: " + name);
    const brace = source.indexOf("{", start);
    let depth = 0, quote = null, escaped = false;
    for (let i = brace; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === "\\") escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
        if (ch === "{") depth++;
        if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error("Unclosed function: " + name);
}

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
});
const local = new Map();
const windowObject = {
    crypto: webcrypto,
    TahouriServiceConfig: {
        mode: "production",
        productId: "tahouri-edu",
        entitlementVersion: 1,
        publicKeyPem: publicKey
    }
};
const context = {
    console: { log() {}, warn() {}, error() {} },
    Date, JSON, Map, TextEncoder, crypto: webcrypto,
    atob: value => Buffer.from(value, "base64").toString("binary"),
    localStorage: {
        getItem(key) { return local.has(key) ? local.get(key) : null; },
        setItem(key, value) { local.set(key, String(value)); },
        removeItem(key) { local.delete(key); }
    },
    window: windowObject,
    fetch: async () => { throw new Error("Network must not be used in this isolated test."); },
    activeStudentId: "student-A",
    installationId: "device-A",
    getActiveStudentId() { return context.activeStudentId; },
    getOrCreateInstallationId() { return context.installationId; },
    verifiedRemoteEntitlement: null
};
vm.createContext(context);
vm.runInContext(storeSource, context);
vm.runInContext(verifierSource, context);

const initialize = extractFunction(managerSource, "initializeRemoteEntitlement");
vm.runInContext(initialize + "\nglobalThis.__initialize = initializeRemoteEntitlement;", context);

function makeEnvelope(studentId, installationBinding, licenseId) {
    const claims = {
        productId: "tahouri-edu",
        entitlementVersion: 1,
        licenseId,
        studentId,
        gradeScope: "grade6",
        academicYear: "1405-1406",
        installationBinding,
        validFrom: new Date(Date.now() - 60_000).toISOString(),
        validUntil: new Date(Date.now() + 86_400_000).toISOString()
    };
    const signature = sign("RSA-SHA256", Buffer.from(JSON.stringify(claims)), privateKey).toString("base64");
    return { claims, signature };
}

(async () => {
    const original = makeEnvelope("student-A", "device-A", "license-A");
    assert.equal((await windowObject.TahouriEntitlementVerifier.verifyEnvelope(original)).valid, true,
        "A correctly signed entitlement must verify.");

    const tamperedStudent = structuredClone(original);
    tamperedStudent.claims.studentId = "student-B";
    assert.equal((await windowObject.TahouriEntitlementVerifier.verifyEnvelope(tamperedStudent)).valid, false,
        "Changing studentId without re-signing must invalidate the signature.");

    const tamperedLicense = structuredClone(original);
    tamperedLicense.claims.licenseId = "license-B";
    assert.equal((await windowObject.TahouriEntitlementVerifier.verifyEnvelope(tamperedLicense)).valid, false,
        "Changing licenseId without re-signing must invalidate the signature.");

    const wrongDevice = makeEnvelope("student-A", "device-B", "license-A-device-B");
    assert.equal(windowObject.TahouriEntitlementStore.write(wrongDevice), true);
    assert.equal(await context.__initialize(), false,
        "A correctly signed entitlement bound to another device must be rejected.");

    assert.equal(windowObject.TahouriEntitlementStore.write(original), true);
    context.installationId = "device-A";
    context.activeStudentId = "student-A";
    assert.equal(await context.__initialize(), true);
    assert.equal(context.verifiedRemoteEntitlement.studentId, "student-A");

    // Demonstrate the current trust boundary: active student identity is sourced
    // from mutable local profile state, not an authenticated server identity.
    context.activeStudentId = "student-B";
    assert.equal(await context.__initialize(), false,
        "Student B must not inherit A's entitlement.");
    const forgedProfileEnvelope = makeEnvelope("student-B", "device-A", "license-B");
    assert.equal(windowObject.TahouriEntitlementStore.write(forgedProfileEnvelope), true);
    assert.equal(await context.__initialize(), true,
        "Current client accepts B's valid envelope when local active studentId is changed to B.");
    assert.equal(context.verifiedRemoteEntitlement.studentId, "student-B");

    console.log("Cryptographic tamper rejection: PASS");
    console.log("Cross-installation entitlement rejection: PASS");
    console.log("SECURITY FINDING: local profile studentId is mutable; client accepts another valid student's entitlement after local identity substitution.");
    console.log("Tahouri local profile tamper boundary test: FINDING CONFIRMED");
})().catch(error => {
    console.error("Tahouri local profile tamper boundary test: FAIL");
    console.error(error);
    process.exitCode = 1;
});
