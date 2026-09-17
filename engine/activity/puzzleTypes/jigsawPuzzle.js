// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Handler
// Version 2.3
// Supports image and word/sentence jigsaw
// Two-stage word jigsaw starts directly with both word boxes visible.
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

        const words = (Array.isArray(result.words) ? result.words : []).map(String);

        engine.puzzle = {
            type: "jigsaw",
            dataType: isWords ? "text" : "image",
            mode: result.mode,
            source: data.source || "file",
            instruction: data.instruction || (isWords ? "هر واژه را از بخش کلمات به پاسخ خود منتقل کن." : "قطعه‌ها را جابه‌جا کن تا تصویر کامل شود."),
            objective: data.objective || (isWords ? "واژه‌ها را به ترتیب درست بچین" : "تصویر را کامل کن"),
            title: data.title || (isWords ? "جورچین واژه‌ها" : "پازل تصویری"),
            difficulty: result.difficulty,
            image: result.image,
            rows: result.rows,
            cols: result.cols,
            words: words,
            pieceCount: result.pieceCount,
            twoStageWordOrder: hasTwoStage,
            stage: hasTwoStage ? 2 : undefined,
            availableWords: hasTwoStage ? words.slice() : undefined,
            targetWords: hasTwoStage ? [] : undefined,
            history: hasTwoStage ? [] : undefined,
            hintUsed: false,
            correctOrder: correctOrder.length ? correctOrder : words.slice()
        };

        // The two-stage word activity is a word-transfer activity from the
        // moment it opens. Do not wait for the old Jigsaw completion first.
        engine.items = hasTwoStage ? [] : result.pieces.slice().sort(function (a, b) { return a.currentIndex - b.currentIndex; }).map(function (piece) { return piece.id; });
        engine.moves = 0;
        engine.emitStarted();
        console.log("Jigsaw Puzzle Handler Started", { mode: result.mode, twoStageWordOrder: hasTwoStage, stage: engine.puzzle.stage || 1 });
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
        if (engine.puzzle.twoStageWordOrder === true) {
            // Stage 2 is checked by the Stage 2 UI extension.
            if (engine.puzzle.stage === 2 && typeof JigsawPuzzleHandler.checkStage2 === "function") {
                return JigsawPuzzleHandler.checkStage2(engine);
            }
            return false;
        }
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
console.log("Jigsaw Puzzle Handler v2.3 Ready");
