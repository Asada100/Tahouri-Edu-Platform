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

console.log("Tahouri License API backup created:");
console.log(backupFile);
