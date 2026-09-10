// =====================================
// Tahouri Edu Platform
// Matching Screen
// Version 1.0
//
// Responsibilities:
// - Matching UI Rendering
// - Left / Right Item Display
// - User Selection
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

                <div class="matchingBoard">

                    <div
                        class="matchingColumn matchingLeftColumn"
                        data-side="left">

                        <div class="matchingColumnTitle">
                            مورد اول
                        </div>

                        <div class="matchingItems">
                            ${leftHTML}
                        </div>

                    </div>

                    <div
                        class="matchingColumn matchingRightColumn"
                        data-side="right">

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
                "click",
                function () {
                    MatchingScreen.handleSelection(
                        button.getAttribute("data-matching-side"),
                        button.getAttribute("data-matching-id")
                    );
                }
            );

        });

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
            .replace(/"/g, "&quot;")
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


console.log("Matching Screen Ready v1.0");
