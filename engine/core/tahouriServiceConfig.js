// =====================================
// Tahouri Service Configuration
// Version 1.1
// =====================================
// Central configuration only.
// No secret belongs in this file.

(function () {
    "use strict";

    const CONFIG = {
        enabled: true,
        mode: "test",
        apiBaseUrl: "http://localhost:8787/api",
        requestTimeoutMs: 8000,
        appVersion: "5.1.0",
        updateManifestUrl: "",
        productId: "tahouri-edu",
        entitlementVersion: 1,

        // Production: pin the real public key here.
        // Test mode obtains the development public key
        // from the local development license API.
        publicKeyPem: ""
    };

    window.TahouriServiceConfig = Object.freeze(CONFIG);

    console.log("Tahouri Service Config v1.1 Ready");
})();