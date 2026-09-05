// =====================================
// Tahouri Edu Platform
// Welcome Manager v2.0
//
// Purpose:
// - Show the active student's greeting NEXT TO the daily message
// - Keep the Profile button unchanged
// - Do not move the greeting to Dashboard cards
// - Do not modify ProfileManager or DailyMessageManager
// =====================================


const WelcomeManager = {

    VERSION: "2.0",


    // =====================================
    // ACTIVE PROFILE NAME
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
                    typeof profile.name === "string" &&
                    profile.name.trim()
                ) {

                    return profile.name.trim();

                }

            }

        }
        catch (error) {

            console.error(
                "WelcomeManager: Profile read failed",
                error
            );

        }

        return "دانش‌آموز";

    },


    // =====================================
    // HOME GREETING + DAILY MESSAGE
    // =====================================

    personalizeHome: function () {

        const app =
            document.getElementById("app");

        if (!app) {

            return;

        }


        const screen =
            app.querySelector(".screen");

        const dailyMessage =
            app.querySelector(".daily-message-home");


        if (!screen || !dailyMessage) {

            return;

        }


        // Already arranged.
        if (
            app.querySelector(
                ".welcome-daily-message-row"
            )
        ) {

            return;

        }


        // The original Home greeting is the first
        // paragraph immediately after the main H1.
        const heading =
            screen.querySelector("h1");

        const oldGreeting =
            heading
                ? heading.nextElementSibling
                : null;


        // Create the greeting panel exactly beside
        // the existing "پیام امروز" panel.
        const greeting =
            document.createElement("div");

        greeting.className =
            "welcome-daily-greeting";

        greeting.innerHTML = `

            <div class="welcome-daily-greeting-icon">
                👋
            </div>

            <div>

                <h2>
                    سلام ${this.getActiveProfileName()} عزیز
                </h2>

                <p>
                    خوش آمدی! آماده‌ای امروز هم یاد بگیری؟ 🌱
                </p>

            </div>

        `;


        const row =
            document.createElement("div");

        row.className =
            "welcome-daily-message-row";


        row.appendChild(greeting);
        row.appendChild(dailyMessage);


        // Remove the old standalone greeting paragraph.
        if (
            oldGreeting &&
            oldGreeting.tagName === "P"
        ) {

            oldGreeting.remove();

        }


        // The original HR immediately after the greeting
        // should not remain between the greeting and message.
        const hr =
            row.previousElementSibling;


        if (
            hr &&
            hr.tagName === "HR"
        ) {

            hr.remove();

        }


        // Put the combined row exactly where the
        // daily-message section originally started.
        screen.insertBefore(
            row,
            dailyMessage
        );


        // The old daily message is now inside row,
        // so remove any immediately following duplicate HR
        // that belonged only to the old standalone message.
        const next =
            row.nextElementSibling;

        if (
            next &&
            next.tagName === "HR"
        ) {

            next.remove();

        }


        // IMPORTANT:
        // Never change the profile button text.
        const profileButton =
            document.getElementById("profileBtn");

        if (profileButton) {

            profileButton.textContent =
                "👤 پروفایل من";

        }


        console.log(
            "WelcomeManager v2.0: Greeting placed beside daily message"
        );

    },


    // =====================================
    // STYLES
    // =====================================

    styles: function () {

        const styleId =
            "tahouriWelcomeManagerV2Styles";

        if (
            document.getElementById(styleId)
        ) {

            return;

        }


        const style =
            document.createElement("style");

        style.id =
            styleId;

        style.textContent = `

            .welcome-daily-message-row {

                display: grid;

                grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);

                gap: 15px;

                width: 100%;

                margin: 18px 0;

                align-items: stretch;

            }


            .welcome-daily-greeting,
            .welcome-daily-message-row .daily-message-home {

                box-sizing: border-box;

                min-width: 0;

                height: 100%;

                margin: 0;

                border-radius: 14px;

            }


            .welcome-daily-greeting {

                display: flex;

                align-items: center;

                gap: 12px;

                padding: 18px;

                background: #ffffff;

                border: 1px solid #e1e4e8;

                box-shadow: 0 3px 12px rgba(0,0,0,.05);

                direction: rtl;

                text-align: right;

            }


            .welcome-daily-greeting-icon {

                font-size: 30px;

                flex: 0 0 auto;

            }


            .welcome-daily-greeting h2 {

                margin: 0 0 7px 0;

                font-size: 19px;

            }


            .welcome-daily-greeting p {

                margin: 0;

                font-size: 13px;

                opacity: .72;

                line-height: 1.8;

            }


            .welcome-daily-message-row .daily-message-home {

                width: 100%;

            }


            @media (max-width: 700px) {

                .welcome-daily-message-row {

                    grid-template-columns: 1fr;

                    gap: 10px;

                }

            }

        `;

        document.head.appendChild(style);

    },


    // =====================================
    // OBSERVE HOME RENDERING
    // =====================================

    observe: function () {

        const app =
            document.getElementById("app");

        if (!app || this.observer) {

            return;

        }


        this.styles();


        this.observer =
            new MutationObserver(
                function () {

                    if (
                        document.querySelector(
                            ".daily-message-home"
                        )
                    ) {

                        WelcomeManager.personalizeHome();

                    }

                }
            );


        this.observer.observe(
            app,
            {
                childList: true,
                subtree: true
            }
        );


        this.personalizeHome();

    },


    // =====================================
    // INIT
    // =====================================

    init: function () {

        this.observe();

        console.log(
            "WelcomeManager v2.0 Ready"
        );

    }

};


WelcomeManager.init();
