// =====================================
// Tahouri Edu Platform
// Classification Screen
// Version 1.6
// =====================================

const ClassificationScreen = {
    activityReadyConnected: false,
    currentActivity: null,
    currentState: null,
    lastMessage: "",
    selectedItemId: null,
    dragItemId: null,
    dragActive: false,
    touchDrag: null,

    init: function () {
        if (typeof EventManager === "undefined") return;
        if (this.activityReadyConnected) return;
        EventManager.on("activityReady", function (payload) { ClassificationScreen.handleActivityReady(payload); });
        EventManager.on("activityFinished", function (result) {
            if (result && result.activityId === ClassificationScreen.getActivityId()) ClassificationScreen.showFinished(result);
        });
        this.activityReadyConnected = true;
        console.log("Classification Screen: Activity Ready Listener Connected");
    },

    handleActivityReady: function (payload) {
        if (!payload || !payload.activity || !payload.result) return;
        if (payload.engineName !== "classification" && payload.engineName !== "ClassificationEngine") return;
        this.currentActivity = payload.activity;
        this.currentState = payload.result;
        this.lastMessage = "";
        this.selectedItemId = null;
        this.dragItemId = null;
        this.dragActive = false;
        this.touchDrag = null;
        this.show(payload.result);
    },

    getMode: function () {
        const activity = this.currentActivity || {};
        return activity.classification && activity.classification.mode
            ? String(activity.classification.mode) : "choice";
    },

    isTouchDevice: function () {
        return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    },

    show: function (state) {
        if (!state) return;
        const app = document.getElementById("app");
        if (!app) return;
        const categories = Array.isArray(state.categories) ? state.categories : [];
        const items = Array.isArray(state.items) ? state.items : [];
        const classifications = state.classifications || {};
        const activity = this.currentActivity || {};
        const mode = this.getMode();
        const isDragDrop = mode === "dragDrop";
        const touch = this.isTouchDevice();
        const nativeDrag = isDragDrop && !touch;

        const categoryHTML = categories.map(function (category) {
            const id = ClassificationScreen.escapeAttribute(category.id);
            const title = ClassificationScreen.escapeHTML(category.title || category.id);
            if (isDragDrop) {
                return `<div class="classificationDropZone" data-category-id="${id}" tabindex="0" role="button" aria-label="${title}">
                    <div class="classificationDropZoneTitle">${title}</div>
                    <div class="classificationDropZoneItems" data-category-items="${id}"></div>
                </div>`;
            }
            return `<button type="button" class="classificationCategoryBtn" data-category-id="${id}">${title}</button>`;
        }).join("");

        const itemsHTML = items.map(function (item) {
            const classified = Object.prototype.hasOwnProperty.call(classifications, item.id);
            const answer = classifications[item.id];
            const status = classified ? (answer.correct ? "correct" : "wrong") : "";
            const content = item.type === "image" && item.content
                ? `<img src="${ClassificationScreen.escapeAttribute(item.content)}" alt="">`
                : ClassificationScreen.escapeHTML(item.content);
            if (isDragDrop) {
                if (classified && answer && answer.correct) return "";
                const dragAttr = nativeDrag ? " draggable=\"true\"" : "";
                return `<button type="button" class="classificationItem classificationDragItem ${status}"${dragAttr} data-item-id="${ClassificationScreen.escapeAttribute(item.id)}">${content}</button>`;
            }
            return `<button type="button" class="classificationItem ${status}" data-item-id="${ClassificationScreen.escapeAttribute(item.id)}" ${classified || state.finished ? "disabled" : ""}>${content}</button>`;
        }).join("");

        const interactionClass = isDragDrop ? (touch ? "classificationTouchMode" : "classificationDesktopDragMode") : "";
        const instruction = isDragDrop && touch
            ? "هر مورد را بگیر و در دسته مناسب رها کن."
            : (state.instruction || "هر مورد را در دسته مناسب قرار بده");

        app.innerHTML = `<div class="screen classificationScreen classificationMode-${ClassificationScreen.escapeAttribute(mode)} ${interactionClass}" dir="rtl">
            <h1>${ClassificationScreen.escapeHTML(activity.title || "دسته‌بندی")}</h1>
            <p class="classificationInstruction">${ClassificationScreen.escapeHTML(instruction)}</p>
            <div class="classificationStatus">باقی‌مانده: ${Math.max(0, (state.totalItems || 0) - (state.classifiedItems || 0))} از ${state.totalItems || 0}</div>
            <div class="classificationItems">${itemsHTML}</div>
            <div class="classificationCategories ${isDragDrop ? "classificationDropZones" : ""}">${categoryHTML}</div>
            <div id="classificationMessage" class="classificationMessage">${ClassificationScreen.escapeHTML(this.lastMessage)}</div>
            <button type="button" id="classificationBackBtn" class="classificationBackBtn">بازگشت</button>
        </div>`;
        if (isDragDrop) this.renderPlacements(state);
        this.bindEvents();
    },

    bindEvents: function () {
        const self = this;
        if (this.getMode() === "dragDrop") this.bindDragDropEvents();
        else {
            let selected = null;
            document.querySelectorAll(".classificationItem:not(:disabled)").forEach(function (button) {
                button.onclick = function () {
                    document.querySelectorAll(".classificationItem").forEach(function (b) { b.classList.remove("selected"); });
                    selected = this.dataset.itemId;
                    self.selectedItemId = selected;
                    this.classList.add("selected");
                    self.lastMessage = "حالا دسته مناسب را انتخاب کن.";
                    self.updateMessage();
                };
            });
            document.querySelectorAll(".classificationCategoryBtn").forEach(function (button) {
                button.onclick = function () {
                    if (!selected) { self.lastMessage = "ابتدا یک مورد را انتخاب کن."; self.updateMessage(); return; }
                    self.submitClassification(selected, this.dataset.categoryId, "user");
                    selected = null; self.selectedItemId = null;
                };
            });
        }
        const back = document.getElementById("classificationBackBtn");
        if (back) back.onclick = function () {
            if (typeof App !== "undefined" && typeof App.showActivities === "function") App.showActivities();
        };
    },

    bindDragDropEvents: function () {
        const self = this;
        const touch = this.isTouchDevice();

        document.querySelectorAll(".classificationDragItem").forEach(function (item) {
            if (!touch) {
                item.addEventListener("dragstart", function (event) {
                    self.dragItemId = this.dataset.itemId;
                    self.dragActive = true;
                    this.classList.add("dragging");
                    if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", self.dragItemId);
                    }
                });
                item.addEventListener("dragend", function () {
                    this.classList.remove("dragging");
                    document.querySelectorAll(".classificationDropZone").forEach(function (z) { z.classList.remove("drag-over"); });
                    self.dragActive = false;
                    self.dragItemId = null;
                });
            } else {
                item.addEventListener("pointerdown", function (event) { self.startTouchDrag(event, this); });
            }
        });

        document.querySelectorAll(".classificationDropZone").forEach(function (zone) {
            if (!touch) {
                zone.addEventListener("dragover", function (event) {
                    if (!self.dragActive || !self.dragItemId) return;
                    event.preventDefault();
                    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
                    this.classList.add("drag-over");
                });
                zone.addEventListener("dragleave", function () { this.classList.remove("drag-over"); });
                zone.addEventListener("drop", function (event) {
                    event.preventDefault();
                    this.classList.remove("drag-over");
                    const id = event.dataTransfer ? event.dataTransfer.getData("text/plain") : self.dragItemId;
                    const validDrop = event.isTrusted && self.dragActive && id && id === self.dragItemId;

                    // Clear the drag session BEFORE submitting. submitClassification()
                    // re-renders the screen, which otherwise creates fresh drop zones
                    // while the browser's current drag operation is still finishing.
                    self.dragActive = false;
                    self.dragItemId = null;

                    if (validDrop) self.submitClassification(id, this.dataset.categoryId, "user");
                });
            }
        });
    },

    startTouchDrag: function (event, item) {
        if (!event || !event.isTrusted || event.pointerType !== "touch" || this.touchDrag) return;
        event.preventDefault();
        this.touchDrag = { itemId: item.dataset.itemId, item: item, active: false, startX: event.clientX, startY: event.clientY };
        item.setPointerCapture(event.pointerId);
        item.addEventListener("pointermove", this.handleTouchDragMoveBound = this.handleTouchDragMove.bind(this), { passive: false });
        item.addEventListener("pointerup", this.handleTouchDragEndBound = this.handleTouchDragEnd.bind(this), { passive: false, once: true });
        item.addEventListener("pointercancel", this.handleTouchDragCancelBound = this.handleTouchDragEnd.bind(this), { passive: false, once: true });
    },

    handleTouchDragMove: function (event) {
        const drag = this.touchDrag;
        if (!drag || !event.isTrusted) return;
        event.preventDefault();
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.active && Math.hypot(dx, dy) < 8) return;
        drag.active = true;
        drag.item.classList.add("dragging");
        document.querySelectorAll(".classificationDropZone").forEach(function (z) { z.classList.remove("drag-over"); });
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const zone = target && target.closest ? target.closest(".classificationDropZone") : null;
        if (zone) zone.classList.add("drag-over");
    },

    handleTouchDragEnd: function (event) {
        const drag = this.touchDrag;
        if (!drag || !event.isTrusted) return;
        event.preventDefault();
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const zone = target && target.closest ? target.closest(".classificationDropZone") : null;
        drag.item.classList.remove("dragging");
        document.querySelectorAll(".classificationDropZone").forEach(function (z) { z.classList.remove("drag-over"); });
        const itemId = drag.itemId;
        this.touchDrag = null;
        if (zone && drag.active) this.submitClassification(itemId, zone.dataset.categoryId, "user");
    },

    submitClassification: function (itemId, categoryId, source) {
        // Classification must only change through an actual user interaction.
        // This prevents startup/render/resume code from accidentally classifying
        // items and immediately finishing the activity.
        if (source !== "user") return null;
        if (!window.ClassificationEngine) return null;
        const result = window.ClassificationEngine.classifyItem(itemId, categoryId);
        if (!result) return null;
        this.lastMessage = result.correct === true ? "✓ درست" : (result.retryAllowed ? "✗ دوباره تلاش کن" : "✗ نادرست");
        this.currentState = window.ClassificationEngine.getState();
        if (this.currentState && this.currentState.finished) { this.showFinished(this.currentState.result); return result; }
        this.show(this.currentState);
        return result;
    },

    renderPlacements: function (state) {
        const classifications = state.classifications || {};
        const categories = state.categories || [];
        const itemsById = {};
        (state.items || []).forEach(function (item) { itemsById[item.id] = item; });
        categories.forEach(function (category) {
            const target = document.querySelector(`[data-category-items="${ClassificationScreen.escapeAttribute(category.id)}"]`);
            if (!target) return;
            Object.keys(classifications).forEach(function (itemId) {
                const placement = classifications[itemId];
                if (!placement || !placement.correct || String(placement.categoryId) !== String(category.id)) return;
                const item = itemsById[itemId]; if (!item) return;
                const content = item.type === "image" && item.content ? `<img src="${ClassificationScreen.escapeAttribute(item.content)}" alt="">` : ClassificationScreen.escapeHTML(item.content);
                target.insertAdjacentHTML("beforeend", `<div class="classificationPlacedItem">${content}</div>`);
            });
        });
    },

    showFinished: function (result) {
        if (!result) return;
        const app = document.getElementById("app"); if (!app) return;
        app.innerHTML = `<div class="screen classificationScreen classificationFinished" dir="rtl">
            <h1>فعالیت تمام شد 🎉</h1>
            <div class="classificationResultCard">
                <div>امتیاز: <strong>${Number(result.score) || 0}</strong></div>
                <div>درصد: <strong>${Number(result.percentage) || 0}%</strong></div>
                <div>ستاره: <strong>${Number(result.stars) || 0} ⭐</strong></div>
                <div>پاسخ درست: <strong>${Number(result.correctAnswers) || 0}</strong></div>
                <div>پاسخ نادرست: <strong>${Number(result.wrongAnswers) || 0}</strong></div>
                <div>تعداد تلاش: <strong>${Number(result.moves) || 0}</strong></div>
            </div>
            <button type="button" id="classificationFinishedBackBtn" class="classificationBackBtn">بازگشت به فعالیت‌ها</button>
        </div>`;
        const back = document.getElementById("classificationFinishedBackBtn");
        if (back) back.onclick = function () { if (typeof App !== "undefined" && typeof App.showActivities === "function") App.showActivities(); };
    },

    updateMessage: function () { const message = document.getElementById("classificationMessage"); if (message) message.textContent = this.lastMessage || ""; },
    getActivityId: function () { return this.currentActivity ? this.currentActivity.id : null; },
    escapeHTML: function (value) { const text = value === null || value === undefined ? "" : String(value); return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); },
    escapeAttribute: function (value) { return this.escapeHTML(value); }
};

window.ClassificationScreen = ClassificationScreen;
ClassificationScreen.init();
console.log("Classification Screen Ready v1.6");
