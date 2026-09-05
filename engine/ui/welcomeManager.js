// =====================================
// Tahouri Edu Platform
// Welcome Manager v1.2
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

    VERSION: "1.2",


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


        if (
            dashboard.querySelector(
                ".dashboard-welcome-message-row"
            )
        ) {

            return;

        }


        // Remove the old separator belonging to the
        // standalone welcome block.
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


        // IMPORTANT:
        // The profile button is NOT personalized here.
        // Its label remains "پروفایل من".

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
    // DASHBOARD OBSERVER
    // =====================================

    observeDashboard: function () {

        const app =
            document.getElementById("app");

        if (!app || this.dashboardObserver) {

            return;

        }


        const process =
            function () {

                if (
                    document.querySelector(
                        ".dashboard-screen"
                    )
                ) {

                    WelcomeManager.personalizeDashboard();

                }

            };


        this.dashboardObserver =
            new MutationObserver(
                function () {

                    process();

                }
            );


        this.dashboardObserver.observe(
            app,
            {
                childList: true,
                subtree: true
            }
        );


        process();

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


        this.observeDashboard();


        console.log(
            "WelcomeManager v1.2 Ready"
        );

    }

};


WelcomeManager.init();
