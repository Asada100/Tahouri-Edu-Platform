"use strict";

const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const source = fs.readFileSync(serverPath, "utf8");
const composePath = path.join(__dirname, "../../docker-compose.production.yml");
const compose = fs.readFileSync(composePath, "utf8");
const gitignorePath = path.join(__dirname, "../../.gitignore");
const gitignore = fs.readFileSync(gitignorePath, "utf8");

const forbidden = [
    /console\.log\([^\n]*(?:password|secret|token|authority|private.?key|api.?key)/i,
    /TAHOURI_ADMIN_PASSWORD\s*=\s*["'][^"']+["']/i,
    /TAHOURI_LICENSE_PRIVATE_KEY_FILE\s*=\s*["'][^"']+["']/i
];

const failures = forbidden.filter(pattern => pattern.test(source));
if (failures.length) {
    throw new Error("Potential secret/logging leak detected in server.js.");
}

if (!source.includes("X-Content-Type-Options") || !source.includes("X-Frame-Options") || !source.includes("Referrer-Policy")) {
    throw new Error("Required security headers are missing.");
}

if (compose.includes('8787:8787')) {
    throw new Error("License API port 8787 must not be publicly published.");
}
if (!compose.includes("tahouri_private_key:")) {
    throw new Error("Production signing key must use a Docker secret.");
}
if (!compose.includes("TAHOURI_LICENSE_PRIVATE_KEY_FILE: /run/secrets/tahouri_private_key")) {
    throw new Error("Production signing key path must use the Docker secret mount.");
}
if (!gitignore.includes("*.pem") || !gitignore.includes("secrets/")) {
    throw new Error("Production secret files must be ignored by Git.");
}

const required = [
    "function safeLog",
    "function startupRecoveryCheck",
    "function migrateDatabase",
    "function gracefulShutdown",
    "/api/ready",
    "/api/metrics/alerts"
];

for (const marker of required) {
    if (!source.includes(marker)) {
        throw new Error("Required production hardening marker missing: " + marker);
    }
}

console.log("Tahouri License API security test: PASS");
