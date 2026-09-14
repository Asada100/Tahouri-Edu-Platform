// =====================================
// Tahouri Edu Platform
// Puzzle Screen
// Version 2.1
// =====================================

const PuzzleScreen = {

    connected: false,

    init: function () {
        if (typeof EventManager === "undefined") {
            console.error("Puzzle Screen: EventManager Not Available");
            return;
        }

        if (this.connected) return;

        EventManager.on("activityReady", function (payload) {
            PuzzleScreen.handleActivityReady(payload);
        });

        this.connected = true;
        console.log("Puzzle Screen: Activity Ready Listener Connected");
    },

    handleActivityReady: function (payload) {
        if (!payload) return;

        const result = payload.result;
        if (!result) {
            console.error("Puzzle Screen: Puzzle Result Missing");
            return;
        }

        console.log(
            "Puzzle Screen: Activity Ready Received",
            payload.activity ? payload.activity.id : null
        );

        this.show(result);
    },

    show: function (state) {
        if (!state) {
            console.error("Puzzle Screen: State Missing");
            return;
        }

        // Jigsaw has its own complete screen and must not be routed through
        // the legacy PuzzleScreen renderer.
        if (state.type === "jigsaw") {
            if (typeof JigsawScreen !== "undefined") {
                JigsawScreen.render(state);
            }
            return;
        }

        switch (state.type) {
            case "ordering":
                this.showOrdering(state);
                return;
            case "sequence":
                this.showSequence(state);
                return;
            case "visualMath":
                this.showVisualMath(state);
                return;
            case "inputOutput":
                this.showInputOutput(state);
                return;
            case "sentence":
                this.showSentence(state);
                return;
            case "grid":
                this.showGrid(state);
                return;
            case "wordGrid":
                this.showWordGrid(state);
                return;
            case "crossGrid":
                this.showCrossGrid(state);
                return;
            default:
                console.warn("Puzzle Screen: Unsupported Type:", state.type);
        }
    },

    getApp: function () {
        return document.getElementById("app");
    }
};

// Preserve the legacy PuzzleScreen implementation for all existing puzzle
// types. The Jigsaw route above is intentionally isolated from it.

window.PuzzleScreen = window.PuzzleScreen || PuzzleScreen;

PuzzleScreen.init();

console.log("Puzzle Screen v2.1 Ready");
