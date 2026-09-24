"use strict";

const fs = require("node:fs");
const path = require("node:path");

const errors = [];
const warnings = [];

function required(name) {
    if (!process.env[name]) errors.push(name + " is required.");
    return process.env[name];
}

if (process.env.NODE_ENV !== "production") {
    errors.push("NODE_ENV must be production.");
}

const privateKeyFile = required("TAHOURI_LICENSE_PRIVATE_KEY_FILE");
const adminPassword = required("TAHOURI_ADMIN_PASSWORD");
const provider = String(required("TAHOURI_PAYMENT_PROVIDER") || "").trim().toLowerCase();
const appOrigin = required("TAHOURI_APP_ORIGIN");
const adminOrigin = required("TAHOURI_ADMIN_ORIGIN");
const dbFile = required("TAHOURI_LICENSE_DB_FILE");
required("TAHOURI_LICENSE_BACKUP_DIR");

if (privateKeyFile) {
    const resolvedKey = path.resolve(privateKeyFile);
    const projectRoot = path.resolve(__dirname, "../..");
    if (resolvedKey.startsWith(projectRoot + path.sep)) {
        errors.push("Signing private key must be outside the project directory.");
    }
    if (!fs.existsSync(resolvedKey)) {
        errors.push("Signing private key file does not exist: " + resolvedKey);
    }
}

if (adminPassword && adminPassword.length < 16) {
    errors.push("TAHOURI_ADMIN_PASSWORD must be at least 16 characters.");
}

for (const [name, value] of [["TAHOURI_APP_ORIGIN", appOrigin], ["TAHOURI_ADMIN_ORIGIN", adminOrigin]]) {
    if (value && !/^https:\/\//i.test(value)) {
        errors.push(name + " must use HTTPS in production.");
    }
}

if (!["zarinpal", "idpay"].includes(provider)) {
    errors.push("TAHOURI_PAYMENT_PROVIDER must be a supported real provider: zarinpal or idpay.");
}

if (provider === "zarinpal") {
    required("TAHOURI_PAYMENT_MERCHANT_ID");
    required("TAHOURI_PAYMENT_CALLBACK_URL");
}
if (provider === "idpay") {
    required("TAHOURI_PAYMENT_API_KEY");
    required("TAHOURI_PAYMENT_CALLBACK_URL");
}

if (dbFile) {
    const dbDir = path.dirname(path.resolve(dbFile));
    if (!fs.existsSync(dbDir)) warnings.push("Database directory does not exist yet; deployment must create it with persistent storage.");
}

if (errors.length) {
    console.error("PRODUCTION PREFLIGHT: FAIL");
    for (const error of errors) console.error("- " + error);
    process.exit(1);
}

console.log("PRODUCTION PREFLIGHT: PASS");
if (warnings.length) {
    console.log("Warnings:");
    for (const warning of warnings) console.log("- " + warning);
}
