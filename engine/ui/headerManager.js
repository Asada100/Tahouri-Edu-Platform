// =====================================
// Tahouri Edu Platform
// Header Manager
// Version 2.1
// =====================================

const HeaderManager = {

    init: function () {
        const app = document.getElementById("app");
        if (!document.body || !app) return;
        if (this._observer) return;

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

    isProfileEditScreen: function (screen) {
        return !!(
            screen &&
            (
                screen.matches(".profile-edit-screen") ||
                screen.querySelector(".profile-edit-screen")
            )
        );
    },

    isProfileListScreen: function (screen) {
        return !!(
            screen &&
            screen.matches(".profiles-screen")
        );
    },

    isProfileCreateScreen: function (screen) {
        return !!(
            screen &&
            (
                screen.matches(".profile-create-screen") ||
                screen.querySelector(".profile-create-screen")
            )
        );
    },

    getSectionTitle: function (screen) {
        if (!screen) return "طهوری";
        if (this.isHomeScreen(screen)) return "طهوری";
        if (this.isProfileEditScreen(screen)) return "ویرایش پروفایل";
        if (this.isProfileListScreen(screen)) return "پروفایل‌های دانش‌آموزان";
        if (this.isProfileCreateScreen(screen)) return "افزودن دانش‌آموز";
        if (screen.querySelector(".profile-screen")) return "پروفایل من";
        if (screen.querySelector("#gradesContainer")) return "انتخاب پایه";
        if (screen.querySelector("#subjectsContainer")) return "انتخاب درس";
        if (screen.querySelector("#chaptersContainer")) return "انتخاب فصل";
        if (screen.querySelector("#activityList")) return "انتخاب فعالیت";
        if (
            screen.querySelector(".report") ||
            screen.querySelector("[class*='report']") ||
            screen.querySelector("[id*='report']")
        ) return "گزارش عملکرد";
        return "طهوری";
    },

    updateSectionTitle: function (header, screen) {
        const title = header.querySelector(".tahouri-header-section");
        if (title) title.textContent = this.getSectionTitle(screen);
    },

    getBackConfig: function (screen) {
        if (!screen || this.isHomeScreen(screen)) return null;

        if (this.isProfileEditScreen(screen)) {
            return {
                label: "بازگشت به پروفایل من",
                action: function () {
                    if (
                        typeof ProfileScreen !== "undefined" &&
                        typeof ProfileScreen.show === "function"
                    ) {
                        ProfileScreen.show();
                    }
                }
            };
        }

        if (this.isProfileListScreen(screen)) {
            return {
                label: "بازگشت به پروفایل من",
                action: function () {
                    if (
                        typeof ProfileScreen !== "undefined" &&
                        typeof ProfileScreen.show === "function"
                    ) {
                        ProfileScreen.show();
                    }
                }
            };
        }

        if (this.isProfileCreateScreen(screen)) {
            return {
                label: "بازگشت به پروفایل من",
                action: function () {
                    if (
                        typeof ProfileScreen !== "undefined" &&
                        typeof ProfileScreen.show === "function"
                    ) {
                        ProfileScreen.show();
                    }
                }
            };
        }

        if (screen.querySelector("#gradesContainer")) {
            return {
                label: "بازگشت به خانه",
                action: function () {
                    if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") {
                        Screen.showHome();
                    }
                }
            };
        }

        if (screen.querySelector("#subjectsContainer")) {
            return {
                label: "بازگشت به پایه",
                action: function () {
                    if (typeof Screen !== "undefined" && typeof Screen.showGrades === "function") {
                        Screen.showGrades();
                    }
                }
            };
        }

        if (screen.querySelector("#chaptersContainer")) {
            return {
                label: "بازگشت به درس‌ها",
                action: function () {
                    if (
                        typeof Screen !== "undefined" &&
                        typeof Screen.showSubjects === "function" &&
                        typeof AppState !== "undefined"
                    ) {
                        Screen.showSubjects(AppState.grade);
                    }
                }
            };
        }

        if (screen.querySelector("#activityList")) {
            return {
                label: "بازگشت به فصل",
                action: function () {
                    if (
                        typeof Screen !== "undefined" &&
                        typeof Screen.showChapters === "function" &&
                        typeof AppState !== "undefined"
                    ) {
                        Screen.showChapters(
                            AppState.grade,
                            AppState.subject
                        );
                    }
                }
            };
        }

        if (
            typeof AppState !== "undefined" &&
            AppState.activity
        ) {
            return {
                label: "بازگشت به فعالیت‌ها",
                action: function () {
                    if (
                        typeof Screen !== "undefined" &&
                        typeof Screen.showActivities === "function"
                    ) {
                        Screen.showActivities(
                            AppState.grade,
                            AppState.subject,
                            AppState.chapter
                        );
                    }
                }
            };
        }

        return {
            label: "بازگشت به خانه",
            action: function () {
                if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") {
                    Screen.showHome();
                }
            }
        };
    },

    ensureBackButton: function (header, screen) {
        let backButton = header.querySelector(".tahouri-header-back");
        const config = this.getBackConfig(screen);

        if (!config) {
            if (backButton) backButton.remove();
            return;
        }

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
        if (!screen) return;

        let header = screen.querySelector(":scope > .tahouri-app-header");

        if (!header) {
            header = document.createElement("div");
            header.className = "tahouri-app-header";
            header.innerHTML = `
                <button class="tahouri-header-menu" type="button" aria-label="منو">☰</button>
                <div class="tahouri-header-logo">طهوری</div>
                <div class="tahouri-header-section"></div>
                <button class="tahouri-header-notification" type="button" aria-label="اعلان‌ها">🔔</button>
            `;
            screen.insertBefore(header, screen.firstChild);
        }

        this.cleanHomeActions(screen);
        this.updateSectionTitle(header, screen);
        this.ensureBackButton(header, screen);

        if (typeof BottomNavigation !== "undefined" && typeof BottomNavigation.updateActive === "function") {
            BottomNavigation.updateActive();
        }
    }
};

console.log("Header Manager v2.1 Ready");
