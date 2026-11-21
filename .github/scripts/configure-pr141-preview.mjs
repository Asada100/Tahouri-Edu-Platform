#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";

const configPath = process.argv[2];
const apiBaseUrl = process.env.PR141_PREVIEW_API_BASE_URL || "";
if (!configPath) throw new Error("Usage: node configure-pr141-preview.mjs <staged-config-path>");

const parsed = new URL(apiBaseUrl);
if (parsed.protocol !== "https:" ||
    parsed.hostname !== "tahouri-pr141-device-e2e-20261119.asadtahouri1986.workers.dev" ||
    parsed.pathname !== "/api" || parsed.search || parsed.hash) {
    throw new Error("PR141 preview must target only the isolated test Worker /api endpoint.");
}

const absolutePath = path.resolve(configPath);
let source = fs.readFileSync(absolutePath, "utf8");
const replacements = [
    [/mode: "production"/g, 'mode: "pr141-isolated-test"'],
    [/apiBaseUrl: "https:\/\/tahouri-license-api\.asadtahouri1986\.workers\.dev\/api"/g,
        'apiBaseUrl: "' + apiBaseUrl + '"'],
    [/publicKeyPem: "[^"]*"/g,
        'publicKeyPem: ""']
];

for (const [pattern, replacement] of replacements) {
    const matches = source.match(pattern);
    if (!matches || matches.length !== 1) {
        throw new Error("Expected exactly one service config match for " + pattern);
    }
    source = source.replace(pattern, replacement);
}

if (source.includes("tahouri-license-api.asadtahouri1986.workers.dev") ||
    !source.includes('mode: "pr141-isolated-test"') ||
    !source.includes('apiBaseUrl: "' + apiBaseUrl + '"') ||
    !source.includes('publicKeyPem: ""')) {
    throw new Error("Preview config isolation verification failed.");
}

fs.writeFileSync(absolutePath, source, "utf8");
console.log("PASS: preview config points only to isolated PR141 Worker; production key pin removed.");
