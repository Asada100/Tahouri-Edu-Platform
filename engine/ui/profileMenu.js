// =====================================
// Tahouri Edu Platform
// Profile Menu
// Version 3.0
// =====================================

const ProfileMenu = {

    isOpen: false,

    open: function () {

        if (this.isOpen) {

            this.close();
            return;

        }

        const oldMenu =
            document.getElementById("profileMenu");

        if (oldMenu) {

            oldMenu.remove();

        }

        const menu =
            document.createElement("div");

        menu.id = "profileMenu";

        menu.className = "profile-menu";

        menu.innerHTML = `

            <div class="profile-menu-header">

                <div class="profile-avatar">
                    👤
                </div>

                <div class="profile-name">
                    دانش آموز
                </div>

            </div>

            <button id="profileBtn">
                👤 پروفایل
            </button>

            <button id="achievementBtn">
                🏆 دستاوردها
            </button>

            <button id="reportsBtn">
                📊 گزارش عملکرد
            </button>

            <button id="settingsBtn">
                ⚙ تنظیمات
            </button>

            <button id="helpBtn">
                ❓ راهنما
            </button>

            <button id="aboutBtn">
                ℹ درباره برنامه
            </button>

        `;

        document.body.appendChild(menu);

        this.bindEvents();

        this.isOpen = true;

        console.log(
            "Profile Menu Opened"
        );

    },

    close: function () {

        const menu =
            document.getElementById("profileMenu");

        if (menu) {

            menu.remove();

        }

        this.isOpen = false;

        console.log(
            "Profile Menu Closed"
        );

    },

    bindEvents: function () {

        const reports =
            document.getElementById("reportsBtn");

        if (reports) {

            reports.onclick = function () {

                ProfileMenu.close();

                if (
                    typeof ReportsController !== "undefined"
                ) {

                    ReportsController.open();

                }

            };

        }

        const achievement =
            document.getElementById("achievementBtn");

        if (achievement) {

            achievement.onclick = function () {

                ProfileMenu.close();

                alert(
                    "Achievements Screen (Coming Soon)"
                );

            };

        }

        const settings =
            document.getElementById("settingsBtn");

        if (settings) {

            settings.onclick = function () {

                ProfileMenu.close();

                alert(
                    "Settings Screen (Coming Soon)"
                );

            };

        }

        const profile =
            document.getElementById("profileBtn");

        if (profile) {

            profile.onclick = function () {

                ProfileMenu.close();

                alert(
                    "Profile Screen (Coming Soon)"
                );

            };

        }

        const help =
            document.getElementById("helpBtn");

        if (help) {

            help.onclick = function () {

                ProfileMenu.close();

                alert(
                    "Help (Coming Soon)"
                );

            };

        }

        const about =
            document.getElementById("aboutBtn");

        if (about) {

            about.onclick = function () {

                ProfileMenu.close();

                alert(
                    "Tahouri Edu Platform\nVersion 3.0"
                );

            };

        }

    }

};

window.ProfileMenu =
ProfileMenu;

console.log(
    "Profile Menu Ready"
);