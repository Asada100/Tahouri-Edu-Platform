"use strict";

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("node:crypto");

const backupFile = process.argv[2];

if (!backupFile) {
    console.error("Usage: node verify-backup.js <backup.sqlite>");
    process.exit(2);
}

if (!fs.existsSync(backupFile)) {
    console.error("Backup file not found: " + backupFile);
    process.exit(2);
}


const publicKeyFile = process.env.TAHOURI_BACKUP_SIGNING_PUBLIC_KEY_FILE;
const signatureFile = path.resolve(backupFile + ".sig");
if (process.env.NODE_ENV === "production" && !publicKeyFile) {
    console.error("Backup signing public key is required in production.");
    process.exit(2);
}
if (publicKeyFile) {
    if (!fs.existsSync(publicKeyFile) || !fs.existsSync(signatureFile)) {
        throw new Error("Backup signature or verification key is missing.");
    }
    const signature = Buffer.from(fs.readFileSync(signatureFile, "utf8").trim(), "base64");
    const digest = crypto.createHash("sha256").update(fs.readFileSync(path.resolve(backupFile))).digest();
    if (!crypto.verify("RSA-SHA256", digest, fs.readFileSync(publicKeyFile), signature)) {
        throw new Error("Backup signature verification failed.");
    }
}

const db = new DatabaseSync(path.resolve(backupFile));

try {
    const integrity = db.prepare("PRAGMA integrity_check").get();
    if (!integrity || integrity.integrity_check !== "ok") {
        throw new Error("SQLite integrity check failed.");
    }

        const schemaVersion = db.prepare("PRAGMA user_version").get().user_version;
    if (schemaVersion !== 1) {
        throw new Error("Unsupported database schema version: " + schemaVersion);
    }

const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map(row => row.name);

    for (const required of [
        "activation_codes",
        "licenses",
        "audit_log",
        "payments"
    ]) {
        if (!tables.includes(required)) {
            throw new Error("Required table missing: " + required);
        }
    }

    const counts = {
        activationCodes: db.prepare("SELECT COUNT(*) AS count FROM activation_codes").get().count,
        licenses: db.prepare("SELECT COUNT(*) AS count FROM licenses").get().count,
        auditEvents: db.prepare("SELECT COUNT(*) AS count FROM audit_log").get().count,
        payments: db.prepare("SELECT COUNT(*) AS count FROM payments").get().count
    };

    console.log("Tahouri backup verification: PASS");
    console.log(JSON.stringify(counts));
} finally {
    db.close();
}
