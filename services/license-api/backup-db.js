"use strict";

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const dbFile = process.env.TAHOURI_LICENSE_DB_FILE ||
    path.join(__dirname, "data", "license.sqlite");
const backupDir = process.env.TAHOURI_LICENSE_BACKUP_DIR ||
    path.join(__dirname, "backups");

if (!fs.existsSync(dbFile)) {
    throw new Error("License database not found: " + dbFile);
}

fs.mkdirSync(backupDir, { recursive: true });

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

console.log("Tahouri License API backup created and verified:");
console.log(backupFile);
