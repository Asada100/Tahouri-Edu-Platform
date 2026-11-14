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

        // The public key is served over HTTPS by the production License API.
        // Never place the private signing key in client-side files.
        publicKeyPem: ""
    };

    window.TahouriServiceConfig = Object.freeze(CONFIG);

    console.log("Tahouri Service Config v1.2 Ready");
})();
