"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-backup-test-"));
const dbFile = path.join(root, "live", "license.sqlite");
const backupDir = path.join(root, "backups");

fs.mkdirSync(path.dirname(dbFile), { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });

const db = new DatabaseSync(dbFile);
try {
  db.exec("CREATE TABLE activation_codes (id INTEGER PRIMARY KEY, code_hash TEXT); CREATE TABLE licenses (id INTEGER PRIMARY KEY, license_id TEXT); CREATE TABLE audit_log (id INTEGER PRIMARY KEY, event_type TEXT); CREATE TABLE payments (id INTEGER PRIMARY KEY, payment_id TEXT); INSERT INTO activation_codes(code_hash) VALUES ('test-hash'); INSERT INTO licenses(license_id) VALUES ('lic-test'); INSERT INTO audit_log(event_type) VALUES ('test'); INSERT INTO payments(payment_id) VALUES ('pay-test');");
} finally {
  db.close();
}

try {
  const env = { ...process.env, TAHOURI_LICENSE_DB_FILE: dbFile, TAHOURI_LICENSE_BACKUP_DIR: backupDir };
  execFileSync(process.execPath, ["backup-db.js"], { cwd: __dirname, env, stdio: "inherit" });
  const backups = fs.readdirSync(backupDir).filter(name => name.endsWith(".sqlite"));
  if (backups.length !== 1) throw new Error("Expected exactly one backup file.");
  const backup = path.join(backupDir, backups[0]);
  execFileSync(process.execPath, ["verify-backup.js", backup], { cwd: __dirname, env, stdio: "inherit" });
  execFileSync(process.execPath, ["restore-rehearsal.js", backup], { cwd: __dirname, env, stdio: "inherit" });
  const malformed = path.join(root, "malformed.sqlite");
  const bad = new DatabaseSync(malformed);
  try {
    bad.exec("PRAGMA user_version = 99; CREATE TABLE activation_codes (id INTEGER); CREATE TABLE licenses (id INTEGER); CREATE TABLE audit_log (id INTEGER); CREATE TABLE payments (id INTEGER);");
  } finally {
    bad.close();
  }

  let rejected = false;
  try {
    execFileSync(process.execPath, ["verify-backup.js", malformed], { cwd: __dirname, env, stdio: "pipe" });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Malformed/unsupported backup was accepted.");


  const live = new DatabaseSync(dbFile);
  try {
    const counts = [
      live.prepare("SELECT COUNT(*) AS count FROM activation_codes").get().count,
      live.prepare("SELECT COUNT(*) AS count FROM licenses").get().count,
      live.prepare("SELECT COUNT(*) AS count FROM audit_log").get().count,
      live.prepare("SELECT COUNT(*) AS count FROM payments").get().count
    ];
    if (counts.some(count => count !== 1)) throw new Error("Live database changed during backup/recovery test.");
  } finally {
    live.close();
  }
  console.log("Backup/recovery verification: PASS");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
