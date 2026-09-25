"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const backupDir = process.env.TAHOURI_LICENSE_BACKUP_DIR ||
    path.join(__dirname, "backups");
const host = process.env.TAHOURI_BACKUP_OFFSITE_HOST;
const user = process.env.TAHOURI_BACKUP_OFFSITE_USER;
const remoteDir = process.env.TAHOURI_BACKUP_OFFSITE_DIR;
const identityFile = process.env.TAHOURI_BACKUP_OFFSITE_SSH_KEY_FILE;

if (process.env.NODE_ENV === "production" &&
    (!host || !user || !remoteDir || !identityFile)) {
    throw new Error(
        "Off-site backup configuration is required in production: " +
        "TAHOURI_BACKUP_OFFSITE_HOST, TAHOURI_BACKUP_OFFSITE_USER, " +
        "TAHOURI_BACKUP_OFFSITE_DIR, TAHOURI_BACKUP_OFFSITE_SSH_KEY_FILE."
    );
}

if (!host || !user || !remoteDir || !identityFile) {
    console.log("Off-site backup replication skipped: configuration is incomplete.");
    process.exit(0);
}

if (!fs.existsSync(backupDir)) {
    throw new Error("Backup directory not found: " + backupDir);
}
if (!fs.existsSync(identityFile)) {
    throw new Error("Off-site SSH key not found: " + identityFile);
}

const files = fs.readdirSync(backupDir)
    .filter(name => name.endsWith(".sqlite") || name.endsWith(".sqlite.sig"))
    .map(name => path.join(backupDir, name));

if (!files.length) {
    throw new Error("No backup files found for off-site replication.");
}

const remote = user + "@" + host + ":" + remoteDir + "/";
const args = ["-i", identityFile, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes"];

for (const file of files) {
    execFileSync("scp", [...args, file, remote], { stdio: "inherit" });
}

console.log("Off-site backup replication: PASS");
console.log("Files replicated: " + files.length);
