// =====================================
// Tahouri Edu Platform
// Version 1.4
// Puzzle Screen
//
// Supported:
// - Ordering
// - Sequence
// - Image Ordering
// - Visual Math
// =====================================


const PuzzleScreen = {

    currentOrder: [],


    // =====================================
    // SHOW
    // =====================================

    show: function(state) {

        if (!state) {

            console.error(
                "Puzzle Screen: State Missing"
            );

            return;

        }


        // =================================
        // ORDERING
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
        // SEQUENCE
        // =================================

        if (
            state.type === "sequence"
        ) {

            this.showSequence(
                state
            );

            return;

        }


        // =================================
        // VISUAL MATH
        // =================================

        if (
            state.type === "visualMath"
        ) {

            this.showVisualMath(
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
    // ORDERING
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

                        // -------------------------
                        // IMAGE
                        // -------------------------

                        if (
                            state.dataType ===
                            "image"
                        ) {

                            return `

                                <button
                                    class="puzzleItem puzzleImageItem"
                                    data-index="${index}"
                                    data-value="${String(item)}">

                                    <img
                                        src="${item}"
                                        alt="پازل"
                                        draggable="false">

                                </button>

                            `;

                        }


                        // -------------------------
                        // TEXT / NUMBER
                        // -------------------------

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


                <p class="puzzleInstruction">

                    ${state.instruction}

                </p>


                <div
                    id="puzzleItems"
                    class="puzzleItems"
                    dir="ltr">

                    ${itemsHTML}

                </div>


                <div class="puzzleControls">

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


                <div class="puzzleMoves">

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
    // SEQUENCE
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
                    دنباله
                </h1>


                <p class="puzzleInstruction">

                    ${state.instruction}

                </p>


                <div
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
                        placeholder="پاسخ"
                        autocomplete="off">

                    <button
                        id="sequenceCheckBtn">

                        بررسی پاسخ

                    </button>

                </div>


                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
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
    // VISUAL MATH
    // =====================================

    showVisualMath: function(state) {

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


        // =================================
        // Only Addition For Now
        // =================================

        if (
            state.operation !==
            "addition"
        ) {

            console.warn(
                "Puzzle Screen: Unsupported Visual Math Operation:",
                state.operation
            );

            return;

        }


        const groups =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        if (
            groups.length !== 2
        ) {

            console.error(
                "Puzzle Screen: Visual Math Requires Two Groups"
            );

            return;

        }


        const firstGroup =
            this.renderVisualGroup(
                groups[0]
            );


        const secondGroup =
            this.renderVisualGroup(
                groups[1]
            );


        app.innerHTML = `

            <div
                class="screen puzzleScreen visualMathScreen"
                dir="rtl">

                <h1>
                    پازل تصویری ریاضی
                </h1>


                <p class="puzzleInstruction">

                    ${state.instruction}

                </p>


                <div
                    class="visualMathEquation"
                    dir="ltr">

                    <div
                        class="visualMathGroup">

                        ${firstGroup}

                    </div>


                    <div
                        class="visualMathOperator">

                        +

                    </div>


                    <div
                        class="visualMathGroup">

                        ${secondGroup}

                    </div>


                    <div
                        class="visualMathOperator">

                        =

                    </div>


                    <div
                        class="visualMathQuestion">

                        ؟

                    </div>

                </div>


                <div
                    class="visualMathAnswerArea">

                    <input
                        id="visualMathAnswerInput"
                        type="number"
                        inputmode="numeric"
                        min="0"
                        placeholder="پاسخ"
                        autocomplete="off">


                    <button
                        id="visualMathCheckBtn">

                        بررسی پاسخ

                    </button>

                </div>


                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>


                <div class="puzzleControls">

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>


                <div class="puzzleMoves">

                    تلاش:
                    <span id="puzzleMoveCount">

                        ${state.moves}

                    </span>

                </div>

            </div>

        `;


        this.bindVisualMathEvents();

    },


    // =====================================
    // RENDER VISUAL GROUP
    // =====================================

    renderVisualGroup: function(group) {

        if (!group) {

            return "";

        }


        const image =
            group.image;


        const count =
            Number(group.count) || 0;


        let html = "";


        for (
            let i = 0;
            i < count;
            i++
        ) {

            html += `

                <img
                    class="visualMathImage"
                    src="${image}"
                    alt="شکل"
                    draggable="false">

            `;

        }


        return html;

    },


    // =====================================
    // ORDERING EVENTS
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


                            // ====================
                            // First Selection
                            // ====================

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


                            // ====================
                            // Same Item
                            // ====================

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


                            // ====================
                            // Swap
                            // ====================

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
    // SEQUENCE EVENTS
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

                    if (
                        input.value === ""
                    ) {

                        PuzzleScreen.showMessage(
                            "لطفاً پاسخ را وارد کن."
                        );

                        return;

                    }


                    PuzzleEngine
                        .setSequenceAnswer(
                            Number(
                                input.value
                            )
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
    // VISUAL MATH EVENTS
    // =====================================

    bindVisualMathEvents: function() {

        const input =
            document.getElementById(
                "visualMathAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "visualMathCheckBtn"
            );


        if (
            input &&
            checkBtn
        ) {

            checkBtn.onclick =
                function() {

                    if (
                        input.value === ""
                    ) {

                        PuzzleScreen.showMessage(
                            "لطفاً پاسخ را وارد کن."
                        );

                        input.focus();

                        return;

                    }


                    const value =
                        Number(
                            input.value
                        );


                    PuzzleEngine
                        .setVisualMathAnswer(
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
    // CHECK
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
    // RESET
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
    // RENDER
    // =====================================

    renderState: function() {

        const state =
            PuzzleEngine.getState();


        this.show(
            state
        );

    },


    // =====================================
    // MESSAGE
    // =====================================

    showMessage: function(message) {

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
    // STYLES
    // =====================================

    injectStyles: function() {

        const oldStyle =
            document.getElementById(
                "puzzleScreenStyles"
            );


        if (oldStyle) {

            oldStyle.remove();

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "puzzleScreenStyles";


        style.textContent = `

            /* ============================= */
            /* BASE */
            /* ============================= */

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


            /* ============================= */
            /* ORDERING */
            /* ============================= */

            .puzzleItems {

                display:
                    flex;

                flex-wrap:
                    wrap;

                justify-content:
                    center;

                align-items:
                    center;

                gap:
                    14px;

                margin:
                    30px 0;

            }


            .puzzleItem {

                min-width:
                    80px;

                min-height:
                    80px;

                padding:
                    12px;

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


            /* ============================= */
            /* IMAGE ORDERING */
            /* ============================= */

            .puzzleImageItem {

                width:
                    150px;

                height:
                    150px;

                padding:
                    8px;

                overflow:
                    hidden;

            }


            .puzzleImageItem img {

                width:
                    100%;

                height:
                    100%;

                object-fit:
                    contain;

                display:
                    block;

                pointer-events:
                    none;

            }


            /* ============================= */
            /* BUTTONS */
            /* ============================= */

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
            #sequenceCheckBtn,
            #visualMathCheckBtn {

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


            /* ============================= */
            /* MESSAGE */
            /* ============================= */

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
            /* SEQUENCE */
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

                font-size:
                    28px;

            }


            .sequenceItem,
            .sequenceMissing {

                min-width:
                    70px;

                padding:
                    14px 18px;

                border:
                    2px solid #ddd;

                border-radius:
                    14px;

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


            /* ============================= */
            /* VISUAL MATH */
            /* ============================= */

            .visualMathEquation {

                display:
                    flex;

                justify-content:
                    center;

                align-items:
                    center;

                gap:
                    22px;

                margin:
                    35px auto;

                direction:
                    ltr;

                flex-wrap:
                    wrap;

            }


            .visualMathGroup {

                display:
                    flex;

                flex-wrap:
                    wrap;

                justify-content:
                    center;

                align-items:
                    center;

                gap:
                    8px;

                max-width:
                    220px;

            }


            .visualMathImage {

                width:
                    65px;

                height:
                    65px;

                object-fit:
                    contain;

                display:
                    block;

                border-radius:
                    10px;

            }


            .visualMathOperator {

                font-size:
                    36px;

                font-weight:
                    bold;

            }


            .visualMathQuestion {

                width:
                    70px;

                height:
                    70px;

                display:
                    flex;

                justify-content:
                    center;

                align-items:
                    center;

                border:
                    2px dashed #999;

                border-radius:
                    12px;

                font-size:
                    32px;

                font-weight:
                    bold;

            }


            .visualMathAnswerArea {

                display:
                    flex;

                justify-content:
                    center;

                align-items:
                    center;

                gap:
                    12px;

                margin:
                    25px 0;

            }


            #visualMathAnswerInput {

                width:
                    120px;

                padding:
                    12px;

                border:
                    2px solid #ddd;

                border-radius:
                    10px;

                font-size:
                    22px;

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
// GLOBAL
// =====================================

window.PuzzleScreen =
    PuzzleScreen;


// =====================================
// INITIALIZE
// =====================================

PuzzleScreen.injectStyles();


console.log(
    "Puzzle Screen Ready"
);