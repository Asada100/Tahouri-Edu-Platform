// =====================================
// Tahouri Edu Platform
// Push Service Worker
// Version 1.2
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

    const scopeUrl = new URL(self.registration.scope || "./", self.location.href);
    let destination;

    try {
        const requested = new URL(targetUrl, scopeUrl.href);
        destination = requested.origin === scopeUrl.origin &&
            requested.pathname.startsWith(scopeUrl.pathname)
            ? requested.href
            : scopeUrl.href;
    } catch (error) {
        destination = scopeUrl.href;
    }

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(async function (clients) {
                const client = clients.find(function (item) {
                    try {
                        const clientUrl = new URL(item.url);
                        return clientUrl.origin === scopeUrl.origin &&
                            clientUrl.pathname.startsWith(scopeUrl.pathname);
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

console.log("Tahouri Push Service Worker v1.2 Ready");