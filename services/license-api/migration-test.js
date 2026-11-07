"use strict";

const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const port = 8898;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-migration-test-"));
const dbFile = path.join(tempDir, "license.sqlite");
const keyFile = path.join(tempDir, "private.pem");
const base = "http://127.0.0.1:" + port;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function request(method, route, options = {}) {
    return new Promise((resolve, reject) => {
        const body = options.body ? JSON.stringify(options.body) : "";
        const req = http.request(base + route, {
            method,
            headers: {
                ...(options.cookie ? { Cookie: options.cookie } : {}),
                ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {})
            }
        }, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on("error", reject);
        if (body) req.write(body);
        req.end();
    });
}

async function waitForReady(child) {
    for (let i = 0; i < 50; i++) {
        if (child.exitCode !== null) throw new Error("Server exited before readiness.");
        try {
            const result = await request("GET", "/api/ready");
            if (result.status === 200) return;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Server did not become ready.");
}

function startServer() {
    return spawn(process.execPath, [path.join(__dirname, "server.js")], {
        env: {
            ...process.env,
            PORT: String(port),
            HOST: "127.0.0.1",
            NODE_ENV: "development",
            TAHOURI_TEST_CODES: "false",
            TAHOURI_TEST_MODE: "true",
            TAHOURI_LICENSE_DB_FILE: dbFile,
            TAHOURI_LICENSE_PRIVATE_KEY_FILE: keyFile
        },
        stdio: ["ignore", "pipe", "pipe"]
    });
}

function stopServer(child) {
    if (child.exitCode === null) child.kill("SIGTERM");
}

async function main() {
    const key = require("crypto").generateKeyPairSync("rsa", { modulusLength: 2048 });
    fs.writeFileSync(keyFile, key.privateKey.export({ type: "pkcs8", format: "pem" }));

    const first = startServer();
    await waitForReady(first);

    const login = await request("POST", "/api/admin/login", { body: { password: "TAHOURI-ADMIN-TEST" } });
    assert(login.status === 200, "Admin login failed in isolated migration test.");
    const cookie = (login.headers["set-cookie"]?.[0] || "").split(";")[0];
    assert(cookie.includes("tahouri_admin_session="), "Admin session cookie missing.");

    const missingId = await request("POST", "/api/admin/students", {
        cookie, body: { fullName: "بدون شناسه", gradeId: "grade6" }
    });
    assert(missingId.status === 400, "Student registration must require the exact existing profile ID.");

    const student = await request("POST", "/api/admin/students", {
        cookie, body: { studentId: "existing-profile-123", fullName: "پروفایل موجود", gradeId: "grade6" }
    });
    assert(student.status === 201, "Existing profile registration failed.");
    assert(JSON.parse(student.body).student.studentId === "existing-profile-123", "Existing profile ID was replaced.");

    const imported = await request("POST", "/api/admin/students/import", {
        cookie, body: { profiles: [
            { studentId: "existing-profile-456", fullName: "پروفایل دوم", gradeId: "grade5" },
            { studentId: "existing-profile-789", fullName: "پروفایل سوم", gradeId: "grade4" }
        ] }
    });
    assert(imported.status === 200, "Bulk import of existing profiles failed.");
    const importedBody = JSON.parse(imported.body);
    assert(importedBody.imported === 2 && importedBody.total === 2, "Bulk import summary is incorrect.");

    const repeated = await request("POST", "/api/admin/students/import", {
        cookie, body: { profiles: [
            { studentId: "existing-profile-456", fullName: "پروفایل دوم", gradeId: "grade5" },
            { studentId: "existing-profile-789", fullName: "پروفایل سوم", gradeId: "grade4" }
        ] }
    });
    assert(repeated.status === 200, "Repeated profile import should be idempotent.");
    const repeatedBody = JSON.parse(repeated.body);
    assert(repeatedBody.imported === 0 && repeatedBody.alreadyRegistered === 2, "Repeated import created duplicates.");

    const yearParts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
        timeZone: "Asia/Tehran", year: "numeric", month: "numeric"
    }).formatToParts(new Date());
    const yearValues = Object.fromEntries(yearParts.filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
    const academicYear = String(yearValues.month >= 7 ? yearValues.year : yearValues.year - 1);
    const issued = await request("POST", "/api/admin/codes", {
        cookie, body: { studentId: "existing-profile-123", gradeId: "grade6", academicYear, renewalMode: "promotion" }
    });
    assert(issued.status === 201, "Student-bound code issuance failed.");
    const issuedBody = JSON.parse(issued.body);
    assert(issuedBody.studentId === "existing-profile-123" && issuedBody.codes.length === 1, "Issued code is not bound to the existing profile.");

    const listed = await request("GET", "/api/admin/codes", { cookie });
    assert(JSON.parse(listed.body).codes.some(x => x.studentId === "existing-profile-123"), "Code listing omitted the student binding.");

    const wrongStudent = await request("POST", "/api/licenses/activate", {
        body: { code: issuedBody.codes[0], gradeId: "grade6", studentId: "different-profile-456", installationId: "test-installation" }
    });
    assert(wrongStudent.status === 400, "Activation accepted a code bound to another profile.");

    stopServer(first);
    await new Promise(resolve => first.once("exit", resolve));

    const db = new DatabaseSync(dbFile);
    const version = Number(db.prepare("PRAGMA user_version").get().user_version || 0);
    const migrations = Number(db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'database.migrated'").get().count);
    assert(version === 4, "Student registry migration chain did not reach schema version 4.");
    assert(migrations === 4, "Expected exactly four one-time migration audit entries.");
    assert(Number(db.prepare("SELECT COUNT(*) AS count FROM student_accounts").get().count) === 3, "Registered profiles were not preserved.");
    assert(db.prepare("SELECT student_id FROM activation_codes WHERE student_id = 'existing-profile-123'").get()?.student_id === "existing-profile-123", "Activation code student binding was not stored.");
    assert(db.prepare("SELECT student_id FROM activation_codes WHERE student_id IS NULL").get() === undefined, "A newly issued activation code was left unbound.");
    db.close();

    const second = startServer();
    await waitForReady(second);
    stopServer(second);
    await new Promise(resolve => second.once("exit", resolve));

    const dbAfterRestart = new DatabaseSync(dbFile);
    assert(Number(dbAfterRestart.prepare("PRAGMA user_version").get().user_version) === 4, "Schema version changed after restart.");
    assert(Number(dbAfterRestart.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'database.migrated'").get().count) === 4, "Migration ran again after restart.");
    dbAfterRestart.exec("PRAGMA user_version = 99");
    dbAfterRestart.close();

    const incompatible = startServer();
    let output = "";
    incompatible.stdout.on("data", chunk => output += chunk);
    incompatible.stderr.on("data", chunk => output += chunk);
    await new Promise(resolve => incompatible.once("exit", resolve));
    assert(incompatible.exitCode !== 0, "Newer database schema was not rejected.");
    assert(output.includes("Database schema is newer than this service.") || output.includes("Startup recovery check: FAIL"), "Incompatible schema rejection was not observed.");

    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("Migration and student registry verification: PASS");
}

main().catch(error => {
    console.error("Migration and student registry verification: FAIL -", error.message);
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    process.exit(1);
});
