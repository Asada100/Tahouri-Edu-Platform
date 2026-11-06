"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

const requiredFiles = [
    "docker-compose.production.yml",
    "services/license-api/Dockerfile",
    "services/license-api/Caddyfile.production.example",
    "services/license-api/.env.production.example",
    "services/license-api/preflight-production.js",
    "services/license-api/backup-db.js",
    "services/license-api/verify-backup.js",
    "services/license-api/restore-rehearsal.js",
    "services/license-api/security-test.js",
    "services/license-api/backup-crypto.js",
    "services/license-api/integration-test.js",
    "services/license-api/release-smoke-test.js",
    "services/license-api/worker.js",
    "services/license-api/worker-activation-test.js",
    "services/license-api/wrangler.toml",
    "services/license-api/migrations/0001_initial_schema.sql",
    "services/license-api/migrations/0002_admin_login_attempts.sql",
    ".github/workflows/license-api-ci.yml"
];

const missing = requiredFiles.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
    throw new Error("Missing release artifact(s): " + missing.join(", "));
}

const compose = fs.readFileSync(path.join(root, "docker-compose.production.yml"), "utf8");
const envExample = fs.readFileSync(path.join(__dirname, ".env.production.example"), "utf8");

const composeMarkers = [
    "caddy:",
    "tahouri-license-api:",
    "TAHOURI_API_DOMAIN",
    "tahouri_private_key",
    "tahouri_license_data",
    "tahouri_license_backups"
];

for (const marker of composeMarkers) {
    if (!compose.includes(marker)) {
        throw new Error("Production compose marker missing: " + marker);
    }
}

const envMarkers = [
    "NODE_ENV=production",
    "TAHOURI_ADMIN_PASSWORD=",
    "TAHOURI_PAYMENT_PROVIDER=",
    "TAHOURI_ADMIN_ORIGIN=",
    "TAHOURI_API_DOMAIN=",
    "TAHOURI_APP_ORIGIN=",
    "TAHOURI_LICENSE_DB_FILE=",
    "TAHOURI_LICENSE_BACKUP_DIR=",
    "TAHOURI_LICENSE_PRIVATE_KEY_FILE=",
    "TAHOURI_BACKUP_ENCRYPTION_KEY_FILE=",
    "TAHOURI_PAYMENT_CALLBACK_URL="
];

for (const marker of envMarkers) {
    if (!envExample.includes(marker)) {
        throw new Error("Production environment template marker missing: " + marker);
    }
}

const worker = fs.readFileSync(path.join(__dirname, "worker.js"), "utf8");
for (const marker of [
    "async function activateLicense",
    'url.pathname === "/api/licenses/activate"',
    'url.pathname === "/api/licenses/status"',
    "async function signEntitlement",
    "LICENSE_PRIVATE_KEY_PEM"
]) {
    if (!worker.includes(marker)) throw new Error("Cloudflare Worker capability missing: " + marker);
}

if (/\\son[a-z]+\\s*=/i.test(worker) || /\\sstyle\\s*=/i.test(worker)) {
    throw new Error("Cloudflare admin HTML contains inline event or style attributes.");
}
if (!worker.includes("content-security-policy") || !worker.includes("document.addEventListener")) {
    throw new Error("Cloudflare admin HTML is missing its strict CSP or delegated event handlers.");
}

const wrangler = fs.readFileSync(path.join(__dirname, "wrangler.toml"), "utf8");
for (const marker of ['name = "tahouri-license-api"', 'binding = "DB"', 'database_id = "bc958420-184a-43ff-b728-069654f58058"']) {
    if (!wrangler.includes(marker)) throw new Error("Cloudflare Worker configuration marker missing: " + marker);
}

console.log("Tahouri License API release artifact check: PASS");
