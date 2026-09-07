// =====================================
// Tahouri Edu Platform
// Header Manager
// Version 1.1
// =====================================

const HeaderManager = {

    init: function () {
        if (!document.body || !document.getElementById("app")) return;
        if (this._observer) return;

        this._observer = new MutationObserver(() => this.enhance());
        this._observer.observe(document.getElementById("app"), {
            childList: true,
            subtree: true
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

    enhance: function () {
        const app = document.getElementById("app");
        if (!app) return;

        const screen = app.querySelector(":scope > .screen");
        if (!screen || this.isActivityScreen(screen)) return;

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

            header.querySelector(".tahouri-header-notification").onclick = function () {
                if (
                    typeof NotificationScreen !== "undefined" &&
                    typeof NotificationScreen.open === "function"
                ) {
                    NotificationScreen.open();
                }
            };

            header.querySelector(".tahouri-header-menu").onclick = function () {
                if (typeof ToastManager !== "undefined") {
                    ToastManager.info("منوی برنامه در حال آماده‌سازی است.");
                }
            };
        }

        this.updateBell();
    },

    updateBell: function () {
        const badge = document.querySelector(".tahouri-notification-badge");
        if (!badge || typeof NotificationStore === "undefined") return;

        const count = NotificationStore.unreadCount();
        badge.textContent = count > 9 ? "۹+" : String(count);
        badge.hidden = count === 0;
    }
};

window.HeaderManager = HeaderManager;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
        HeaderManager.init();
    });
} else {
    HeaderManager.init();
}

console.log("Header Manager v1.1 Ready");
