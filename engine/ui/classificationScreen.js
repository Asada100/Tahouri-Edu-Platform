// =====================================
// Tahouri Edu Platform
// Classification Screen
// Version 1.1
// =====================================

const ClassificationScreen = {
    activityReadyConnected: false,
    currentActivity: null,
    currentState: null,
    lastMessage: "",
    selectedItemId: null,
    dragItemId: null,

    init: function () {
        if (typeof EventManager === "undefined") {
            console.error("Classification Screen: EventManager Not Available");
            return;
        }

        if (this.activityReadyConnected) return;

        EventManager.on("activityReady", function (payload) {
            ClassificationScreen.handleActivityReady(payload);
        });

        EventManager.on("activityFinished", function (result) {
            if (result && result.activityId === ClassificationScreen.getActivityId()) {
                ClassificationScreen.showFinished(result);
            }
        });

        this.activityReadyConnected = true;
        console.log("Classification Screen: Activity Ready Listener Connected");
    },

    handleActivityReady: function (payload) {
        if (!payload) return;
        if (payload.engineName !== "classification" && payload.engineName !== "ClassificationEngine") return;
        if (!payload.activity || !payload.result) return;

        this.currentActivity = payload.activity;
        this.currentState = payload.result;
        this.lastMessage = "";
        this.selectedItemId = null;
        this.dragItemId = null;
        this.show(payload.result);
    },

    getMode: function () {
        const activity = this.currentActivity || {};
        if (activity.classification && activity.classification.mode) {
            return String(activity.classification.mode);
        }
        return "choice";
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

        const categoryHTML = categories.map(function (category) {
            const categoryId = ClassificationScreen.escapeAttribute(category.id);
            const categoryTitle = ClassificationScreen.escapeHTML(category.title || category.id);

            if (isDragDrop) {
                return `<div class="classificationDropZone" data-category-id="${categoryId}" tabindex="0" role="button" aria-label="${categoryTitle}">
                    <div class="classificationDropZoneTitle">${categoryTitle}</div>
                    <div class="classificationDropZoneItems" data-category-items="${categoryId}"></div>
                </div>`;
            }

            return `<button type="button" class="classificationCategoryBtn" data-category-id="${categoryId}">${categoryTitle}</button>`;
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
                return `<button type="button" class="classificationItem classificationDragItem ${status}" draggable="true" data-item-id="${ClassificationScreen.escapeAttribute(item.id)}">${content}</button>`;
            }

            return `<button type="button" class="classificationItem ${status}" data-item-id="${ClassificationScreen.escapeAttribute(item.id)}" ${classified || state.finished ? "disabled" : ""}>${content}</button>`;
        }).join("");

        app.innerHTML = `
            <div class="screen classificationScreen classificationMode-${ClassificationScreen.escapeAttribute(mode)}" dir="rtl">
                <h1>${ClassificationScreen.escapeHTML(activity.title || "دسته‌بندی")}</h1>
                <p class="classificationInstruction">${ClassificationScreen.escapeHTML(state.instruction || "هر مورد را در دسته مناسب قرار بده")}</p>
                <div class="classificationStatus">باقی‌مانده: ${Math.max(0, (state.totalItems || 0) - (state.classifiedItems || 0))} از ${state.totalItems || 0}</div>
                <div class="classificationItems">${itemsHTML}</div>
                <div class="classificationCategories ${isDragDrop ? "classificationDropZones" : ""}">${categoryHTML}</div>
                <div id="classificationMessage" class="classificationMessage">${ClassificationScreen.escapeHTML(this.lastMessage)}</div>
                <button type="button" id="classificationBackBtn" class="classificationBackBtn">بازگشت</button>
            </div>
        `;

        if (isDragDrop) {
            this.renderPlacements(state);
        }

        this.bindEvents();
    },

    bindEvents: function () {
        const self = this;
        const isDragDrop = this.getMode() === "dragDrop";

        if (isDragDrop) {
            this.bindDragDropEvents();
        } else {
            let selectedItemId = null;

            document.querySelectorAll(".classificationItem:not(:disabled)").forEach(function (button) {
                button.onclick = function () {
                    document.querySelectorAll(".classificationItem").forEach(function (itemButton) {
                        itemButton.classList.remove("selected");
                    });
                    selectedItemId = this.dataset.itemId;
                    self.selectedItemId = selectedItemId;
                    this.classList.add("selected");
                    self.lastMessage = "حالا دسته مناسب را انتخاب کن.";
                    self.updateMessage();
                };
            });

            document.querySelectorAll(".classificationCategoryBtn").forEach(function (button) {
                button.onclick = function () {
                    if (!selectedItemId) {
                        self.lastMessage = "ابتدا یک مورد را انتخاب کن.";
                        self.updateMessage();
                        return;
                    }

                    self.submitClassification(selectedItemId, this.dataset.categoryId);
                    selectedItemId = null;
                    self.selectedItemId = null;
                };
            });
        }

        const backButton = document.getElementById("classificationBackBtn");
        if (backButton) {
            backButton.onclick = function () {
                if (typeof App !== "undefined" && typeof App.showActivities === "function") {
                    App.showActivities();
                }
            };
        }
    },

    bindDragDropEvents: function () {
        const self = this;

        document.querySelectorAll(".classificationDragItem").forEach(function (item) {
            item.addEventListener("dragstart", function (event) {
                self.dragItemId = this.dataset.itemId;
                this.classList.add("dragging");
                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", self.dragItemId);
                }
            });

            item.addEventListener("dragend", function () {
                this.classList.remove("dragging");
                document.querySelectorAll(".classificationDropZone").forEach(function (zone) {
                    zone.classList.remove("drag-over");
                });
                self.dragItemId = null;
            });

            item.addEventListener("click", function () {
                document.querySelectorAll(".classificationDragItem").forEach(function (button) {
                    button.classList.remove("selected");
                });
                self.selectedItemId = this.dataset.itemId;
                this.classList.add("selected");
                self.lastMessage = "حالا این مورد را روی دسته مناسب رها کن یا دسته را انتخاب کن.";
                self.updateMessage();
            });
        });

        document.querySelectorAll(".classificationDropZone").forEach(function (zone) {
            zone.addEventListener("dragover", function (event) {
                event.preventDefault();
                if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
                this.classList.add("drag-over");
            });

            zone.addEventListener("dragleave", function () {
                this.classList.remove("drag-over");
            });

            zone.addEventListener("drop", function (event) {
                event.preventDefault();
                this.classList.remove("drag-over");
                const itemId = event.dataTransfer
                    ? event.dataTransfer.getData("text/plain")
                    : self.dragItemId;
                if (itemId) self.submitClassification(itemId, this.dataset.categoryId);
                self.dragItemId = null;
                self.selectedItemId = null;
            });

            zone.addEventListener("click", function () {
                if (!self.selectedItemId) {
                    self.lastMessage = "ابتدا یک مورد را انتخاب کن.";
                    self.updateMessage();
                    return;
                }
                self.submitClassification(self.selectedItemId, this.dataset.categoryId);
                self.selectedItemId = null;
            });
        });
    },

    submitClassification: function (itemId, categoryId) {
        if (!window.ClassificationEngine) return;

        const result = window.ClassificationEngine.classifyItem(itemId, categoryId);
        if (!result) return;

        if (result.correct === true) {
            this.lastMessage = "✓ درست";
        } else if (result.correct === false) {
            this.lastMessage = result.retryAllowed
                ? "✗ دوباره تلاش کن"
                : "✗ نادرست";
        }

        this.currentState = window.ClassificationEngine.getState();

        if (this.currentState && this.currentState.finished) {
            this.showFinished(this.currentState.result);
            return;
        }

        this.show(this.currentState);
    },

    renderPlacements: function (state) {
        const classifications = state.classifications || {};
        const categories = state.categories || [];
        const itemsById = {};
        (state.items || []).forEach(function (item) {
            itemsById[item.id] = item;
        });

        categories.forEach(function (category) {
            const target = document.querySelector(`[data-category-items="${ClassificationScreen.escapeAttribute(category.id)}"]`);
            if (!target) return;

            Object.keys(classifications).forEach(function (itemId) {
                const placement = classifications[itemId];
                if (!placement || !placement.correct || String(placement.categoryId) !== String(category.id)) return;
                const item = itemsById[itemId];
                if (!item) return;
                const content = item.type === "image" && item.content
                    ? `<img src="${ClassificationScreen.escapeAttribute(item.content)}" alt="">`
                    : ClassificationScreen.escapeHTML(item.content);
                target.insertAdjacentHTML("beforeend", `<div class="classificationPlacedItem">${content}</div>`);
            });
        });
    },

    showFinished: function (result) {
        if (!result) return;
        const app = document.getElementById("app");
        if (!app) return;

        app.innerHTML = `
            <div class="screen classificationScreen classificationFinished" dir="rtl">
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
            </div>
        `;

        const backButton = document.getElementById("classificationFinishedBackBtn");
        if (backButton) {
            backButton.onclick = function () {
                if (typeof App !== "undefined" && typeof App.showActivities === "function") {
                    App.showActivities();
                }
            };
        }
    },

    updateMessage: function () {
        const message = document.getElementById("classificationMessage");
        if (message) message.textContent = this.lastMessage || "";
    },

    getActivityId: function () {
        return this.currentActivity ? this.currentActivity.id : null;
    },

    escapeHTML: function (value) {
        const text = value === null || value === undefined ? "" : String(value);
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    },

    escapeAttribute: function (value) {
        return this.escapeHTML(value);
    }
};

window.ClassificationScreen = ClassificationScreen;
ClassificationScreen.init();
console.log("Classification Screen Ready v1.1");
