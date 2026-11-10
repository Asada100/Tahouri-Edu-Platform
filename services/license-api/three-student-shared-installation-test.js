"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const storeSource = fs.readFileSync(
    path.join(root, "engine/core/tahouriEntitlementStore.js"), "utf8"
);
const managerSource = fs.readFileSync(
    path.join(root, "engine/core/licenseManager.js"), "utf8"
);

function extractFunction(source, name) {
    const marker = "async function " + name + "(";
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, "Missing source function: " + name);
    const brace = source.indexOf("{", start);
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let i = brace; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === "\\") escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
            quote = ch;
            continue;
        }
        if (ch === "{") depth++;
        if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error("Unclosed function: " + name);
}

const local = new Map();
const windowObject = {};
const context = {
    console: { log() {}, warn() {}, error() {} },
    Date,
    JSON,
    Map,
    localStorage: {
        getItem(key) { return local.has(key) ? local.get(key) : null; },
        setItem(key, value) { local.set(key, String(value)); },
        removeItem(key) { local.delete(key); }
    },
    window: windowObject,
    activeStudentId: "student-A",
    installationId: "shared-device-01",
    getActiveStudentId() { return context.activeStudentId; },
    getOrCreateInstallationId() { return context.installationId; },
    verifiedRemoteEntitlement: null
};
vm.createContext(context);
vm.runInContext(storeSource, context);

const initialize = extractFunction(managerSource, "initializeRemoteEntitlement");
const validFrom = new Date(Date.now() - 60_000).toISOString();
const validUntil = new Date(Date.now() + 86_400_000).toISOString();
const students = ["student-A", "student-B", "student-C"];
const envelopes = students.map((studentId, index) => ({
    claims: {
        productId: "tahouri-edu",
        entitlementVersion: 1,
        licenseId: "license-" + studentId,
        studentId,
        gradeScope: "grade6",
        academicYear: "1405-1406",
        installationBinding: "shared-device-01",
        validFrom,
        validUntil
    },
    signature: "isolated-test-signature-" + index
}));

windowObject.TahouriEntitlementVerifier = {
    async verifyEnvelope(envelope) {
        return envelope && envelope.signature &&
            envelope.claims && envelope.claims.installationBinding
            ? { valid: true, claims: envelope.claims }
            : { valid: false, reason: "invalid-test-envelope" };
    }
};

(async () => {
    for (const envelope of envelopes) {
        assert.equal(windowObject.TahouriEntitlementStore.write(envelope), true);
    }

    const stored = windowObject.TahouriEntitlementStore.readAll();
    assert.equal(stored.length, 3, "Three independent entitlements must coexist on one installation.");
    assert.equal(new Set(stored.map(x => x.claims.licenseId)).size, 3,
        "Each student must have a distinct license.");

    vm.runInContext(initialize + "\nglobalThis.__initialize = initializeRemoteEntitlement;", context);

    for (const studentId of students) {
        context.activeStudentId = studentId;
        assert.equal(await context.__initialize(), true,
            "Entitlement should resolve for " + studentId);
        assert.equal(context.verifiedRemoteEntitlement.studentId, studentId,
            "Active student must never receive another student's entitlement.");
        assert.equal(context.verifiedRemoteEntitlement.licenseId, "license-" + studentId);
    }

    context.activeStudentId = "student-not-registered";
    assert.equal(await context.__initialize(), false,
        "Unknown student must not inherit any stored entitlement.");
    assert.equal(context.verifiedRemoteEntitlement, null,
        "Previous student's in-memory entitlement must be cleared.");

    context.activeStudentId = "student-A";
    context.installationId = "different-device";
    assert.equal(await context.__initialize(), false,
        "Entitlement from another installation must not be accepted.");
    assert.equal(context.verifiedRemoteEntitlement, null);

    context.installationId = "shared-device-01";
    assert.equal(windowObject.TahouriEntitlementStore.clear(), true);
    assert.equal(windowObject.TahouriEntitlementStore.readAll().length, 0,
        "Clearing local profiles' entitlement storage must leave no stale envelopes.");

    console.log("Tahouri three-student shared-installation entitlement test: PASS");
})().catch(error => {
    console.error("Tahouri three-student shared-installation entitlement test: FAIL");
    console.error(error);
    process.exitCode = 1;
});
