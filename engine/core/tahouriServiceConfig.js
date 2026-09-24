// =====================================
// Tahouri Service Configuration
// Version 1.0
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
        publicKeyPem: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr6GUnkolCYZCnPGMC0/h
olqsuZ2Y55ogUWfvb4+YsIsd3Xd2uvW8wTanmOn2mKSC1s8OaxbusQjF5MvCEzCK
OFDnlexWyk4Bv0awVEgbnaZfnoxf3SGDe6kN+2qHIkgsUlvfQ5d2kcwGhJ77EGMt
Fu0BQSKMj8ezqBlMcEO3c2ruKP6KSUHempzbG1EB2+0rjWcnamu8NJLXQasy0tPz
mhtXI6usQrK055CdXIpzZomU9ZXMdzRbT7BB95M2BT4GbILlzNthzBZNyCbscgR+
HOdqsNDIucZAwdaJyWasNy1dl0dipSxpbq6Yp6uI5LANBnaNNlERz+zTQG1yjgUZ
lwIDAQAB
-----END PUBLIC KEY-----`
    };

    window.TahouriServiceConfig = Object.freeze(CONFIG);

    console.log("Tahouri Service Config v1.0 Ready");
})();