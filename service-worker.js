// =====================================
// Tahouri Edu Platform
// Push Service Worker
// Version 1.1
// =====================================

self.addEventListener("install", function () {
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (error) {
        data = {
            title: "یادآوری طهوری",
            body: event.data ? event.data.text() : "وقت یادگیریه! 📚"
        };
    }

    const title = data.title || "پلتفرم آموزشی طهوری";
    const options = {
        body: data.body || "وقت یادگیریه! 📚",
        icon: data.icon || "",
        badge: data.badge || "",
        tag: data.tag || "tahouri-push",
        renotify: false,
        data: {
            url: data.url || "./"
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const targetUrl =
        event.notification.data &&
        event.notification.data.url
            ? event.notification.data.url
            : "./";

    let destination;
    try {
        const requested = new URL(targetUrl, self.location.href);
        destination = requested.origin === self.location.origin
            ? requested.href
            : new URL("./", self.location.href).href;
    } catch (error) {
        destination = new URL("./", self.location.href).href;
    }

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(async function (clients) {
                const client = clients.find(function (item) {
                    try {
                        return new URL(item.url).origin === self.location.origin;
                    } catch (error) {
                        return false;
                    }
                });

                if (client) {
                    if (typeof client.navigate === "function") {
                        try {
                            await client.navigate(destination);
                        } catch (error) {
                            // Focusing the existing app window is still useful.
                        }
                    }

                    if (typeof client.focus === "function") {
                        return client.focus();
                    }
                }

                if (self.clients.openWindow) {
                    return self.clients.openWindow(destination);
                }

                return null;
            })
    );
});

console.log("Tahouri Push Service Worker v1.1 Ready");