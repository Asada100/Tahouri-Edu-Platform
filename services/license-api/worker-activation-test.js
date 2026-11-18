"use strict";

const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");
for (const file of ["migrations/0001_initial_schema.sql", "migrations/0002_admin_login_attempts.sql", "migrations/0003_activation_integrity_indexes.sql", "migrations/0004_student_accounts.sql", "migrations/0005_student_activation_status.sql", "migrations/0006_one_phone_one_computer.sql"]) {
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
async function request(worker, env, pathName, method, body, origin = "https://asada100.github.io", ip = "203.0.113.10", contentType = "application/json") {
    const headers = { "content-type": contentType, "cf-connecting-ip": ip };
    if (origin) headers.origin = origin;
    return worker.fetch(new Request("https://api.example.test" + pathName, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    }), env);
}

async function main() {
    const migrations = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
    assert.equal(Number(migrations.version), 6, "D1 migrations must create the version-6 device-slot schema.");
    assert(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'license_device_slots'").get(), "Migration 6 must create device slots.");
    assert(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'device_pairing_requests'").get(), "Migration 6 must create pairing requests.");
    assert.equal(db.prepare("PRAGMA table_info(license_device_slots)").all().some(row => row.name === "device_type"), true, "Device slots must distinguish phone and computer.");

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
    assert.match(adminHtml, /data-action="importStudentsFile"/,
        "The authenticated admin UI must expose the profile import action after public registration is disabled.");
    assert.match(adminHtml, /id="studentProfilesFile"/,
        "The admin UI must provide a file input for the exported profile JSON.");
    assert.match(adminHtml, /data-action="createBulkCodesFromFile"/,
        "The authenticated admin UI must expose the bulk issuance action.");
    assert.match(adminHtml, /id="bulkProfilesFile"/,
        "The bulk issuance UI must accept the original profile export file.");

    const adminScript = await worker.fetch(new Request("https://api.example.test/admin.js"), env);
    assert.equal(adminScript.status, 200);
    const adminScriptText = await adminScript.text();
    assert.match(adminScriptText, /document\.addEventListener/);
    assert.match(adminScriptText, /async function importStudentsFile/);
    assert.match(adminScriptText, /\/api\/admin\/students\/import/);
    assert.match(adminScriptText, /credentials:"include"/,
        "The profile import client must send the authenticated admin session.");
    assert.match(adminScriptText, /async function createBulkCodesFromFile/);
    assert.match(adminScriptText, /\/api\/admin\/codes\/bulk/,
        "The bulk issuance client must call the authenticated Worker endpoint.");

    // Execute the actual admin UI import function against a minimal DOM/fetch harness.
    const uiElements = new Map();
    const getUiElement = id => {
        if (!uiElements.has(id)) uiElements.set(id, { id, files: [], value: "", hidden: false, textContent: "", innerHTML: "" });
        return uiElements.get(id);
    };
    const uiFetchCalls = [];
    const uiAlerts = [];
    const uiProfile = { studentId: "ui-import-student-01", fullName: "پروفایل آزمون رابط", gradeId: "grade6" };
    const uiContext = {
        window: { location: { origin: "https://api.example.test" } },
        document: { getElementById: getUiElement, addEventListener() {} },
        fetch: async (url, options = {}) => {
            uiFetchCalls.push({ url: String(url), options });
            if (String(url).endsWith("/api/admin/students/import")) {
                return { ok: true, status: 200, json: async () => ({ ok: true, imported: 1, alreadyRegistered: 0, total: 1 }) };
            }
            if (String(url).endsWith("/api/admin/students")) {
                return { ok: true, status: 200, json: async () => ({ ok: true, students: [uiProfile] }) };
            }
            if (String(url).endsWith("/api/admin/codes/bulk")) {
                return { ok: true, status: 201, json: async () => ({ ok: true, academicYear: String(currentIranianYear()), count: 2, codes: [
                    { studentId: "ui-bulk-01", fullName: "دانش‌آموز یک", gradeId: "grade2", code: "THR-GRADE2-1405-TEST001" },
                    { studentId: "ui-bulk-02", fullName: "دانش‌آموز دو", gradeId: "grade4", code: "THR-GRADE4-1405-TEST002" }
                ] }) };
            }
            if (String(url).endsWith("/api/admin/codes")) {
                return { ok: true, status: 200, json: async () => ({ ok: true, codes: [] }) };
            }
            throw new Error("Unexpected admin UI fetch: " + url);
        },
        alert: message => uiAlerts.push(String(message)),
        confirm: () => true
    };
    const executableAdminScript = adminScriptText.replace(/loadHealth\\(\\);checkSession\\(\\);\\s*$/, "");
    vm.runInNewContext(executableAdminScript, uiContext);
    const profileFileInput = getUiElement("studentProfilesFile");
    profileFileInput.files = [{
        text: async () => JSON.stringify({ format: "tahouri-student-profiles", version: 1, profiles: [uiProfile] })
    }];
    profileFileInput.value = "profiles.json";
    await uiContext.importStudentsFile();
    const importCall = uiFetchCalls.find(call => call.url.endsWith("/api/admin/students/import"));
    assert(importCall, "The real admin UI import handler must call the authenticated import endpoint.");
    assert.equal(importCall.options.method, "POST");
    assert.equal(importCall.options.credentials, "include");
    assert.equal(importCall.options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(importCall.options.body), { profiles: [uiProfile] });
    assert.equal(profileFileInput.value, "", "The UI must clear the selected file after successful import.");
    assert.match(getUiElement("students").innerHTML, /ui-import-student-01/,
        "The UI must refresh and render the imported profile in the student list.");
    assert.match(uiAlerts[0] || "", /پروفایل جدید: 1/,
        "The UI must report the import result to the administrator.");

    const bulkFileInput = getUiElement("bulkProfilesFile");
    const bulkProfiles = [
        { studentId: "ui-bulk-01", fullName: "دانش‌آموز یک", gradeId: "grade2" },
        { studentId: "ui-bulk-02", fullName: "دانش‌آموز دو", gradeId: "grade4" }
    ];
    bulkFileInput.files = [{ text: async () => JSON.stringify({ format: "tahouri-student-profiles", version: 1, profiles: bulkProfiles }) }];
    bulkFileInput.value = "bulk-profiles.json";
    await uiContext.createBulkCodesFromFile();
    const bulkCall = uiFetchCalls.find(call => call.url.endsWith("/api/admin/codes/bulk"));
    assert(bulkCall, "The bulk UI handler must call the authenticated batch endpoint.");
    assert.equal(bulkCall.options.method, "POST");
    assert.equal(bulkCall.options.credentials, "include");
    assert.deepEqual(JSON.parse(bulkCall.options.body), { studentIds: ["ui-bulk-01", "ui-bulk-02"] });
    assert.match(getUiElement("bulkNewCodes").textContent, /THR-GRADE2-1405-TEST001/);
    assert.match(getUiElement("bulkNewCodes").textContent, /THR-GRADE4-1405-TEST002/);
    assert.equal(bulkFileInput.value, "", "The UI must clear the bulk file after successful issuance.");
    assert.match(uiAlerts[1] || "", /2 کد ساخته شد/,
        "The UI must confirm the number of generated bulk codes.");

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

    // CSRF regression: a valid admin session must not authorize cross-origin mutations.
    const codeCountBeforeCsrf = Number(db.prepare("SELECT COUNT(*) AS count FROM activation_codes").get().count);
    const csrfBody = JSON.stringify({ gradeId: "grade6", academicYear: String(currentIranianYear()), count: 1 });
    const crossOriginMutation = await worker.fetch(new Request("https://api.example.test/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": "https://attacker.example", "cookie": adminCookie },
        body: csrfBody
    }), env);
    assert.equal(crossOriginMutation.status, 403,
        "An authenticated admin mutation from an untrusted Origin must be rejected.");

    const missingOriginMutation = await worker.fetch(new Request("https://api.example.test/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json", "cookie": adminCookie },
        body: csrfBody
    }), env);
    assert.equal(missingOriginMutation.status, 403,
        "An authenticated browser admin mutation without Origin must be rejected.");

    const simpleContentTypeMutation = await worker.fetch(new Request("https://api.example.test/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "text/plain", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: csrfBody
    }), env);
    assert.equal(simpleContentTypeMutation.status, 415,
        "Admin mutations must reject simple text/plain content types.");

    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM activation_codes").get().count), codeCountBeforeCsrf,
        "Rejected CSRF attempts must not create activation codes.");
    const bulkCsrf = await worker.fetch(new Request("https://api.example.test/api/admin/codes/bulk", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": "https://attacker.example", "cookie": adminCookie },
        body: JSON.stringify({ studentIds: ["worker-test-student"] })
    }), env);
    assert.equal(bulkCsrf.status, 403, "Bulk code issuance must enforce the same trusted-Origin CSRF guard.");
    const bulkUnauthenticated = await worker.fetch(new Request("https://api.example.test/api/admin/codes/bulk", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN },
        body: JSON.stringify({ studentIds: ["worker-test-student"] })
    }), env);
    assert.equal(bulkUnauthenticated.status, 401, "Bulk code issuance must require an authenticated admin session.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM activation_codes").get().count), codeCountBeforeCsrf,
        "Rejected bulk requests must not create activation codes.");

    const registrationProfile = { studentId: "auto-register-profile", fullName: "پروفایل خودکار", gradeId: "grade6" };
    const publicRegistration = await request(worker, env, "/api/students/register", "POST", registrationProfile);
    assert.equal(publicRegistration.status, 410,
        "Public profile enrollment must be disabled and require an authenticated administrator import.");
    assert.deepEqual(await publicRegistration.json(), {
        ok: false,
        code: "enrollment_requires_admin",
        message: "ثبت عمومی پروفایل غیرفعال است؛ ورود پروفایل باید از پنل مدیریت انجام شود."
    });
    const repeatedPublicRegistration = await request(worker, env, "/api/students/register", "POST", registrationProfile);
    assert.equal(repeatedPublicRegistration.status, 410, "Repeated public enrollment attempts must remain disabled.");
    const publicRegistrationGet = await request(worker, env, "/api/students/register", "GET");
    assert.equal(publicRegistrationGet.status, 410, "The retired public enrollment route must not expose another method.");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM student_accounts WHERE student_id = ?").get(registrationProfile.studentId).count, 0,
        "Public enrollment attempts must not create student accounts.");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'student.registered'").get().count, 0,
        "Public enrollment attempts must not write student registration audit events.");

    const importedProfiles = [
        { studentId: "worker-test-student", fullName: "آزمایش دانش‌آموز", gradeId: "grade6" },
        { studentId: "student-1", fullName: "دانش‌آموز یک", gradeId: "grade6" },
        { studentId: "student-2", fullName: "دانش‌آموز دو", gradeId: "grade6" },
        { studentId: "student-future", fullName: "دانش‌آموز آینده", gradeId: "grade6" }
    ];
    const oversizedUnicodeBody = JSON.stringify({
        profiles: [{ studentId: "oversized-body-must-not-import", fullName: "آزمون", gradeId: "grade6" }],
        padding: "ا".repeat(33000)
    });
    assert(Buffer.byteLength(oversizedUnicodeBody, "utf8") > 65536,
        "The oversized Unicode regression fixture must exceed the byte limit.");
    const oversizedUnicodeImport = await worker.fetch(new Request("https://api.example.test/api/admin/students/import", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: oversizedUnicodeBody
    }), env);
    assert.equal(oversizedUnicodeImport.status, 413,
        "UTF-8 multibyte payloads over the byte limit must be rejected.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM student_accounts WHERE student_id = ?")
        .get("oversized-body-must-not-import").count), 0,
        "An oversized Unicode request must not create a student account.");

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
    assert.equal((await listedStudents.json()).students.length, 4, "Only the four administrator-imported profiles should appear; public enrollment must not create accounts.");

    const bulkCodeCountBefore = Number(db.prepare("SELECT COUNT(*) AS count FROM activation_codes").get().count);
    const bulkCodesResponse = await worker.fetch(new Request("https://api.example.test/api/admin/codes/bulk", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ studentIds: importedProfiles.map(profile => profile.studentId) })
    }), env);
    assert.equal(bulkCodesResponse.status, 201, "Authenticated bulk issuance must create one current-year code per eligible profile.");
    const bulkCodesBody = await bulkCodesResponse.json();
    assert.equal(bulkCodesBody.count, 4);
    assert.equal(bulkCodesBody.academicYear, String(currentIranianYear()));
    assert.equal(bulkCodesBody.codes.length, 4);
    for (const profile of importedProfiles) {
        const issued = bulkCodesBody.codes.find(item => item.studentId === profile.studentId);
        assert.ok(issued, "Every requested profile must receive exactly one code.");
        assert.equal(issued.gradeId, profile.gradeId, "Bulk code grade must match the profile's current grade.");
        const stored = db.prepare("SELECT grade_id AS gradeId, academic_year AS academicYear, status FROM activation_codes WHERE code_hash = ?")
            .get(await sha256(issued.code));
        assert.deepEqual({ ...stored }, { gradeId: profile.gradeId, academicYear: String(currentIranianYear()), status: "active" });
    }
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'codes.created'").get().count), 4,
        "Each bulk-created code must have an individual audit event.");
    const duplicateBulk = await worker.fetch(new Request("https://api.example.test/api/admin/codes/bulk", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ studentIds: importedProfiles.map(profile => profile.studentId) })
    }), env);
    assert.equal(duplicateBulk.status, 409, "Bulk issuance must reject duplicate current-year issuance.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM activation_codes").get().count), bulkCodeCountBefore + 4,
        "A rejected duplicate bulk request must not create partial codes.");

    const manualProfile = {
        studentId: "manual-student-uuid-0001",
        fullName: "دانش‌آموز ثبت دستی",
        gradeId: "grade5"
    };
    const manualCreate = await worker.fetch(new Request("https://api.example.test/api/admin/students", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify(manualProfile)
    }), env);
    assert.equal(manualCreate.status, 201, "Manual student account registration must succeed.");
    assert.equal((await manualCreate.json()).student.studentId, manualProfile.studentId);

    const manualDuplicate = await worker.fetch(new Request("https://api.example.test/api/admin/students", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify(manualProfile)
    }), env);
    assert.equal(manualDuplicate.status, 200, "Repeated manual registration must be idempotent.");
    assert.equal((await manualDuplicate.json()).alreadyRegistered, true);

    const manualConflict = await worker.fetch(new Request("https://api.example.test/api/admin/students", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ ...manualProfile, fullName: "نام متعارض" })
    }), env);
    assert.equal(manualConflict.status, 409, "Manual registration must reject conflicting student IDs.");

    const manualCode = await worker.fetch(new Request("https://api.example.test/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ studentId: manualProfile.studentId, gradeId: "grade5", academicYear: String(currentIranianYear()), count: 1 })
    }), env);
    assert.equal(manualCode.status, 201, "An active registered student must be eligible for code issuance.");

    const manualFutureLicenseId = "lic_archived_student_future";
    db.prepare("INSERT INTO licenses (license_id, product_id, student_id, grade_id, academic_year, valid_from, valid_until, installation_binding, status, entitlement_json, created_at) VALUES (?, 'tahouri-edu', ?, 'grade5', ?, ?, ?, ?, 'future', '{}', ?)")
        .run(manualFutureLicenseId, manualProfile.studentId, String(currentIranianYear() + 1),
            new Date(Date.now() + 86400000).toISOString(), new Date(Date.now() + 366 * 86400000).toISOString(),
            "install-archived-future", new Date().toISOString());
    const archiveManual = await worker.fetch(new Request("https://api.example.test/api/admin/students/archive", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ studentId: manualProfile.studentId })
    }), env);
    assert.equal(archiveManual.status, 200, "Student archival must succeed.");
    const manualCodeValue = (await manualCode.json()).codes[0];
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(await sha256(manualCodeValue)).status, "revoked",
        "Archiving a student must revoke their unused active codes.");
    assert.equal(db.prepare("SELECT status FROM licenses WHERE license_id = ?").get(manualFutureLicenseId).status, "revoked",
        "Archiving a student must also revoke future license reservations.");

    const archivedCode = await worker.fetch(new Request("https://api.example.test/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ studentId: manualProfile.studentId, gradeId: "grade5", academicYear: String(currentIranianYear()), count: 1 })
    }), env);
    assert.equal(archivedCode.status, 409, "Archived students must not receive new activation codes.");

    const archivedImport = await worker.fetch(new Request("https://api.example.test/api/admin/students/import", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ profiles: [manualProfile] })
    }), env);
    assert.equal(archivedImport.status, 409, "Archived student IDs must not be silently reactivated.");

    const singleCodeAuditBefore = Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'codes.created'").get().count);
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
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'codes.created'").get().count), singleCodeAuditBefore + 1,
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

    // The public activation endpoint must reject missing/untrusted browser origins and
    // simple content types before writing even an activation-attempt audit event.
    const activationAttemptsBeforeGuards = Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'activation.attempt'").get().count);
    const missingOriginActivation = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade6", studentId: "student-1", installationId: "install-no-origin"
    }, null);
    assert.equal(missingOriginActivation.status, 403,
        "Activation requests without an explicit Origin must be rejected.");
    const simpleContentTypeActivation = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade6", studentId: "student-1", installationId: "install-simple-content-type"
    }, "https://asada100.github.io", "203.0.113.10", "text/plain");
    assert.equal(simpleContentTypeActivation.status, 415,
        "Activation requests using a simple text/plain content type must be rejected.");
    const activationAttemptsAfterGuards = Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'activation.attempt'").get().count);
    assert.equal(activationAttemptsAfterGuards, activationAttemptsBeforeGuards,
        "Rejected activation request guards must not write activation-attempt audit events.");
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(codeHash).status, "active",
        "Rejected activation request guards must not consume the activation code.");

    const wrongStudent = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade6", studentId: "student-2", installationId: "install-wrong-student"
    });
    assert.equal(wrongStudent.status, 409, "A code must not activate a different registered student's profile.");
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(codeHash).status, "active",
        "A student ID mismatch must not consume the activation code.");

    const unregisteredCode = "THR-UNREGISTERED-" + year + "-TEST";
    const unregisteredHash = await sha256(unregisteredCode);
    db.prepare("INSERT INTO activation_codes (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at) VALUES (?, ?, 'tahouri-edu', 'student-not-registered', 'grade6', ?, 'promotion', 'active', ?)")
        .run(unregisteredHash, "UNREG…TEST", String(year), new Date().toISOString());
    const unregisteredAttempt = await request(worker, env, "/api/licenses/activate", "POST", {
        code: unregisteredCode, gradeId: "grade6", studentId: "student-not-registered", installationId: "install-unregistered"
    });
    assert.equal(unregisteredAttempt.status, 409, "A code bound to an unregistered student must not activate.");
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(unregisteredHash).status, "active",
        "An unregistered student attempt must not consume the code.");

    const legacyCode = "THR-LEGACY-UNBOUND-" + year + "-TEST";
    const legacyHash = await sha256(legacyCode);
    db.prepare("INSERT INTO activation_codes (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at) VALUES (?, ?, 'tahouri-edu', NULL, 'grade6', ?, 'promotion', 'active', ?)")
        .run(legacyHash, "LEGACY…TEST", String(year), new Date().toISOString());
    const legacyAttempt = await request(worker, env, "/api/licenses/activate", "POST", {
        code: legacyCode, gradeId: "grade6", studentId: "student-1", installationId: "install-legacy"
    });
    assert.equal(legacyAttempt.status, 409, "A legacy unbound activation code must not activate a student profile.");
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(legacyHash).status, "active",
        "A legacy unbound code must remain unused after rejection.");

    const wrongGrade = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade5", studentId: "student-1", installationId: "install-1"
    });
    assert.equal(wrongGrade.status, 400);
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(codeHash).status, "active");

    // Simulate another request consuming the code just before this request's D1 batch.
    // A profile archived after preflight but before the atomic D1 batch must not consume a code.
    const archiveRaceStudent = "student-archive-race";
    db.prepare("INSERT INTO student_accounts (student_id, full_name, grade_id, status, activation_status, created_at, updated_at) VALUES (?, ?, 'grade6', 'active', 'inactive', ?, ?)")
        .run(archiveRaceStudent, "آزمون بایگانی هم‌زمان", new Date().toISOString(), new Date().toISOString());
    const archiveRaceCode = "THR-ARCHIVE-RACE-" + year + "-TEST";
    const archiveRaceHash = await sha256(archiveRaceCode);
    db.prepare("INSERT INTO activation_codes (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at) VALUES (?, ?, 'tahouri-edu', ?, 'grade6', ?, 'promotion', 'active', ?)")
        .run(archiveRaceHash, "ARCHIVE…TEST", archiveRaceStudent, String(year), new Date().toISOString());
    const originalArchiveBatch = D1.batch;
    let injectConcurrentArchive = true;
    D1.batch = async statements => {
        if (injectConcurrentArchive) {
            injectConcurrentArchive = false;
            db.prepare("UPDATE student_accounts SET status = 'archived', updated_at = ? WHERE student_id = ? AND status = 'active'")
                .run(new Date().toISOString(), archiveRaceStudent);
        }
        return originalArchiveBatch.call(D1, statements);
    };
    const archiveRaceLoser = await request(worker, env, "/api/licenses/activate", "POST", {
        code: archiveRaceCode, gradeId: "grade6", studentId: archiveRaceStudent, installationId: "install-archive-race"
    }, "https://asada100.github.io", "203.0.113.99");
    D1.batch = originalArchiveBatch;
    assert.equal(archiveRaceLoser.status, 409, "An account archived immediately before the activation batch must be rejected.");
    assert.equal(db.prepare("SELECT status FROM activation_codes WHERE code_hash = ?").get(archiveRaceHash).status, "active",
        "A concurrent account archive must prevent activation-code consumption.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM licenses WHERE code_hash = ?").get(archiveRaceHash).count), 0,
        "A concurrent account archive must not create a license.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE code_hash = ?").get(archiveRaceHash).count), 0,
        "A concurrent account archive must not create an activation audit event.");

    const raceCode = "THR-RACE-" + year + "-TEST";
    const raceHash = await sha256(raceCode);
    db.prepare("UPDATE student_accounts SET activation_status = 'inactive' WHERE student_id = 'student-2'").run();
    db.prepare("INSERT INTO activation_codes (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at) VALUES (?, ?, 'tahouri-edu', 'student-2', 'grade6', ?, 'promotion', 'active', ?)")
        .run(raceHash, "RACE…TEST", String(year), new Date().toISOString());
    const originalBatch = D1.batch;
    let injectConcurrentConsumption = true;
    D1.batch = async statements => {
        if (injectConcurrentConsumption) {
            injectConcurrentConsumption = false;
            db.prepare("UPDATE activation_codes SET status = 'used', used_at = ?, license_id = 'lic_concurrent_winner' WHERE code_hash = ? AND status = 'active'")
                .run(new Date().toISOString(), raceHash);
        }
        return originalBatch.call(D1, statements);
    };
    const raceLoser = await request(worker, env, "/api/licenses/activate", "POST", {
        code: raceCode, gradeId: "grade6", studentId: "student-2", installationId: "install-race-loser"
    });
    D1.batch = originalBatch;
    assert.equal(raceLoser.status, 409, "A request that loses the one-time-code race must be rejected.");
    assert.equal(db.prepare("SELECT activation_status FROM student_accounts WHERE student_id = 'student-2'").get().activation_status, "inactive",
        "A losing activation race must not mark the student account as activated.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM licenses WHERE code_hash = ?").get().count), 0,
        "A losing activation race must not create a license.");

    const activated = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade6", studentId: "student-1", installationId: "install-1", deviceType: "phone"
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
    assert.equal(db.prepare("SELECT activation_status FROM student_accounts WHERE student_id = 'student-1'").get().activation_status, "active", "Successful activation must mark the profile active.");
    const phoneSlot = db.prepare("SELECT device_type, installation_id, revoked_at FROM license_device_slots WHERE license_id = ? AND device_type = 'phone'").get(stored.license_id);
    assert.equal(phoneSlot?.device_type, "phone");
    assert.equal(phoneSlot?.installation_id, "install-1");
    assert.equal(phoneSlot?.revoked_at, null,
        "The successful initial activation must atomically bind its phone slot.");
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM license_device_slots WHERE license_id = ?").get(stored.license_id).count), 1,
        "Only one slot should be bound after initial phone activation.");
    assert.throws(() => db.prepare("INSERT INTO license_device_slots (license_id, device_type, installation_id, bound_at) VALUES (?, 'phone', 'install-phone-2', ?)").run(stored.license_id, new Date().toISOString()),
        /UNIQUE constraint failed/,
        "A second phone must not be inserted into the same license slot.");
    db.prepare("INSERT INTO license_device_slots (license_id, device_type, installation_id, bound_at) VALUES (?, 'computer', 'install-computer-1', ?)").run(stored.license_id, new Date().toISOString());
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM license_device_slots WHERE license_id = ?").get(stored.license_id).count), 2,
        "A license must permit one phone and one computer simultaneously.");

    const status = await request(worker, env, "/api/licenses/status?licenseId=" + encodeURIComponent(stored.license_id), "GET");
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { ok: true, valid: true },
        "Public license status must not disclose student identity, grade, academic year, or validity dates.");
    assert.equal(db.prepare("SELECT status FROM licenses WHERE license_id = ?").get(stored.license_id).status,
        "active", "A status GET must not change the license record.");

    const archiveActivatedStudent = await worker.fetch(new Request("https://api.example.test/api/admin/students/archive", {
        method: "POST",
        headers: { "content-type": "application/json", "origin": env.ADMIN_ORIGIN, "cookie": adminCookie },
        body: JSON.stringify({ studentId: "student-1" })
    }), env);
    assert.equal(archiveActivatedStudent.status, 200, "Archiving a student with an active license must succeed.");
    assert.equal(db.prepare("SELECT status FROM licenses WHERE license_id = ?").get(stored.license_id).status,
        "revoked", "Archiving a student must revoke their existing active license.");
    const archivedStudentStatus = await request(worker, env,
        "/api/licenses/status?licenseId=" + encodeURIComponent(stored.license_id), "GET");
    assert.deepEqual(await archivedStudentStatus.json(), { ok: true, valid: false },
        "A license belonging to an archived student must no longer validate.");

    const duplicate = await request(worker, env, "/api/licenses/activate", "POST", {
        code, gradeId: "grade6", studentId: "student-2", installationId: "install-2"
    });
    assert.equal(duplicate.status, 409);

    db.prepare("UPDATE licenses SET status = 'revoked' WHERE license_id = ?").run(stored.license_id);
    const revoked = await request(worker, env, "/api/licenses/status?licenseId=" + encodeURIComponent(stored.license_id), "GET");
    assert.deepEqual(await revoked.json(), { ok: true, valid: false },
        "Revoked and unknown licenses must have the same public response shape.");
    const unknownStatus = await request(worker, env,
        "/api/licenses/status?licenseId=lic_unknown_privacy_test", "GET");
    assert.equal(unknownStatus.status, 200);
    assert.deepEqual(await unknownStatus.json(), { ok: true, valid: false },
        "Unknown license IDs must be indistinguishable from revoked licenses.");

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
    assert.deepEqual(await futureStatus.json(), { ok: true, valid: false },
        "A future-dated reservation must not be reported as currently active or disclose its state.");

    const dueFutureLicenseId = "lic_due_future_readonly_test";
    db.prepare("INSERT INTO licenses (license_id, product_id, student_id, grade_id, academic_year, valid_from, valid_until, installation_binding, status, entitlement_json, created_at) VALUES (?, 'tahouri-edu', ?, 'grade6', ?, ?, ?, ?, 'future', '{}', ?)")
        .run(dueFutureLicenseId, futureStudent, String(year),
            new Date(now - 86400000).toISOString(), new Date(now + 86400000).toISOString(),
            "install-future", new Date().toISOString());
    const dueFutureStatus = await request(worker, env,
        "/api/licenses/status?licenseId=" + encodeURIComponent(dueFutureLicenseId), "GET");
    assert.equal(dueFutureStatus.status, 200);
    assert.deepEqual(await dueFutureStatus.json(), { ok: true, valid: true },
        "A future status whose validity window has begun must be effective without a write.");
    assert.equal(db.prepare("SELECT status FROM licenses WHERE license_id = ?").get(dueFutureLicenseId).status,
        "future", "GET must not persist a future-to-active status transition.");
    const repeatedDueFutureStatus = await request(worker, env,
        "/api/licenses/status?licenseId=" + encodeURIComponent(dueFutureLicenseId), "GET");
    assert.deepEqual(await repeatedDueFutureStatus.json(), { ok: true, valid: true });
    assert.equal(db.prepare("SELECT status FROM licenses WHERE license_id = ?").get(dueFutureLicenseId).status,
        "future", "Repeated GET requests must remain read-only.");

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
