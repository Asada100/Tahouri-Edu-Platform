// =====================================
// Tahouri License API
// TEST / DEVELOPMENT ONLY
// Version 1.0
// =====================================

"use strict";

const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const PRODUCT_ID = "tahouri-edu";
const ENTITLEMENT_VERSION = 1;

const privateKeyFile =
    process.env.TAHOURI_LICENSE_PRIVATE_KEY_FILE ||
    "./dev-private-key.pem";

let privateKey;

try {
    privateKey = crypto.createPrivateKey(
        fs.readFileSync(privateKeyFile, "utf8")
    );
} catch (error) {
    console.error(
        "Tahouri License API: private key unavailable.",
        error.message
    );
    console.error(
        "Set TAHOURI_LICENSE_PRIVATE_KEY_FILE to a development private key."
    );
    process.exit(1);
}

const codes = new Map([
    ["GRADE1-1405-TEST", "grade1"],
    ["GRADE2-1405-TEST", "grade2"],
    ["GRADE3-1405-TEST", "grade3"],
    ["GRADE4-1405-TEST", "grade4"],
    ["GRADE5-1405-TEST", "grade5"],
    ["GRADE6-1405-TEST", "grade6"],
    ["GRADE6-1405-TEST-A", "grade6"],
    ["GRADE6-1405-TEST-B", "grade6"],
    ["GRADE6-1405-TEST-C", "grade6"]
]);

const usedCodes = new Set();

function send(res, status, payload) {
    const body = JSON.stringify(payload);

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "http://localhost:5500",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });

    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";

        req.on("data", chunk => {
            data += chunk;

            if (data.length > 1024 * 64) {
                reject(new Error("Request too large."));
                req.destroy();
            }
        });

        req.on("end", () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch {
                reject(new Error("Invalid JSON."));
            }
        });

        req.on("error", reject);
    });
}

function signClaims(claims) {
    const data = JSON.stringify(claims);
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(data);
    signer.end();

    return signer.sign(privateKey).toString("base64");
}

function academicPeriod() {
    // Development approximation only.
    // Production academic-year boundaries are server-controlled.
    const now = new Date();
    const gy = now.getUTCFullYear();
    const start = Date.UTC(gy, 8, 23, 20, 30, 0);
    const year = now.getTime() >= start ? gy - 621 : gy - 622;
    const validUntil = new Date(Date.UTC(year + 622, 8, 22, 20, 29, 59, 999));

    return {
        academicYear: year,
        validFrom: new Date().toISOString(),
        validUntil: validUntil.toISOString()
    };
}

async function activate(req, res) {
    const body = await readBody(req);

    const code = String(body.code || "").trim().toUpperCase();
    const gradeId = String(body.gradeId || "").trim();
    const installationId = String(body.installationId || "").trim();

    if (!code || !gradeId || !installationId) {
        return send(res, 400, {
            valid: false,
            message: "اطلاعات فعال‌سازی کامل نیست."
        });
    }

    const expectedGrade = codes.get(code);

    if (!expectedGrade) {
        return send(res, 400, {
            valid: false,
            message: "کد فعال‌سازی معتبر نیست."
        });
    }

    if (expectedGrade !== gradeId) {
        return send(res, 400, {
            valid: false,
            message: "این کد مربوط به پایه انتخاب‌شده نیست."
        });
    }

    if (usedCodes.has(code)) {
        return send(res, 409, {
            valid: false,
            message: "این کد قبلاً استفاده شده است."
        });
    }

    const period = academicPeriod();

    const claims = {
        licenseId: "lic_" + crypto.randomUUID(),
        productId: PRODUCT_ID,
        academicYear: String(period.academicYear),
        gradeScope: gradeId,
        validFrom: period.validFrom,
        validUntil: period.validUntil,
        installationBinding: installationId,
        entitlementVersion: ENTITLEMENT_VERSION
    };

    const envelope = {
        claims,
        signature: signClaims(claims),
        algorithm: "RSASSA-PKCS1-v1_5-SHA256"
    };

    usedCodes.add(code);

    return send(res, 200, {
        valid: true,
        entitlement: envelope
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "http://localhost:5500",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        });
        return res.end();
    }

    try {
        if (req.method === "GET" && req.url === "/api/health") {
            return send(res, 200, {
                ok: true,
                service: "tahouri-license-api",
                environment: "test"
            });
        }

        if (req.method === "POST" && req.url === "/api/licenses/activate") {
            return await activate(req, res);
        }

        return send(res, 404, {
            message: "مسیر موردنظر پیدا نشد."
        });
    } catch (error) {
        console.error("Tahouri License API Error:", error);
        return send(res, 500, {
            valid: false,
            message: "خطای داخلی سرویس."
        });
    }
});

server.listen(PORT, HOST, () => {
    console.log("Tahouri License API TEST listening on http://" + HOST + ":" + PORT);
});