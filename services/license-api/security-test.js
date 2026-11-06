"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
const compose = fs.readFileSync(path.join(root, "docker-compose.production.yml"), "utf8");
const caddy = fs.readFileSync(path.join(__dirname, "Caddyfile.production.example"), "utf8");

if (!source.includes("X-Content-Type-Options") || !source.includes("X-Frame-Options") || !source.includes("Referrer-Policy")) {
    throw new Error("Required API security headers are missing.");
}

const caddySecurityMarkers = [
    'Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    "Content-Security-Policy \"default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'\"",
    'X-Content-Type-Options "nosniff"',
    'X-Frame-Options "DENY"',
    'Referrer-Policy "no-referrer"'
];

for (const marker of caddySecurityMarkers) {
    if (!caddy.includes(marker)) {
        throw new Error("Required Caddy security header missing: " + marker);
    }
}

if (compose.includes('8787:8787')) {
    throw new Error("License API port 8787 must not be publicly published.");
}
if (!compose.includes("tahouri_backup_encryption_key:") ||
    !compose.includes("TAHOURI_BACKUP_ENCRYPTION_KEY_FILE: /run/secrets/tahouri_backup_encryption_key")) {
    throw new Error("Production backup encryption key must use a Docker secret.");
}

if (!compose.includes("tahouri_private_key:")) {
    throw new Error("Production signing key must use a Docker secret.");
}
if (!compose.includes("TAHOURI_LICENSE_PRIVATE_KEY_FILE: /run/secrets/tahouri_private_key")) {
    throw new Error("Production signing key path must use the Docker secret mount.");
}

console.log("License API security configuration: PASS");
