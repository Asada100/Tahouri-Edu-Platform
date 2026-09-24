// =====================================
// Tahouri Entitlement Store
// Version 1.0
// =====================================

(function () {
    "use strict";

    const KEY = "Tahouri_Signed_Entitlement_v1";

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.error("EntitlementStore: Read failed.", error);
            return null;
        }
    }

    function write(entitlement) {
        try {
            localStorage.setItem(KEY, JSON.stringify(entitlement));
            return true;
        } catch (error) {
            console.error("EntitlementStore: Write failed.", error);
            return false;
        }
    }

    function clear() {
        try {
            localStorage.removeItem(KEY);
            return true;
        } catch (error) {
            console.error("EntitlementStore: Clear failed.", error);
            return false;
        }
    }

    window.TahouriEntitlementStore = {
        read,
        write,
        clear,
        key: KEY
    };

    console.log("Tahouri Entitlement Store v1.0 Ready");
})();