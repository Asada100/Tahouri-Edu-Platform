"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const adminDir = path.join(__dirname, "admin");
const html = fs.readFileSync(path.join(adminDir, "index.html"), "utf8");
const js = fs.readFileSync(path.join(adminDir, "admin.js"), "utf8");
const caddy = fs.readFileSync(path.join(__dirname, "Caddyfile.production.example"), "utf8");

assert.match(caddy, /Content-Security-Policy/);
for (const directive of [
    "default-src 'self'",
    "connect-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'"
]) {
    assert.ok(caddy.includes(directive), "Missing CSP directive: " + directive);
}

assert.doesNotMatch(html, /\son[a-z]+\s*=/i, "Inline event handlers are blocked by the production CSP.");

const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
const styleSources = [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css)["']/gi)].map(match => match[1]);

assert.deepEqual(scriptSources, ["/admin/admin.js"]);
assert.deepEqual(styleSources, ["/admin/admin.css"]);
assert.ok(fs.existsSync(path.join(adminDir, "admin.js")));
assert.ok(fs.existsSync(path.join(adminDir, "admin.css")));

const buttons = [...html.matchAll(/<button\b([^>]*)>/gi)];
assert.ok(buttons.length > 0, "Admin page should contain controls.");
for (const [, attributes] of buttons) {
    const id = attributes.match(/\bid=["']([^"']+)["']/i)?.[1];
    assert.ok(id, "Every admin button must have an id for external event binding.");
    assert.match(js, new RegExp('bind\\("' + id + '"\\s*,'), "No external event binding found for button: " + id);
}

for (const id of ["adminKey", "searchQ"]) {
    assert.ok(html.includes('id="' + id + '"'), "Missing keyboard input: " + id);
    assert.ok(js.includes('getElementById("' + id + '")'), "Missing keyboard event setup: " + id);
}

console.log("Production admin CSP compatibility: PASS");
