"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");
for (const file of ["migrations/0001_initial_schema.sql", "migrations/0002_admin_login_attempts.sql"]) {
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
async function request(worker, env, pathName, method, body, origin = "https://asada100.github.io") {
    return worker.fetch(new Request("https://api.example.test" + pathName, {
        method,
        headers: { "content-type": "application/json", "origin": origin, "cf-connecting-ip": "203.0.113.10" },
        body: body === undefined ? undefined : JSON.stringify(body)
    }), env);
}

async function main() {
    const migrations = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
    assert.equal(Number(migrations.version), 2, "D1 migrations must create the version-2 schema.");

    const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privatePem = pair.privateKey.export({ type: "pkcs8", format: "pem" });
    const source = fs.readFileSync(path.join(__dirname, "worker.js"), "utf8");
    const moduleUrl = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
    assert.equal((source.match(/onclick=/gi) || []).length, 0, "Cloudflare admin HTML must not contain inline click handlers.");
    assert.equal((source.match(/onkeydown=/gi) || []).length, 0, "Cloudflare admin HTML must not contain inline keyboard handlers.");
    assert(source.includes("content-security-policy"), "Cloudflare admin route must set a strict CSP.");
    assert(source.includes("document.addEventListener"), "Admin actions must use delegated external JavaScript handlers.");
    const worker = (await import(moduleUrl)).default;
    const env = {
        DB: D1, LICENSE_PRIVATE_KEY_PEM: privatePem,
        ADMIN_ORIGIN: "https://asada100.github.io", APP_ORIGIN: "https://asada100.github.io"
    };

    const health = await request(worker, env, "/api/health", "GET");
    assert.equal(health.status, 200, "Health must be ready with D1 schema and signing key.");
    assert.equal((await health.json()).capabilities.licenseActivation, true);

    const year = currentIranianYear();
    const code = "THR-GRADE6-" + year + "-ONE-TIME-TEST";
    const codeHash = await sha256(code);
    db.prepare("INSERT INTO activation_codes (code_hash, code_preview, product_id, grade_id, academic_year, renewal_mode, status, created_at) VALUES (?, ?, 'tahouri-edu', 'grade6', ?, 'promotion', 'active', ?)")
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

    const noKey = { DB: D1, ADMIN_ORIGIN: env.ADMIN_ORIGIN, APP_ORIGIN: env.APP_ORIGIN };
    assert.equal((await request(worker, noKey, "/api/health", "GET")).status, 503);

    const blockedOrigin = await request(worker, env, "/api/licenses/activate", "POST", {
        code: "invalid", gradeId: "grade6", studentId: "student-3", installationId: "install-3"
    }, "https://evil.example");
    assert.equal(blockedOrigin.status, 403);

    db.close();
    console.log("Cloudflare Worker activation integration test: PASS");
}
main().catch(error => {
    console.error("Cloudflare Worker activation integration test: FAIL", error);
    try { db.close(); } catch {}
    process.exitCode = 1;
});
