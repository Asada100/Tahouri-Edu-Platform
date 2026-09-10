// =====================================
// Tahouri Edu Platform
// Matching Screen
// Version 1.1
//
// Responsibilities:
// - Matching UI Rendering
// - Left / Right Item Display
// - Mouse Connection Interaction
// - Matching Engine Interaction
// - Activity Ready Integration
//
// Execution remains in MatchingEngine.
// Content remains generic and subject-agnostic.
// =====================================


const MatchingScreen = {

    activityReadyConnected: false,

    lastMessage: "",

    lastMessageType: "",

    connection: {
        active: false,
        side: null,
        itemId: null,
        moveHandler: null,
        upHandler: null
    },


    // =====================================
    // INIT
    // =====================================

    init: function () {

        if (typeof EventManager === "undefined") {

            console.error(
                "Matching Screen: EventManager Not Available"
            );

            return;

        }

        if (this.activityReadyConnected) {
            return;
        }

        EventManager.on(
            "activityReady",
            function (payload) {
                MatchingScreen.handleActivityReady(payload);
            }
        );

        this.activityReadyConnected = true;

        console.log(
            "Matching Screen: Activity Ready Listener Connected"
        );

    },


    // =====================================
    // ACTIVITY READY
    // =====================================

    handleActivityReady: function (payload) {

        if (!payload) {
            return;
        }

        const engineName = payload.engineName;

        if (
            engineName !== "MatchingEngine" &&
            engineName !== "matching"
        ) {
            return;
        }

        const result = payload.result;

        if (!result) {
            console.error(
                "Matching Screen: Matching Result Missing"
            );
            return;
        }

        console.log(
            "Matching Screen: Activity Ready Received",
            payload.activity ? payload.activity.id : null
        );

        this.show(result);

    },


    // =====================================
    // SHOW
    // =====================================

    show: function (state) {

        if (!state) {
            console.error("Matching Screen: State Missing");
            return;
        }

        this.cancelMouseConnection();

        const app = this.getApp();

        if (!app) {
            return;
        }

        const leftItems = Array.isArray(state.leftItems)
            ? state.leftItems
            : [];

        const rightItems = Array.isArray(state.rightItems)
            ? state.rightItems
            : [];

        const matchedPairs = Array.isArray(state.matchedPairs)
            ? state.matchedPairs
            : [];

        const selectedLeftId = state.selected && state.selected.left
            ? String(state.selected.left.id)
            : null;

        const selectedRightId = state.selected && state.selected.right
            ? String(state.selected.right.id)
            : null;

        const leftHTML = leftItems
            .map(function (item) {
                return MatchingScreen.renderItem(
                    item,
                    "left",
                    selectedLeftId,
                    matchedPairs,
                    state
                );
            })
            .join("");

        const rightHTML = rightItems
            .map(function (item) {
                return MatchingScreen.renderItem(
                    item,
                    "right",
                    selectedRightId,
                    matchedPairs,
                    state
                );
            })
            .join("");

        const message = this.lastMessage
            ? `
                <div class="matchingMessage ${this.lastMessageType}">
                    ${this.escapeHTML(this.lastMessage)}
                </div>
            `
            : "";

        app.innerHTML = `

            <div
                class="screen matchingScreen"
                dir="rtl">

                <h1>
                    تطبیق موارد مرتبط
                </h1>

                <p class="matchingInstruction">
                    ${this.escapeHTML(state.instruction || "موارد مرتبط را به هم وصل کن.")}
                </p>

                <div
                    class="matchingBoard"
                    style="position:relative;">

                    <svg
                        class="matchingConnections"
                        aria-hidden="true"
                        focusable="false"
                        style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:3;">
                    </svg>

                    <div
                        class="matchingColumn matchingLeftColumn"
                        data-side="left"
                        style="position:relative;z-index:2;">

                        <div class="matchingColumnTitle">
                            مورد اول
                        </div>

                        <div class="matchingItems">
                            ${leftHTML}
                        </div>

                    </div>

                    <div
                        class="matchingColumn matchingRightColumn"
                        data-side="right"
                        style="position:relative;z-index:2;">

                        <div class="matchingColumnTitle">
                            مورد دوم
                        </div>

                        <div class="matchingItems">
                            ${rightHTML}
                        </div>

                    </div>

                </div>

                <div class="matchingStatus">
                    حرکت‌ها: ${Number.isFinite(state.moves) ? state.moves : 0}
                    |
                    تطبیق‌ها: ${matchedPairs.length} از ${state.totalPairs || 0}
                </div>

                ${message}

            </div>

        `;

        this.bindEvents();
        this.drawMatchedConnections();

    },


    // =====================================
    // ITEM RENDER
    // =====================================

    renderItem: function (
        item,
        side,
        selectedId,
        matchedPairs,
        state
    ) {

        const itemId = String(item.id);
        const selected = selectedId === itemId;
        const matched = this.isItemMatched(
            side,
            itemId,
            matchedPairs,
            state
        );

        const classes = ["matchingItem"];

        if (selected) {
            classes.push("selected");
        }

        if (matched) {
            classes.push("matched");
        }

        return `
            <button
                type="button"
                class="${classes.join(" ")}"
                data-matching-side="${side}"
                data-matching-id="${this.escapeAttribute(itemId)}"
                ${matched || state.finished ? "disabled" : ""}>

                ${this.renderItemContent(item)}

            </button>
        `;

    },


    renderItemContent: function (item) {

        if (!item || typeof item !== "object") {
            return "";
        }

        if (item.image) {
            return `
                <span class="matchingItemImageWrap">
                    <img
                        class="matchingItemImage"
                        src="${this.escapeAttribute(item.image)}"
                        alt=""
                        draggable="false">
                </span>
            `;
        }

        const value =
            item.value !== undefined
                ? item.value
                : item.text !== undefined
                    ? item.text
                    : item.label !== undefined
                        ? item.label
                        : item.name !== undefined
                            ? item.name
                            : "";

        return this.escapeHTML(value);

    },


    // =====================================
    // EVENTS
    // =====================================

    bindEvents: function () {

        const buttons = document.querySelectorAll(
            "[data-matching-side][data-matching-id]"
        );

        buttons.forEach(function (button) {

            button.addEventListener(
                "mousedown",
                function (event) {
                    MatchingScreen.beginMouseConnection(
                        event,
                        button
                    );
                }
            );

        });

    },


    // =====================================
    // MOUSE CONNECTION
    // =====================================

    beginMouseConnection: function (event, button) {

        if (!event || event.button !== 0 || !button) {
            return;
        }

        if (button.disabled) {
            return;
        }

        const side = button.getAttribute("data-matching-side");
        const itemId = button.getAttribute("data-matching-id");

        if (!side || !itemId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.cancelMouseConnection();

        this.connection.active = true;
        this.connection.side = side;
        this.connection.itemId = itemId;

        this.connection.moveHandler = function (moveEvent) {
            MatchingScreen.updatePreviewConnection(
                moveEvent.clientX,
                moveEvent.clientY
            );
        };

        this.connection.upHandler = function (upEvent) {
            MatchingScreen.finishMouseConnection(upEvent);
        };

        document.addEventListener(
            "mousemove",
            this.connection.moveHandler
        );

        document.addEventListener(
            "mouseup",
            this.connection.upHandler,
            true
        );

        this.updatePreviewConnection(
            event.clientX,
            event.clientY
        );

    },


    finishMouseConnection: function (event) {

        if (!this.connection.active) {
            return;
        }

        const startSide = this.connection.side;
        const startId = this.connection.itemId;
        const target = event
            ? document.elementFromPoint(event.clientX, event.clientY)
            : null;

        const targetButton = target && typeof target.closest === "function"
            ? target.closest("[data-matching-side][data-matching-id]")
            : null;

        const targetSide = targetButton
            ? targetButton.getAttribute("data-matching-side")
            : null;

        const targetId = targetButton
            ? targetButton.getAttribute("data-matching-id")
            : null;

        const validTarget =
            targetButton &&
            !targetButton.disabled &&
            targetSide &&
            targetId &&
            targetSide !== startSide &&
            String(targetId) !== String(startId);

        this.cancelMouseConnection();

        if (!validTarget) {
            return;
        }

        if (
            typeof MatchingEngine === "undefined" ||
            typeof MatchingEngine.select !== "function"
        ) {
            console.error(
                "Matching Screen: Matching Engine Not Available"
            );
            return;
        }

        const firstResult = MatchingEngine.select(
            startSide,
            startId
        );

        if (!firstResult) {
            return;
        }

        this.handleSelection(
            targetSide,
            targetId
        );

    },


    cancelMouseConnection: function () {

        if (this.connection.moveHandler) {
            document.removeEventListener(
                "mousemove",
                this.connection.moveHandler
            );
        }

        if (this.connection.upHandler) {
            document.removeEventListener(
                "mouseup",
                this.connection.upHandler,
                true
            );
        }

        this.connection.active = false;
        this.connection.side = null;
        this.connection.itemId = null;
        this.connection.moveHandler = null;
        this.connection.upHandler = null;

        const svg = document.querySelector(".matchingConnections");

        if (svg) {
            const preview = svg.querySelector(
                ".matchingPreviewConnection"
            );

            if (preview) {
                preview.remove();
            }
        }

    },


    updatePreviewConnection: function (clientX, clientY) {

        if (!this.connection.active) {
            return;
        }

        const board = document.querySelector(".matchingBoard");
        const svg = document.querySelector(".matchingConnections");
        const startButton = this.findMatchingButton(
            this.connection.side,
            this.connection.itemId
        );

        if (!board || !svg || !startButton) {
            return;
        }

        const boardRect = board.getBoundingClientRect();
        const startPoint = this.getElementCenter(
            startButton,
            boardRect
        );

        const endPoint = {
            x: clientX - boardRect.left,
            y: clientY - boardRect.top
        };

        let preview = svg.querySelector(
            ".matchingPreviewConnection"
        );

        if (!preview) {
            preview = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );
            preview.setAttribute(
                "class",
                "matchingPreviewConnection"
            );
            preview.setAttribute(
                "fill",
                "none"
            );
            preview.setAttribute(
                "stroke",
                "#2563eb"
            );
            preview.setAttribute(
                "stroke-width",
                "3"
            );
            preview.setAttribute(
                "stroke-linecap",
                "round"
            );
            preview.setAttribute(
                "stroke-dasharray",
                "7 6"
            );
            svg.appendChild(preview);
        }

        preview.setAttribute("x1", startPoint.x);
        preview.setAttribute("y1", startPoint.y);
        preview.setAttribute("x2", endPoint.x);
        preview.setAttribute("y2", endPoint.y);

    },


    // =====================================
    // MATCHED CONNECTIONS
    // =====================================

    drawMatchedConnections: function () {

        const board = document.querySelector(".matchingBoard");
        const svg = document.querySelector(".matchingConnections");

        if (!board || !svg) {
            return;
        }

        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        if (
            typeof MatchingEngine === "undefined" ||
            !MatchingEngine.matching ||
            !Array.isArray(MatchingEngine.matching.pairs)
        ) {
            return;
        }

        const matchedPairs = Array.isArray(MatchingEngine.matchedPairs)
            ? MatchingEngine.matchedPairs
            : [];

        const boardRect = board.getBoundingClientRect();

        matchedPairs.forEach(function (pairId) {

            const pair = MatchingEngine.matching.pairs.find(function (item) {
                return String(item.id) === String(pairId);
            });

            if (!pair) {
                return;
            }

            const leftButton = MatchingScreen.findMatchingButton(
                "left",
                pair.left.id
            );

            const rightButton = MatchingScreen.findMatchingButton(
                "right",
                pair.right.id
            );

            if (!leftButton || !rightButton) {
                return;
            }

            const leftPoint = MatchingScreen.getElementCenter(
                leftButton,
                boardRect
            );

            const rightPoint = MatchingScreen.getElementCenter(
                rightButton,
                boardRect
            );

            const line = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );

            line.setAttribute("class", "matchingPairConnection");
            line.setAttribute("x1", leftPoint.x);
            line.setAttribute("y1", leftPoint.y);
            line.setAttribute("x2", rightPoint.x);
            line.setAttribute("y2", rightPoint.y);
            line.setAttribute("fill", "none");
            line.setAttribute("stroke", "#16a34a");
            line.setAttribute("stroke-width", "4");
            line.setAttribute("stroke-linecap", "round");

            svg.appendChild(line);

        });

    },


    findMatchingButton: function (side, itemId) {

        const buttons = document.querySelectorAll(
            "[data-matching-side][data-matching-id]"
        );

        const normalizedId = String(itemId);

        for (let index = 0; index < buttons.length; index += 1) {

            const button = buttons[index];

            if (
                button.getAttribute("data-matching-side") === side &&
                String(button.getAttribute("data-matching-id")) === normalizedId
            ) {
                return button;
            }

        }

        return null;

    },


    getElementCenter: function (element, boardRect) {

        const rect = element.getBoundingClientRect();

        return {
            x: rect.left - boardRect.left + rect.width / 2,
            y: rect.top - boardRect.top + rect.height / 2
        };

    },


    handleSelection: function (side, itemId) {

        if (
            typeof MatchingEngine === "undefined" ||
            typeof MatchingEngine.select !== "function"
        ) {
            console.error(
                "Matching Screen: Matching Engine Not Available"
            );
            return;
        }

        const result = MatchingEngine.select(
            side,
            itemId
        );

        if (!result) {
            return;
        }

        if (
            Object.prototype.hasOwnProperty.call(result, "correct")
        ) {
            this.lastMessage = result.correct
                ? "آفرین! تطبیق درست است."
                : "این دو مورد با هم مرتبط نیستند.";

            this.lastMessageType = result.correct
                ? "success"
                : "error";

            this.show(
                MatchingEngine.getState()
            );

            if (MatchingEngine.getState().finished) {
                this.lastMessage = "فعالیت با موفقیت کامل شد.";
                this.lastMessageType = "success";
                this.show(MatchingEngine.getState());
            }

            return;
        }

        this.show(
            MatchingEngine.getState()
        );

    },


    // =====================================
    // MATCH STATE
    // =====================================

    isItemMatched: function (
        side,
        itemId,
        matchedPairs,
        state
    ) {

        if (!Array.isArray(matchedPairs)) {
            return false;
        }

        const matchingPairs =
            typeof MatchingEngine !== "undefined" &&
            MatchingEngine.matching &&
            Array.isArray(MatchingEngine.matching.pairs)
                ? MatchingEngine.matching.pairs
                : [];

        return matchingPairs.some(function (pair) {

            if (!matchedPairs.includes(pair.id)) {
                return false;
            }

            if (side === "left") {
                return String(pair.left.id) === String(itemId);
            }

            return String(pair.right.id) === String(itemId);

        });

    },


    // =====================================
    // APP
    // =====================================

    getApp: function () {

        const app = document.getElementById("app");

        if (!app) {
            console.error(
                "Matching Screen: App Container Not Found"
            );
            return null;
        }

        return app;

    },


    // =====================================
    // SAFE TEXT
    // =====================================

    escapeHTML: function (value) {

        const text =
            value === null || value === undefined
                ? ""
                : String(value);

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");

    },


    escapeAttribute: function (value) {
        return this.escapeHTML(value);
    }

};


window.MatchingScreen = MatchingScreen;


// =====================================
// CONNECT EVENT
// =====================================

MatchingScreen.init();


console.log("Matching Screen Ready v1.1");
