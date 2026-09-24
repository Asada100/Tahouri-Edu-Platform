"use strict";

const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const port = 8897;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-license-test-"));
const dbFile = path.join(tempDir, "license.sqlite");
const keyFile = path.join(tempDir, "private.pem");
const base = "http://127.0.0.1:" + port;

function request(method, route, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body === undefined ? null : JSON.stringify(body);
        const req = http.request(base + route, {
            method,
            headers: {
                ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
                ...headers
            }
        }, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let json = {};
                try { json = data ? JSON.parse(data) : {}; } catch {}
                resolve({ status: res.statusCode, headers: res.headers, data: json });
            });
        });
        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function waitForServer(child) {
    for (let i = 0; i < 50; i++) {
        if (child.exitCode !== null) throw new Error("Server exited during startup.");
        try {
            const result = await request("GET", "/api/health");
            if (result.status === 200) return;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Server did not start.");
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function main() {
    const sourceServer = path.join(__dirname, "server.js");
    const key = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    fs.writeFileSync(keyFile, key.privateKey.export({ type: "pkcs8", format: "pem" }));

    const child = spawn(process.execPath, [sourceServer], {
        env: {
            ...process.env,
            PORT: String(port),
            HOST: "127.0.0.1",
            NODE_ENV: "development",
            TAHOURI_TEST_CODES: "true",
            TAHOURI_LICENSE_DB_FILE: dbFile,
            TAHOURI_LICENSE_PRIVATE_KEY_FILE: keyFile
        },
        stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    child.stderr.on("data", chunk => stderr += chunk);

    try {
        await waitForServer(child);

        const activation = await request("POST", "/api/licenses/activate", {
            code: "GRADE6-1405-TEST-A",
            gradeId: "grade6",
            studentId: "integration-student",
            installationId: "integration-installation"
        });
        assert(activation.status === 200 && activation.data.valid, "Activation failed.");
        assert(activation.data.entitlement?.claims?.studentId === "integration-student", "Student binding missing.");
        assert(activation.data.entitlement?.claims?.gradeScope === "grade6", "Grade binding missing.");
        assert(Number.isFinite(Date.parse(activation.data.entitlement.claims.validUntil)), "Expiry is invalid.");

        const reuse = await request("POST", "/api/licenses/activate", {
            code: "GRADE6-1405-TEST-A",
            gradeId: "grade6",
            studentId: "second-student",
            installationId: "second-installation"
        });
        assert(reuse.status === 409, "Used activation code was reusable.");

        const wrongGrade = await request("POST", "/api/licenses/activate", {
            code: "GRADE6-1405-TEST-B",
            gradeId: "grade5",
            studentId: "wrong-grade-student",
            installationId: "wrong-grade-installation"
        });
        assert(wrongGrade.status === 400, "Grade mismatch was accepted.");

        const payment = await request("POST", "/api/payments", {
            gradeId: "grade6",
            academicYear: "1405",
            amount: 100000,
            currency: "IRR"
        });
        assert(payment.status === 201 && payment.data.status === "pending", "Payment creation failed.");

        const login = await request("POST", "/api/admin/login", { password: "TAHOURI-ADMIN-TEST" });
        assert(login.status === 200 && login.data.ok, "Admin login failed.");
        const cookie = login.headers["set-cookie"]?.[0]?.split(";")[0];
        assert(cookie, "Admin session cookie missing.");

        const verifyPayment = await request("POST", "/api/admin/payments/verify", {
            paymentId: payment.data.paymentId
        }, { Cookie: cookie });
        assert(verifyPayment.status === 200 && verifyPayment.data.status === "verified", "Payment verification failed.");

        const paymentStatus = await request("GET", "/api/payments/status?paymentId=" + encodeURIComponent(payment.data.paymentId));
        assert(paymentStatus.status === 200 && paymentStatus.data.payment.status === "verified", "Verified payment status failed.");

        const health = await request("GET", "/api/health");
        assert(health.status === 200 && health.data.ok, "Health failed after activation.");

        const db = new DatabaseSync(dbFile);
        try {
            const license = db.prepare("SELECT license_id, student_id, grade_id, status FROM licenses LIMIT 1").get();
            assert(license && license.student_id === "integration-student", "License was not persisted.");
            assert(license.status === "active", "Persisted license is not active.");
        } finally {
            db.close();
        }

        console.log("Tahouri License API integration test: PASS");
    } finally {
        child.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
        if (stderr) process.stderr.write(stderr);
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error("Tahouri License API integration test: FAIL");
    console.error(error.message);
    process.exit(1);
});
