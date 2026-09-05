// =====================================
// Tahouri Edu Platform
// Welcome Manager v1.0
//
// Purpose:
// - Personalize the Home welcome message
// - Use the active Student Profile as source of truth
// - Do not create duplicate profile storage
// - Keep existing Screen / Daily Message behavior intact
// =====================================


const WelcomeManager = {

    VERSION: "1.0",


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


        // The first direct paragraph under
        // the Home .screen is the existing
        // generic welcome message.
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


        if (Screen.showHome.__welcomeManagerWrapped) {

            return;

        }


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


        console.log(
            "WelcomeManager v1.0 Ready"
        );

    }

};


WelcomeManager.init();
