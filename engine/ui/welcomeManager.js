// =====================================
// Tahouri Edu Platform
// Welcome Manager v1.1
//
// Purpose:
// - Show the active student's greeting beside the profile icon
// - Keep the platform title area free for the future program logo/image
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


        // =====================================
        // REMOVE GENERIC HOME GREETING
        //
        // The area below the platform title is
        // intentionally kept free for the future
        // program logo / image.
        // =====================================

        const genericWelcome =
            app.querySelector(".screen > h1 + p");

        if (genericWelcome) {

            genericWelcome.remove();

        }


        // =====================================
        // PROFILE GREETING
        //
        // The existing profile button already has
        // the profile icon. We place the student's
        // greeting directly beside that icon.
        // =====================================

        const profileButton =
            document.getElementById("profileBtn");


        if (!profileButton) {

            return;

        }


        if (name) {

            profileButton.textContent =
                `👤 ${name} عزیز 🌷`;

        }
        else {

            profileButton.textContent =
                "👤 پروفایل من";

        }


        console.log(
            "WelcomeManager: Profile greeting positioned",
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
            "WelcomeManager v1.1 Ready"
        );

    }

};


WelcomeManager.init();
