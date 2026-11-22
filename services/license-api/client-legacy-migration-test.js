"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { webcrypto } = require("crypto");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "engine/core/tahouriLicenseClient.js"), "utf8");
const identity = {
    installationId: "pr141-migration-installation",
    publicKey: "-----BEGIN PUBLIC KEY-----\nAQID\n-----END PUBLIC KEY-----"
};
let fetchCalls = 0;
let stored = [];
let responseBody;
let verification;
let lastRequest;

const window = {
    TahouriServiceConfig: { enabled: true, apiBaseUrl: "https://isolated-worker.invalid/api", requestTimeoutMs: 1000 },
    TahouriDeviceIdentity: {
        async getOrCreate() { return identity; },
        async sign(payload) {
            assert(payload.includes("tahouri-legacy-device-migration-v1"), "Migration proof purpose must be signed.");
            return { installationId: identity.installationId, signature: "synthetic-device-proof" };
        }
    },
    TahouriEntitlementVerifier: {
        async verifyEnvelope(envelope) {
            assert.strictEqual(envelope, "synthetic-signed-envelope");
            return verification;
        }
    },
    TahouriEntitlementStore: {
        write(envelope) { stored.push(envelope); return true; }
    }
};

const context = {
    window,
    navigator: { userAgent: "Android" },
    crypto: webcrypto,
    TextEncoder,
    AbortController,
    setTimeout,
    clearTimeout,
    atob: value => Buffer.from(value, "base64").toString("binary"),
    fetch: async (url, options) => {
        fetchCalls++;
        lastRequest = { url, options };
        return { ok: true, async json() { return responseBody; } };
    },
    console
};
vm.runInNewContext(source, context);

const client = window.TahouriLicenseClient;
const future = new Date(Date.now() + 60_000).toISOString();
const challenge = overrides => ({
    challengeId: "challenge-synthetic",
    nonce: "nonce-synthetic",
    expiresAt: future,
    installationId: identity.installationId,
    deviceType: "phone",
    licenseId: "license-synthetic",
    studentId: "student-synthetic",
    gradeId: "grade6",
    academicYear: 1405,
    ...(overrides || {})
});
const matchingClaims = () => ({
    licenseId: "license-synthetic",
    studentId: "student-synthetic",
    gradeScope: "grade6",
    academicYear: 1405,
    installationBinding: identity.installationId,
    deviceType: "phone",
    deviceKeyFingerprint: require("crypto").createHash("sha256").update(Buffer.from([1, 2, 3])).digest("hex"),
    offlineLeaseExpiresAt: future,
    deviceSlotId: "a".repeat(64)
});
function reset() {
    fetchCalls = 0;
    stored = [];
    responseBody = { entitlement: "synthetic-signed-envelope" };
    verification = { valid: true, claims: matchingClaims() };
    lastRequest = null;
}
async function rejectsWithoutRequest(label, suppliedChallenge, expectedMessage) {
    reset();
    await assert.rejects(client.claimLegacyMigration(suppliedChallenge), expectedMessage, label);
    assert.strictEqual(fetchCalls, 0, label + ": must reject before contacting the Worker.");
    assert.strictEqual(stored.length, 0, label + ": must not store an entitlement.");
}
async function main() {
    await rejectsWithoutRequest(
        "expired challenge",
        challenge({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
        /مهلت چالش/
    );
    await rejectsWithoutRequest(
        "wrong installation",
        challenge({ installationId: "another-installation" }),
        /همین نصب/
    );
    await rejectsWithoutRequest(
        "wrong device class",
        challenge({ deviceType: "computer" }),
        /نوع دستگاه/
    );

    reset();
    verification = { valid: false, claims: matchingClaims() };
    await assert.rejects(client.claimLegacyMigration(challenge()), /مجوز امضاشده/);
    assert.strictEqual(stored.length, 0, "An invalid signed entitlement must never be stored.");

    reset();
    verification = { valid: true, claims: { ...matchingClaims(), studentId: "different-student" } };
    await assert.rejects(client.claimLegacyMigration(challenge()), /مجوز امضاشده/);
    assert.strictEqual(stored.length, 0, "A profile-mismatched entitlement must never be stored.");

    reset();
    const result = await client.claimLegacyMigration(challenge());
    assert.strictEqual(result.entitlementStored, true, "A matching verified entitlement should be stored.");
    assert.deepStrictEqual(stored, ["synthetic-signed-envelope"]);
    assert.strictEqual(fetchCalls, 1);
    assert.strictEqual(lastRequest.url, "https://isolated-worker.invalid/api/licenses/legacy-migration/claim");
    const body = JSON.parse(lastRequest.options.body);
    assert.strictEqual(body.challengeId, "challenge-synthetic");
    assert.strictEqual(body.nonce, "nonce-synthetic");
    assert.strictEqual(body.devicePublicKeyPem, identity.publicKey);
    assert.strictEqual(body.deviceSignature, "synthetic-device-proof");

    console.log("Tahouri client legacy migration test: PASS");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
