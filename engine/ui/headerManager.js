// =====================================
// Tahouri Edu Platform
// Header Manager
// Version 2.4
// =====================================

const HeaderManager = {
    init: function () {
        const app = document.getElementById("app");
        if (!document.body || !app) return;
        if (this._observer) return;
        this._observer = new MutationObserver(() => this.enhance());
        this._observer.observe(app, { childList: true, subtree: false });
        this.enhance();
    },

    isActivityScreen: function (screen) {
        if (!screen) return true;
        const selectors = [
            "[id*='quiz']", "[id*='puzzle']", "[id*='memory']",
            "[class*='quiz']", "[class*='puzzle']", "[class*='memory']"
        ];
        return selectors.some(function (selector) {
            return !!screen.querySelector(selector);
        });
    },

    isNotificationScreen: function (screen) {
        return !!(screen && screen.querySelector(".notification-center-screen"));
    },

    isHomeScreen: function (screen) {
        if (!screen) return false;
        return !!screen.querySelector("#gradesBtn") && !!screen.querySelector("#profileBtn");
    },

    isDashboardScreen: function (screen) {
        return !!(screen && (
            screen.classList.contains("dashboard-screen") ||
            screen.querySelector(".dashboard-screen")
        ));
    },

    isProfileEditScreen: function (screen) {
        return !!(screen && (screen.matches(".profile-edit-screen") || screen.querySelector(".profile-edit-screen")));
    },

    isProfileListScreen: function (screen) {
        return !!(screen && screen.matches(".profiles-screen"));
    },

    isProfileCreateScreen: function (screen) {
        return !!(screen && (screen.matches(".profile-create-screen") || screen.querySelector(".profile-create-screen")));
    },

    getSectionTitle: function (screen) {
        if (!screen) return "طهوری";
        if (this.isDashboardScreen(screen)) return "داشبورد";
        if (this.isHomeScreen(screen)) return "طهوری";
        if (this.isProfileEditScreen(screen)) return "ویرایش پروفایل";
        if (this.isProfileListScreen(screen)) return "پروفایل‌های دانش‌آموزان";
        if (this.isProfileCreateScreen(screen)) return "افزودن دانش‌آموز";
        if (screen.querySelector(".profile-screen")) return "پروفایل من";
        if (screen.querySelector("#gradesContainer")) return "انتخاب پایه";
        if (screen.querySelector("#subjectsContainer")) return "انتخاب درس";
        if (screen.querySelector("#chaptersContainer")) return "انتخاب فصل";
        if (screen.querySelector("#activityList")) return "انتخاب فعالیت";
        if (screen.querySelector(".divisibilityScreen")) return "بخش‌پذیری";
        if (screen.querySelector(".report") || screen.querySelector("[class*='report']") || screen.querySelector("[id*='report']")) return "گزارش عملکرد";
        return "طهوری";
    },

    updateSectionTitle: function (header, screen) {
        const title = header.querySelector(".tahouri-header-section");
        if (title) title.textContent = this.getSectionTitle(screen);
    },

    getBackConfig: function (screen) {
        if (!screen || this.isHomeScreen(screen)) return null;
        if (this.isDashboardScreen(screen)) {
            return {
                label: "بازگشت به خانه",
                action: function () {
                    if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") Screen.showHome();
                }
            };
        }
        if (this.isProfileEditScreen(screen) || this.isProfileListScreen(screen) || this.isProfileCreateScreen(screen)) {
            return {
                label: "بازگشت به پروفایل من",
                action: function () {
                    if (typeof ProfileScreen !== "undefined" && typeof ProfileScreen.show === "function") ProfileScreen.show();
                }
            };
        }
        if (screen.querySelector("#gradesContainer")) {
            return { label: "بازگشت به خانه", action: function () { if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") Screen.showHome(); } };
        }
        if (screen.querySelector("#subjectsContainer")) {
            return { label: "بازگشت به پایه", action: function () { if (typeof Screen !== "undefined" && typeof Screen.showGrades === "function") Screen.showGrades(); } };
        }
        if (screen.querySelector("#chaptersContainer")) {
            return {
                label: "بازگشت به درس‌ها",
                action: function () {
                    if (typeof Screen !== "undefined" && typeof Screen.showSubjects === "function" && typeof AppState !== "undefined") Screen.showSubjects(AppState.grade);
                }
            };
        }
        if (screen.querySelector("#activityList")) {
            return {
                label: "بازگشت به فصل",
                action: function () {
                    if (typeof Screen !== "undefined" && typeof Screen.showChapters === "function" && typeof AppState !== "undefined") Screen.showChapters(AppState.grade, AppState.subject);
                }
            };
        }
        if (screen.querySelector(".divisibilityScreen")) {
            return {
                label: "بازگشت به فعالیت‌ها",
                action: function () {
                    if (typeof Screen !== "undefined" && typeof Screen.showActivities === "function" && typeof AppState !== "undefined") Screen.showActivities(AppState.grade, AppState.subject, AppState.chapter);
                }
            };
        }
        if (typeof AppState !== "undefined" && AppState.activity) {
            return {
                label: "بازگشت به فعالیت‌ها",
                action: function () {
                    if (typeof Screen !== "undefined" && typeof Screen.showActivities === "function") Screen.showActivities(AppState.grade, AppState.subject, AppState.chapter);
                }
            };
        }
        return { label: "بازگشت به خانه", action: function () { if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") Screen.showHome(); } };
    },

    ensureBackButton: function (header, screen) {
        let backButton = header.querySelector(".tahouri-header-back");
        const config = this.getBackConfig(screen);
        if (!config) { if (backButton) backButton.remove(); return; }
        if (!backButton) {
            backButton = document.createElement("button");
            backButton.className = "tahouri-header-back";
            backButton.type = "button";
            backButton.innerHTML = "←";
            header.appendChild(backButton);
        }
        backButton.setAttribute("aria-label", config.label);
        backButton.title = config.label;
        backButton.onclick = config.action;
    },

    cleanHomeActions: function (screen) {
        if (!this.isHomeScreen(screen)) return;
        ["gradesBtn", "reportsBtn", "settingsBtn"].forEach(function (id) {
            const button = document.getElementById(id);
            if (button) button.remove();
        });
    },

    enhance: function () {
        const app = document.getElementById("app");
        if (!app) return;
        const screen = app.querySelector(":scope > .screen");
        if (!screen || this.isActivityScreen(screen)) return;
        if (this.isNotificationScreen(screen)) return;
        const homeScreen = this.isHomeScreen(screen);
        let header = screen.querySelector(":scope > .tahouri-app-header");
        if (!header) {
            header = document.createElement("div");
            header.className = "tahouri-app-header";
            header.innerHTML = `
                <div class="tahouri-header-side"><button class="tahouri-header-menu" type="button" aria-label="منو">☰</button></div>
                <div class="tahouri-header-brand" aria-label="پلتفرم آموزشی طهوری"><span class="tahouri-header-logo">🌱</span><span class="tahouri-header-section">طهوری</span></div>
                <button class="tahouri-header-notification" type="button" aria-label="اعلان‌ها"><span class="tahouri-bell-icon">🔔</span><span class="tahouri-notification-badge" hidden>0</span></button>
            `;
            screen.insertBefore(header, screen.firstChild);
            const notificationButton = header.querySelector(".tahouri-header-notification");
            if (notificationButton) notificationButton.onclick = function () { if (typeof NotificationScreen !== "undefined" && typeof NotificationScreen.open === "function") NotificationScreen.open(); };
            const menuButton = header.querySelector(".tahouri-header-menu");
            if (menuButton) menuButton.onclick = function () { if (typeof ToastManager !== "undefined") ToastManager.info("منوی برنامه در حال آماده‌سازی است."); };
        }
        this.cleanHomeActions(screen);
        this.updateSectionTitle(header, screen);
        this.ensureBackButton(header, screen);
        if (homeScreen) this.injectHomeBanner(screen);
        this.updateBell();
        if (typeof BottomNavigation !== "undefined" && typeof BottomNavigation.updateActive === "function") BottomNavigation.updateActive();
    },

    injectHomeBanner: function (screen) {
        if (screen.querySelector(":scope > .tahouri-home-banner")) return;
        if (typeof HomeBannerManager === "undefined") return;
        const banner = HomeBannerManager.get();
        if (!banner || HomeBannerManager.isDismissed(banner.id)) return;
        const element = document.createElement("section");
        element.className = "tahouri-home-banner";
        element.setAttribute("aria-label", "پیشنهاد طهوری");
        element.innerHTML = `<div class="tahouri-home-banner-row"><div class="tahouri-home-banner-icon">${banner.icon}</div><div class="tahouri-home-banner-content"><h3>${banner.title}</h3><p>${banner.text}</p></div></div><div class="tahouri-home-banner-actions"><button type="button" data-banner-action="start">${banner.actionText}</button><button type="button" data-banner-action="dismiss">بعداً</button></div>`;
        const anchor = screen.querySelector(".daily-message-home");
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(element, anchor); else headerInsertAfter(element, screen);
        const start = element.querySelector("[data-banner-action='start']");
        if (start) start.onclick = function () { if (typeof Screen !== "undefined" && typeof Screen.showGrades === "function") Screen.showGrades(); };
        const dismiss = element.querySelector("[data-banner-action='dismiss']");
        if (dismiss) dismiss.onclick = function () { HomeBannerManager.dismiss(banner.id); element.remove(); };
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
    if (header && header.nextSibling) screen.insertBefore(element, header.nextSibling); else screen.appendChild(element);
}

window.HeaderManager = HeaderManager;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { HeaderManager.init(); });
else HeaderManager.init();
console.log("Header Manager v2.4 Ready");
