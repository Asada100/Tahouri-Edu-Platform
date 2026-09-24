"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const backupFile = process.argv[2];

if (!backupFile) {
    console.error("Usage: node restore-rehearsal.js <backup.sqlite>");
    process.exit(2);
}

const source = path.resolve(backupFile);
if (!fs.existsSync(source)) {
    console.error("Backup file not found: " + source);
    process.exit(2);
}

const rehearsalDir = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-restore-"));
const restoredFile = path.join(rehearsalDir, "license.sqlite");

try {
    fs.copyFileSync(source, restoredFile);

    const db = new DatabaseSync(restoredFile);
    try {
        const integrity = db.prepare("PRAGMA integrity_check").get();
        if (!integrity || integrity.integrity_check !== "ok") {
            throw new Error("Restored database integrity check failed.");
        }

        const requiredTables = [
            "activation_codes",
            "licenses",
            "audit_log",
            "payments"
        ];

        const tables = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).all().map(row => row.name);

        for (const table of requiredTables) {
            if (!tables.includes(table)) {
                throw new Error("Restored database is missing table: " + table);
            }
        }

        const counts = {};
        for (const table of requiredTables) {
            counts[table] = db.prepare(
                "SELECT COUNT(*) AS count FROM " + table
            ).get().count;
        }

        console.log("Tahouri restore rehearsal: PASS");
        console.log("Restored copy: " + restoredFile);
        console.log(JSON.stringify(counts));
    } finally {
        db.close();
    }
} finally {
    fs.rmSync(rehearsalDir, { recursive: true, force: true });
}
