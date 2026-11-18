// Tahouri per-installation cryptographic identity (WebCrypto).
// Standalone groundwork; not yet integrated into activation or pairing routes.
(function () {
    "use strict";
    const DB_NAME = "TahouriDeviceIdentity";
    const DB_VERSION = 1;
    const STORE = "identity";
    const ID_KEY = "installation";

    function openDb() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) return reject(new Error("ذخیره‌سازی امن هویت دستگاه در این مرورگر در دسترس نیست."));
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
            };
            request.onerror = () => reject(request.error || new Error("بازکردن مخزن هویت ناموفق بود."));
            request.onsuccess = () => resolve(request.result);
        });
    }

    function read(db) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const request = tx.objectStore(STORE).get(ID_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error("خواندن هویت ناموفق بود."));
        });
    }

    function write(db, value) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put(value, ID_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("ذخیره هویت ناموفق بود."));
            tx.onabort = () => reject(tx.error || new Error("ذخیره هویت لغو شد."));
        });
    }

    function createInstallationId() {
        if (crypto.randomUUID) return "inst_" + crypto.randomUUID();
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
        return "inst_" + hex.slice(0,8) + "-" + hex.slice(8,12) + "-" + hex.slice(12,16) + "-" + hex.slice(16,20) + "-" + hex.slice(20);
    }

    function base64(bytes) {
        let binary = "";
        for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
        return btoa(binary);
    }

    async function getOrCreate() {
        if (!window.crypto || !crypto.subtle || !crypto.subtle.generateKey) {
            throw new Error("WebCrypto در این محیط پشتیبانی نمی‌شود؛ هویت دستگاه ساخته نشد.");
        }
        const db = await openDb();
        try {
            let identity = await read(db);
            if (identity && identity.privateKey && identity.publicKey && identity.installationId) {
                return { installationId: identity.installationId, publicKey: identity.publicKey };
            }
            const pair = await crypto.subtle.generateKey(
                { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" },
                false,
                ["sign", "verify"]
            );
            const publicDer = await crypto.subtle.exportKey("spki", pair.publicKey);
            const installationId = createInstallationId();
            const identityValue = {
                installationId,
                privateKey: pair.privateKey,
                publicKey: "-----BEGIN PUBLIC KEY-----\n" + base64(publicDer).match(/.{1,64}/g).join("\n") + "\n-----END PUBLIC KEY-----",
                createdAt: new Date().toISOString()
            };
            await write(db, identityValue);
            return { installationId, publicKey: identityValue.publicKey };
        } finally { db.close(); }
    }

    async function sign(message) {
        const db = await openDb();
        try {
            const identity = await read(db);
            if (!identity || !identity.privateKey) throw new Error("هویت این نصب هنوز ساخته نشده است.");
            const bytes = new TextEncoder().encode(String(message));
            const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", identity.privateKey, bytes);
            return { installationId: identity.installationId, signature: base64(signature) };
        } finally { db.close(); }
    }

    window.TahouriDeviceIdentity = Object.freeze({ getOrCreate, sign });
})();
