// =====================================
// Tahouri Edu Platform
// Push Manager
// Version 1.0
// =====================================

const PushManager = {

    SW_PATH: "service-worker.js",
    _registration: null,

    isSupported: function () {
        return (
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
        );
    },

    getPermission: function () {
        if (!("Notification" in window)) return "unsupported";
        return Notification.permission;
    },

    initialize: async function () {
        if (!this.isSupported()) {
            console.warn("PushManager: Push Not Supported");
            return false;
        }

        try {
            this._registration =
                await navigator.serviceWorker.register(this.SW_PATH, { scope: "./" });

            await navigator.serviceWorker.ready;

            console.log("PushManager: Service Worker Ready");
            return true;
        } catch (error) {
            console.error("PushManager: Service Worker Registration Failed", error);
            return false;
        }
    },

    requestPermission: async function () {
        if (!("Notification" in window)) return "unsupported";

        if (Notification.permission === "granted") return "granted";
        if (Notification.permission === "denied") return "denied";

        try {
            return await Notification.requestPermission();
        } catch (error) {
            console.error("PushManager: Permission Request Failed", error);
            return "denied";
        }
    },

    getSubscription: async function () {
        if (!this._registration) {
            const initialized = await this.initialize();
            if (!initialized) return null;
        }

        try {
            return await this._registration.pushManager.getSubscription();
        } catch (error) {
            console.error("PushManager: Get Subscription Failed", error);
            return null;
        }
    },

    subscribe: async function (applicationServerKey) {
        const permission = await this.requestPermission();
        if (permission !== "granted") return null;

        if (!applicationServerKey) {
            console.warn(
                "PushManager: No VAPID public key configured. Remote Push is not activated yet."
            );
            return null;
        }

        if (!this._registration) {
            const initialized = await this.initialize();
            if (!initialized) return null;
        }

        try {
            const existing =
                await this._registration.pushManager.getSubscription();

            if (existing) return existing;

            const subscription =
                await this._registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey
                });

            console.log("PushManager: Subscription Created");
            return subscription;
        } catch (error) {
            console.error("PushManager: Subscribe Failed", error);
            return null;
        }
    },

    unsubscribe: async function () {
        const subscription = await this.getSubscription();
        if (!subscription) return true;

        try {
            const result = await subscription.unsubscribe();
            console.log("PushManager: Subscription Removed", result);
            return result;
        } catch (error) {
            console.error("PushManager: Unsubscribe Failed", error);
            return false;
        }
    },

    getStatus: async function () {
        const supported = this.isSupported();
        const permission = this.getPermission();
        const subscription = supported ? await this.getSubscription() : null;

        return {
            supported: supported,
            permission: permission,
            subscribed: !!subscription,
            ready: !!this._registration
        };
    }
};

window.PushManager = PushManager;

console.log("Push Manager v1.0 Ready");
