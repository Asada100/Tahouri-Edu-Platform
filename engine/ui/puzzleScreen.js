// Puzzle Screen
// Thin compatibility screen. Jigsaw is rendered by JigsawScreen.

class PuzzleScreen {
    static init() {
        if (this._initialized) return;
        this._initialized = true;

        if (typeof EventManager !== "undefined" && typeof EventManager.on === "function") {
            EventManager.on("activityReady", (result) => this.handleActivityReady(result));
        }

        console.log("Puzzle Screen: Ready");
    }

    static handleActivityReady(result) {
        if (!result) return;

        const state = result.result || result;
        if (state && state.type === "jigsaw") {
            // Dedicated JigsawScreen owns the Jigsaw UI.
            return;
        }

        this.show(state);
    }

    static show(state) {
        if (!state) return;

        if (state.type === "jigsaw") {
            if (typeof JigsawScreen !== "undefined" && typeof JigsawScreen.render === "function") {
                JigsawScreen.render(state);
            }
            return;
        }

        // Keep the existing generic puzzle screen behavior for all non-Jigsaw types.
        if (state.type === "sequence" && typeof this.showSequence === "function") {
            this.showSequence(state);
            return;
        }

        if (state.type === "ordering" && typeof this.showOrdering === "function") {
            this.showOrdering(state);
            return;
        }

        console.warn("Puzzle Screen: Unsupported Type:", state.type);
    }

    static showSequence(state) {
        console.warn("Puzzle Screen: Sequence renderer unavailable in compatibility shell", state);
    }

    static showOrdering(state) {
        console.warn("Puzzle Screen: Ordering renderer unavailable in compatibility shell", state);
    }
}

if (typeof window !== "undefined") {
    window.PuzzleScreen = PuzzleScreen;
}

if (typeof PuzzleScreen !== "undefined" && typeof PuzzleScreen.init === "function") {
    PuzzleScreen.init();
}
