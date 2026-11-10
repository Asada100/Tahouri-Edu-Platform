"use strict";

const net = require("node:net");

function normalizeIp(value) {
    const ip = String(value || "").trim().replace(/^\[|\]$/g, "");
    if (ip.startsWith("::ffff:")) {
        const mapped = ip.slice(7);
        return net.isIP(mapped) === 4 ? mapped : ip;
    }
    return ip;
}

function createClientIpResolver({ isProduction = false, trustedProxyIps = "" } = {}) {
    const trusted = new Set(
        String(trustedProxyIps)
            .split(",")
            .map(normalizeIp)
            .filter(ip => net.isIP(ip) !== 0)
    );

    return function getClientIp(req) {
        const remote = normalizeIp(req && req.socket && req.socket.remoteAddress) || "unknown";
        if (!isProduction || !trusted.has(remote)) return remote;

        const forwarded = String(req.headers && req.headers["x-forwarded-for"] || "");
        const chain = forwarded.split(",").map(normalizeIp).filter(ip => net.isIP(ip) !== 0);

        // A trusted edge proxy appends the client address to X-Forwarded-For.
        // Use the right-most valid entry; never trust a caller-controlled left-most value.
        return chain.length ? chain[chain.length - 1] : remote;
    };
}

module.exports = { createClientIpResolver, normalizeIp };
