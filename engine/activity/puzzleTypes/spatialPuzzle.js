// =====================================
// Tahouri Edu Platform
// Spatial Puzzle
// Version 1.0
// =====================================

const SpatialPuzzle = {

    start: function (engine, data) {
        const grid = data && data.grid;
        const items = Array.isArray(data && data.items) ? [...data.items] : [];
        const options = Array.isArray(data && data.options) ? [...data.options] : [];

        if (!grid || !Number.isInteger(Number(grid.rows)) || !Number.isInteger(Number(grid.cols))) {
            console.error("Spatial Puzzle: Invalid Grid");
            return null;
        }

        if (!items.length || !options.length || data.answer === undefined || data.answer === null) {
            console.error("Spatial Puzzle: Content Missing");
            return null;
        }

        engine.puzzle = {
            type: "spatial",
            source: data.source || "file",
            instruction: data.instruction || "جای اشیا را بررسی کن و پاسخ درست را انتخاب کن.",
            grid: {
                rows: Math.max(1, Number(grid.rows)),
                cols: Math.max(1, Number(grid.cols))
            },
            items: items,
            options: options,
            answer: data.answer,
            question: data.question || ""
        };

        engine.items = [...items];
        engine.userAnswer = null;
        engine.emitStarted();
        return engine.getState();
    },

    setAnswer: function (engine, value) {
        if (!engine.puzzle || engine.puzzle.type !== "spatial") return false;
        engine.userAnswer = value;
        engine.moves++;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    },

    check: function (engine) {
        if (!engine.puzzle || engine.puzzle.type !== "spatial") return false;

        if (engine.valuesEqual(engine.userAnswer, engine.puzzle.answer)) {
            engine.finish();
            return true;
        }

        engine.emitWrong();
        return false;
    }
};

window.SpatialPuzzle = SpatialPuzzle;
PuzzleTypeRegistry.register("spatial", SpatialPuzzle);

console.log("Spatial Puzzle v1.0 Ready");
