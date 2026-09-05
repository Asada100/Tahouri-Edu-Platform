// =====================================
// Tahouri Edu Platform
// Welcome Manager v1.1
//
// Purpose:
// - Show the active student's greeting on the Dashboard
// - Keep the profile button as a profile control only
// - Place the greeting beside the daily motivational message
// - Use the active Student Profile as source of truth
// - Do not create duplicate profile storage
// - Keep existing Daily Message behavior intact
// =====================================


const WelcomeManager = {

    VERSION: "1.1",


    // =====================================
    // GET ACTIVE PROFILE NAME
    // =====================================

    getActiveProfileName: function () {

        try {

            if (
                typeof ProfileManager !== "undefined" &&
                typeof ProfileManager.get === "function"
            ) {

                const profile =
                    ProfileManager.get();

                if (
                    profile &&
                    typeof profile.name === "string"
                ) {

                    return profile.name.trim();

                }

            }

        }
        catch (error) {

            console.error(
                "WelcomeManager: Failed to read active profile",
                error
            );

        }

        return "";

    },


    // =====================================
    // PERSONALIZE HOME
    // =====================================

    personalizeHome: function () {

        const app =
            document.getElementById("app");

        if (!app) {

            return;

        }


        const name =
            this.getActiveProfileName();


        const welcomeElement =
            app.querySelector(".screen > p");


        if (!welcomeElement) {

            return;

        }


        if (name) {

            welcomeElement.textContent =
                `سلام ${name} عزیز 🌷`;

        }
        else {

            welcomeElement.textContent =
                "به مرکز کنترل پلتفرم خوش آمدید";

        }


        console.log(
            "WelcomeManager: Home personalized",
            {
                profileName: name || null
            }
        );

    },


    // =====================================
    // PERSONALIZE DASHBOARD
    // =====================================

    personalizeDashboard: function () {

        const dashboard =
            document.querySelector(".dashboard-screen");

        if (!dashboard) {

            return;

        }


        const welcome =
            dashboard.querySelector(".dashboard-welcome");

        const message =
            dashboard.querySelector(".dashboard-message");

        const messageCard =
            message
                ? message.closest(".dashboard-card")
                : null;

        const calendarCard =
            dashboard.querySelector(".learning-calendar-card");


        if (
            !welcome ||
            !messageCard ||
            !calendarCard
        ) {

            return;

        }


        // Prevent duplicate arrangement if the dashboard
        // is refreshed more than once during the session.
        if (
            dashboard.querySelector(
                ".dashboard-welcome-message-row"
            )
        ) {

            return;

        }


        // Remove the old separator that belonged to the
        // standalone welcome section.
        if (
            welcome.nextElementSibling &&
            welcome.nextElementSibling.tagName === "HR"
        ) {

            welcome.nextElementSibling.remove();

        }


        const row =
            document.createElement("div");

        row.className =
            "dashboard-welcome-message-row";


        // The greeting and the motivational message are
        // now two neighboring panels at the top of the dashboard.
        welcome.classList.add(
            "dashboard-welcome-panel"
        );

        messageCard.classList.add(
            "dashboard-message-panel"
        );


        row.appendChild(welcome);
        row.appendChild(messageCard);


        dashboard.insertBefore(
            row,
            calendarCard
        );


        // The profile button must remain only a profile control.
        const profileButton =
            document.getElementById("profileBtn");

        if (profileButton) {

            profileButton.textContent =
                "👤 پروفایل من";

        }


        console.log(
            "WelcomeManager: Dashboard greeting placed beside daily message"
        );

    },


    // =====================================
    // INTEGRATE WITH SCREEN
    // =====================================

    init: function () {

        if (
            typeof Screen === "undefined" ||
            typeof Screen.showHome !== "function"
        ) {

            console.error(
                "WelcomeManager: Screen.showHome not available"
            );

            return;

        }


        if (!Screen.showHome.__welcomeManagerWrapped) {

            const originalShowHome =
                Screen.showHome;


            const personalizedShowHome =
                function () {

                    originalShowHome.apply(
                        Screen,
                        arguments
                    );

                    WelcomeManager.personalizeHome();

                };


            personalizedShowHome.__welcomeManagerWrapped = true;

            personalizedShowHome.__originalShowHome =
                originalShowHome;


            Screen.showHome =
                personalizedShowHome;

        }


        // Dashboard is rendered by Screen/DashboardController.
        // Arrange its existing welcome and message blocks after render.
        if (
            typeof Screen.showDashboard === "function" &&
            !Screen.showDashboard.__welcomeManagerWrapped
        ) {

            const originalShowDashboard =
                Screen.showDashboard;


            const personalizedShowDashboard =
                function () {

                    originalShowDashboard.apply(
                        Screen,
                        arguments
                    );

                    WelcomeManager.personalizeDashboard();

                };


            personalizedShowDashboard.__welcomeManagerWrapped = true;

            personalizedShowDashboard.__originalShowDashboard =
                originalShowDashboard;


            Screen.showDashboard =
                personalizedShowDashboard;

        }


        console.log(
            "WelcomeManager v1.1 Ready"
        );

    }

};


WelcomeManager.init();
