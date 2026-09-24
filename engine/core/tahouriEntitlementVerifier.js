// =====================================
// Tahouri Signed Entitlement Verifier
// Version 1.0
// RSA-SHA256 / Web Crypto
// =====================================

(function () {
    "use strict";

    let importedKeyPromise = null;

    function pemToArrayBuffer(pem) {
        const base64 = pem
            .replace(/-----BEGIN PUBLIC KEY-----/g, "")
            .replace(/-----END PUBLIC KEY-----/g, "")
            .replace(/\s+/g, "");

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes.buffer;
    }

    function getPublicKey() {
        if (importedKeyPromise) return importedKeyPromise;

        const config = window.TahouriServiceConfig;

        if (!config || !config.publicKeyPem || !window.crypto?.subtle) {
            return Promise.reject(new Error("Web Crypto یا کلید عمومی در دسترس نیست."));
        }

        importedKeyPromise = crypto.subtle.importKey(
            "spki",
            pemToArrayBuffer(config.publicKeyPem),
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256"
            },
            false,
            ["verify"]
        );

        return importedKeyPromise;
    }

    function canonicalizeClaims(claims) {
        return JSON.stringify(claims);
    }

    function base64ToBytes(value) {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }

    async function verifyEnvelope(envelope) {
        if (!envelope || !envelope.claims || !envelope.signature) {
            return { valid: false, reason: "ساختار مجوز ناقص است." };
        }

        try {
            const key = await getPublicKey();
            const data = new TextEncoder().encode(
                canonicalizeClaims(envelope.claims)
            );

            const valid = await crypto.subtle.verify(
                {
                    name: "RSASSA-PKCS1-v1_5"
                },
                key,
                base64ToBytes(envelope.signature),
                data
            );

            if (!valid) {
                return { valid: false, reason: "امضای مجوز معتبر نیست." };
            }

            const claims = envelope.claims;
            const config = window.TahouriServiceConfig || {};

            if (claims.productId !== config.productId) {
                return { valid: false, reason: "مجوز مربوط به این محصول نیست." };
            }

            if (Number(claims.entitlementVersion) !== Number(config.entitlementVersion)) {
                return { valid: false, reason: "نسخه مجوز پشتیبانی نمی‌شود." };
            }

            if (!claims.licenseId || !claims.validUntil || !claims.academicYear) {
                return { valid: false, reason: "اطلاعات مجوز کامل نیست." };
            }

            const validUntil = new Date(claims.validUntil);

            if (Number.isNaN(validUntil.getTime())) {
                return { valid: false, reason: "تاریخ انقضای مجوز معتبر نیست." };
            }

            if (Date.now() >= validUntil.getTime()) {
                return { valid: false, reason: "مجوز منقضی شده است." };
            }

            return {
                valid: true,
                claims: claims
            };
        } catch (error) {
            console.error("EntitlementVerifier: Verification failed.", error);
            return { valid: false, reason: "اعتبارسنجی رمزنگاری مجوز انجام نشد." };
        }
    }

    window.TahouriEntitlementVerifier = {
        verifyEnvelope
    };

    console.log("Tahouri Entitlement Verifier v1.0 Ready");
})();