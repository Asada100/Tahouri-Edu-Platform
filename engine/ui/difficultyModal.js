// =====================================
// Tahouri Edu Platform
// Version 1.1
// Difficulty Modal
// Selection Only
// =====================================


const DifficultyModal = {


    isOpen: false,

    escapeHandler: null,


    // =====================================
    // Initialize
    // =====================================

    init: function () {

        this.injectStyles();

        console.log(
            "Difficulty Modal Ready"
        );

    },


    // =====================================
    // Open
    // =====================================

    open: function (
        activityData,
        onSelect
    ) {

        if (!activityData) {

            console.error(
                "Difficulty Modal: Activity Missing"
            );

            return;

        }


        if (this.isOpen) {

            return;

        }


        this.isOpen = true;


        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "difficultyModalOverlay";


        overlay.innerHTML = `

            <div
                class="difficultyModal"
                role="dialog"
                aria-modal="true">

                <h2>
                    انتخاب سطح سؤال
                </h2>

                <p>
                    ${activityData.title || ""}
                </p>


                <div class="difficultyOptions">

                    <button
                        class="difficultyOption"
                        data-difficulty="easy">

                        🟢 آسان

                    </button>


                    <button
                        class="difficultyOption"
                        data-difficulty="medium">

                        🟡 معمولی

                    </button>


                    <button
                        class="difficultyOption"
                        data-difficulty="hard">

                        🔴 سخت

                    </button>

                </div>


                <button
                    id="difficultyCancelBtn">

                    انصراف

                </button>

            </div>

        `;


        document.body.appendChild(
            overlay
        );


        // =====================================
        // Difficulty Buttons
        // =====================================

        overlay
            .querySelectorAll(
                ".difficultyOption"
            )
            .forEach(
                function (button) {

                    button.onclick =
                        function () {


                            const difficulty =
                                this.dataset.difficulty;


                            const selectedActivity = {

                                ...activityData,

                                settings: {

                                    ...(activityData.settings || {}),

                                    difficulty:
                                        difficulty

                                }

                            };


                            console.log(
                                "Difficulty Selected:",
                                difficulty
                            );


                            DifficultyModal.close();


                            if (
                                typeof onSelect ===
                                "function"
                            ) {

                                onSelect(
                                    selectedActivity
                                );

                            }

                        };

                }
            );


        // =====================================
        // Cancel
        // =====================================

        const cancelBtn =
            overlay.querySelector(
                "#difficultyCancelBtn"
            );


        if (cancelBtn) {

            cancelBtn.onclick =
                function () {

                    DifficultyModal.close();

                };

        }


        // =====================================
        // Outside Click
        // =====================================

        overlay.onclick =
            function (event) {

                if (
                    event.target ===
                    overlay
                ) {

                    DifficultyModal.close();

                }

            };


        // =====================================
        // Escape
        // =====================================

        this.escapeHandler =
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    DifficultyModal.close();

                }

            };


        document.addEventListener(
            "keydown",
            this.escapeHandler
        );

    },


    // =====================================
    // Close
    // =====================================

    close: function () {

        const overlay =
            document.getElementById(
                "difficultyModalOverlay"
            );


        if (overlay) {

            overlay.remove();

        }


        if (
            this.escapeHandler
        ) {

            document.removeEventListener(
                "keydown",
                this.escapeHandler
            );

            this.escapeHandler =
                null;

        }


        this.isOpen = false;

    },


    // =====================================
    // Styles
    // =====================================

    injectStyles: function () {

        if (
            document.getElementById(
                "difficultyModalStyles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "difficultyModalStyles";


        style.textContent = `

            #difficultyModalOverlay {

                position: fixed;

                inset: 0;

                z-index: 99999;

                display: flex;

                align-items: center;

                justify-content: center;

                background:
                    rgba(0,0,0,0.55);

                padding: 20px;

            }


            .difficultyModal {

                width: min(
                    500px,
                    95vw
                );

                background: white;

                border-radius: 22px;

                padding: 28px;

                box-sizing: border-box;

                text-align: center;

                direction: rtl;

                box-shadow:
                    0 20px 60px
                    rgba(0,0,0,0.3);

            }


            .difficultyModal h2 {

                margin:
                    0 0 10px;

            }


            .difficultyModal p {

                margin:
                    0 0 22px;

            }


            .difficultyOptions {

                display: flex;

                flex-direction: column;

                gap: 12px;

            }


            .difficultyOption {

                width: 100%;

                padding: 16px;

                border:
                    2px solid transparent;

                border-radius:
                    14px;

                background:
                    #f4f4f4;

                cursor: pointer;

                font-size:
                    19px;

                transition:
                    transform 0.15s ease;

            }


            .difficultyOption:hover {

                transform:
                    translateY(-2px);

            }


            #difficultyCancelBtn {

                margin-top:
                    20px;

                padding:
                    8px 18px;

                border:
                    none;

                background:
                    transparent;

                cursor: pointer;

            }

        `;


        document.head.appendChild(
            style
        );

    }

};


window.DifficultyModal =
    DifficultyModal;


DifficultyModal.init();