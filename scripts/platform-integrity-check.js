"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const failures = [];
const counts = { javascript: 0, json: 0, scripts: 0, styles: 0, links: 0, activities: 0, chapters: 0 };

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...walk(full));
        else if (entry.isFile()) files.push(full);
    }
    return files;
}

function readJson(relativePath) {
    const absolute = path.join(root, relativePath);
    try {
        return JSON.parse(fs.readFileSync(absolute, "utf8"));
    } catch (error) {
        failures.push(relativePath + ": invalid JSON (" + error.message + ")");
        return null;
    }
}

const files = walk(root);
const relativeFiles = new Set(files.map(file => path.relative(root, file).split(path.sep).join("/")));

for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (/\.(?:js|mjs|cjs)$/i.test(relative)) {
        counts.javascript++;
        try {
            execFileSync(process.execPath, ["--input-type=module", "--check"], {
                input: fs.readFileSync(file),
                stdio: ["pipe", "pipe", "pipe"]
            });
        } catch (error) {
            failures.push(relative + ": JavaScript syntax check failed (" +
                String(error.stderr || error.message).trim() + ")");
        }
    }

    if (/\.json$/i.test(relative)) {
        counts.json++;
        try {
            JSON.parse(fs.readFileSync(file, "utf8"));
        } catch (error) {
            failures.push(relative + ": invalid JSON (" + error.message + ")");
        }
    }
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scriptRefs = [...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
const linkRefs = [...index.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)].map(match => match[1]);
const styleRefs = linkRefs.filter(ref => /\.css(?:[?#]|$)/i.test(ref));

for (const [kind, refs] of [["script", scriptRefs], ["link", linkRefs]]) {
    for (const ref of refs) {
        if (/^(?:https?:|data:|\/\/)/i.test(ref)) continue;
        const clean = ref.split(/[?#]/, 1)[0].replace(/^\.\//, "");
        if (!relativeFiles.has(clean)) failures.push("index.html: missing " + kind + " reference " + ref);
    }
}
counts.scripts = scriptRefs.length;
counts.styles = styleRefs.length;
counts.links = linkRefs.length;

const assetPattern = /\.(?:png|jpe?g|svg|webp|gif|mp3|wav|ogg|m4a|mp4|ttf|woff2?)(?:[?#].*)?$/i;
let assetReferences = 0;

function assetExists(reference, sourceFile) {
    const value = String(reference || "").trim();
    if (
        !value ||
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:") ||
        value.startsWith("//") ||
        value.startsWith("#") ||
        value.startsWith("var(")
    ) return true;

    const clean = value.replace(/^["']|["']$/g, "").split(/[?#]/, 1)[0];
    const candidates = [
        path.resolve(path.dirname(path.join(root, sourceFile)), clean),
        path.resolve(root, clean.replace(/^\.\//, "")),
        ...(clean.startsWith("/") ? [path.resolve(root, clean.slice(1))] : [])
    ];
    return candidates.some(candidate => fs.existsSync(candidate));
}

function collectAssetStrings(value, output) {
    if (typeof value === "string") {
        if (assetPattern.test(value)) output.push(value);
    } else if (Array.isArray(value)) {
        value.forEach(item => collectAssetStrings(item, output));
    } else if (value && typeof value === "object") {
        Object.values(value).forEach(item => collectAssetStrings(item, output));
    }
}

for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (/\.css$/i.test(relative)) {
        const css = fs.readFileSync(file, "utf8");
        const refs = [...css.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/gi)].map(match => match[1]);
        for (const ref of refs) {
            if (!assetPattern.test(ref)) continue;
            assetReferences++;
            if (!assetExists(ref, relative)) failures.push(relative + ": missing CSS asset " + ref);
        }
    }

    if (/\.json$/i.test(relative)) {
        try {
            const value = JSON.parse(fs.readFileSync(file, "utf8"));
            const refs = [];
            collectAssetStrings(value, refs);
            for (const ref of refs) {
                if (ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("data:") || ref.startsWith("blob:") || ref.startsWith("//")) continue;
                assetReferences++;
                if (!assetExists(ref, relative)) failures.push(relative + ": missing data asset " + ref);
            }
        } catch {
            // The JSON validation pass above reports malformed files.
        }
    }
}
counts.assetReferences = assetReferences;

if (failures.length) {
    console.error("PLATFORM INTEGRITY: FAIL");
    for (const failure of failures) console.error("- " + failure);
    process.exitCode = 1;
} else {
    console.log("PLATFORM INTEGRITY: PASS");
    console.log(JSON.stringify(counts));
}
