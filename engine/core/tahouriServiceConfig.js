// =====================================
// Tahouri Service Configuration
// Version 1.2
// =====================================
// Central configuration only.
// No secret belongs in this file.

(function () {
    "use strict";

    const CONFIG = {
        enabled: true,
        mode: "production",
        apiBaseUrl: "https://tahouri-license-api.asadtahouri1986.workers.dev/api",
        requestTimeoutMs: 8000,
        appVersion: "5.1.0",
        updateManifestUrl: "",
        productId: "tahouri-edu",
        entitlementVersion: 1,

        // Public verification key only. The private signing key
        // remains inside the Cloudflare Worker.
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvhmSKnBfAiOJHgZRY2ax\nA8YZA4ie0nAZ4r2ysABPjNS6RppjQ5gm4pZIy9d4Py+VFUohox/g5vURMqIUrhJJ\nqpDGWv4367EMsqqVWBkaryF9RRje4OGzz8KBdwOdPm1OJkXWoiK4IGXmpCRsR/2z\nv7Md5iJFvL2/h++pQjUbbsvQH3v4B3orAjhH/oC2WQcp55L5nboUKc3jcrK42hSL\nAmH2y8JXS4g0uXUrcbcxu0eJKk0abX0P3fdoxe24FK4TQty63XkZ/YbNSZ7zblz9\nyTswEEmYD3TJlebdZptYHtKfQuc4xooa/dAOwmUKPG3Iv91Isn84mMxzcnpirG9h\nIwIDAQAB\n-----END PUBLIC KEY-----"
    };

    window.TahouriServiceConfig = Object.freeze(CONFIG);

    console.log("Tahouri Service Config v1.2 Ready");
})();
