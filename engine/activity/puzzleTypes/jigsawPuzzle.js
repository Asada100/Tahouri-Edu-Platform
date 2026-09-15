// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Handler
// Version 1.4
// Completion-safe adapter
// Final state rendered before completion
// =====================================

const JigsawPuzzleHandler = {

    start: function (engine, data) {

        if (typeof JigsawPuzzle === "undefined") {
            console.error("Jigsaw Puzzle Handler: Core Not Available");
            return null;
        }

        const definition = {
            ...data,
            type: "jigsaw",
            content: data.content || {
                image: data.image,
                rows: data.rows,
                cols: data.cols
            }
        };

        const result = JigsawPuzzle.start(definition);

        if (!result) {
            return null;
        }

        engine.puzzle = {
            type: "jigsaw",
            dataType: "image",
            source: data.source || "file",
            instruction: data.instruction || "قطعه‌ها را جابه‌جا کن تا تصویر کامل شود.",
            objective: data.objective || "تصویر را کامل کن",
            title: data.title || "پازل تصویری",
            difficulty: result.difficulty,
            image: result.image,
            rows: result.rows,
            cols: result.cols,
            pieceCount: result.pieceCount
        };

        engine.items = result.pieces
            .slice()
            .sort(function (a, b) {
                return a.currentIndex - b.currentIndex;
            })
            .map(function (piece) {
                return piece.id;
            });

        engine.moves = result.moves;
        engine.emitStarted();

        console.log("Jigsaw Puzzle Handler Started");

        return engine.getState();
    },

    move: function (engine, fromIndex, toIndex) {

        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw") {
            return false;
        }

        if (engine.state && engine.state.isFinished) {
            return false;
        }

        const moved = JigsawPuzzle.move(fromIndex, toIndex);

        if (!moved) {
            return false;
        }

        const state = JigsawPuzzle.getState();

        engine.items = state.pieces
            .slice()
            .sort(function (a, b) {
                return a.currentIndex - b.currentIndex;
            })
            .map(function (piece) {
                return piece.id;
            });

        engine.moves = state.moves;

        const solved = JigsawPuzzle.check();

        if (solved) {
            // Publish the solved board first. The Jigsaw screen receives
            // this synchronously and renders the final arrangement before
            // activityFinished opens the result modal.
            EventManager.emit("puzzleChanged", engine.getState());
            engine.finish();
            return true;
        }

        EventManager.emit("puzzleChanged", engine.getState());

        return true;
    },

    reset: function (engine) {

        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw") {
            return false;
        }

        if (engine.state && engine.state.isFinished) {
            return false;
        }

        const state = JigsawPuzzle.reset();

        if (!state) {
            return false;
        }

        engine.items = state.pieces
            .slice()
            .sort(function (a, b) {
                return a.currentIndex - b.currentIndex;
            })
            .map(function (piece) {
                return piece.id;
            });

        engine.moves = state.moves;

        EventManager.emit("puzzleChanged", engine.getState());

        return true;
    },

    check: function (engine) {

        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw") {
            return false;
        }

        if (engine.state && engine.state.isFinished) {
            return !!(JigsawPuzzle.state && JigsawPuzzle.state.solved);
        }

        const solved = JigsawPuzzle.check();

        if (solved) {
            EventManager.emit("puzzleChanged", engine.getState());
            engine.finish();
            return true;
        }

        engine.emitWrong();
        return false;
    }
};

window.JigsawPuzzleHandler = JigsawPuzzleHandler;

PuzzleTypeRegistry.register("jigsaw", JigsawPuzzleHandler);

console.log("Jigsaw Puzzle Handler v1.4 Ready");
