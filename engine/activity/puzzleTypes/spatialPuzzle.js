// =====================================
// Tahouri Edu Platform
// Spatial Puzzle
// Version 1.2
// Modes: legacy, place, symmetry
// =====================================

const SpatialPuzzle = {

    start: function (engine, data) {
        const grid = data && data.grid;
        const mode = data && data.mode ? String(data.mode) : "legacy";
        const pieces = Array.isArray(data && data.pieces)
            ? [...data.pieces]
            : (Array.isArray(data && data.items) ? [...data.items] : []);
        const options = Array.isArray(data && data.options) ? [...data.options] : [];

        if (!grid || !Number.isInteger(Number(grid.rows)) || !Number.isInteger(Number(grid.cols))) {
            console.error("Spatial Puzzle: Invalid Grid");
            return null;
        }

        if (mode === "place" || mode === "symmetry") {
            if (!pieces.length) {
                console.error("Spatial Puzzle: Pieces Missing");
                return null;
            }

            const normalizedPieces = pieces.map(function (piece) {
                if (!piece || piece.id === undefined) return null;
                const normalized = { ...piece };

                if (mode === "symmetry") {
                    if (!piece.source) return null;

                    const sourceRow = Number(piece.source.row);
                    const sourceCol = Number(piece.source.col);
                    const axis = data.axis || "vertical";

                    if (!Number.isInteger(sourceRow) || !Number.isInteger(sourceCol)) return null;
                    if (sourceRow < 0 || sourceRow >= Number(grid.rows) ||
                        sourceCol < 0 || sourceCol >= Number(grid.cols)) return null;

                    let targetRow = sourceRow;
                    let targetCol = sourceCol;

                    if (axis === "vertical") {
                        targetCol = Number(grid.cols) - 1 - sourceCol;
                    } else if (axis === "horizontal") {
                        targetRow = Number(grid.rows) - 1 - sourceRow;
                    } else {
                        return null;
                    }

                    normalized.source = { row: sourceRow, col: sourceCol };
                    normalized.target = { row: targetRow, col: targetCol };
                }

                return normalized;
            }).filter(Boolean);

            if (normalizedPieces.length !== pieces.length) {
                console.error("Spatial Puzzle: Invalid Piece");
                return null;
            }

            const seenTargets = new Set();
            for (const piece of normalizedPieces) {
                if (!piece.target) {
                    console.error("Spatial Puzzle: Invalid Piece Target");
                    return null;
                }

                const row = Number(piece.target.row);
                const col = Number(piece.target.col);

                if (!Number.isInteger(row) || !Number.isInteger(col) ||
                    row < 0 || row >= Number(grid.rows) ||
                    col < 0 || col >= Number(grid.cols)) {
                    console.error("Spatial Puzzle: Invalid Piece Target");
                    return null;
                }

                const key = row + ":" + col;
                if (seenTargets.has(key)) {
                    console.error("Spatial Puzzle: Duplicate Target");
                    return null;
                }
                seenTargets.add(key);
            }

            engine.puzzle = {
                type: "spatial",
                mode: mode,
                source: data.source || "file",
                instruction: data.instruction ||
                    (mode === "symmetry"
                        ? "هر شکل را در جای قرینه خودش قرار بده."
                        : "شکل‌ها را بردار و در جای درست قرار بده."),
                grid: {
                    rows: Math.max(1, Number(grid.rows)),
                    cols: Math.max(1, Number(grid.cols))
                },
                axis: mode === "symmetry" ? (data.axis || "vertical") : null,
                items: normalizedPieces,
                pieces: normalizedPieces,
                placements: {},
                options: [],
                answer: null,
                question: ""
            };

            engine.items = [...normalizedPieces];
            engine.userAnswer = {};
            engine.emitStarted();
            return engine.getState();
        }

        if (!pieces.length || !options.length || data.answer === undefined || data.answer === null) {
            console.error("Spatial Puzzle: Content Missing");
            return null;
        }

        engine.puzzle = {
            type: "spatial",
            mode: "legacy",
            source: data.source || "file",
            instruction: data.instruction || "جای اشیا را بررسی کن و پاسخ درست را انتخاب کن.",
            grid: {
                rows: Math.max(1, Number(grid.rows)),
                cols: Math.max(1, Number(grid.cols))
            },
            items: pieces,
            options: options,
            answer: data.answer,
            question: data.question || ""
        };

        engine.items = [...pieces];
        engine.userAnswer = null;
        engine.emitStarted();
        return engine.getState();
    },

    setAnswer: function (engine, value) {
        if (!engine.puzzle || engine.puzzle.type !== "spatial") return false;

        if (engine.puzzle.mode === "place" || engine.puzzle.mode === "symmetry") {
            if (!value || value.pieceId === undefined) return false;

            const pieceId = String(value.pieceId);
            const piece = engine.puzzle.pieces.find(function (item) {
                return item && String(item.id) === pieceId;
            });

            if (!piece) return false;

            const row = Number(value.row);
            const col = Number(value.col);

            if (!Number.isInteger(row) || !Number.isInteger(col) ||
                row < 0 || row >= engine.puzzle.grid.rows ||
                col < 0 || col >= engine.puzzle.grid.cols) {
                return false;
            }

            const targetOwner = engine.puzzle.pieces.find(function (item) {
                return String(item.id) !== pieceId &&
                    engine.puzzle.placements[String(item.id)] &&
                    Number(engine.puzzle.placements[String(item.id)].row) === row &&
                    Number(engine.puzzle.placements[String(item.id)].col) === col;
            });

            const previous = engine.puzzle.placements[pieceId] || null;

            if (targetOwner) {
                engine.puzzle.placements[pieceId] = { row: row, col: col };
                if (previous) {
                    engine.puzzle.placements[String(targetOwner.id)] = previous;
                } else {
                    delete engine.puzzle.placements[String(targetOwner.id)];
                }
            } else {
                engine.puzzle.placements[pieceId] = { row: row, col: col };
            }

            engine.userAnswer = { ...engine.puzzle.placements };
            engine.moves++;
            EventManager.emit("puzzleChanged", engine.getState());
            return true;
        }

        engine.userAnswer = value;
        engine.moves++;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    },

    check: function (engine) {
        if (!engine.puzzle || engine.puzzle.type !== "spatial") return false;

        if (engine.puzzle.mode === "place" || engine.puzzle.mode === "symmetry") {
            const pieces = engine.puzzle.pieces || [];
            const placements = engine.puzzle.placements || {};

            if (Object.keys(placements).length !== pieces.length) {
                engine.emitWrong();
                return false;
            }

            if (pieces.some(function (piece) {
                const placement = placements[String(piece.id)];
                return !placement ||
                    Number(placement.row) !== Number(piece.target.row) ||
                    Number(placement.col) !== Number(piece.target.col);
            })) {
                engine.emitWrong();
                return false;
            }

            engine.finish();
            return true;
        }

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

console.log("Spatial Puzzle v1.2 Ready");
