// =====================================
// Tahouri Edu Platform
// Matching Screen
// Version 1.3
//
// Supports one-to-one and many-to-one Matching.
// Right-side targets remain reusable.
// Uses Pointer Events for mouse + touch.
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
        upHandler: null,
        cancelHandler: null
    },

    init: function () {
        if (typeof EventManager === "undefined") {
            console.error("Matching Screen: EventManager Not Available");
            return;
        }

        if (this.activityReadyConnected) return;

        EventManager.on("activityReady", function (payload) {
            MatchingScreen.handleActivityReady(payload);
        });

        this.activityReadyConnected = true;
        console.log("Matching Screen: Activity Ready Listener Connected");
    },

    handleActivityReady: function (payload) {
        if (!payload) return;

        if (payload.engineName !== "MatchingEngine" && payload.engineName !== "matching") {
            return;
        }

        if (!payload.result) {
            console.error("Matching Screen: Matching Result Missing");
            return;
        }

        console.log(
            "Matching Screen: Activity Ready Received",
            payload.activity ? payload.activity.id : null
        );

        this.show(payload.result);
    },

    show: function (state) {
        if (!state) {
            console.error("Matching Screen: State Missing");
            return;
        }

        this.cancelPointerConnection();

        const app = this.getApp();
        if (!app) return;

        const leftItems = Array.isArray(state.leftItems) ? state.leftItems : [];
        const rightItems = Array.isArray(state.rightItems) ? state.rightItems : [];
        const matchedPairs = Array.isArray(state.matchedPairs) ? state.matchedPairs : [];

        const selectedLeftId = state.selected && state.selected.left
            ? String(state.selected.left.id)
            : null;

        const selectedRightId = state.selected && state.selected.right
            ? String(state.selected.right.id)
            : null;

        const leftHTML = leftItems.map(function (item) {
            return MatchingScreen.renderItem(
                item,
                "left",
                selectedLeftId,
                matchedPairs,
                state
            );
        }).join("");

        const rightHTML = rightItems.map(function (item) {
            return MatchingScreen.renderItem(
                item,
                "right",
                selectedRightId,
                matchedPairs,
                state
            );
        }).join("");

        const message = this.lastMessage
            ? `<div class="matchingMessage ${this.lastMessageType}">${this.escapeHTML(this.lastMessage)}</div>`
            : "";

        app.innerHTML = `
            <div class="screen matchingScreen" dir="rtl">
                <h1>تطبیق موارد مرتبط</h1>

                <p class="matchingInstruction">
                    ${this.escapeHTML(state.instruction || "موارد مرتبط را به هم وصل کن.")}
                </p>

                <div class="matchingBoard" style="position:relative;">
                    <svg
                        class="matchingConnections"
                        aria-hidden="true"
                        focusable="false"
                        style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:3;">
                    </svg>

                    <div class="matchingColumn matchingLeftColumn" data-side="left" style="position:relative;z-index:2;">
                        <div class="matchingColumnTitle">مورد اول</div>
                        <div class="matchingItems">${leftHTML}</div>
                    </div>

                    <div class="matchingColumn matchingRightColumn" data-side="right" style="position:relative;z-index:2;">
                        <div class="matchingColumnTitle">مورد دوم</div>
                        <div class="matchingItems">${rightHTML}</div>
                    </div>
                </div>

                <div class="matchingStatus">
                    حرکت‌ها: ${Number.isFinite(state.moves) ? state.moves : 0}
                    |
                    تطبیق‌ها: ${Array.isArray(state.matchedLeftIds) ? state.matchedLeftIds.length : matchedPairs.length}
                    از ${state.totalPairs || 0}
                </div>

                ${message}
            </div>
        `;

        this.bindEvents();
        this.drawMatchedConnections();
    },

    renderItem: function (item, side, selectedId, matchedPairs, state) {
        const itemId = String(item.id);
        const matched = this.isItemMatched(side, itemId, matchedPairs, state);
        const selected = selectedId === itemId;
        const classes = ["matchingItem"];

        if (selected) classes.push("selected");
        if (matched) classes.push("matched");

        // Only a matched LEFT item becomes unavailable.
        // Right targets are reusable for many left items.
        const disabled = state.finished || (side === "left" && matched);

        return `
            <button
                type="button"
                class="${classes.join(" ")}"
                data-matching-side="${side}"
                data-matching-id="${this.escapeAttribute(itemId)}"
                ${disabled ? "disabled" : ""}>
                ${this.renderItemContent(item)}
            </button>
        `;
    },

    renderItemContent: function (item) {
        if (!item || typeof item !== "object") return "";

        if (item.image) {
            return `
                <span class="matchingItemImageWrap">
                    <img class="matchingItemImage" src="${this.escapeAttribute(item.image)}" alt="" draggable="false">
                </span>
            `;
        }

        const value = item.value !== undefined
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

    bindEvents: function () {
        const buttons = document.querySelectorAll("[data-matching-side][data-matching-id]");

        buttons.forEach(function (button) {
            button.addEventListener("pointerdown", function (event) {
                MatchingScreen.beginPointerConnection(event, button);
            });
        });
    },

    beginPointerConnection: function (event, button) {
        if (!event || !button || button.disabled) return;

        // Pointer Events use button=0 for mouse. Touch pointers do not have
        // a mouse button value, so only reject non-primary mouse buttons.
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const side = button.getAttribute("data-matching-side");
        const itemId = button.getAttribute("data-matching-id");
        if (!side || !itemId) return;

        event.preventDefault();
        event.stopPropagation();
        this.cancelPointerConnection();

        this.connection.active = true;
        this.connection.side = side;
        this.connection.itemId = itemId;

        if (typeof button.setPointerCapture === "function" && event.pointerId !== undefined) {
            try {
                button.setPointerCapture(event.pointerId);
            } catch (error) {
                // Pointer capture is optional; document-level listeners still handle the drag.
            }
        }

        this.connection.moveHandler = function (moveEvent) {
            if (moveEvent.pointerId !== event.pointerId) return;
            moveEvent.preventDefault();
            MatchingScreen.updatePreviewConnection(moveEvent.clientX, moveEvent.clientY);
        };

        this.connection.upHandler = function (upEvent) {
            if (upEvent.pointerId !== event.pointerId) return;
            MatchingScreen.finishPointerConnection(upEvent);
        };

        this.connection.cancelHandler = function (cancelEvent) {
            if (cancelEvent.pointerId !== event.pointerId) return;
            MatchingScreen.cancelPointerConnection();
        };

        document.addEventListener("pointermove", this.connection.moveHandler, {passive: false});
        document.addEventListener("pointerup", this.connection.upHandler, true);
        document.addEventListener("pointercancel", this.connection.cancelHandler, true);

        this.updatePreviewConnection(event.clientX, event.clientY);
    },

    finishPointerConnection: function (event) {
        if (!this.connection.active) return;

        const startSide = this.connection.side;
        const startId = this.connection.itemId;
        const target = event
            ? document.elementFromPoint(event.clientX, event.clientY)
            : null;

        const targetButton = target && typeof target.closest === "function"
            ? target.closest("[data-matching-side][data-matching-id]")
            : null;

        const targetSide = targetButton ? targetButton.getAttribute("data-matching-side") : null;
        const targetId = targetButton ? targetButton.getAttribute("data-matching-id") : null;

        const validTarget = targetButton &&
            !targetButton.disabled &&
            targetSide &&
            targetId &&
            targetSide !== startSide &&
            String(targetId) !== String(startId);

        this.cancelPointerConnection();
        if (!validTarget) return;

        if (typeof MatchingEngine === "undefined" || typeof MatchingEngine.select !== "function") {
            console.error("Matching Screen: Matching Engine Not Available");
            return;
        }

        const firstResult = MatchingEngine.select(startSide, startId);
        if (!firstResult) return;

        this.handleSelection(targetSide, targetId);
    },

    cancelPointerConnection: function () {
        if (this.connection.moveHandler) {
            document.removeEventListener("pointermove", this.connection.moveHandler, {passive: false});
        }

        if (this.connection.upHandler) {
            document.removeEventListener("pointerup", this.connection.upHandler, true);
        }

        if (this.connection.cancelHandler) {
            document.removeEventListener("pointercancel", this.connection.cancelHandler, true);
        }

        this.connection.active = false;
        this.connection.side = null;
        this.connection.itemId = null;
        this.connection.moveHandler = null;
        this.connection.upHandler = null;
        this.connection.cancelHandler = null;

        const svg = document.querySelector(".matchingConnections");
        if (svg) {
            const preview = svg.querySelector(".matchingPreviewConnection");
            if (preview) preview.remove();
        }
    },

    // Backward-compatible name for any existing internal/external callers.
    cancelMouseConnection: function () {
        this.cancelPointerConnection();
    },

    updatePreviewConnection: function (clientX, clientY) {
        if (!this.connection.active) return;

        const board = document.querySelector(".matchingBoard");
        const svg = document.querySelector(".matchingConnections");
        const startButton = this.findMatchingButton(this.connection.side, this.connection.itemId);
        if (!board || !svg || !startButton) return;

        const boardRect = board.getBoundingClientRect();
        const startPoint = this.getElementCenter(startButton, boardRect);
        const endPoint = {
            x: clientX - boardRect.left,
            y: clientY - boardRect.top
        };

        let preview = svg.querySelector(".matchingPreviewConnection");
        if (!preview) {
            preview = document.createElementNS("http://www.w3.org/2000/svg", "line");
            preview.setAttribute("class", "matchingPreviewConnection");
            preview.setAttribute("fill", "none");
            preview.setAttribute("stroke", "#2563eb");
            preview.setAttribute("stroke-width", "3");
            preview.setAttribute("stroke-linecap", "round");
            preview.setAttribute("stroke-dasharray", "7 6");
            svg.appendChild(preview);
        }

        preview.setAttribute("x1", startPoint.x);
        preview.setAttribute("y1", startPoint.y);
        preview.setAttribute("x2", endPoint.x);
        preview.setAttribute("y2", endPoint.y);
    },

    drawMatchedConnections: function () {
        const board = document.querySelector(".matchingBoard");
        const svg = document.querySelector(".matchingConnections");
        if (!board || !svg) return;

        while (svg.firstChild) svg.removeChild(svg.firstChild);

        if (typeof MatchingEngine === "undefined" ||
            !MatchingEngine.matching ||
            !Array.isArray(MatchingEngine.matching.pairs)) {
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

            if (!pair) return;

            const leftButton = MatchingScreen.findMatchingButton("left", pair.left.id);
            const rightButton = MatchingScreen.findMatchingButton("right", pair.right.id);
            if (!leftButton || !rightButton) return;

            const leftPoint = MatchingScreen.getElementCenter(leftButton, boardRect);
            const rightPoint = MatchingScreen.getElementCenter(rightButton, boardRect);

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
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
        const buttons = document.querySelectorAll("[data-matching-side][data-matching-id]");
        const normalizedId = String(itemId);

        for (let index = 0; index < buttons.length; index += 1) {
            const button = buttons[index];
            if (button.getAttribute("data-matching-side") === side &&
                String(button.getAttribute("data-matching-id")) === normalizedId) {
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
        if (typeof MatchingEngine === "undefined" || typeof MatchingEngine.select !== "function") {
            console.error("Matching Screen: Matching Engine Not Available");
            return;
        }

        const result = MatchingEngine.select(side, itemId);
        if (!result) return;

        if (Object.prototype.hasOwnProperty.call(result, "correct")) {
            this.lastMessage = result.correct
                ? "آفرین! تطبیق درست است."
                : "این دو مورد با هم مرتبط نیستند.";

            this.lastMessageType = result.correct ? "success" : "error";
            this.show(MatchingEngine.getState());

            if (MatchingEngine.getState().finished) {
                this.lastMessage = "فعالیت با موفقیت کامل شد.";
                this.lastMessageType = "success";
                this.show(MatchingEngine.getState());
            }
            return;
        }

        this.show(MatchingEngine.getState());
    },

    isItemMatched: function (side, itemId, matchedPairs, state) {
        if (side === "right") {
            // Right targets are reusable and therefore never become matched/disabled.
            return false;
        }

        if (state && Array.isArray(state.matchedLeftIds)) {
            return state.matchedLeftIds.includes(String(itemId));
        }

        if (!Array.isArray(matchedPairs) || typeof MatchingEngine === "undefined" || !MatchingEngine.matching) {
            return false;
        }

        return MatchingEngine.matching.pairs.some(function (pair) {
            return matchedPairs.includes(pair.id) && String(pair.left.id) === String(itemId);
        });
    },

    getApp: function () {
        const app = document.getElementById("app");
        if (!app) {
            console.error("Matching Screen: App Container Not Found");
            return null;
        }
        return app;
    },

    escapeHTML: function (value) {
        const text = value === null || value === undefined ? "" : String(value);
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
// INITIALIZE MATCHING SCREEN
// =====================================
MatchingScreen.init();

console.log("Matching Screen Ready v1.3");