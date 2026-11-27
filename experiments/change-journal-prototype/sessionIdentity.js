"use strict";

// Experimental session identity generator. Not wired into runtime.
function createSessionIdentityGenerator(cryptoProvider) {
    function formatUuidV4(bytes) {
        if (!(bytes instanceof Uint8Array) || bytes.length !== 16) {
            throw new TypeError("UUID v4 requires exactly 16 random bytes.");
        }
        const value = new Uint8Array(bytes);
        value[6] = (value[6] & 0x0f) | 0x40;
        value[8] = (value[8] & 0x3f) | 0x80;
        const hex = Array.from(value, byte => byte.toString(16).padStart(2, "0")).join("");
        return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" +
            hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
    }

    return function generateSessionId() {
        const provider = cryptoProvider ||
            (typeof globalThis !== "undefined" ? globalThis.crypto : null);

        if (!provider) {
            throw new Error("Secure cryptographic randomness is unavailable; session identity was not created.");
        }

        if (typeof provider.randomUUID === "function") {
            const id = provider.randomUUID();
            if (typeof id !== "string" ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
                throw new Error("crypto.randomUUID() returned an invalid UUID v4.");
            }
            return "activity-session-" + id.toLowerCase();
        }

        if (typeof provider.getRandomValues !== "function") {
            throw new Error("Secure crypto.getRandomValues() is unavailable; session identity was not created.");
        }

        const bytes = new Uint8Array(16);
        provider.getRandomValues(bytes);
        return "activity-session-" + formatUuidV4(bytes);
    };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { createSessionIdentityGenerator };
}
if (typeof window !== "undefined") {
    window.TahouriExperimentalSessionIdentity = Object.freeze({ createSessionIdentityGenerator });
}
