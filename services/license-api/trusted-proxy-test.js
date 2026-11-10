"use strict";

const assert = require("node:assert/strict");
const { createClientIpResolver } = require("./trusted-proxy");

const resolve = createClientIpResolver({
    isProduction: true,
    trustedProxyIps: "10.0.0.2, invalid-proxy"
});

assert.equal(resolve({
    socket: { remoteAddress: "203.0.113.9" },
    headers: { "x-forwarded-for": "198.51.100.7" }
}), "203.0.113.9", "Untrusted clients cannot choose their rate-limit IP.");

assert.equal(resolve({
    socket: { remoteAddress: "10.0.0.2" },
    headers: { "x-forwarded-for": "198.51.100.7, 203.0.113.44" }
}), "203.0.113.44", "For a trusted proxy, use the right-most appended client IP.");

assert.equal(resolve({
    socket: { remoteAddress: "10.0.0.2" },
    headers: { "x-forwarded-for": "attacker, not-an-ip" }
}), "10.0.0.2", "Malformed forwarded chains fail closed to the proxy address.");

assert.equal(resolve({
    socket: { remoteAddress: "::ffff:10.0.0.2" },
    headers: { "x-forwarded-for": "203.0.113.55" }
}), "203.0.113.55", "IPv4-mapped trusted proxy addresses are normalized.");

const developmentResolve = createClientIpResolver({
    isProduction: false,
    trustedProxyIps: "10.0.0.2"
});
assert.equal(developmentResolve({
    socket: { remoteAddress: "127.0.0.1" },
    headers: { "x-forwarded-for": "198.51.100.8" }
}), "127.0.0.1", "Development mode ignores forwarded headers.");

console.log("Trusted proxy IP resolution: PASS");
console.log("Untrusted X-Forwarded-For spoofing rejection: PASS");
console.log("Malformed and IPv4-mapped address handling: PASS");
