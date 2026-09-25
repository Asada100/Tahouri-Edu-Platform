"use strict";

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("node:crypto");

const dbFile = process.env.TAHOURI_LICENSE_DB_FILE ||
    path.join(__dirname, "data", "license.sqlite");
const backupDir = process.env.TAHOURI_LICENSE_BACKUP_DIR ||
    path.join(__dirname, "backups");

if (!fs.existsSync(dbFile)) {
    throw new Error("License database not found: " + dbFile);
}

fs.mkdirSync(backupDir, { recursive: true });

const signingKeyFile = process.env.TAHOURI_BACKUP_SIGNING_PRIVATE_KEY_FILE;
const signatureFile = backupFile + ".sig";

if (process.env.NODE_ENV === "production" && !signingKeyFile) {
    throw new Error("TAHOURI_BACKUP_SIGNING_PRIVATE_KEY_FILE is required in production.");
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(backupDir, "license-" + stamp + ".sqlite");

const db = new DatabaseSync(dbFile);
try {
    db.exec("VACUUM INTO " + JSON.stringify(backupFile));
} finally {
    db.close();
}

const verify = new DatabaseSync(backupFile);
try {
    const tables = verify.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('activation_codes','licenses','audit_log','payments') ORDER BY name"
    ).all().map(row => row.name);

    const expected = ["activation_codes", "audit_log", "licenses", "payments"];
    if (JSON.stringify(tables) !== JSON.stringify(expected)) {
        throw new Error("Backup verification failed: required tables are missing.");
    }

    const integrity = verify.prepare("PRAGMA integrity_check").get();
    if (!integrity || integrity.integrity_check !== "ok") {
        throw new Error("Backup verification failed: SQLite integrity check failed.");
    }
} finally {
    verify.close();
}

if (signingKeyFile) {
    if (!fs.existsSync(signingKeyFile)) throw new Error("Backup signing private key not found: " + signingKeyFile);
    const digest = crypto.createHash("sha256").update(fs.readFileSync(backupFile)).digest();
    const signature = crypto.sign("RSA-SHA256", digest, fs.readFileSync(signingKeyFile));
    fs.writeFileSync(signatureFile, signature.toString("base64") + "\n", { mode: 0o600 });
}

console.log("Tahouri License API backup created and verified:");
console.log(backupFile);
if (signingKeyFile) console.log(signatureFile);

const offsiteConfigured = process.env.TAHOURI_BACKUP_OFFSITE_HOST &&
    process.env.TAHOURI_BACKUP_OFFSITE_USER &&
    process.env.TAHOURI_BACKUP_OFFSITE_DIR &&
    process.env.TAHOURI_BACKUP_OFFSITE_SSH_KEY_FILE;
if (process.env.NODE_ENV === "production" || offsiteConfigured) {
    const { execFileSync } = require("node:child_process");
    execFileSync(process.execPath, ["offsite-backup.js"], {
        cwd: __dirname,
        env: process.env,
        stdio: "inherit"
    });
}
