"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
const worker = fs.readFileSync(path.join(__dirname, "worker.js"), "utf8");
const compose = fs.readFileSync(path.join(root, "docker-compose.production.yml"), "utf8");
const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
const caddy = fs.readFileSync(path.join(__dirname, "Caddyfile.production.example"), "utf8");
const dockerfile = fs.readFileSync(path.join(__dirname, "Dockerfile"), "utf8");
const backupCrypto = fs.readFileSync(path.join(__dirname, "backup-crypto.js"), "utf8");
const backupDb = fs.readFileSync(path.join(__dirname, "backup-db.js"), "utf8");
const licenseManager = fs.readFileSync(path.join(root, "engine/core/licenseManager.js"), "utf8");
const activationGate = fs.readFileSync(path.join(root, "engine/core/activationGate.js"), "utf8");

const forbidden = [
    /console\.log\([^\n]*(?:password|secret|token|authority|private.?key|api.?key)/i,
    /TAHOURI_ADMIN_PASSWORD\s*=\s*["'][^"']+["']/i,
    /TAHOURI_LICENSE_PRIVATE_KEY_FILE\s*=\s*["'][^"']+["']/
];
if (forbidden.some(pattern => pattern.test(source))) {
    throw new Error("Potential secret/logging leak detected in server.js.");
}

const rateLimitMarkers = [
    "function getClientIp",
    "const ACTIVATION_RATE_LIMIT = 10",
    "requestAllowedWithLimit(req, ACTIVATION_RATE_LIMIT, activationRateBuckets)",
    "requestAllowedWithLimit(req, ADMIN_LOGIN_RATE_LIMIT, adminLoginRateBuckets)",
    "x-forwarded-for"
];
for (const marker of rateLimitMarkers) {
    if (!source.includes(marker)) throw new Error("Rate limiting hardening marker missing: " + marker);
}

if (!source.includes("X-Content-Type-Options") ||
    !source.includes("X-Frame-Options") ||
    !source.includes("Referrer-Policy")) {
    throw new Error("Required API security headers are missing.");
}

const caddySecurityMarkers = [
    "{$TAHOURI_API_DOMAIN} {",
    'Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    "Content-Security-Policy \"default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'\"",
    'X-Content-Type-Options "nosniff"',
    'X-Frame-Options "DENY"',
    'Referrer-Policy "no-referrer"'
];
for (const marker of caddySecurityMarkers) {
    if (!caddy.includes(marker)) throw new Error("Required Caddy security header missing: " + marker);
}

if (compose.includes("8787:8787")) throw new Error("License API port 8787 must not be publicly published.");
if (!compose.includes("tahouri_backup_encryption_key:") ||
    !compose.includes("TAHOURI_BACKUP_ENCRYPTION_KEY_FILE: /run/secrets/tahouri_backup_encryption_key")) {
    throw new Error("Production backup encryption key must use a Docker secret.");
}
if (!compose.includes("tahouri_private_key:") ||
    !compose.includes("TAHOURI_LICENSE_PRIVATE_KEY_FILE: /run/secrets/tahouri_private_key")) {
    throw new Error("Production signing key must use a Docker secret mount.");
}
if (!gitignore.includes("*.pem") || !gitignore.includes("secrets/")) {
    throw new Error("Production secret files must be ignored by Git.");
}

if (!dockerfile.includes("USER node") ||
    !dockerfile.includes("chown -R node:node /data /backups") ||
    !dockerfile.includes("COPY --chown=node:node")) {
    throw new Error("Production API container must run as non-root with writable, correctly owned data paths.");
}

const requiredServerMarkers = [
    "function safeLog",
    "function startupRecoveryCheck",
    "function migrateDatabase",
    "function gracefulShutdown",
    "/api/ready",
    "/api/metrics/alerts"
];
for (const marker of requiredServerMarkers) {
    if (!source.includes(marker)) throw new Error("Required production hardening marker missing: " + marker);
}

if (!backupDb.includes('const { encryptFile, readEncryptionKey } = require("./backup-crypto")') ||
    !backupCrypto.includes("aes-256-gcm") ||
    !backupCrypto.includes("crypto.createCipheriv") ||
    !backupCrypto.includes("crypto.createDecipheriv")) {
    throw new Error("Backup encryption implementation is missing.");
}

const productionLicenseMarkers = [
    "function isRemoteProductionMode",
    "if (isRemoteProductionMode())",
    "فعال‌سازی محلی در نسخه production مجاز نیست."
];
for (const marker of productionLicenseMarkers) {
    if (!licenseManager.includes(marker)) throw new Error("Production license safety marker missing: " + marker);
}
if (!activationGate.includes('const productionMode = serviceConfig.mode === "production";')) {
    throw new Error("Activation gate production mode guard is missing.");
}

const workerMarkers = [
    "async function activateLicense",
    'url.pathname === "/api/licenses/activate"',
    'url.pathname === "/api/licenses/status"',
    "async function signEntitlement",
    "LICENSE_PRIVATE_KEY_PEM",
    "licenseActivation: signingReady",
    "content-security-policy"
];
for (const marker of workerMarkers) {
    if (!worker.includes(marker)) throw new Error("Cloudflare Worker security/capability marker missing: " + marker);
}
if (/onclick=/i.test(worker) || /onkeydown=/i.test(worker) || /\sstyle\s*=/i.test(worker)) {
    throw new Error("Cloudflare admin HTML contains inline event or style attributes.");
}

console.log("Tahouri License API and Cloudflare Worker security tests: PASS");
