// =====================================
// Tahouri Edu Platform
// Notification Manager
// Version 1.0
// =====================================

const NotificationManager = {

    // =====================================
    // CHECK SUPPORT
    // =====================================

    isSupported: function () {

        return (
            "Notification" in window
        );

    },

    // =====================================
    // GET PERMISSION
    // =====================================

    getPermission: function () {

        if (!this.isSupported()) {

            return "unsupported";

        }

        return Notification.permission;

    },

    // =====================================
    // REQUEST PERMISSION
    // =====================================

    requestPermission: async function () {

        if (!this.isSupported()) {

            console.warn(
                "NotificationManager: Notifications Not Supported"
            );

            return "unsupported";

        }

        if (
            Notification.permission === "granted"
        ) {

            console.log(
                "NotificationManager: Permission Already Granted"
            );

            return "granted";

        }

        if (
            Notification.permission === "denied"
        ) {

            console.warn(
                "NotificationManager: Permission Denied"
            );

            return "denied";

        }

        try {

            const permission =
                await Notification.requestPermission();

            console.log(
                "NotificationManager: Permission:",
                permission
            );

            return permission;

        } catch (error) {

            console.error(
                "NotificationManager: Permission Request Failed",
                error
            );

            return "denied";

        }

    },

    // =====================================
    // SHOW NOTIFICATION
    // =====================================

    show: function (title, options) {

        if (!this.isSupported()) {

            console.warn(
                "NotificationManager: Notifications Not Supported"
            );

            return null;

        }

        if (
            Notification.permission !== "granted"
        ) {

            console.warn(
                "NotificationManager: Permission Not Granted"
            );

            return null;

        }

        try {

            const notification =
                new Notification(
                    title,
                    options || {}
                );

            console.log(
                "NotificationManager: Notification Shown",
                title
            );

            return notification;

        } catch (error) {

            console.error(
                "NotificationManager: Show Failed",
                error
            );

            return null;

        }

    },

    // =====================================
    // TEST NOTIFICATION
    // =====================================

    test: async function () {

        const permission =
            await this.requestPermission();

        if (
            permission !== "granted"
        ) {

            console.warn(
                "NotificationManager: Test Cancelled"
            );

            return null;

        }

        return this.show(
            "یادآوری طهوری",
            {
                body:
                    "این یک اعلان آزمایشی از پلتفرم طهوری است.",
                icon: "",
                tag:
                    "tahouri-test-notification"
            }
        );

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.NotificationManager =
    NotificationManager;


// =====================================
// READY
// =====================================

console.log(
    "Notification Manager v1.0 Ready"
);
