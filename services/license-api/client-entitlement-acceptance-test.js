"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const managerSource = fs.readFileSync(
    path.resolve(__dirname, "../../engine/core/licenseManager.js"),
    "utf8"
);
const verifierSource = fs.readFileSync(
    path.resolve(__dirname, "../../engine/core/tahouriEntitlementVerifier.js"),
    "utf8"
);

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function makeClaims(overrides = {}) {
    const now = Date.now();
    return {
        licenseId: "license-new",
        productId: "tahouri-edu",
        entitlementVersion: 1,
        academicYear: "1405",
        gradeScope: "grade6",
        studentId: "student-1",
        installationBinding: "install-test",
        validFrom: new Date(now - 60_000).toISOString(),
        validUntil: new Date(now + 86_400_000).toISOString(),
        ...overrides
    };
}

function createHarness({ stored = [], responseClaims } = {}) {
    const storage = new Map([["Tahouri_Installation_Id_v1", "install-test"]]);
    const writes = [];
    const entitlements = stored.slice();

    const localStorage = {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, value); },
        removeItem(key) { storage.delete(key); }
    };

    const window = {
        crypto: { randomUUID: () => "install-test" },
        ProfileManager: {
            get: () => ({ studentId: "student-1", gradeId: "grade6" })
        },
        TahouriServiceConfig: { mode: "test", productId: "tahouri-edu", entitlementVersion: 1 },
        TahouriLicenseClient: {
            activate: async () => ({ valid: true, entitlement: { claims: responseClaims, signature: "test-signature" } })
        },
        TahouriEntitlementVerifier: {
            verifyEnvelope: async (envelope, options = {}) => {
                const claims = envelope && envelope.claims;
                if (!claims) return { valid: false, reason: "missing_claims" };
                const from = new Date(claims.validFrom).getTime();
                const until = new Date(claims.validUntil).getTime();
                const now = Date.now();
                const dateValid = Number.isFinite(from) && Number.isFinite(until) &&
                    until > from && now < until &&
                    (options.allowFuture === true || now >= from);
                return dateValid
                    ? { valid: true, claims }
                    : { valid: false, reason: "date_invalid" };
            }
        },
        TahouriEntitlementStore: {
            readAll: () => entitlements.slice(),
            read: () => entitlements[0] || null,
            write: envelope => {
                writes.push(envelope);
                const id = envelope && envelope.claims && envelope.claims.licenseId;
                const index = entitlements.findIndex(item =>
                    item && item.claims && item.claims.licenseId === id
                );
                if (index >= 0) entitlements[index] = envelope;
                else entitlements.push(envelope);
                return true;
            }
        }
    };
    window.window = window;

    const sandbox = {
        window,
        localStorage,
        console: { log() {}, warn() {}, error() {} },
        Date,
        Math,
        Intl,
        setTimeout,
        clearTimeout
    };
    vm.runInNewContext(managerSource, sandbox, { filename: "licenseManager.js" });

    return {
        api: window.LicenseManager,
        writes,
        entitlements
    };
}

(async function run() {
    // Missing installation binding must be rejected before persistence.
    {
        const claims = makeClaims();
        delete claims.installationBinding;
        const h = createHarness({ responseClaims: claims });
        const result = await h.api.activateRemote("CODE", "grade6", "student-1");
        assert(result && result.valid === false, "Missing installationBinding was accepted.");
        assert(h.writes.length === 0, "Incomplete claims were persisted.");
    }

    // A signed entitlement for another installation must be rejected.
    {
        const h = createHarness({
            responseClaims: makeClaims({ installationBinding: "different-install" })
        });
        const result = await h.api.activateRemote("CODE", "grade6", "student-1");
        assert(result && result.valid === false, "Mismatched installation binding was accepted.");
        assert(h.writes.length === 0, "Mismatched installation binding was persisted.");
    }

    // Student and grade must match the active profile and requested grade.
    for (const overrides of [
        { studentId: "student-2" },
        { gradeScope: "grade5" }
    ]) {
        const h = createHarness({ responseClaims: makeClaims(overrides) });
        const result = await h.api.activateRemote("CODE", "grade6", "student-1");
        assert(result && result.valid === false, "Mismatched profile/grade claims were accepted.");
        assert(h.writes.length === 0, "Mismatched profile/grade claims were persisted.");
    }

    // A valid current entitlement is persisted and selected.
    {
        const h = createHarness({ responseClaims: makeClaims() });
        const result = await h.api.activateRemote("CODE", "grade6", "student-1");
        assert(result && result.valid === true, "Valid current entitlement was rejected.");
        assert(h.writes.length === 1, "Valid current entitlement was not persisted exactly once.");
        assert(h.api.hasValidRemoteEntitlement("grade6"), "Valid current entitlement was not selected.");
    }

    // A future renewal without a verifiable current entitlement must not be stored.
    {
        const now = Date.now();
        const h = createHarness({
            responseClaims: makeClaims({
                licenseId: "future-no-current",
                gradeScope: "grade7",
                academicYear: "1406",
                validFrom: new Date(now + 86_400_000).toISOString(),
                validUntil: new Date(now + 365 * 86_400_000).toISOString()
            })
        });
        const result = await h.api.activateRemote("CODE", "grade7", "student-1");
        assert(result && result.valid === false, "Future renewal without current entitlement was accepted.");
        assert(h.writes.length === 0, "Future renewal without current entitlement was persisted.");
    }

    // A future renewal is stored only after the current entitlement is re-verified.
    {
        const current = {
            claims: makeClaims({ licenseId: "current-license" }),
            signature: "current-signature"
        };
        const now = Date.now();
        const future = makeClaims({
            licenseId: "future-license",
            gradeScope: "grade7",
            academicYear: "1406",
            validFrom: new Date(now + 86_400_000).toISOString(),
            validUntil: new Date(now + 365 * 86_400_000).toISOString()
        });
        const h = createHarness({ stored: [current], responseClaims: future });
        const result = await h.api.activateRemote("CODE", "grade7", "student-1");
        assert(result && result.valid === true && result.renewalStored === true,
            "Future renewal with a valid current entitlement was rejected.");
        assert(h.writes.length === 1, "Future renewal was not persisted exactly once.");
        assert(h.api.hasValidRemoteEntitlement("grade6"),
            "Future renewal replaced the currently active entitlement.");
        assert(!h.api.hasValidRemoteEntitlement("grade7"),
            "Future entitlement became active before its validFrom date.");
    }

    // The real verifier must require the binding and scope claims.
    assert(
        verifierSource.includes('"gradeScope"') &&
        verifierSource.includes('"installationBinding"') &&
        verifierSource.includes('validUntil.getTime() <= validFrom.getTime()'),
        "Entitlement verifier does not enforce the complete claim schema and date interval."
    );

    console.log("Tahouri client entitlement acceptance tests: PASS");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
