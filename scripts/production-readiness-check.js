"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const blockers = [];

const configSource = fs.readFileSync(
    path.join(root, "engine/core/tahouriServiceConfig.js"),
    "utf8"
);
const context = {
    window: { location: { hostname: "asada100.github.io" } },
    console: { log() {}, warn() {}, error() {} }
};

try {
    vm.runInNewContext(configSource, context);
} catch (error) {
    blockers.push("Service configuration cannot be evaluated: " + error.message);
}

const config = context.window.TahouriServiceConfig;
if (!config) {
    blockers.push("TahouriServiceConfig is missing.");
} else {
    if (config.mode !== "production") {
        blockers.push("Public Pages configuration is still in test mode.");
    }

    try {
        const api = new URL(config.apiBaseUrl);
        if (api.protocol !== "https:" || /^(localhost|127\\.0\\.0\\.1)$/i.test(api.hostname)) {
            blockers.push("Production API URL must be HTTPS and must not point to localhost.");
        }
    } catch {
        blockers.push("Production API URL is missing or invalid.");
    }

    if (typeof config.publicKeyPem !== "string" ||
        !config.publicKeyPem.includes("-----BEGIN PUBLIC KEY-----")) {
        blockers.push("A pinned production entitlement public key is not configured.");
    }
}

const requiredFiles = [
    "services/license-api/worker.js",
    "services/license-api/activation-service.js",
    "services/license-api/entitlement-crypto.js",
    "services/license-api/student-profile-service.js",
    "services/license-api/migrations/0001_initial_schema.sql",
    "services/license-api/migrations/0002_admin_login_attempts.sql",
    "services/license-api/migrations/0003_student_bound_activation_codes.sql",
    "services/license-api/migrations/0004_student_accounts.sql",
    "services/license-api/migrations/0005_student_profiles.sql"
];

for (const relative of requiredFiles) {
    if (!fs.existsSync(path.join(root, relative))) {
        blockers.push("Production licensing source or migration is missing from Git: " + relative);
    }
}

const workerPath = path.join(root, "services/license-api/worker.js");
if (fs.existsSync(workerPath)) {
    const worker = fs.readFileSync(workerPath, "utf8");
    if (!worker.includes("activateStudentBoundCode") || !worker.includes("/api/activate")) {
        blockers.push("Version-controlled Worker does not expose the student-bound activation flow.");
    }
    if (/licenseActivation\\s*:\\s*false/.test(worker)) {
        blockers.push("Worker health contract still reports license activation disabled.");
    }
}

if (blockers.length) {
    console.error("PRODUCTION READINESS: BLOCKED");
    for (const blocker of blockers) console.error("- " + blocker);
    console.error("Do not publish the Pages build until the Worker, D1 migrations, and public key are aligned and tested.");
    process.exitCode = 1;
} else {
    console.log("PRODUCTION READINESS: PASS");
}
