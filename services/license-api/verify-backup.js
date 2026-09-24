"use strict";

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const backupFile = process.argv[2];

if (!backupFile) {
    console.error("Usage: node verify-backup.js <backup.sqlite>");
    process.exit(2);
}

if (!fs.existsSync(backupFile)) {
    console.error("Backup file not found: " + backupFile);
    process.exit(2);
}

const db = new DatabaseSync(path.resolve(backupFile));

try {
    const integrity = db.prepare("PRAGMA integrity_check").get();
    if (!integrity || integrity.integrity_check !== "ok") {
        throw new Error("SQLite integrity check failed.");
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
