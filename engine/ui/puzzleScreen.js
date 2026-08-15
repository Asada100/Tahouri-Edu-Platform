// =====================================
// Tahouri Edu Platform
// Version 1.2
// Puzzle Screen
// Ordering + Sequence
// =====================================


const PuzzleScreen = {

    // =====================================
    // Local Order
    // =====================================

    currentOrder: [],


    // =====================================
    // Sequence Answer
    // =====================================

    sequenceAnswer: null,


    // =====================================
    // Show
    // =====================================

    show: function(state) {

        if (!state) {

            console.error(
                "Puzzle Screen: State Missing"
            );

            return;

        }


        // =================================
        // Ordering
        // =================================

        if (
            state.type === "ordering"
        ) {

            this.showOrdering(
                state
            );

            return;

        }


        // =================================
        // Sequence
        // =================================

        if (
            state.type === "sequence"
        ) {

            this.showSequence(
                state
            );

            return;

        }


        console.warn(
            "Puzzle Screen: Unsupported Type:",
            state.type
        );

    },


    // =====================================
    // Ordering Screen
    // =====================================

    showOrdering: function(state) {

        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "Puzzle Screen: App Container Not Found"
            );

            return;

        }


        this.currentOrder =
            [...state.items];


        const itemsHTML =
            this.currentOrder
                .map(
                    function(item, index) {

                        return `

                            <button
                                class="puzzleItem"
                                data-index="${index}"
                                data-value="${String(item)}">

                                ${item}

                            </button>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل مرتب‌سازی
                </h1>

                <p
                    class="puzzleInstruction">

                    ${state.instruction}

                </p>


                <div
                    id="puzzleItems"
                    class="puzzleItems"
                    dir="ltr">

                    ${itemsHTML}

                </div>


                <div
                    class="puzzleControls">

                    <button
                        id="puzzleCheckBtn">

                        بررسی پاسخ

                    </button>


                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>


                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>


                <div
                    class="puzzleMoves">

                    حرکت‌ها:
                    <span id="puzzleMoveCount">
                        ${state.moves}
                    </span>

                </div>

            </div>

        `;


        this.bindOrderingEvents();

    },


    // =====================================
    // Sequence Screen
    // =====================================

    showSequence: function(state) {

        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "Puzzle Screen: App Container Not Found"
            );

            return;

        }


        this.sequenceAnswer = null;


        const itemsHTML =
            state.items
                .map(
                    function(item, index) {

                        if (
                            index ===
                            state.missingIndex
                        ) {

                            return `

                                <span
                                    class="sequenceMissing">

                                    ؟

                                </span>

                            `;

                        }


                        return `

                            <span
                                class="sequenceItem">

                                ${item}

                            </span>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    دنباله عددی
                </h1>


                <p
                    class="puzzleInstruction">

                    ${state.instruction}

                </p>


                <div
                    id="sequenceItems"
                    class="sequenceItems"
                    dir="ltr">

                    ${itemsHTML}

                </div>


                <div
                    class="sequenceAnswerArea">

                    <input
                        id="sequenceAnswerInput"
                        type="number"
                        inputmode="numeric"
                        placeholder="عدد بعدی"
                        autocomplete="off"
                    />


                    <button
                        id="sequenceCheckBtn">

                        بررسی پاسخ

                    </button>

                </div>


                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>


                <div
                    class="puzzleMoves">

                    تلاش:
                    <span id="puzzleMoveCount">
                        ${state.moves}
                    </span>

                </div>


                <button
                    id="puzzleResetBtn">

                    شروع دوباره

                </button>

            </div>

        `;


        this.bindSequenceEvents();

    },


    // =====================================
    // Ordering Events
    // =====================================

    bindOrderingEvents: function() {

        const container =
            document.getElementById(
                "puzzleItems"
            );


        if (!container) {

            return;

        }


        let selectedIndex =
            null;


        container
            .querySelectorAll(
                ".puzzleItem"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function() {

                            const index =
                                Number(
                                    this.dataset.index
                                );


                            if (
                                selectedIndex ===
                                null
                            ) {

                                selectedIndex =
                                    index;


                                this.classList.add(
                                    "selected"
                                );


                                return;

                            }


                            if (
                                selectedIndex ===
                                index
                            ) {

                                this.classList.remove(
                                    "selected"
                                );


                                selectedIndex =
                                    null;


                                return;

                            }


                            const temp =
                                PuzzleScreen
                                    .currentOrder[
                                        selectedIndex
                                    ];


                            PuzzleScreen
                                .currentOrder[
                                    selectedIndex
                                ] =

                                PuzzleScreen
                                    .currentOrder[
                                        index
                                    ];


                            PuzzleScreen
                                .currentOrder[
                                    index
                                ] =

                                temp;


                            PuzzleEngine.setOrder(
                                PuzzleScreen
                                    .currentOrder
                            );


                            selectedIndex =
                                null;


                            PuzzleScreen
                                .renderState();

                        };

                }
            );


        const checkBtn =
            document.getElementById(
                "puzzleCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function() {

                    PuzzleScreen.checkPuzzle();

                };

        }


        const resetBtn =
            document.getElementById(
                "puzzleResetBtn"
            );


        if (resetBtn) {

            resetBtn.onclick =
                function() {

                    PuzzleScreen.resetPuzzle();

                };

        }

    },


    // =====================================
    // Sequence Events
    // =====================================

    bindSequenceEvents: function() {

        const input =
            document.getElementById(
                "sequenceAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "sequenceCheckBtn"
            );


        if (
            input &&
            checkBtn
        ) {

            checkBtn.onclick =
                function() {

                    const value =
                        Number(
                            input.value
                        );


                    if (
                        input.value === ""
                    ) {

                        PuzzleScreen
                            .showMessage(
                                "لطفاً پاسخ را وارد کن."
                            );

                        return;

                    }


                    PuzzleEngine
                        .setSequenceAnswer(
                            value
                        );


                    PuzzleScreen
                        .checkPuzzle();

                };


            input.onkeydown =
                function(event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        checkBtn.click();

                    }

                };

        }


        const resetBtn =
            document.getElementById(
                "puzzleResetBtn"
            );


        if (resetBtn) {

            resetBtn.onclick =
                function() {

                    PuzzleScreen.resetPuzzle();

                };

        }

    },


    // =====================================
    // Check Puzzle
    // =====================================

    checkPuzzle: function() {

        const correct =
            PuzzleEngine.check();


        if (correct) {

            this.showMessage(
                "آفرین! پاسخ درست است. 🎉"
            );

        }
        else {

            this.showMessage(
                "هنوز درست نیست؛ دوباره فکر کن."
            );

        }

    },


    // =====================================
    // Reset Puzzle
    // =====================================

    resetPuzzle: function() {

        const activity =
            ActivityManager.currentActivity;


        if (!activity) {

            return;

        }


        const state =
            PuzzleEngine.start(
                activity
            );


        if (state) {

            this.show(
                state
            );

        }

    },


    // =====================================
    // Render State
    // =====================================

    renderState: function() {

        const state =
            PuzzleEngine.getState();


        this.show(
            state
        );

    },


    // =====================================
    // Show Message
    // =====================================

    showMessage: function(
        message
    ) {

        const element =
            document.getElementById(
                "puzzleMessage"
            );


        if (element) {

            element.textContent =
                message;

        }

    },


    // =====================================
    // Styles
    // =====================================

    injectStyles: function() {

        if (
            document.getElementById(
                "puzzleScreenStyles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "puzzleScreenStyles";


        style.textContent = `

            .puzzleScreen {

                text-align:
                    center;

            }


            .puzzleInstruction {

                font-size:
                    18px;

                margin-bottom:
                    25px;

            }


            .puzzleItems {

                display:
                    flex;

                flex-wrap:
                    wrap;

                justify-content:
                    center;

                gap:
                    12px;

                margin:
                    25px 0;

                direction:
                    ltr;

            }


            .puzzleItem {

                min-width:
                    80px;

                padding:
                    16px 20px;

                border:
                    2px solid #ddd;

                border-radius:
                    14px;

                background:
                    white;

                cursor:
                    pointer;

                font-size:
                    22px;

            }


            .puzzleItem.selected {

                border-color:
                    #333;

                transform:
                    scale(1.05);

            }


            .puzzleControls {

                display:
                    flex;

                justify-content:
                    center;

                gap:
                    12px;

                margin-top:
                    20px;

            }


            .puzzleControls button,
            #puzzleResetBtn,
            #sequenceCheckBtn {

                padding:
                    12px 22px;

                border:
                    none;

                border-radius:
                    10px;

                cursor:
                    pointer;

                font-size:
                    16px;

            }


            .puzzleMessage {

                min-height:
                    30px;

                margin-top:
                    20px;

                font-size:
                    18px;

            }


            .puzzleMoves {

                margin-top:
                    15px;

                opacity:
                    0.7;

            }


            /* ============================= */
            /* Sequence */
            /* ============================= */

            .sequenceItems {

                display:
                    flex;

                justify-content:
                    center;

                align-items:
                    center;

                gap:
                    14px;

                margin:
                    30px 0;

                direction:
                    ltr;

                font-size:
                    28px;

            }


            .sequenceItem,
            .sequenceMissing {

                min-width:
                    70px;

                padding:
                    14px 18px;

                border-radius:
                    14px;

                border:
                    2px solid #ddd;

            }


            .sequenceMissing {

                border-style:
                    dashed;

                font-weight:
                    bold;

            }


            .sequenceAnswerArea {

                display:
                    flex;

                justify-content:
                    center;

                align-items:
                    center;

                gap:
                    12px;

                margin:
                    20px 0;

            }


            #sequenceAnswerInput {

                width:
                    140px;

                padding:
                    12px;

                border:
                    2px solid #ddd;

                border-radius:
                    10px;

                font-size:
                    20px;

                text-align:
                    center;

            }

        `;


        document.head.appendChild(
            style
        );

    }

};


// =====================================
// Global
// =====================================

window.PuzzleScreen =
    PuzzleScreen;


// =====================================
// Initialize
// =====================================

PuzzleScreen.injectStyles();


console.log(
    "Puzzle Screen Ready"
);