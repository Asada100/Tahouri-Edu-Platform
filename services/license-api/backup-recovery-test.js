"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("node:crypto");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-backup-test-"));
const dbFile = path.join(root, "live", "license.sqlite");
const backupDir = path.join(root, "backups");
const keyDir = path.join(root, "keys");
const fakeBin = path.join(root, "bin");
fs.mkdirSync(keyDir, { recursive: true });
fs.mkdirSync(fakeBin, { recursive: true });

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicExponent: 0x10001
});
const privateKeyFile = path.join(keyDir, "backup-private.pem");
const publicKeyFile = path.join(keyDir, "backup-public.pem");
const encryptionKeyFile = path.join(keyDir, "backup-encryption.key");
const offsiteSshKeyFile = path.join(keyDir, "offsite-ssh-key");
const knownHostsFile = path.join(keyDir, "known_hosts");

fs.writeFileSync(privateKeyFile, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
fs.writeFileSync(publicKeyFile, publicKey.export({ type: "spki", format: "pem" }));
fs.writeFileSync(encryptionKeyFile, crypto.randomBytes(32).toString("base64") + "\n", { mode: 0o600 });
fs.writeFileSync(offsiteSshKeyFile, "test-offsite-key\n", { mode: 0o600 });
fs.writeFileSync(knownHostsFile, "# test known_hosts\n");

const offsiteDir = path.join(root, "offsite");
fs.mkdirSync(offsiteDir, { recursive: true });

const fakeScp = path.join(fakeBin, "scp");
fs.writeFileSync(
    fakeScp,
    "#!/bin/sh\nfor arg in \"$@\"; do case \"$arg\" in *.sqlite.enc|*.sqlite.enc.sig) if [ -f \"$arg\" ]; then cp \"$arg\" \"$TAHOURI_TEST_OFFSITE/\"; fi;; esac; done\n",
    { mode: 0o755 }
);

fs.mkdirSync(path.dirname(dbFile), { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });

const db = new DatabaseSync(dbFile);
try {
    db.exec("CREATE TABLE activation_codes (id INTEGER PRIMARY KEY, code_hash TEXT); CREATE TABLE licenses (id INTEGER PRIMARY KEY, license_id TEXT); CREATE TABLE audit_log (id INTEGER PRIMARY KEY, event_type TEXT); CREATE TABLE payments (id INTEGER PRIMARY KEY, payment_id TEXT); INSERT INTO activation_codes(code_hash) VALUES ('test-hash'); INSERT INTO licenses(license_id) VALUES ('lic-test'); INSERT INTO audit_log(event_type) VALUES ('test'); INSERT INTO payments(payment_id) VALUES ('pay-test');");
} finally {
    db.close();
}

try {
    const env = {
        ...process.env,
        NODE_ENV: "test",
        TAHOURI_LICENSE_DB_FILE: dbFile,
        TAHOURI_LICENSE_BACKUP_DIR: backupDir,
        TAHOURI_BACKUP_SIGNING_PRIVATE_KEY_FILE: privateKeyFile,
        TAHOURI_BACKUP_SIGNING_PUBLIC_KEY_FILE: publicKeyFile,
        TAHOURI_BACKUP_ENCRYPTION_KEY_FILE: encryptionKeyFile,
        TAHOURI_BACKUP_OFFSITE_HOST: "test-host",
        TAHOURI_BACKUP_OFFSITE_USER: "test-user",
        TAHOURI_BACKUP_OFFSITE_DIR: "/offsite",
        TAHOURI_BACKUP_OFFSITE_SSH_KEY_FILE: offsiteSshKeyFile,
        TAHOURI_BACKUP_OFFSITE_KNOWN_HOSTS_FILE: knownHostsFile,
        TAHOURI_TEST_OFFSITE: offsiteDir,
        PATH: fakeBin + path.delimiter + process.env.PATH
    };

    execFileSync(process.execPath, ["backup-db.js"], { cwd: __dirname, env, stdio: "inherit" });

    const backups = fs.readdirSync(backupDir).filter(name => name.endsWith(".sqlite"));
    if (backups.length !== 1 || backups[0].endsWith(".sqlite")) throw new Error("Expected exactly one encrypted backup file.");

    const backup = path.join(backupDir, backups[0]);

    execFileSync(process.execPath, ["verify-backup.js", backup], { cwd: __dirname, env, stdio: "inherit" });

    const replicated = fs.readdirSync(offsiteDir);
    if (!replicated.includes(path.basename(backup)) || !replicated.includes(path.basename(backup) + ".sig")) {
        throw new Error("Off-site replication did not copy backup and signature.");
    }

    execFileSync(process.execPath, ["restore-rehearsal.js", backup], { cwd: __dirname, env, stdio: "inherit" });

    const tampered = path.join(root, "tampered.sqlite.enc");
    fs.copyFileSync(backup, tampered);
    fs.appendFileSync(tampered, "tampered");
    fs.copyFileSync(backup + ".sig", tampered + ".sig");

    let tamperRejected = false;
    try {
        execFileSync(process.execPath, ["verify-backup.js", tampered], { cwd: __dirname, env, stdio: "pipe" });
    } catch {
        tamperRejected = true;
    }
    if (!tamperRejected) throw new Error("Tampered signed backup was accepted.");

    const malformed = path.join(root, "malformed.sqlite.enc");
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
        if (counts.some(count => count !== 1)) {
            throw new Error("Live database changed during backup/recovery test.");
        }
    } finally {
        live.close();
    }

    console.log("Backup/recovery verification: PASS");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
