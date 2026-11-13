"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");
for (const file of ["migrations/0001_initial_schema.sql", "migrations/0002_admin_login_attempts.sql", "migrations/0003_activation_integrity_indexes.sql", "migrations/0004_student_accounts.sql"]) {
    db.exec(fs.readFileSync(path.join(__dirname, file), "utf8"));
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

function currentIranianYear() {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
        timeZone: "Asia/Tehran", year: "numeric", month: "numeric"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
    return values.month >= 7 ? values.year : values.year - 1;
}
async function sha256(value) {
    const digest = await crypto.webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Buffer.from(digest).toString("hex");
}
async function request(worker, env, pathName, method, body, origin = "https://asada100.github.io", ip = "203.0.113.10") {
    return worker.fetch(new Request("https://api.example.test" + pathName, {
        method,
        headers: { "content-type": "application/json", "origin": origin, "cf-connecting-ip": ip },
        body: body === undefined ? undefined : JSON.stringify(body)
    }), env);
}

async function main() {
    const migrations = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
    assert.equal(Number(migrations.version), 4, "D1 migrations must create the version-4 student registry schema.");

    const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privatePem = pair.privateKey.export({ type: "pkcs8", format: "pem" });
    const publicPem = pair.publicKey.export({ type: "spki", format: "pem" });
    const source = fs.readFileSync(path.join(__dirname, "worker.js"), "utf8");
    const moduleUrl = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
    assert.equal((source.match(/onclick=/gi) || []).length, 0, "Cloudflare admin HTML must not contain inline click handlers.");
    assert.equal((source.match(/onkeydown=/gi) || []).length, 0, "Cloudflare admin HTML must not contain inline keyboard handlers.");
    assert(source.includes("content-security-policy"), "Cloudflare admin route must set a strict CSP.");
    assert(source.includes("document.addEventListener"), "Admin actions must use delegated external JavaScript handlers.");
    const worker = (await import(moduleUrl)).default;
    const env = {
        DB: D1, LICENSE_PRIVATE_KEY_PEM: privatePem, LICENSE_PUBLIC_KEY_PEM: publicPem,
        ADMIN_PASSWORD: "worker-test-admin-password-strong",
        ADMIN_ORIGIN: "https://asada100.github.io", APP_ORIGIN: "https://asada100.github.io"
    };

    const adminPage = await worker.fetch(new Request("https://api.example.test/admin"), env);
    assert.equal(adminPage.status, 200, "Cloudflare admin page must remain reachable.");
    assert.match(adminPage.headers.get("content-security-policy") || "", /script-src 'self'/);
    const adminHtml = await adminPage.text();
    assert.doesNotMatch(adminHtml, /\son[a-z]+\s*=/i);
    assert.match(adminHtml, /data-action="login"/);

    const adminScript = await worker.fetch(new Request("https://api.example.test/admin.js"), env);
    assert.equal(adminScript.status, 200);
    assert.match(await adminScript.text(), /document\.addEventListener/);

    const publicKeyResponse = await request(worker, env, "/api/public-key", "GET");
    assert.equal(publicKeyResponse.status, 200);
    assert.equal((await publicKeyResponse.json()).publicKeyPem, publicPem.trim());

    const adminLogin = await worker.fetch(new Request("https://api.example.test/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cf-connecting-ip": "203.0.113.11" },
        body: JSON.stringify({ password: env.ADMIN_PASSWORD })
    }), env);
    assert.equal(adminLogin.status, 200, "Worker admin login must succeed with its configured password.");
    const adminCookie = String(adminLogin.headers.get("set-cookie") || "").split(";")[0];
    assert.match(adminCookie, /^tahouri_admin_session=/);

    const importedProfiles = [
        { studentId: "worker-test-student", fullName: "آزمایش دانش‌آموز", gradeId: "grade6" },
        { studentId: "student-1", fullName: "دانش‌آموز یک", gradeId: "grade6" },
        { studentId: "student-2", fullName: "دانش‌آموز دو", gradeId: "grade6" },
        { studentId: "student-future", fullName: "دانش‌آموز آینده", gradeId: "grade6" }
    ];
    const importResponse = await worker.fetch(new Request("https://api.example.test/api/admin/students/import", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ profiles: importedProfiles })
    }), env);
    assert.equal(importResponse.status, 200, "Existing profile import must succeed.");
    const importBody = await importResponse.json();
    assert.equal(importBody.imported, 4);
    assert.equal(importBody.alreadyRegistered, 0);
    const duplicateImport = await worker.fetch(new Request("https://api.example.test/api/admin/students/import", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ profiles: importedProfiles })
    }), env);
    assert.equal(duplicateImport.status, 200);
    assert.deepEqual(await duplicateImport.json(), { ok: true, imported: 0, alreadyRegistered: 4, total: 4 });
    const conflictImport = await worker.fetch(new Request("https://api.example.test/api/admin/students/import", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ profiles: [{ ...importedProfiles[0], fullName: "نام متفاوت" }] })
    }), env);
    assert.equal(conflictImport.status, 409, "Conflicting student IDs must not overwrite existing accounts.");
    const listedStudents = await worker.fetch(new Request("https://api.example.test/api/admin/students", {
        headers: { "origin": env.ADMIN_ORIGIN, "cookie": adminCookie }
    }), env);
    assert.equal(listedStudents.status, 200);
    assert.equal((await listedStudents.json()).students.length, 4);

    const createCodes = await worker.fetch(new Request("https://api.example.test/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ studentId: "worker-test-student", gradeId: "grade7", academicYear: String(currentIranianYear() + 1), renewalMode: "promotion", count: 2 })
    }), env);
    assert.equal(createCodes.status, 201, "Worker admin code creation must succeed.");
    const createdCodes = await createCodes.json();
    assert.equal(createdCodes.codes.length, 2);
    const createdHash = await sha256(createdCodes.codes[0]);
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(createdHash).status, "active");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'codes.created'").get().count), 1,
        "Code creation must write its audit event in the same D1 batch.");

    const revokeCode = await worker.fetch(new Request("https://api.example.test/api/admin/codes/revoke", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ code: createdCodes.codes[0] })
    }), env);
    assert.equal(revokeCode.status, 200, "Worker admin code revocation must succeed.");
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(createdHash).status, "revoked");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'code.revoked'").get().count), 1,
        "Code revocation must write its audit event atomically.");

    const health = await request(worker, env, "/api/health", "GET");
    assert.equal(health.status, 200, "Health must be ready with D1 schema and signing key.");
    assert.equal((await health.json()).capabilities.licenseActivation, true);

    const year = currentIranianYear();
    const code = "THR-GRADE6-" + year + "-ONE-TIME-TEST";
    const codeHash = await sha256(code);
    db.prepare("INSERT INTO activation_codes (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at) VALUES (?, ?, 'tahouri-edu', 'student-1', 'grade6', ?, 'promotion', 'active', ?)")
        .run(codeHash, code.slice(0, 7) + "…" + code.slice(-6), String(year), new Date().toISOString());

    const wrongGrade = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade5", studentId: "student-1", installationId: "install-1"
    });
    assert.equal(wrongGrade.status, 400);
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(codeHash).status, "active");

    const activated = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade6", studentId: "student-1", installationId: "install-1"
    });
    assert.equal(activated.status, 200, "Valid one-time activation must succeed.");
    const activationBody = await activated.json();
    assert.equal(activationBody.valid, true);
    assert.equal(activationBody.entitlement.claims.studentId, "student-1");
    assert.equal(activationBody.entitlement.claims.gradeScope, "grade6");

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(JSON.stringify(activationBody.entitlement.claims));
    verifier.end();
    assert.equal(verifier.verify(pair.publicKey, Buffer.from(activationBody.entitlement.signature, "base64")), true);

    const stored = db.prepare("SELECT status, license_id FROM activation_codes WHERE code_hash = ?").get(codeHash);
    assert.equal(stored.status, "used");
    assert.equal(stored.license_id, activationBody.entitlement.claims.licenseId);

    const status = await request(worker, env, "/api/licenses/status?licenseId=" + encodeURIComponent(stored.license_id), "GET");
    assert.equal(status.status, 200);
    assert.equal((await status.json()).valid, true);

    const duplicate = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade6", studentId: "student-2", installationId: "install-2"
    });
    assert.equal(duplicate.status, 409);

    db.prepare("UPDATE licenses SET status = 'revoked' WHERE license_id = ?").run(stored.license_id);
    const revoked = await request(worker, env, "/api/licenses/status?licenseId=" + encodeURIComponent(stored.license_id), "GET");
    assert.equal((await revoked.json()).valid, false);

    const futureStudent = "student-future";
    const now = Date.now();
    db.prepare("INSERT INTO licenses (license_id, product_id, student_id, grade_id, academic_year, valid_from, valid_until, installation_binding, status, entitlement_json, created_at) VALUES (?, 'tahouri-edu', ?, 'grade6', ?, ?, ?, ?, 'active', '{}', ?)")
        .run("lic_current_future_test", futureStudent, String(year),
            new Date(now - 86400000).toISOString(), new Date(now + 86400000).toISOString(),
            "install-future", new Date().toISOString());

    const futureCode = "THR-GRADE7-" + (year + 1) + "-FUTURE-TEST";
    const futureHash = await sha256(futureCode);
    db.prepare("INSERT INTO activation_codes (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at) VALUES (?, ?, 'tahouri-edu', 'student-future', 'grade7', ?, 'promotion', 'active', ?)")
        .run(futureHash, futureCode.slice(0, 7) + "…" + futureCode.slice(-6),
            String(year + 1), new Date().toISOString());

    const wrongRenewalMode = await request(worker, env, "/api/licenses/activate", "POST", {
        code: futureCode, gradeId: "grade7", studentId: futureStudent,
        installationId: "install-future", renewalMode: "repeat"
    });
    assert.equal(wrongRenewalMode.status, 409, "Future renewal mode must match the code's issued mode.");
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(futureHash).status,
        "active", "A renewal-mode mismatch must not consume the code.");

    const futureActivation = await request(worker, env, "/api/licenses/activate", "POST", {
        code: futureCode, gradeId: "grade7", studentId: futureStudent,
        installationId: "install-future", renewalMode: "promotion"
    });
    assert.equal(futureActivation.status, 200, "A valid next-grade reservation must succeed.");
    const futureBody = await futureActivation.json();
    assert.equal(futureBody.renewalStored, true);
    const futureLicense = db.prepare("SELECT status FROM licenses WHERE license_id = ?")
        .get(futureBody.entitlement.claims.licenseId);
    assert.equal(futureLicense.status, "future");

    const futureStatus = await request(worker, env,
        "/api/licenses/status?licenseId=" + encodeURIComponent(futureBody.entitlement.claims.licenseId), "GET");
    assert.equal(futureStatus.status, 200);
    const futureStatusBody = await futureStatus.json();
    assert.equal(futureStatusBody.valid, false);
    assert.equal(futureStatusBody.reason, "future",
        "A future-dated reservation must not be reported as currently active.");

    const repeatCode = "THR-GRADE6-" + (year + 1) + "-REPEAT-TEST";
    const repeatHash = await sha256(repeatCode);
    db.prepare("INSERT INTO activation_codes (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at) VALUES (?, ?, 'tahouri-edu', 'student-future', 'grade6', ?, 'repeat', 'active', ?)")
        .run(repeatHash, repeatCode.slice(0, 7) + "…" + repeatCode.slice(-6),
            String(year + 1), new Date().toISOString());
    const repeatActivation = await request(worker, env, "/api/licenses/activate", "POST", {
        code: repeatCode, gradeId: "grade6", studentId: futureStudent,
        installationId: "install-future", renewalMode: "repeat"
    });
    assert.equal(repeatActivation.status, 200, "A valid same-grade repeat reservation must succeed.");
    assert.equal((await repeatActivation.json()).renewalStored, true);

    const noKey = { DB: D1, ADMIN_ORIGIN: env.ADMIN_ORIGIN, APP_ORIGIN: env.APP_ORIGIN };
    assert.equal((await request(worker, noKey, "/api/health", "GET")).status, 503);
    const malformedKey = { ...env, LICENSE_PRIVATE_KEY_PEM: "-----BEGIN PRIVATE KEY-----\\ninvalid\\n-----END PRIVATE KEY-----" };
    assert.equal((await request(worker, malformedKey, "/api/health", "GET")).status, 503,
        "Health must reject a malformed private signing key.");
    const otherPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const mismatchedKey = {
        ...env,
        LICENSE_PUBLIC_KEY_PEM: otherPair.publicKey.export({ type: "spki", format: "pem" })
    };
    assert.equal((await request(worker, mismatchedKey, "/api/health", "GET")).status, 503,
        "Health must reject a public key that does not match the signing private key.");

    const blockedOrigin = await request(worker, env, "/api/licenses/activate", "POST", {
        code: "invalid", gradeId: "grade6", studentId: "student-3", installationId: "install-3"
    }, "https://evil.example");
    assert.equal(blockedOrigin.status, 403);

    const rateLimitResponses = [];
    for (let attempt = 0; attempt < 11; attempt++) {
        rateLimitResponses.push(await request(worker, env, "/api/licenses/activate", "POST", {
            code: "INVALID-WORKER-RATE-" + attempt,
            gradeId: "grade6",
            studentId: "rate-limit-student",
            installationId: "rate-limit-installation"
        }, "https://asada100.github.io", "203.0.113.250"));
    }
    assert(rateLimitResponses.slice(0, 10).every(response => response.status === 400),
        "Worker rate limit rejected requests before its configured threshold.");
    assert.equal(rateLimitResponses[10].status, 429,
        "Worker activation endpoint did not enforce its per-IP rate limit.");

    db.close();
    console.log("Cloudflare Worker activation integration test: PASS");
}
main().catch(error => {
    console.error("Cloudflare Worker activation integration test: FAIL", error);
    try { db.close(); } catch {}
    process.exitCode = 1;
});
