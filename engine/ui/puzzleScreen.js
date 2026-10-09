// =====================================
// Tahouri Edu Platform
// Puzzle Screen
// Version 2.0
//
// Supported:
// - ordering
// - sequence
// - visualMath
// - inputOutput
// - sentence
// - grid
// - wordGrid
// - crossGrid
//
// Architecture:
// ActivityManager
//      ↓
// PuzzleEngine
//      ↓
// activityReady
//      ↓
// PuzzleScreen
//
// Execution remains in PuzzleEngine
// and Puzzle Type Handlers.
// =====================================


const PuzzleScreen = {

    currentOrder: [],

    activityReadyConnected: false,

    spatialScreenActivatedAt: 0,


    // =====================================
    // INIT
    // =====================================

    init: function () {

        if (
            typeof EventManager ===
            "undefined"
        ) {

            console.error(
                "Puzzle Screen: EventManager Not Available"
            );

            return;

        }


        if (
            this.activityReadyConnected
        ) {

            return;

        }


        EventManager.on(
            "activityReady",
            function (payload) {

                PuzzleScreen.handleActivityReady(
                    payload
                );

            }
        );


        this.activityReadyConnected =
            true;


        console.log(
            "Puzzle Screen: Activity Ready Listener Connected"
        );

    },


    // =====================================
    // ACTIVITY READY
    // =====================================

    handleActivityReady: function (
        payload
    ) {

        if (!payload) {

            return;

        }


        const engineName =
            payload.engineName;


        if (
            engineName !== "PuzzleEngine"
            &&
            engineName !== "puzzle"
        ) {

            return;

        }


        const result =
            payload.result;


        if (!result) {

            console.error(
                "Puzzle Screen: Puzzle Result Missing"
            );

            return;

        }


        console.log(
            "Puzzle Screen: Activity Ready Received",
            payload.activity
                ? payload.activity.id
                : null
        );


        this.show(
            result
        );

    },


    // =====================================
    // SHOW ROUTER
    // =====================================

    show: function (
        state
    ) {

        if (!state) {

            console.error(
                "Puzzle Screen: State Missing"
            );

            return;

        }


        // Jigsaw has its own dedicated screen and must not fall through
        // to the generic PuzzleScreen type switch.
        if (
            state.type === "jigsaw" &&
            typeof JigsawScreen !== "undefined" &&
            typeof JigsawScreen.show === "function"
        ) {
            JigsawScreen.show(state);
            return;
        }

        switch (
            state.type
        ) {

            case "ordering":

                this.showOrdering(
                    state
                );

                return;


            case "sequence":

                this.showSequence(
                    state
                );

                return;


            case "visualMath":

                this.showVisualMath(
                    state
                );

                return;


            case "inputOutput":

                this.showInputOutput(
                    state
                );

                return;


            case "sentence":

                this.showSentence(
                    state
                );

                return;


            case "grid":

                this.showGrid(
                    state
                );

                return;


            case "wordGrid":

                this.showWordGrid(
                    state
                );

                return;


            case "crossGrid":

                this.showCrossGrid(
                    state
                );

                return;

            case "pattern":

                this.showPattern(
                    state
                );

                return;

            case "spatial":

                this.showSpatial(
                    state
                );

                return;


            default:

                console.warn(
                    "Puzzle Screen: Unsupported Type:",
                    state.type
                );

        }

    },


    // =====================================
    // SPATIAL
    // =====================================

    showSpatial: function (state) {
        if (state && state.mode === "place") {
            this.showSpatialPlace(state);
            return;
        }

        if (state && state.mode === "symmetry") {
            this.showSpatialSymmetry(state);
            return;
        }

        this.showSpatialLegacy(state);
    },


    showSpatialSymmetry: function (state) {
        const app = this.getApp();
        if (!app) return;

        const grid = state.grid || {};
        const rows = Math.max(1, Number(grid.rows) || 1);
        const cols = Math.max(1, Number(grid.cols) || 1);
        const pieces = Array.isArray(state.pieces) ? state.pieces : [];
        const placements = state.placements || {};
        const sourceByCell = {};
        const placedByCell = {};

        pieces.forEach(function (piece) {
            if (piece.source) {
                sourceByCell[Number(piece.source.row) + ":" + Number(piece.source.col)] = piece;
            }
            const placement = placements[String(piece.id)];
            if (placement) {
                placedByCell[Number(placement.row) + ":" + Number(placement.col)] = piece;
            }
        });

        const cells = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const key = row + ":" + col;
                const sourcePiece = sourceByCell[key];
                const placedPiece = placedByCell[key];
                const targetPiece = pieces.find(function (entry) {
                    return entry && entry.target &&
                        Number(entry.target.row) === row &&
                        Number(entry.target.col) === col;
                });
                const isAxis = state.axis === "vertical"
                    ? (cols % 2 === 1 && col === Math.floor(cols / 2))
                    : (rows % 2 === 1 && row === Math.floor(rows / 2));

                cells.push(
                    "<div class=\"spatialDropCell spatialSymmetryCell" +
                        (placedPiece ? " filled" : "") +
                        (sourcePiece ? " spatialSourceCell" : "") +
                        (isAxis ? " spatialAxisCell" : "") +
                        "\" data-row=\"" + row + "\" data-col=\"" + col + "\">" +
                        (sourcePiece
                            ? "<div class=\"spatialSourcePiece\">" + PuzzleScreen.escapeHTML(sourcePiece.label || sourcePiece.id) + "</div>"
                            : placedPiece
                                ? "<div class=\"spatialPlacedPiece\" data-piece-id=\"" + PuzzleScreen.escapeHTML(placedPiece.id) + "\">" + PuzzleScreen.escapeHTML(placedPiece.label || placedPiece.id) + "</div>"
                                : targetPiece
                                    ? "<div class=\"spatialTargetGhost\" aria-hidden=\"true\">" + PuzzleScreen.escapeHTML(targetPiece.label || targetPiece.id) + "</div>"
                                    : "<span class=\"spatialSlotHint\"></span>") +
                    "</div>"
                );
            }
        }

        const tray = pieces.map(function (piece) {
            if (placements[String(piece.id)]) return "";
            return "<div class=\"spatialDragPiece\" data-piece-id=\"" + PuzzleScreen.escapeHTML(piece.id) + "\" tabindex=\"0\">" +
                PuzzleScreen.escapeHTML(piece.label || piece.id) +
                "</div>";
        }).join("");

        const placedCount = Object.keys(placements).filter(function (id) {
            return placements[id] !== null && placements[id] !== undefined;
        }).length;

        if (Number(state.moves) <= 0 && Object.keys(state.placements || {}).length === 0) {
        PuzzleScreen.spatialScreenActivatedAt = Date.now();
    }

    const axisText = state.axis === "horizontal" ? "افقی" : "عمودی";

        app.innerHTML =
            "<div class=\"screen puzzleScreen spatialScreen spatialPlaceScreen\" dir=\"rtl\">" +
                "<h1>تقارن شکل‌ها</h1>" +
                "<p class=\"puzzleInstruction\">هر شکل را بردار و در جای قرینه‌اش قرار بده.</p>" +
                "<div class=\"spatialProgress\">" + placedCount + " از " + pieces.length + " جای قرینه کامل شده است</div>" +
                "<div class=\"spatialAxisLabel\">محور تقارن: " + axisText + "</div>" +
                "<div class=\"spatialPlacementLayout\">" +
                    "<div class=\"spatialBoardWrap\">" +
                        "<div class=\"spatialBoard\" style=\"--spatial-cols:" + cols + "\">" + cells.join("") + "</div>" +
                    "</div>" +
                    "<div class=\"spatialTray\">" +
                        "<div class=\"spatialTrayTitle\">شکل‌های قرینه</div>" +
                        "<div class=\"spatialTrayPieces\">" + tray + "</div>" +
                    "</div>" +
                "</div>" +
                "<button id=\"spatialSymmetryCheckBtn\" class=\"spatialCheckButton\">بررسی تقارن</button>" +
                "<div id=\"spatialSymmetryMessage\" class=\"puzzleMessage\"></div>" +
                this.renderStandardFooter(state.moves) +
            "</div>";

        const beginDrag = function (pieceElement) {
            const pieceId = pieceElement.dataset.pieceId;
            if (!pieceId) return;

            const ghost = document.createElement("div");
            ghost.className = "spatialDragGhost";
            ghost.textContent = pieceElement.textContent || "";
            document.body.appendChild(ghost);

            const moveGhost = function (event) {
                ghost.style.left = (event.clientX - 32) + "px";
                ghost.style.top = (event.clientY - 32) + "px";
            };

            const finishDrag = function (event) {
                document.removeEventListener("pointermove", moveGhost);
                document.removeEventListener("pointerup", finishDrag);
                ghost.remove();

                const target = document.elementFromPoint(event.clientX, event.clientY);
                const cell = target && target.closest ? target.closest(".spatialDropCell") : null;

                if (cell && app.contains(cell) && !cell.classList.contains("spatialSourceCell")) {
                    PuzzleEngine.setTypeAnswer({
                        pieceId: pieceId,
                        row: Number(cell.dataset.row),
                        col: Number(cell.dataset.col)
                    });
                    PuzzleScreen.show(PuzzleEngine.getState());
                }
            };

            document.addEventListener("pointermove", moveGhost);
            document.addEventListener("pointerup", finishDrag, { once: true });
            moveGhost(event);
        };

        app.querySelectorAll(".spatialDragPiece, .spatialPlacedPiece").forEach(function (pieceElement) {
            pieceElement.addEventListener("pointerdown", function (event) {
                event.preventDefault();
                beginDrag(pieceElement);
            });
        });

        const checkButton = app.querySelector("#spatialSymmetryCheckBtn");
        if (checkButton) {
            checkButton.addEventListener("click", function () {
                const correct = PuzzleEngine.check();
                if (!correct) {
                    const message = app.querySelector("#spatialSymmetryMessage");
                    if (message) message.textContent = "تقارن کامل نیست؛ جای شکل‌ها را دوباره بررسی کن.";
                }
            });
        }
    },


    showSpatialLegacy: function (state) {
        const app = this.getApp();
        if (!app) return;

        const grid = state.grid || {};
        const rows = Math.max(1, Number(grid.rows) || 1);
        const cols = Math.max(1, Number(grid.cols) || 1);
        const items = Array.isArray(state.items) ? state.items : [];
        const options = Array.isArray(state.options) ? state.options : [];
        const cells = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const item = items.find(function (entry) {
                    return entry && Number(entry.row) === row && Number(entry.col) === col;
                });
                cells.push("<div class=\"spatialCell\">" +
                    (item ? PuzzleScreen.escapeHTML(item.label || item.id || "") : "") +
                    "</div>");
            }
        }

        app.innerHTML =
            "<div class=\"screen puzzleScreen spatialScreen\" dir=\"rtl\">" +
                "<h1>درک فضایی</h1>" +
                "<p class=\"puzzleInstruction\">" + PuzzleScreen.escapeHTML(state.instruction) + "</p>" +
                (state.question ? "<div class=\"spatialQuestion\">" + PuzzleScreen.escapeHTML(state.question) + "</div>" : "") +
                "<div class=\"spatialGrid\" style=\"--spatial-cols:" + cols + "\">" + cells.join("") + "</div>" +
                "<div class=\"spatialOptions\">" +
                    options.map(function (option) {
                        const selected = PuzzleScreen.valuesEqualForDisplay(option, state.userAnswer) ? " selected" : "";
                        return "<button class=\"spatialOption" + selected + "\" data-answer=\"" + PuzzleScreen.escapeHTML(option) + "\">" + PuzzleScreen.escapeHTML(option) + "</button>";
                    }).join("") +
                "</div>" +
                "<button id=\"spatialCheckBtn\">بررسی پاسخ</button>" +
                "<div id=\"puzzleMessage\" class=\"puzzleMessage\"></div>" +
                this.renderStandardFooter(state.moves) +
            "</div>";

        app.querySelectorAll(".spatialOption").forEach(function (button) {
            button.addEventListener("click", function () {
                PuzzleEngine.setTypeAnswer(button.dataset.answer);
                PuzzleScreen.show(PuzzleEngine.getState());
            });
        });

        const checkButton = app.querySelector("#spatialCheckBtn");
        if (checkButton) checkButton.addEventListener("click", function () {
            PuzzleEngine.check();
        });
    },


    showSpatialPlace: function (state) {
        const app = this.getApp();
        if (!app) return;

        const grid = state.grid || {};
        const rows = Math.max(1, Number(grid.rows) || 1);
        const cols = Math.max(1, Number(grid.cols) || 1);
        const pieces = Array.isArray(state.pieces) ? state.pieces : [];
        const placements = state.placements || {};
        const placedByCell = {};

        pieces.forEach(function (piece) {
            const placement = placements[String(piece.id)];
            if (placement) {
                placedByCell[Number(placement.row) + ":" + Number(placement.col)] = piece;
            }
        });

        const cells = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const key = row + ":" + col;
                const piece = placedByCell[key];
                const targetPiece = pieces.find(function (entry) {
                    return entry &&
                        entry.target &&
                        Number(entry.target.row) === row &&
                        Number(entry.target.col) === col;
                });

                cells.push(
                    "<div class=\"spatialDropCell" + (piece ? " filled" : "") + (targetPiece && !piece ? " hasTarget" : "") + "\" data-row=\"" + row + "\" data-col=\"" + col + "\">" +
                        (piece
                            ? "<div class=\"spatialPlacedPiece\" data-piece-id=\"" + PuzzleScreen.escapeHTML(piece.id) + "\">" + PuzzleScreen.escapeHTML(piece.label || piece.id) + "</div>"
                            : targetPiece
                                ? "<div class=\"spatialTargetGhost\" aria-hidden=\"true\">" + PuzzleScreen.escapeHTML(targetPiece.label || targetPiece.id) + "</div>"
                                : "<span class=\"spatialSlotHint\"></span>") +
                    "</div>"
                );
            }
        }

        const tray = pieces.map(function (piece) {
            const placement = placements[String(piece.id)];
            if (placement) return "";
            return "<div class=\"spatialDragPiece\" data-piece-id=\"" + PuzzleScreen.escapeHTML(piece.id) + "\" tabindex=\"0\">" +
                PuzzleScreen.escapeHTML(piece.label || piece.id) +
            "</div>";
        }).join("");

        const placedCount = Object.keys(placements).filter(function (id) {
            return placements[id] !== null && placements[id] !== undefined;
        }).length;

        app.innerHTML =
            "<div class=\"screen puzzleScreen spatialScreen spatialPlaceScreen\" dir=\"rtl\">" +
                "<h1>جای درست شکل‌ها</h1>" +
                "<p class=\"puzzleInstruction\">هر شکل را روی جای هم‌شکل خودش قرار بده.</p>" +
                "<div class=\"spatialProgress\">" + placedCount + " از " + pieces.length + " شکل در صفحه قرار گرفته است</div>" +
                "<div class=\"spatialPlacementLayout\">" +
                    "<div class=\"spatialBoardWrap\">" +
                        "<div class=\"spatialBoard\" style=\"--spatial-cols:" + cols + "\">" + cells.join("") + "</div>" +
                    "</div>" +
                    "<div class=\"spatialTray\">" +
                        "<div class=\"spatialTrayTitle\">شکل‌ها</div>" +
                        "<div class=\"spatialTrayPieces\">" + tray + "</div>" +
                    "</div>" +
                "</div>" +
                "<button id=\"spatialPlaceCheckBtn\" class=\"spatialCheckButton\">بررسی چیدمان</button>" +
                "<div id=\"spatialPlaceMessage\" class=\"puzzleMessage\"></div>" +
                this.renderStandardFooter(state.moves) +
            "</div>";

        const beginDrag = function (pieceElement) {
            const pieceId = pieceElement.dataset.pieceId;
            if (!pieceId) return;

            const ghost = document.createElement("div");
            ghost.className = "spatialDragGhost";
            ghost.textContent = pieceElement.textContent || "";
            document.body.appendChild(ghost);

            const moveGhost = function (event) {
                ghost.style.left = (event.clientX - 32) + "px";
                ghost.style.top = (event.clientY - 32) + "px";
            };

            const finishDrag = function (event) {
                document.removeEventListener("pointermove", moveGhost);
                document.removeEventListener("pointerup", finishDrag);
                ghost.remove();

                const target = document.elementFromPoint(event.clientX, event.clientY);
                const cell = target && target.closest ? target.closest(".spatialDropCell") : null;

                if (cell && app.contains(cell)) {
                    PuzzleEngine.setTypeAnswer({
                        pieceId: pieceId,
                        row: Number(cell.dataset.row),
                        col: Number(cell.dataset.col)
                    });
                    PuzzleScreen.show(PuzzleEngine.getState());
                }
            };

            document.addEventListener("pointermove", moveGhost);
            document.addEventListener("pointerup", finishDrag, { once: true });
            moveGhost(event);
        };

        app.querySelectorAll(".spatialDragPiece, .spatialPlacedPiece").forEach(function (pieceElement) {
            pieceElement.addEventListener("pointerdown", function (event) {
                event.preventDefault();
                beginDrag(pieceElement);
            });
        });

        const checkButton = app.querySelector("#spatialPlaceCheckBtn");
        if (checkButton) {
            checkButton.addEventListener("click", function () {
                const correct = PuzzleEngine.check();
                if (!correct) {
                    const message = app.querySelector("#spatialPlaceMessage");
                    if (message) message.textContent = "هنوز همه شکل‌ها در جای درست نیستند.";
                }
            });
        }
    },


    // =====================================
    // ORDERING
    // =====================================

    showOrdering: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        this.currentOrder =
            Array.isArray(
                state.items
            )
                ? [
                    ...state.items
                ]
                : [];


        const itemsHTML =
            this.currentOrder
                .map(
                    function (
                        item,
                        index
                    ) {

                        if (
                            state.dataType ===
                            "image"
                        ) {

                            return `

                                <button
                                    class="puzzleItem puzzleImageItem"
                                    data-index="${index}">

                                    <img
                                        src="${item}"
                                        alt="پازل"
                                        draggable="false">

                                </button>

                            `;

                        }


                        return `

                            <button
                                class="puzzleItem"
                                data-index="${index}">

                                ${PuzzleScreen.escapeHTML(
                                    item
                                )}

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
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
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

                <div class="puzzleMoves">

                    حرکت‌ها:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindOrderingEvents();

    },


    // =====================================
    // SEQUENCE
    // =====================================

    showSequence: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const itemsHTML =
            state.items
                .map(
                    function (
                        item,
                        index
                    ) {

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

                                ${PuzzleScreen.escapeHTML(
                                    item
                                )}

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
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
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

                <div class="puzzleMoves">

                    تلاش:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindSequenceEvents();

    },


    // =====================================
    // VISUAL MATH
    // =====================================

    showVisualMath: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const operation =
            state.operation;


        const groups =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        if (
            !groups.length
        ) {

            this.showUnsupported(
                "محتوای پازل تصویری وجود ندارد."
            );

            return;

        }


        // =================================
        // COUNTING
        // =================================

        if (
            operation ===
            "counting"
        ) {

            const group =
                this.renderVisualGroup(
                    groups[0]
                );


            app.innerHTML = `

                <div
                    class="screen puzzleScreen visualMathScreen"
                    dir="rtl">

                    <h1>
                        شمارش تصویری
                    </h1>

                    <p class="puzzleInstruction">
                        ${PuzzleScreen.escapeHTML(
                            state.instruction
                        )}
                    </p>

                    <div
                        class="visualMathCountingGroup"
                        dir="ltr">

                        ${group}

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

                    ${this.renderStandardFooter(
                        state.moves
                    )}

                </div>

            `;


            this.bindVisualMathEvents();

            return;

        }


        // =================================
        // COMPARISON
        // =================================

        if (
            operation ===
            "comparison"
        ) {

            const first =
                this.renderVisualGroup(
                    groups[0]
                );


            const second =
                this.renderVisualGroup(
                    groups[1]
                );


            app.innerHTML = `

                <div
                    class="screen puzzleScreen visualMathScreen"
                    dir="rtl">

                    <h1>
                        مقایسه تصویری
                    </h1>

                    <p class="puzzleInstruction">
                        ${PuzzleScreen.escapeHTML(
                            state.instruction
                        )}
                    </p>

                    <div
                        class="visualComparisonArea">

                        <div class="visualComparisonGroup">
                            ${first}
                        </div>

                        <div
                            class="visualComparisonSeparator">

                            ؟

                        </div>

                        <div class="visualComparisonGroup">
                            ${second}
                        </div>

                    </div>

                    <div
                        class="visualComparisonChoices">

                        <button
                            class="visualComparisonBtn"
                            data-answer="left">

                            گروه اول

                        </button>

                        <button
                            class="visualComparisonBtn"
                            data-answer="equal">

                            برابر

                        </button>

                        <button
                            class="visualComparisonBtn"
                            data-answer="right">

                            گروه دوم

                        </button>

                    </div>

                    ${this.renderStandardFooter(
                        state.moves
                    )}

                </div>

            `;


            this.bindVisualComparisonEvents();

            return;

        }


        // =================================
        // ADDITION / SUBTRACTION
        // =================================

        if (
            groups.length !== 2
        ) {

            this.showUnsupported(
                "ساختار جمع یا تفریق تصویری نامعتبر است."
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


        const operator =
            operation ===
            "subtraction"
                ? "−"
                : "+";


        const title =
            operation ===
            "subtraction"
                ? "تفریق تصویری"
                : "جمع تصویری";


        app.innerHTML = `

            <div
                class="screen puzzleScreen visualMathScreen"
                dir="rtl">

                <h1>
                    ${title}
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="visualMathEquation"
                    dir="ltr">

                    <div class="visualMathGroup">
                        ${firstGroup}
                    </div>

                    <div class="visualMathOperator">
                        ${operator}
                    </div>

                    <div class="visualMathGroup">
                        ${secondGroup}
                    </div>

                    <div class="visualMathOperator">
                        =
                    </div>

                    <div class="visualMathQuestion">
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

                ${this.renderStandardFooter(
                    state.moves
                )}

            </div>

        `;


        this.bindVisualMathEvents();

    },


    // =====================================
    // INPUT / OUTPUT
    // =====================================

    showInputOutput: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const inputs =
            Array.isArray(
                state.inputs
            )
                ? state.inputs
                : [];


        const outputs =
            Array.isArray(
                state.outputs
            )
                ? state.outputs
                : [];


        const rows =
            inputs
                .map(
                    function (
                        input,
                        index
                    ) {

                        const output =
                            outputs[index];


                        const outputHTML =
                            index ===
                            state.missingIndex

                                ?

                                `

                                <input
                                    class="ioAnswerInput"
                                    data-index="${index}"
                                    type="number"
                                    inputmode="numeric"
                                    autocomplete="off"
                                    placeholder="؟">

                                `

                                :

                                `

                                <span
                                    class="ioOutputValue">

                                    ${PuzzleScreen.escapeHTML(
                                        output
                                    )}

                                </span>

                                `;


                        return `

                            <div
                                class="ioRow">

                                <span
                                    class="ioInputValue">

                                    ${PuzzleScreen.escapeHTML(
                                        input
                                    )}

                                </span>

                                <span
                                    class="ioArrow">

                                    ←

                                </span>

                                ${outputHTML}

                            </div>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    ماشین ورودی و خروجی
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="ioMachine">

                    ${rows}

                </div>

                <div
                    class="puzzleControls">

                    <button
                        id="ioCheckBtn">

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

                    تلاش:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindInputOutputEvents();

    },


    // =====================================
    // SENTENCE
    // =====================================

    showSentence: function (
        state
    ) {

        if (
            state.mode ===
            "sentenceGrammar"
        ) {

            this.showSentenceGrammar(
                state
            );

            return;

        }


        this.showSentenceOrder(
            state
        );

    },


    // =====================================
    // SENTENCE ORDER
    // =====================================

    showSentenceOrder: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const words =
            Array.isArray(
                state.words
            )
                ? state.words
                : [];


        const indexes =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const wordHTML =
            indexes
                .map(
                    function (
                        wordIndex,
                        position
                    ) {

                        const word =
                            words[
                                wordIndex
                            ];


                        return `

                            <button
                                class="sentenceWord"
                                data-index="${position}">

                                ${PuzzleScreen.escapeHTML(
                                    word
                                )}

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
                    جمله‌سازی
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    id="sentenceWords"
                    class="sentenceWords">

                    ${wordHTML}

                </div>

                <div
                    class="sentencePreview"
                    id="sentencePreview">
                </div>

                <div class="puzzleControls">

                    <button
                        id="sentenceCheckBtn">

                        بررسی جمله

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

            </div>

        `;


        this.bindSentenceOrderEvents();

    },


    // =====================================
    // SENTENCE GRAMMAR
    // =====================================

    showSentenceGrammar: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const words =
            Array.isArray(
                state.words
            )
                ? state.words
                : [];


        const answers =
            Array.isArray(
                state.answers
            )
                ? state.answers
                : [];


        const targets =
            Array.isArray(
                state.targets
            )
                ? state.targets
                : [];


        let targetHTML =
            "";


        const roleOptions = [

            {
                value: "subject",
                label: "نهاد"
            },

            {
                value: "predicate",
                label: "گزاره"
            },

            {
                value: "verb",
                label: "فعل"
            },

            {
                value: "object",
                label: "مفعول"
            },

            {
                value: "adjective",
                label: "صفت"
            },

            {
                value: "adverb",
                label: "قید"
            }

        ];


        targets.forEach(
            function (
                target,
                index
            ) {

                const wordIndex =
                    Number(
                        target
                    );


                const word =
                    words[
                        wordIndex
                    ];


                const currentAnswer =
                    answers[index] ||
                    "";


                const optionsHTML =
                    roleOptions
                        .map(
                            function (
                                option
                            ) {

                                return `

                                    <option
                                        value="${option.value}"
                                        ${
                                            currentAnswer ===
                                            option.value
                                                ? "selected"
                                                : ""
                                        }>

                                        ${option.label}

                                    </option>

                                `;

                            }
                        )
                        .join("");


                targetHTML += `

                    <div
                        class="grammarRow">

                        <span
                            class="grammarWord">

                            ${PuzzleScreen.escapeHTML(
                                word
                            )}

                        </span>

                        <select
                            class="grammarSelect"
                            data-target-index="${index}">

                            <option value="">
                                انتخاب نقش
                            </option>

                            ${optionsHTML}

                        </select>

                    </div>

                `;

            }
        );


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    نقش دستوری
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="grammarRows">

                    ${targetHTML}

                </div>

                <div class="puzzleControls">

                    <button
                        id="grammarCheckBtn">

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

            </div>

        `;


        this.bindSentenceGrammarEvents();

    },


    // =====================================
    // PATTERN
    // =====================================

    showPattern: function (state) {
        const app = this.getApp();
        if (!app) return;

        const items = Array.isArray(state.items) ? state.items : [];
        const options = Array.isArray(state.options) ? state.options : [];
        const selected = state.userAnswer === null || state.userAnswer === undefined
            ? ""
            : String(state.userAnswer);

        const toPersianDigits = function (value) {
            return String(value === null || value === undefined ? "" : value)
                .replace(/[0-9]/g, function (digit) {
                    return "۰۱۲۳۴۵۶۷۸۹"[Number(digit)];
                });
        };

        const renderValue = function (value) {
            if (value === null || value === undefined || value === "") return "؟";
            return PuzzleScreen.escapeHTML(toPersianDigits(value));
        };

        const itemsHTML = items.map(function (item, index) {
            const missing = index === Number(state.missingIndex);
            const arrow = index < items.length - 1
                ? "<span class=\"patternArrow\" aria-hidden=\"true\">←</span>"
                : "";

            return "<div class=\"patternStep\">" +
                "<div class=\"patternItem " + (missing ? "patternMissing" : "") + "\">" +
                    renderValue(item) +
                "</div>" +
                arrow +
            "</div>";
        }).join("");

        const optionsHTML = options.map(function (option) {
            const value = String(option);
            const selectedClass = selected === value ? " selected" : "";

            return "<button type=\"button\" class=\"patternOption" + selectedClass +
                "\" data-pattern-value=\"" + PuzzleScreen.escapeHTML(value) + "\">" +
                renderValue(option) +
            "</button>";
        }).join("");

        app.innerHTML =
            "<div class=\"screen puzzleScreen patternScreen\" dir=\"rtl\">" +
                "<div class=\"patternCard\">" +
                    "<div class=\"patternHeader\">" +
                        "<div class=\"patternBadge\">پازل الگو</div>" +
                        "<h1>الگو را کشف کن</h1>" +
                        "<p class=\"puzzleInstruction\">" +
                            PuzzleScreen.escapeHTML(state.instruction) +
                        "</p>" +
                    "</div>" +

                    "<div class=\"patternBoard\" aria-label=\"الگوی عددی\">" +
                        itemsHTML +
                    "</div>" +

                    "<div class=\"patternPrompt\">" +
                        "<span>عدد مناسب برای جای خالی را انتخاب کن</span>" +
                    "</div>" +

                    "<div class=\"patternOptions\">" +
                        optionsHTML +
                    "</div>" +

                    "<div class=\"puzzleControls patternControls\">" +
                        "<button type=\"button\" id=\"patternCheckBtn\">بررسی پاسخ</button>" +
                        "<button type=\"button\" id=\"puzzleResetBtn\">شروع دوباره</button>" +
                    "</div>" +

                    "<div id=\"puzzleMessage\" class=\"puzzleMessage\"></div>" +
                "</div>" +
            "</div>" +

            "<style>" +
                ".patternScreen{width:min(900px,100%);margin:0 auto;padding:24px 14px 40px;}" +
                ".patternCard{width:min(820px,100%);margin:0 auto;padding:24px 18px 28px;background:var(--ui-surface,#fff);border:1px solid var(--ui-border,#dbe4ef);border-radius:24px;box-shadow:var(--ui-shadow-card,0 7px 20px rgba(31,41,55,.06));text-align:center;}" +
                ".patternHeader h1{margin:8px 0 6px;font-size:clamp(25px,4vw,34px);color:var(--ui-text,#172033);}" +
                ".patternBadge{display:inline-block;padding:6px 14px;border-radius:999px;background:var(--ui-surface-soft,#f8fbff);border:1px solid var(--ui-border-soft,#e4e9f0);font-size:14px;color:var(--ui-muted,#667085);}" +
                ".patternHeader .puzzleInstruction{max-width:650px;margin:8px auto 22px;line-height:1.9;color:var(--ui-muted,#667085);}" +
                ".patternBoard{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin:10px auto 22px;padding:18px 12px;border-radius:20px;background:var(--ui-surface-soft,#f8fbff);border:1px solid var(--ui-border-soft,#e4e9f0);direction:rtl;}" +
                ".patternStep{display:flex;align-items:center;gap:8px;}" +
                ".patternItem{min-width:64px;height:64px;padding:0 12px;display:flex;align-items:center;justify-content:center;border:2px solid var(--ui-border,#dbe4ef);border-radius:16px;background:#fff;font-family:\"Tahouri Yekan\",\"B Yekan\",Tahoma,sans-serif;font-size:clamp(25px,5vw,34px);font-weight:700;color:var(--ui-text,#172033);box-shadow:0 3px 8px rgba(31,41,55,.06);}" +
                ".patternMissing{border-style:dashed;font-size:34px;color:var(--ui-muted,#667085);background:var(--ui-surface-soft,#f8fbff);}" +
                ".patternArrow{font-size:25px;color:var(--ui-muted,#667085);line-height:1;}" +
                ".patternPrompt{margin:4px auto 12px;font-size:16px;color:var(--ui-muted,#667085);}" +
                ".patternOptions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:0 auto 20px;}" +
                ".patternOption{min-width:76px;height:58px;padding:0 18px;border:2px solid var(--ui-border,#dbe4ef);border-radius:15px;background:#fff;font-family:\"Tahouri Yekan\",\"B Yekan\",Tahoma,sans-serif;font-size:24px;font-weight:700;color:var(--ui-text,#172033);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;}" +
                ".patternOption:hover{transform:translateY(-2px);box-shadow:0 5px 12px rgba(31,41,55,.09);}" +
                ".patternOption.selected{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.14);}" +
                ".patternControls{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;}" +
                ".patternControls button{min-width:130px;}" +
                "@media(max-width:600px){.patternCard{padding:18px 10px 24px;border-radius:20px}.patternBoard{gap:5px;padding:14px 6px}.patternStep{gap:5px}.patternItem{min-width:52px;height:54px;padding:0 8px}.patternArrow{font-size:19px}.patternOption{min-width:64px;height:52px;padding:0 14px}}" +
            "</style>";

        app.querySelectorAll(".patternOption").forEach(function (button) {
            button.onclick = function () {
                PuzzleEngine.setTypeAnswer(this.dataset.patternValue);
                app.querySelectorAll(".patternOption").forEach(function (item) {
                    item.classList.remove("selected");
                });
                this.classList.add("selected");
            };
        });

        const check = app.querySelector("#patternCheckBtn");
        if (check) {
            check.onclick = function () {
                PuzzleScreen.checkPuzzle();
            };
        }

        this.bindResetButton();
    },

    // =====================================
    // GRID
    // =====================================

    showGrid: function (
        state
    ) {

        this.showGenericGrid(
            state,
            "grid",
            "جدول عددی"
        );

    },


    // =====================================
    // WORD GRID
    // =====================================

    showWordGrid: function (
        state
    ) {

        this.showGenericGrid(
            state,
            "wordGrid",
            "جدول واژه‌ها"
        );

    },


    // =====================================
    // GENERIC GRID
    // =====================================

    showGenericGrid: function (
        state,
        type,
        title
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const rows =
            Number(
                state.rows
            );


        const cols =
            Number(
                state.cols
            );


        const cells =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const missing =
            Array.isArray(
                state.missingIndices
            )
                ? state.missingIndices
                : [];


        let html =
            "";


        for (
            let row = 0;

            row < rows;

            row++
        ) {

            for (
                let col = 0;

                col < cols;

                col++
            ) {

                const index =
                    (
                        row *
                        cols
                    )
                    +
                    col;


                const value =
                    cells[
                        index
                    ];


                if (
                    missing.includes(
                        index
                    )
                ) {

                    const inputType =
                        type ===
                        "wordGrid"
                            ? "text"
                            : "number";


                    html += `

                        <div
                            class="gridCell gridMissing">

                            <input
                                class="gridAnswerInput"
                                data-index="${index}"
                                type="${inputType}"
                                ${
                                    type ===
                                    "wordGrid"
                                        ? ""
                                        : 'inputmode="numeric"'
                                }
                                value=""
                                autocomplete="off"
                                placeholder="؟">

                        </div>

                    `;

                }

                else {

                    html += `

                        <div
                            class="gridCell">

                            ${PuzzleScreen.escapeHTML(
                                value
                            )}

                        </div>

                    `;

                }

            }

        }


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    ${title}
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="genericGrid"
                    style="--grid-cols:${cols}">

                    ${html}

                </div>

                <div
                    class="puzzleControls">

                    <button
                        id="gridCheckBtn">

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

            </div>

        `;


        this.bindGridEvents(
            type
        );

    },


    // =====================================
    // CROSS GRID
    // =====================================

    showCrossGrid: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const rows =
            Number(
                state.rows
            );


        const cols =
            Number(
                state.cols
            );


        const items =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const cells =
            Array.isArray(
                state.cells
            )
                ? state.cells
                : [];


        const missing =
            Array.isArray(
                state.missingIndices
            )
                ? state.missingIndices
                : [];


        let html =
            "";


        for (
            let row = 0;

            row < rows;

            row++
        ) {

            for (
                let col = 0;

                col < cols;

                col++
            ) {

                const index =
                    (
                        row *
                        cols
                    )
                    +
                    col;


                const cell =
                    cells[
                        index
                    ] ||
                    {};


                const value =
                    items[
                        index
                    ];


                // =================================
                // OPERATION CELL
                // =================================

                if (
                    cell.type ===
                    "operation"
                ) {

                    const operator =
                        cell.operator ||
                        cell.value ||
                        "";


                    html += `

                        <div
                            class="crossGridCell crossOperationCell">

                            ${PuzzleScreen.escapeHTML(
                                operator
                            )}

                        </div>

                    `;


                    continue;

                }


                // =================================
                // BLOCK
                // =================================

                if (
                    cell.type ===
                    "blocked"
                ) {

                    html += `

                        <div
                            class="crossGridCell crossBlockedCell">
                        </div>

                    `;


                    continue;

                }


                // =================================
                // MISSING
                // =================================

                if (
                    missing.includes(
                        index
                    )
                ) {

                    html += `

                        <div
                            class="crossGridCell crossMissingCell">

                            <input
                                class="crossGridAnswerInput"
                                data-index="${index}"
                                type="number"
                                inputmode="numeric"
                                autocomplete="off"
                                placeholder="?">

                        </div>

                    `;


                    continue;

                }


                // =================================
                // VALUE
                // =================================

                html += `

                    <div
                        class="crossGridCell">

                        ${
                            value !==
                            null &&
                            value !==
                            undefined

                                ?

                                PuzzleScreen.escapeHTML(
                                    value
                                )

                                :

                                "·"
                        }

                    </div>

                `;

            }

        }


        const pathsInfo =
            this.renderCrossGridPaths(
                state
            );


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل شبکه‌ای
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="crossGridContainer"
                    style="--grid-cols:${cols}">

                    ${html}

                </div>

                ${
                    pathsInfo
                }

                <div
                    class="puzzleControls">

                    <button
                        id="crossGridCheckBtn">

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

            </div>

        `;


        this.bindCrossGridEvents();

    },


    // =====================================
    // CROSS GRID PATHS
    // =====================================

    renderCrossGridPaths: function (
        state
    ) {

        const paths = [

            ...(
                Array.isArray(
                    state.horizontalPaths
                )
                    ? state.horizontalPaths
                    : []
            ),

            ...(
                Array.isArray(
                    state.verticalPaths
                )
                    ? state.verticalPaths
                    : []
            ),

            ...(
                Array.isArray(
                    state.paths
                )
                    ? state.paths
                    : []
            )

        ];


        if (
            paths.length === 0
        ) {

            return "";

        }


        const unique = [];


        paths.forEach(
            function (
                path
            ) {

                if (!path) {

                    return;

                }


                const id =
                    path.id ||
                    (
                        path.direction +
                        "_" +
                        path.index
                    );


                if (
                    unique.some(
                        function (
                            item
                        ) {

                            return (
                                item.id ===
                                id
                            );

                        }
                    )
                ) {

                    return;

                }


                unique.push({

                    id:
                        id,

                    direction:
                        path.direction ||
                        "",

                    rule:
                        path.rule ||
                        "",

                    operation:
                        path.operation ||
                        ""

                });

            }
        );


        return `

            <div
                class="crossGridPaths">

                ${
                    unique
                        .map(
                            function (
                                path
                            ) {

                                const label =

                                    path.operation ||
                                    path.rule ||
                                    path.direction;


                                return `

                                    <span
                                        class="crossGridPathTag">

                                        ${PuzzleScreen.escapeHTML(
                                            label
                                        )}

                                    </span>

                                `;

                            }
                        )
                        .join("")
                }

            </div>

        `;

    },


    // =====================================
    // VISUAL GROUP
    // =====================================

    renderVisualGroup: function (
        group
    ) {

        if (!group) {

            return "";

        }


        const image =
            group.image;


        const count =
            Number(
                group.count
            ) || 0;


        let html =
            "";


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

    bindOrderingEvents: function () {

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
                function (
                    button
                ) {

                    button.onclick =
                        function () {

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
                                PuzzleScreen.currentOrder
                            );


                            selectedIndex =
                                null;


                            PuzzleScreen.renderState();

                        };

                }
            );


        const checkBtn =
            document.getElementById(
                "puzzleCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // SEQUENCE EVENTS
    // =====================================

    bindSequenceEvents: function () {

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

            const submit =
                function () {

                    if (
                        input.value ===
                        ""
                    ) {

                        PuzzleScreen.showMessage(
                            "لطفاً پاسخ را وارد کن."
                        );


                        input.focus();


                        return;

                    }


                    PuzzleEngine.setSequenceAnswer(
                        Number(
                            input.value
                        )
                    );


                    PuzzleScreen.checkPuzzle();

                };


            checkBtn.onclick =
                submit;


            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // VISUAL MATH EVENTS
    // =====================================

    bindVisualMathEvents: function () {

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

            const submit =
                function () {

                    if (
                        input.value ===
                        ""
                    ) {

                        PuzzleScreen.showMessage(
                            "لطفاً پاسخ را وارد کن."
                        );


                        input.focus();


                        return;

                    }


                    PuzzleEngine.setVisualMathAnswer(
                        Number(
                            input.value
                        )
                    );


                    PuzzleScreen.checkPuzzle();

                };


            checkBtn.onclick =
                submit;


            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // COMPARISON EVENTS
    // =====================================

    bindVisualComparisonEvents: function () {

        const buttons =
            document.querySelectorAll(
                ".visualComparisonBtn"
            );


        buttons.forEach(
            function (
                button
            ) {

                button.onclick =
                    function () {

                        const answer =
                            this.dataset.answer;


                        buttons.forEach(
                            function (
                                item
                            ) {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                        this.classList.add(
                            "selected"
                        );


                        PuzzleEngine
                            .setVisualMathAnswer(
                                answer
                            );


                        PuzzleScreen
                            .checkPuzzle();

                    };

            }
        );


        this.bindResetButton();

    },


    // =====================================
    // INPUT / OUTPUT EVENTS
    // =====================================

    bindInputOutputEvents: function () {

        const input =
            document.querySelector(
                ".ioAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "ioCheckBtn"
            );


        const submit =
            function () {

                if (
                    !input
                    ||
                    input.value ===
                    ""
                ) {

                    PuzzleScreen.showMessage(
                        "لطفاً خروجی را وارد کن."
                    );


                    if (input) {

                        input.focus();

                    }


                    return;

                }


                PuzzleEngine.setGenericAnswer(
                    Number(
                        input.value
                    )
                );


                PuzzleScreen.checkPuzzle();

            };


        if (checkBtn) {

            checkBtn.onclick =
                submit;

        }


        if (input) {

            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // SENTENCE ORDER EVENTS
    // =====================================

    bindSentenceOrderEvents: function () {

        const container =
            document.getElementById(
                "sentenceWords"
            );


        if (!container) {

            return;

        }


        let order =
            Array.isArray(
                PuzzleEngine.items
            )
                ? [
                    ...PuzzleEngine.items
                ]
                : [];


        const render =
            function () {

                const preview =
                    document.getElementById(
                        "sentencePreview"
                    );


                if (!preview) {

                    return;

                }


                const words =
                    PuzzleEngine.puzzle &&
                    Array.isArray(
                        PuzzleEngine.puzzle.words
                    )
                        ? PuzzleEngine.puzzle.words
                        : [];


                preview.textContent =
                    order
                        .map(
                            function (
                                index
                            ) {

                                return (
                                    words[
                                        index
                                    ] ||
                                    ""
                                );

                            }
                        )
                        .join(
                            " "
                        );

            };


        container
            .querySelectorAll(
                ".sentenceWord"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            const index =
                                Number(
                                    this.dataset.index
                                );


                            if (
                                index ===
                                0
                            ) {

                                return;

                            }


                            const temp =
                                order[
                                    index
                                ];


                            order[
                                index
                            ] =
                                order[
                                    index - 1
                                ];


                            order[
                                index - 1
                            ] =
                                temp;


                            PuzzleEngine.setTypeAnswer(
                                order
                            );


                            PuzzleScreen.renderState();

                        };

                }
            );


        const checkBtn =
            document.getElementById(
                "sentenceCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleEngine.setTypeAnswer(
                        order
                    );


                    PuzzleScreen.checkPuzzle();

                };

        }


        render();


        this.bindResetButton();

    },


    // =====================================
    // SENTENCE GRAMMAR EVENTS
    // =====================================

    bindSentenceGrammarEvents: function () {

        const checkBtn =
            document.getElementById(
                "grammarCheckBtn"
            );


        const submit =
            function () {

                const answers =
                    Array.from(
                        document.querySelectorAll(
                            ".grammarSelect"
                        )
                    )
                        .map(
                            function (
                                select
                            ) {

                                return (
                                    select.value
                                    ||
                                    ""
                                );

                            }
                        );


                PuzzleEngine.setGenericAnswer(
                    answers
                );


                PuzzleScreen.checkPuzzle();

            };


        if (checkBtn) {

            checkBtn.onclick =
                submit;

        }


        this.bindResetButton();

    },


    // =====================================
    // GRID EVENTS
    // =====================================

    bindGridEvents: function (
        type
    ) {

        const inputs =
            document.querySelectorAll(
                ".gridAnswerInput"
            );


        inputs.forEach(
            function (
                input
            ) {

                input.oninput =
                    function () {

                        const index =
                            Number(
                                this.dataset.index
                            );


                        const value =
                            type ===
                            "wordGrid"

                                ?

                                this.value

                                :

                                Number(
                                    this.value
                                );


                        if (
                            type ===
                            "wordGrid"
                        ) {

                            PuzzleEngine.setCell(
                                index,
                                value
                            );

                        }

                        else if (
                            this.value !==
                            ""
                        ) {

                            PuzzleEngine.setCell(
                                index,
                                value
                            );

                        }

                    };

            }
        );


        const checkBtn =
            document.getElementById(
                "gridCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // CROSS GRID EVENTS
    // =====================================

    bindCrossGridEvents: function () {

        const inputs =
            document.querySelectorAll(
                ".crossGridAnswerInput"
            );


        inputs.forEach(
            function (
                input
            ) {

                input.oninput =
                    function () {

                        if (
                            this.value ===
                            ""
                        ) {

                            return;

                        }


                        const index =
                            Number(
                                this.dataset.index
                            );


                        PuzzleEngine.setCell(
                            index,
                            Number(
                                this.value
                            )
                        );

                    };

            }
        );


        const checkBtn =
            document.getElementById(
                "crossGridCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // CHECK
    // =====================================

    checkPuzzle: function () {

        const correct =
            PuzzleEngine.check();


        if (
            correct
        ) {

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

    resetPuzzle: function () {

        const activity =
            ActivityManager.currentActivity;


        if (!activity) {

            return;

        }


        Promise
            .resolve(
                PuzzleEngine.start(
                    activity
                )
            )
            .then(
                function (
                    state
                ) {

                    if (state) {

                        PuzzleScreen.show(
                            state
                        );

                    }

                }
            );

    },


    // =====================================
    // RENDER STATE
    // =====================================

    renderState: function () {

        const state =
            PuzzleEngine.getState();


        this.show(
            state
        );

    },


    // =====================================
    // RESET BUTTON
    // =====================================

    bindResetButton: function () {

        const resetBtn =
            document.getElementById(
                "puzzleResetBtn"
            );


        if (resetBtn) {

            resetBtn.onclick =
                function () {

                    PuzzleScreen.resetPuzzle();

                };

        }

    },


    // =====================================
    // STANDARD FOOTER
    // =====================================

    renderStandardFooter: function (
        moves
    ) {

        return `

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

                    ${moves || 0}

                </span>

            </div>

        `;

    },


    // =====================================
    // APP
    // =====================================

    getApp: function () {

        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "Puzzle Screen: App Container Not Found"
            );

            return null;

        }


        return app;

    },


    // =====================================
    // MESSAGE
    // =====================================

    showMessage: function (
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
    // UNSUPPORTED
    // =====================================

    showUnsupported: function (
        message
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل
                </h1>

                <p class="puzzleMessage">
                    ${PuzzleScreen.escapeHTML(
                        message
                    )}
                </p>

                <button
                    id="puzzleResetBtn">

                    شروع دوباره

                </button>

            </div>

        `;


        this.bindResetButton();

    },


    valuesEqualForDisplay: function (a, b) {
        if (a === null || a === undefined || b === null || b === undefined) return a === b;
        return String(a) === String(b);
    },

    // =====================================
    // HTML ESCAPE
    // =====================================

    escapeHTML: function (
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(
            value
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    },


    // =====================================
    // STYLES
    // =====================================

    injectStyles: function () {

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
                text-align: center;
                padding: 20px;
            }

            .puzzleInstruction {
                font-size: 18px;
                margin-bottom: 24px;
            }

            .puzzleControls {
                display: flex;
                justify-content: center;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 20px;
            }

            .puzzleControls button,
            #puzzleCheckBtn,
            #sequenceCheckBtn,
            #visualMathCheckBtn,
            #ioCheckBtn,
            #sentenceCheckBtn,
            #grammarCheckBtn,
            #gridCheckBtn,
            #crossGridCheckBtn {
                padding: 12px 22px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
            }

            .puzzleMessage {
                min-height: 30px;
                margin-top: 18px;
                font-size: 18px;
            }

            .puzzleMoves {
                margin-top: 14px;
                opacity: .7;
            }

            /* ============================= */
            /* PATTERN */
            /* ============================= */

            .patternItems { display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap; margin: 30px auto; }
            .patternItem, .patternOption { min-width: 70px; min-height: 70px; padding: 12px 18px; border: 2px solid #ddd; border-radius: 14px; background: white; font-size: 28px; display: flex; align-items: center; justify-content: center; }
            .patternMissing { border-style: dashed; }
            .patternOptions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 20px auto; }
            .patternOption { cursor: pointer; }
            .patternOption.selected { border-color: #333; transform: scale(1.04); }

            /* ============================= */
            /* SPATIAL */
            /* ============================= */

            .spatialQuestion { max-width: 720px; margin: 18px auto; font-size: 20px; font-weight: bold; }
            .spatialGrid { display: grid; grid-template-columns: repeat(var(--spatial-cols), minmax(65px, 100px)); gap: 6px; justify-content: center; margin: 28px auto; width: fit-content; }
            .spatialCell { min-width: 65px; min-height: 65px; display: flex; align-items: center; justify-content: center; border: 2px solid #ddd; border-radius: 12px; background: white; font-size: 20px; font-weight: bold; }
            .spatialOptions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin: 22px auto; }
            .spatialOption { min-width: 100px; padding: 12px 18px; border: 2px solid #ddd; border-radius: 12px; background: white; cursor: pointer; font-size: 17px; }
            .spatialOption.selected { border-color: #333; transform: scale(1.04); }

            .spatialDropCell {
                position: relative;
                min-width: 88px;
                min-height: 88px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #d8d8d8;
                border-radius: 14px;
                background: #fff;
                overflow: hidden;
            }

            .spatialDropCell.hasTarget {
                border-style: dashed;
            }

            .spatialTargetGhost {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 68%;
                height: 68%;
                border: 2px dashed #aaa;
                border-radius: 12px;
                opacity: .28;
                font-size: 34px;
                font-weight: bold;
                pointer-events: none;
            }

            .spatialSourceCell { background: #fafafa; }
            .spatialAxisCell { box-shadow: inset 0 0 0 2px rgba(120, 120, 120, 0.25); }
            .spatialSourcePiece { font-size: 26px; font-weight: bold; opacity: 0.9; }
            .spatialAxisLabel { margin: 10px auto 18px; text-align: center; font-size: 15px; opacity: 0.75; }
            .spatialSlotHint {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                opacity: .12;
                background: currentColor;
            }

            /* ============================= */
            /* ORDERING */
            /* ============================= */

            .puzzleItems {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 14px;
                margin: 30px 0;
            }

            .puzzleItem {
                min-width: 80px;
                min-height: 80px;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 14px;
                background: white;
                cursor: pointer;
                font-size: 22px;
            }

            .puzzleItem.selected {
                border-color: #333;
                transform: scale(1.05);
            }

            .puzzleImageItem {
                width: 150px;
                height: 150px;
                padding: 8px;
                overflow: hidden;
            }

            .puzzleImageItem img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
                pointer-events: none;
            }

            /* ============================= */
            /* SEQUENCE */
            /* ============================= */

            .sequenceItems {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin: 30px 0;
                font-size: 28px;
            }

            .sequenceItem,
            .sequenceMissing {
                min-width: 70px;
                padding: 14px 18px;
                border: 2px solid #ddd;
                border-radius: 14px;
            }

            .sequenceMissing {
                border-style: dashed;
                font-weight: bold;
            }

            .sequenceAnswerArea,
            .visualMathAnswerArea {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin: 20px 0;
            }

            #sequenceAnswerInput,
            #visualMathAnswerInput {
                width: 140px;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 10px;
                font-size: 20px;
                text-align: center;
            }

            /* ============================= */
            /* VISUAL MATH */
            /* ============================= */

            .visualMathEquation {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 22px;
                margin: 35px auto;
                direction: ltr;
                flex-wrap: wrap;
            }

            .visualMathGroup {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 8px;
                max-width: 220px;
            }

            .visualMathImage {
                width: 65px;
                height: 65px;
                object-fit: contain;
                display: block;
                border-radius: 10px;
            }

            .visualMathOperator {
                font-size: 36px;
                font-weight: bold;
            }

            .visualMathQuestion {
                width: 70px;
                height: 70px;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 2px dashed #999;
                border-radius: 12px;
                font-size: 32px;
                font-weight: bold;
            }

            .visualMathCountingGroup {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 10px;
                max-width: 500px;
                margin: 35px auto;
            }

            .visualComparisonArea {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 25px;
                margin: 35px auto;
                flex-wrap: wrap;
            }

            .visualComparisonGroup {
                width: 240px;
                min-height: 130px;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 8px;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 16px;
                background: white;
            }

            .visualComparisonSeparator {
                font-size: 34px;
                font-weight: bold;
            }

            .visualComparisonChoices {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin: 25px auto;
                flex-wrap: wrap;
            }

            .visualComparisonBtn {
                min-width: 120px;
                padding: 14px 22px;
                border: 2px solid #ddd;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                font-size: 17px;
            }

            .visualComparisonBtn.selected {
                border-color: #333;
                transform: scale(1.04);
            }

            /* ============================= */
            /* INPUT OUTPUT */
            /* ============================= */

            .ioMachine {
                width: min(620px, 100%);
                margin: 30px auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .ioRow {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                gap: 12px;
                padding: 14px;
                border: 2px solid #ddd;
                border-radius: 14px;
                background: white;
            }

            .ioInputValue,
            .ioOutputValue {
                font-size: 22px;
                font-weight: bold;
            }

            .ioArrow {
                font-size: 25px;
            }

            .ioAnswerInput {
                width: 110px;
                margin: auto;
                padding: 10px;
                border: 2px dashed #999;
                border-radius: 10px;
                font-size: 20px;
                text-align: center;
            }

            /* ============================= */
            /* SENTENCE */
            /* ============================= */

            .sentenceWords {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 10px;
                margin: 30px auto;
            }

            .sentenceWord {
                padding: 14px 18px;
                border: 2px solid #ddd;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                font-size: 18px;
            }

            .sentencePreview {
                min-height: 55px;
                max-width: 800px;
                margin: 20px auto;
                padding: 14px;
                border: 2px dashed #aaa;
                border-radius: 12px;
                font-size: 21px;
            }

            .grammarRows {
                width: min(650px, 100%);
                margin: 25px auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .grammarRow {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                align-items: center;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 12px;
            }

            .grammarWord {
                font-size: 20px;
                font-weight: bold;
            }

            .grammarSelect {
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 10px;
                font-size: 16px;
            }

            /* ============================= */
            /* GRID */
            /* ============================= */

            .genericGrid,
            .crossGridContainer {
                display: grid;
                grid-template-columns:
                    repeat(
                        var(--grid-cols),
                        minmax(65px, 110px)
                    );
                justify-content: center;
                gap: 5px;
                margin: 30px auto;
                width: fit-content;
                max-width: 100%;
            }

            .gridCell,
            .crossGridCell {
                min-width: 65px;
                min-height: 65px;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 8px;
                border: 2px solid #ddd;
                border-radius: 8px;
                background: white;
                font-size: 22px;
                font-weight: bold;
            }

            .gridMissing,
            .crossMissingCell {
                border-style: dashed;
            }

            .gridAnswerInput,
            .crossGridAnswerInput {
                width: 80%;
                min-width: 45px;
                padding: 8px;
                border: 0;
                outline: none;
                background: transparent;
                text-align: center;
                font-size: 20px;
            }

            /* ============================= */
            /* CROSS GRID */
            /* ============================= */

            .crossOperationCell {
                background: #f4f4f4;
                font-size: 22px;
            }

            .crossBlockedCell {
                background: transparent;
                border-color: transparent;
            }

            .crossGridPaths {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 8px;
                margin: 18px auto;
            }

            .crossGridPathTag {
                display: inline-block;
                padding: 6px 10px;
                border-radius: 10px;
                border: 1px solid #ddd;
                font-size: 14px;
            }

            /* ============================= */
            /* MOBILE */
            /* ============================= */

            @media (
                max-width: 700px
            ) {

                .visualMathEquation {
                    gap: 12px;
                }

                .visualMathImage {
                    width: 52px;
                    height: 52px;
                }

                .gridCell,
                .crossGridCell {
                    min-width: 52px;
                    min-height: 52px;
                    font-size: 18px;
                }

                .genericGrid,
                .crossGridContainer {
                    grid-template-columns:
                        repeat(
                            var(--grid-cols),
                            minmax(48px, 75px)
                        );
                }

                .ioRow {
                    grid-template-columns: 1fr auto 1fr;
                }

                .sentencePreview {
                    font-size: 18px;
                }

            }

        `;


        document.head.appendChild(
            style
        );

    }

};




// =====================================
// SPATIAL SYMMETRY v2 UI OVERRIDE
// =====================================
PuzzleScreen.showSpatialSymmetry = function (state) {
    const app = this.getApp();
    if (!app) return;

    const grid = state.grid || {};
    const rows = Math.max(1, Number(grid.rows) || 1);
    const cols = Math.max(1, Number(grid.cols) || 1);
    const pieces = Array.isArray(state.pieces) ? state.pieces : [];
    const placements = state.placements || {};
    const sourceByCell = {};
    const placedByCell = {};

    pieces.forEach(function (piece) {
        if (piece.source) {
            sourceByCell[Number(piece.source.row) + ":" + Number(piece.source.col)] = piece;
        }
        const placement = placements[String(piece.id)];
        if (placement) {
            placedByCell[Number(placement.row) + ":" + Number(placement.col)] = piece;
        }
    });

    const cells = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const key = row + ":" + col;
            const sourcePiece = sourceByCell[key];
            const placedPiece = placedByCell[key];
            const isAxis = state.axis === "vertical"
                ? (cols % 2 === 1 && col === Math.floor(cols / 2))
                : (rows % 2 === 1 && row === Math.floor(rows / 2));

            cells.push(
                "<div class=\"spatialDropCell spatialSymmetryCell" +
                    (placedPiece ? " filled" : "") +
                    (sourcePiece ? " spatialSourceCell" : "") +
                    (isAxis ? " spatialAxisCell" : "") +
                    "\" data-row=\"" + row + "\" data-col=\"" + col + "\">" +
                    (sourcePiece
                        ? "<div class=\"spatialSourcePiece\">" + this.escapeHTML(sourcePiece.label || sourcePiece.id) + "</div>"
                        : placedPiece
                            ? "<div class=\"spatialPlacedPiece\" data-piece-id=\"" + this.escapeHTML(placedPiece.id) + "\">" + this.escapeHTML(placedPiece.label || placedPiece.id) + "</div>"
                            : "<span class=\"spatialSlotHint\"></span>") +
                "</div>"
            );
        }
    }

    const tray = pieces.map(function (piece) {
        if (placements[String(piece.id)]) return "";
        return "<div class=\"spatialDragPiece\" data-piece-id=\"" +
            PuzzleScreen.escapeHTML(piece.id) +
            "\" tabindex=\"0\">" +
            PuzzleScreen.escapeHTML(piece.label || piece.id) +
            "</div>";
    }).join("");

    const axisText = state.axis === "horizontal" ? "افقی" : "عمودی";

    app.innerHTML =
        "<div class=\"screen puzzleScreen spatialScreen spatialSymmetryScreen\" dir=\"rtl\">" +
            "<div class=\"spatialSymmetryHeader\">" +
                "<h1>تقارن شکل‌ها</h1>" +
                "<p class=\"puzzleInstruction\">شکل‌ها را در جای قرینه قرار بده.</p>" +
            "</div>" +
            "<div class=\"spatialAxisLabel\">محور تقارن: " + axisText + "</div>" +
            "<div class=\"spatialPlacementLayout\">" +
                "<div class=\"spatialBoardWrap\">" +
                    "<div class=\"spatialBoard\" style=\"--spatial-cols:" + cols + ";--spatial-rows:" + rows + "\">" +
                        cells.join("") +
                    "</div>" +
                "</div>" +
                "<div class=\"spatialTray\">" +
                    "<div class=\"spatialTrayTitle\">شکل‌ها</div>" +
                    "<div class=\"spatialTrayPieces\">" + tray + "</div>" +
                "</div>" +
            "</div>" +
            "<button id=\"spatialSymmetryCheckBtn\" class=\"spatialCheckButton\" type=\"button\" disabled>بررسی پاسخ</button>" +
            "<div id=\"spatialSymmetryMessage\" class=\"puzzleMessage\" role=\"status\"></div>" +
            this.renderStandardFooter(state.moves) +
        "</div>";

    const beginDrag = function (pieceElement) {
        const pieceId = pieceElement.dataset.pieceId;
        if (!pieceId) return;

        // Do not let the pointer gesture that launched the activity become
        // the first puzzle drag when the screen appears underneath it.
        if (Date.now() - PuzzleScreen.spatialScreenActivatedAt < 900) return;

        const ghost = document.createElement("div");
        ghost.className = "spatialDragGhost";
        ghost.textContent = pieceElement.textContent || "";
        document.body.appendChild(ghost);

        const moveGhost = function (event) {
            ghost.style.left = (event.clientX - 28) + "px";
            ghost.style.top = (event.clientY - 28) + "px";
        };

        const finishDrag = function (event) {
            document.removeEventListener("pointermove", moveGhost);
            document.removeEventListener("pointerup", finishDrag);
            ghost.remove();

            const target = document.elementFromPoint(event.clientX, event.clientY);
            const cell = target && target.closest
                ? target.closest(".spatialDropCell")
                : null;

            if (cell && app.contains(cell) && !cell.classList.contains("spatialSourceCell")) {
                PuzzleEngine.setTypeAnswer({
                    pieceId: pieceId,
                    row: Number(cell.dataset.row),
                    col: Number(cell.dataset.col)
                });
                PuzzleScreen.show(PuzzleEngine.getState());
            }
        };

        document.addEventListener("pointermove", moveGhost);
        document.addEventListener("pointerup", finishDrag, { once: true });
        moveGhost(event);
    };

    app.querySelectorAll(".spatialDragPiece, .spatialPlacedPiece").forEach(function (pieceElement) {
        pieceElement.addEventListener("pointerdown", function (event) {
            event.preventDefault();
            beginDrag(pieceElement);
        });
    });

    const checkButton = app.querySelector("#spatialSymmetryCheckBtn");
    if (checkButton) {
        // Ignore release/click events that belong to the activity-launch
        // gesture and arrive while the newly rendered puzzle is taking over.
        const screenReadyAt = Date.now();
        let userActivatedCheckAt = 0;

        checkButton.addEventListener("pointerdown", function () {
            userActivatedCheckAt = Date.now();
        });

        setTimeout(function () {
            if (!checkButton.isConnected) return;
            checkButton.disabled = !(Number(state.moves) > 0);
        }, 0);

        checkButton.addEventListener("click", function () {
            const now = Date.now();
            const pointerStartedAt = userActivatedCheckAt;
            userActivatedCheckAt = 0;

            // A check is accepted only after the screen has settled and the
            // button itself received a fresh pointerdown for this click.
            if (now - screenReadyAt < 700) return;
            if (!pointerStartedAt || pointerStartedAt < screenReadyAt ||
                now - pointerStartedAt > 1500) return;

            const currentState = PuzzleEngine.getState();
            const currentPlacements = currentState.placements || {};
            const currentPieces = currentState.pieces || [];
            if (Number(currentState.moves) <= 0 ||
                Object.keys(currentPlacements).length === 0 ||
                currentPieces.length === 0) {
                checkButton.disabled = true;
                return;
            }

            const correct = PuzzleEngine.check();
            const message = app.querySelector("#spatialSymmetryMessage");
            if (message) {
                message.textContent = correct
                    ? "آفرین! تقارن کامل است."
                    : "هنوز درست نیست؛ شکل‌ها را جابه‌جا کن و دوباره بررسی کن.";
            }
        });
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

PuzzleScreen.init();


console.log(
    "Puzzle Screen v2.5 Ready"
);