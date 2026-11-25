"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const nodeCrypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { webcrypto } = nodeCrypto;

const root = path.resolve(__dirname, "../..");
const db = new DatabaseSync(":memory:");
const migrationFiles = [
    "0001_initial_schema.sql", "0002_admin_login_attempts.sql",
    "0003_activation_integrity_indexes.sql", "0004_student_accounts.sql",
    "0005_student_activation_status.sql", "0006_one_phone_one_computer.sql",
    "0007_device_slot_public_keys.sql", "0008_pairing_request_identity.sql",
    "0009_pairing_signed_decisions.sql", "0010_pairing_entitlement_delivery.sql",
    "0011_device_slot_history.sql", "0012_device_revocation_challenges.sql",
    "0013_legacy_device_migration_challenges.sql"
];
for (const file of migrationFiles) {
    db.exec(fs.readFileSync(path.join(__dirname, "migrations", file), "utf8"));
}

class D1Statement {
    constructor(sql) { this.sql = sql; this.values = []; }
    bind(...values) { this.values = values; return this; }
    async first() { return db.prepare(this.sql).get(...this.values) || null; }
    async all() { return { results: db.prepare(this.sql).all(...this.values) }; }
    async run() {
        const result = db.prepare(this.sql).run(...this.values);
        return { meta: { changes: Number(result.changes || 0) } };
    }
}
const D1 = {
    prepare(sql) { return new D1Statement(sql); },
    async batch(statements) {
        db.exec("BEGIN");
        try {
            const results = [];
            for (const statement of statements) {
                const result = db.prepare(statement.sql).run(...statement.values);
                results.push({ meta: { changes: Number(result.changes || 0) } });
            }
            db.exec("COMMIT");
            return results;
        } catch (error) {
            db.exec("ROLLBACK");
            throw error;
        }
    }
};

const APP_ORIGIN = "https://app.example.test";
const ADMIN_PASSWORD = "synthetic-pr141-e2e-admin-password";
const serverPair = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const serverPrivatePem = serverPair.privateKey.export({ type: "pkcs8", format: "pem" });
const serverPublicPem = serverPair.publicKey.export({ type: "spki", format: "pem" });
const workerSource = fs.readFileSync(path.join(__dirname, "worker.js"), "utf8");
const workerModuleUrl = "data:text/javascript;base64," + Buffer.from(workerSource).toString("base64");

async function sha256Hex(bytes) {
    const digest = await webcrypto.subtle.digest("SHA-256", bytes);
    return Buffer.from(digest).toString("hex");
}
function publicFingerprint(keyPair) {
    return nodeCrypto.createHash("sha256")
        .update(keyPair.publicKey.export({ type: "spki", format: "der" }))
        .digest("hex");
}
async function main() {
    const worker = (await import(workerModuleUrl)).default;
    const env = {
        DB: D1,
        LICENSE_PRIVATE_KEY_PEM: serverPrivatePem,
        LICENSE_PUBLIC_KEY_PEM: serverPublicPem,
        ADMIN_PASSWORD,
        ADMIN_ORIGIN: APP_ORIGIN,
        APP_ORIGIN
    };

    const now = new Date();
    const studentId = "synthetic-client-worker-student";
    const licenseId = "lic_synthetic_client_worker_migration";
    const oldInstallationId = "synthetic-old-phone-installation";
    const computerInstallationId = "synthetic-computer-preserved";
    const academicYear = new Intl.DateTimeFormat("en-US-u-ca-persian", {
        timeZone: "Asia/Tehran", year: "numeric"
    }).format(now);
    const validFrom = new Date(now.getTime() - 60_000).toISOString();
    const validUntil = new Date(now.getTime() + 30 * 86_400_000).toISOString();
    db.prepare("INSERT INTO student_accounts (student_id, full_name, grade_id, status, created_at, updated_at) VALUES (?, ?, 'grade6', 'active', ?, ?)")
        .run(studentId, "دانش‌آموز ساختگی آزمون E2E", now.toISOString(), now.toISOString());
    db.prepare("INSERT INTO licenses (license_id, product_id, student_id, grade_id, academic_year, valid_from, valid_until, installation_binding, status, entitlement_json, created_at) VALUES (?, 'tahouri-edu', ?, 'grade6', ?, ?, ?, ?, 'active', '{}', ?)")
        .run(licenseId, studentId, academicYear, validFrom, validUntil, oldInstallationId, now.toISOString());

    const preservedComputerPair = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const preservedComputerPem = preservedComputerPair.publicKey.export({ type: "spki", format: "pem" }).trim();
    db.prepare("INSERT INTO license_device_slots (license_id, device_type, installation_id, bound_at, public_key_pem, key_fingerprint) VALUES (?, 'computer', ?, ?, ?, ?)")
        .run(licenseId, computerInstallationId, now.toISOString(), preservedComputerPem, publicFingerprint(preservedComputerPair));
    db.prepare("INSERT INTO license_device_slots (license_id, device_type, installation_id, bound_at, public_key_pem, key_fingerprint) VALUES (?, 'phone', ?, ?, NULL, NULL)")
        .run(licenseId, oldInstallationId, now.toISOString());

    async function workerRequest(url, options = {}) {
        const headers = new Headers(options.headers || {});
        headers.set("origin", APP_ORIGIN);
        headers.set("cf-connecting-ip", "203.0.113.81");
        const request = new Request(url, {
            method: options.method || "GET",
            headers,
            body: options.body
        });
        return worker.fetch(request, env);
    }

    const login = await workerRequest("https://api.example.test/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: ADMIN_PASSWORD })
    });
    assert.equal(login.status, 200, "Synthetic admin login must succeed.");
    const adminCookie = String(login.headers.get("set-cookie") || "").split(";")[0];
    assert.match(adminCookie, /^tahouri_admin_session=/);

    const challengeResponse = await workerRequest("https://api.example.test/api/admin/legacy-device-migration/challenge", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: adminCookie },
        body: JSON.stringify({
            licenseId, studentId, gradeId: "grade6", academicYear,
            deviceType: "phone", installationId: oldInstallationId,
            identityVerified: true,
            verificationReason: "Synthetic test fixture only; no real student identity was used",
            adminPassword: ADMIN_PASSWORD
        })
    });
    assert.equal(challengeResponse.status, 201, "Worker must issue a supervised migration challenge.");
    const challenge = await challengeResponse.json();
    assert.equal(challenge.installationId, oldInstallationId);
    assert.equal(challenge.deviceType, "phone");

    const devicePair = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const devicePublicPem = devicePair.publicKey.export({ type: "spki", format: "pem" }).trim();
    const installationId = oldInstallationId;
    const localStorageData = new Map();
    const localStorage = {
        getItem(key) { return localStorageData.has(key) ? localStorageData.get(key) : null; },
        setItem(key, value) { localStorageData.set(key, String(value)); },
        removeItem(key) { localStorageData.delete(key); }
    };
    const window = {
        crypto: webcrypto,
        TahouriServiceConfig: {
            enabled: true,
            mode: "pr141-isolated-test",
            apiBaseUrl: "https://api.example.test/api",
            requestTimeoutMs: 5000,
            productId: "tahouri-edu",
            entitlementVersion: 1,
            publicKeyPem: serverPublicPem
        },
        TahouriDeviceIdentity: {
            async getOrCreate() {
                return { installationId, publicKey: devicePublicPem };
            },
            async sign(message) {
                return {
                    installationId,
                    signature: nodeCrypto.sign("RSA-SHA256", Buffer.from(String(message), "utf8"), devicePair.privateKey).toString("base64")
                };
            }
        }
    };
    const context = {
        window,
        navigator: { userAgent: "Android synthetic E2E device" },
        crypto: webcrypto,
        TextEncoder,
        AbortController,
        setTimeout,
        clearTimeout,
        atob: value => Buffer.from(value, "base64").toString("binary"),
        localStorage,
        fetch: async (url, options = {}) => {
            const response = await workerRequest(String(url), options);
            return response;
        },
        console
    };

    for (const file of [
        "engine/core/tahouriEntitlementVerifier.js",
        "engine/core/tahouriEntitlementStore.js",
        "engine/core/tahouriLicenseClient.js"
    ]) {
        vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    }

    const beforeLicense = { ...db.prepare("SELECT student_id, grade_id, academic_year, valid_from, valid_until, status FROM licenses WHERE license_id=?").get(licenseId) };
    const beforeStudent = { ...db.prepare("SELECT status, grade_id, activation_status FROM student_accounts WHERE student_id=?").get(studentId) };
    const result = await window.TahouriLicenseClient.claimLegacyMigrationCode(challenge.transferCode);

    assert.equal(result.status, "migrated");
    assert.equal(result.entitlementStored, true, "The real client must verify and store the Worker-signed entitlement.");
    const stored = JSON.parse(localStorage.getItem("Tahouri_Signed_Entitlement_v1"));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].claims.licenseId, licenseId);
    assert.equal(stored[0].claims.studentId, studentId);
    assert.equal(stored[0].claims.installationBinding, installationId);
    assert.equal(stored[0].claims.deviceType, "phone");
    assert.equal(stored[0].claims.deviceKeyFingerprint, publicFingerprint(devicePair));
    assert.equal(Date.parse(stored[0].claims.offlineLeaseExpiresAt) > Date.now(), true);
    assert.match(stored[0].claims.deviceSlotId, /^[a-f0-9]{64}$/);

    const migratedSlot = db.prepare("SELECT public_key_pem, key_fingerprint, revoked_at FROM license_device_slots WHERE license_id=? AND device_type='phone' AND installation_id=?")
        .get(licenseId, oldInstallationId);
    assert.equal(migratedSlot.public_key_pem, devicePublicPem);
    assert.equal(migratedSlot.key_fingerprint, publicFingerprint(devicePair));
    assert.equal(migratedSlot.revoked_at, null);
    const preservedComputer = db.prepare("SELECT installation_id, revoked_at FROM license_device_slots WHERE license_id=? AND device_type='computer' AND revoked_at IS NULL")
        .get(licenseId);
    assert.equal(preservedComputer.installation_id, computerInstallationId, "Migration must preserve the complementary computer slot.");
    assert.deepEqual({ ...db.prepare("SELECT student_id, grade_id, academic_year, valid_from, valid_until, status FROM licenses WHERE license_id=?").get(licenseId) }, beforeLicense);
    assert.deepEqual({ ...db.prepare("SELECT status, grade_id, activation_status FROM student_accounts WHERE student_id=?").get(studentId) }, beforeStudent);
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM legacy_device_migration_challenges WHERE challenge_id=? AND consumed_at IS NOT NULL").get(challenge.challengeId).count), 1);
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type='device.legacy_migrated' AND license_id=?").get(licenseId).count), 1);

    const replay = await window.TahouriLicenseClient.claimLegacyMigrationCode(challenge.transferCode).then(
        () => ({ status: 200 }),
        error => ({ status: 409, message: error.message })
    );
    assert.equal(replay.status, 409, "A second client claim must be rejected after the one-use challenge is consumed.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type='device.legacy_migrated' AND license_id=?").get(licenseId).count), 1);

    const expiredChallengeId = "synthetic-expired-legacy-migration-challenge";
    const expiredTransferCode = nodeCrypto.randomBytes(32).toString("hex");
    const expiredNonceHash = nodeCrypto.createHash("sha256").update(expiredTransferCode).digest("hex");
    db.prepare(`INSERT INTO legacy_device_migration_challenges
        (challenge_id, license_id, student_id, grade_id, academic_year, device_type,
         installation_id, nonce_hash, expires_at, created_by_admin, verification_reason, created_at)
        VALUES (?, ?, ?, 'grade6', ?, 'phone', ?, ?, ?, 'admin', 'Synthetic expiry regression test', ?)`)
        .run(expiredChallengeId, licenseId, studentId, academicYear, oldInstallationId,
            expiredNonceHash, new Date(Date.now() - 60_000).toISOString(), now.toISOString());

    const expiredPrepare = await workerRequest("https://api.example.test/api/licenses/legacy-migration/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transferCode: expiredTransferCode })
    });
    assert.equal(expiredPrepare.status, 409, "Prepare must reject an expired migration challenge.");

    const expiredClaim = await workerRequest("https://api.example.test/api/licenses/legacy-migration/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            challengeId: expiredChallengeId,
            nonce: expiredTransferCode,
            deviceSignature: "AA==",
            devicePublicKeyPem: devicePublicPem
        })
    });
    assert.equal(expiredClaim.status, 409, "Claim must reject an expired migration challenge before accepting a device proof.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM legacy_device_migration_challenges WHERE challenge_id=? AND consumed_at IS NOT NULL").get(expiredChallengeId).count), 0);
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type='device.legacy_migrated' AND license_id=?").get(licenseId).count), 1);

    console.log("PASS: actual TahouriLicenseClient -> Worker migration route -> RSA entitlement verifier -> entitlement store");
    console.log("PASS: synthetic RSA proof, one-time challenge, expired prepare/claim rejection, signed lease, exact slot binding, complementary slot preservation, unchanged license/student records, and audit");
    db.close();
}

main().catch(error => {
    console.error(error);
    try { db.close(); } catch {}
    process.exitCode = 1;
});
