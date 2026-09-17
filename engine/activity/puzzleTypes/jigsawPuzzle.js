// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Handler
// Version 2.1
// Supports image and word/sentence jigsaw
// Two-stage word jigsaw configuration is preserved for Stage 2.
// =====================================

const JigsawPuzzleHandler = {
    start: function (engine, data) {
        if (typeof JigsawPuzzle === "undefined") return null;

        const content = data.content || {};
        const definition = { ...data, type: "jigsaw", content: content };
        const result = JigsawPuzzle.start(definition);
        if (!result) return null;

        const isWords = result.mode === "words";
        const hasTwoStage = content.twoStageWordOrder === true || data.twoStageWordOrder === true;
        const correctOrder = Array.isArray(content.correctOrder)
            ? content.correctOrder.map(String)
            : Array.isArray(data.correctOrder)
                ? data.correctOrder.map(String)
                : [];

        engine.puzzle = {
            type: "jigsaw",
            dataType: isWords ? "text" : "image",
            mode: result.mode,
            source: data.source || "file",
            instruction: data.instruction || (isWords ? "هر واژه را در جای درست قرار بده." : "قطعه‌ها را جابه‌جا کن تا تصویر کامل شود."),
            objective: data.objective || (isWords ? "جمله را کامل کن" : "تصویر را کامل کن"),
            title: data.title || (isWords ? "جورچین واژه‌ها" : "پازل تصویری"),
            difficulty: result.difficulty,
            image: result.image,
            rows: result.rows,
            cols: result.cols,
            words: result.words,
            pieceCount: result.pieceCount,
            twoStageWordOrder: hasTwoStage,
            correctOrder: correctOrder
        };

        engine.items = result.pieces.slice().sort(function (a, b) { return a.currentIndex - b.currentIndex; }).map(function (piece) { return piece.id; });
        engine.moves = result.moves;
        engine.emitStarted();
        console.log("Jigsaw Puzzle Handler Started", { mode: result.mode, twoStageWordOrder: hasTwoStage });
        return engine.getState();
    },

    move: function (engine, fromIndex, toIndex) {
        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw" || (engine.state && engine.state.isFinished)) return false;
        const moved = JigsawPuzzle.move(fromIndex, toIndex);
        if (!moved) return false;

        const state = JigsawPuzzle.getState();
        engine.items = state.pieces.slice().sort(function (a, b) { return a.currentIndex - b.currentIndex; }).map(function (piece) { return piece.id; });
        engine.moves = state.moves;
        EventManager.emit("puzzleChanged", engine.getState());

        if (state.solved) engine.check();
        return true;
    },

    reset: function (engine) {
        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw" || (engine.state && engine.state.isFinished)) return false;
        const state = JigsawPuzzle.reset();
        if (!state) return false;
        engine.items = state.pieces.slice().sort(function (a, b) { return a.currentIndex - b.currentIndex; }).map(function (piece) { return piece.id; });
        engine.moves = state.moves;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    },

    check: function (engine) {
        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw") return false;
        if (engine.state && engine.state.isFinished) return !!(JigsawPuzzle.state && JigsawPuzzle.state.solved);
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
console.log("Jigsaw Puzzle Handler v2.1 Ready");
