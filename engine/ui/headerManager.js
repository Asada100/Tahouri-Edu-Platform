// =====================================
// Tahouri Edu Platform
// Header Manager
// Version 1.4
// =====================================

const HeaderManager = {

    init: function () {
        const app = document.getElementById("app");
        if (!document.body || !app) return;
        if (this._observer) return;

        // Observe only screen replacement at the #app level.
        // Do NOT observe the whole subtree: HeaderManager itself adds
        // header/banner nodes and could otherwise retrigger on every
        // internal DOM mutation made by screens or activities.
        this._observer = new MutationObserver(() => this.enhance());
        this._observer.observe(app, {
            childList: true,
            subtree: false
        });

        this.enhance();
    },

    isActivityScreen: function (screen) {
        if (!screen) return true;

        const selectors = [
            "[id*='quiz']", "[id*='puzzle']", "[id*='memory']",
            "[id*='divisibility']", "[class*='quiz']", "[class*='puzzle']",
            "[class*='memory']", "[class*='divisibility']"
        ];

        return selectors.some(function (selector) {
            return !!screen.querySelector(selector);
        });
    },

    isNotificationScreen: function (screen) {
        return !!(
            screen &&
            screen.querySelector(".notification-center-screen")
        );
    },

    isHomeScreen: function (screen) {
        if (!screen) return false;
        return !!screen.querySelector("#gradesBtn") &&
            !!screen.querySelector("#profileBtn");
    },

    enhance: function () {
        const app = document.getElementById("app");
        if (!app) return;

        const screen = app.querySelector(":scope > .screen");
        if (!screen || this.isActivityScreen(screen)) return;
        if (this.isNotificationScreen(screen)) return;

        let header = screen.querySelector(":scope > .tahouri-app-header");

        if (!header) {
            header = document.createElement("div");
            header.className = "tahouri-app-header";
            header.innerHTML = `
                <div class="tahouri-header-side">
                    <button class="tahouri-header-menu" type="button" aria-label="منو">☰</button>
                </div>
                <div class="tahouri-header-brand" aria-label="پلتفرم آموزشی طهوری">
                    <span class="tahouri-header-logo">🌱</span>
                    <span>طهوری</span>
                </div>
                <button class="tahouri-header-notification" type="button" aria-label="اعلان‌ها">
                    <span class="tahouri-bell-icon">🔔</span>
                    <span class="tahouri-notification-badge" hidden>0</span>
                </button>
            `;

            screen.insertBefore(header, screen.firstChild);

            const notificationButton =
                header.querySelector(".tahouri-header-notification");

            if (notificationButton) {
                notificationButton.onclick = function () {
                    if (
                        typeof NotificationScreen !== "undefined" &&
                        typeof NotificationScreen.open === "function"
                    ) {
                        NotificationScreen.open();
                    }
                };
            }

            const menuButton =
                header.querySelector(".tahouri-header-menu");

            if (menuButton) {
                menuButton.onclick = function () {
                    if (typeof ToastManager !== "undefined") {
                        ToastManager.info("منوی برنامه در حال آماده‌سازی است.");
                    }
                };
            }
        }

        if (this.isHomeScreen(screen)) {
            this.injectHomeBanner(screen);
        }

        this.updateBell();
    },

    injectHomeBanner: function (screen) {
        if (screen.querySelector(":scope > .tahouri-home-banner")) return;
        if (typeof HomeBannerManager === "undefined") return;

        const banner = HomeBannerManager.get();
        if (!banner || HomeBannerManager.isDismissed(banner.id)) return;

        const element = document.createElement("section");
        element.className = "tahouri-home-banner";
        element.setAttribute("aria-label", "پیشنهاد طهوری");
        element.innerHTML = `
            <div class="tahouri-home-banner-row">
                <div class="tahouri-home-banner-icon">${banner.icon}</div>
                <div class="tahouri-home-banner-content">
                    <h3>${banner.title}</h3>
                    <p>${banner.text}</p>
                </div>
            </div>
            <div class="tahouri-home-banner-actions">
                <button type="button" data-banner-action="start">${banner.actionText}</button>
                <button type="button" data-banner-action="dismiss">بعداً</button>
            </div>
        `;

        const anchor = screen.querySelector(".daily-message-home");
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(element, anchor);
        } else {
            headerInsertAfter(element, screen);
        }

        const start = element.querySelector("[data-banner-action='start']");
        if (start) {
            start.onclick = function () {
                if (typeof Screen !== "undefined" && typeof Screen.showGrades === "function") {
                    Screen.showGrades();
                }
            };
        }

        const dismiss = element.querySelector("[data-banner-action='dismiss']");
        if (dismiss) {
            dismiss.onclick = function () {
                HomeBannerManager.dismiss(banner.id);
                element.remove();
            };
        }
    },

    updateBell: function () {
        const badge = document.querySelector(".tahouri-notification-badge");
        if (!badge || typeof NotificationStore === "undefined") return;

        const count = NotificationStore.unreadCount();
        badge.textContent = count > 9 ? "۹+" : String(count);
        badge.hidden = count === 0;
    }
};

function headerInsertAfter(element, screen) {
    const header = screen.querySelector(":scope > .tahouri-app-header");
    if (header && header.nextSibling) {
        screen.insertBefore(element, header.nextSibling);
    } else {
        screen.appendChild(element);
    }
}

window.HeaderManager = HeaderManager;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
        HeaderManager.init();
    });
} else {
    HeaderManager.init();
}

console.log("Header Manager v1.4 Ready");
