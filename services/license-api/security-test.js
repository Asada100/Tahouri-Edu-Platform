"use strict";

const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const source = fs.readFileSync(serverPath, "utf8");

const forbidden = [
    /console\.log\([^\n]*(?:password|secret|token|authority|private.?key|api.?key)/i,
    /TAHOURI_ADMIN_PASSWORD\s*=\s*["'][^"']+["']/i,
    /TAHOURI_LICENSE_PRIVATE_KEY_FILE\s*=\s*["'][^"']+["']/i
];

const failures = forbidden.filter(pattern => pattern.test(source));
if (failures.length) {
    throw new Error("Potential secret/logging leak detected in server.js.");
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
