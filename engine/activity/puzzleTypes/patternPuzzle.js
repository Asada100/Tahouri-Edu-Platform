// =====================================
// Tahouri Edu Platform
// Pattern Puzzle
// Version 1.0
// =====================================

const PatternPuzzle = {

    start: function (engine, data) {
        const items = Array.isArray(data.items) ? [...data.items] : [];
        const missingIndex = Number.isInteger(data.missingIndex) ? data.missingIndex : -1;

        if (!items.length || missingIndex < 0 || missingIndex >= items.length) {
            console.error("Pattern Puzzle: Invalid Items or Missing Index");
            return null;
        }

        if (data.answer === undefined || data.answer === null) {
            console.error("Pattern Puzzle: Answer Missing");
            return null;
        }

        engine.puzzle = {
            type: "pattern",
            dataType: data.dataType || engine.detectDataType(items.filter(function (v) { return v !== null; })),
            source: data.source || "file",
            instruction: data.instruction || "الگو را پیدا کن و جای خالی را کامل کن.",
            items: [...items],
            missingIndex: missingIndex,
            answer: data.answer,
            options: Array.isArray(data.options) ? [...data.options] : []
        };

        engine.items = [...items];
        engine.userAnswer = null;
        engine.emitStarted();
        return engine.getState();
    },

    setAnswer: function (engine, value) {
        if (!engine.puzzle || engine.puzzle.type !== "pattern") return false;
        engine.userAnswer = value;
        engine.items[engine.puzzle.missingIndex] = value;
        engine.moves++;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    },

    check: function (engine) {
        const value = engine.userAnswer !== null && engine.userAnswer !== undefined
            ? engine.userAnswer
            : engine.items[engine.puzzle.missingIndex];

        if (engine.valuesEqual(value, engine.puzzle.answer)) {
            engine.finish();
            return true;
        }

        engine.emitWrong();
        return false;
    }
};

window.PatternPuzzle = PatternPuzzle;

PuzzleTypeRegistry.register("pattern", PatternPuzzle);

console.log("Pattern Puzzle v1.0 Ready");
