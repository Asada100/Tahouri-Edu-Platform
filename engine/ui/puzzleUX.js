// =====================================
// Tahouri Edu Platform
// Puzzle UX Shared Layer
// Version 1.0
//
// Purpose:
// - Shared interaction vocabulary for all Puzzle types
// - Shared move-counter synchronization
// - Shared feedback state helpers
// - Shared interaction-family mapping
// - No Puzzle type owns common UX behavior
// =====================================

const PuzzleUX = {

    VERSION: "1.0",

    families: {
        ordering: "drag",
        sequence: "placement",
        visualMath: "selection",
        inputOutput: "placement",
        sentenceOrder: "drag",
        sentenceGrammar: "selection",
        grid: "placement",
        wordGrid: "placement",
        crossGrid: "placement"
    },

    interactionFamilies: {
        drag: {
            interaction: "drag",
            feedback: "snap"
        },
        placement: {
            interaction: "placement",
            feedback: "target"
        },
        selection: {
            interaction: "selection",
            feedback: "selected"
        }
    },

    getFamily: function (type, mode) {
        if (type === "sentence") {
            return this.families[mode || "sentenceOrder"] || "selection";
        }

        return this.families[type] || "selection";
    },

    getConfig: function (type, mode) {
        const family = this.getFamily(type, mode);
        return {
            type: type,
            mode: mode || null,
            family: family,
            ...(this.interactionFamilies[family] || this.interactionFamilies.selection)
        };
    },

    setFeedback: function (message, status) {
        if (!message) return;

        message.textContent = status === "correct"
            ? "درست است ✓"
            : status === "wrong"
                ? "هنوز درست نیست"
                : String(status || "");

        message.dataset.status = status || "";
        message.classList.remove(
            "puzzleFeedbackCorrect",
            "puzzleFeedbackWrong",
            "puzzleFeedbackNeutral"
        );

        message.classList.add(
            status === "correct"
                ? "puzzleFeedbackCorrect"
                : status === "wrong"
                    ? "puzzleFeedbackWrong"
                    : "puzzleFeedbackNeutral"
        );
    },

    clearFeedback: function (message) {
        if (!message) return;
        message.textContent = "";
        message.dataset.status = "";
        message.classList.remove(
            "puzzleFeedbackCorrect",
            "puzzleFeedbackWrong",
            "puzzleFeedbackNeutral"
        );
    },

    updateMoveCount: function (state) {
        const counter = document.getElementById("puzzleMoveCount");
        if (!counter || !state) return;
        counter.textContent = String(Number(state.moves || 0));
    },

    markTarget: function (element, active) {
        if (!element) return;
        element.classList.toggle("puzzleTargetActive", !!active);
    },

    animatePlacement: function (element) {
        if (!element) return;
        element.classList.remove("puzzlePlacementAnimation");
        void element.offsetWidth;
        element.classList.add("puzzlePlacementAnimation");
    },

    init: function () {
        if (this.initialized) return;
        this.initialized = true;

        if (typeof EventManager !== "undefined") {
            EventManager.on("puzzleChanged", function (state) {
                PuzzleUX.updateMoveCount(state);
            });
        }

        console.log("Puzzle UX Shared Layer v1.0 Ready");
    }
};

window.PuzzleUX = PuzzleUX;
PuzzleUX.init();
