// =====================================
// Tahouri Edu Platform
// Spatial Puzzle
// Version 2.0
// Modes: legacy, place, symmetry
// =====================================

const SpatialPuzzle = {

    randomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    shuffle: function (items) {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    gradeNumber: function (value) {
        const match = String(value || "").match(/(\d+)/);
        return match ? Number(match[1]) : 6;
    },

    buildDifficultyConfig: function (grade, difficulty, generator) {
        const profiles = {
            1: { easy: [4, 6], medium: [6, 9], hard: [9, 12], shapes: { easy: [2, 3], medium: [3, 4], hard: [4, 5] } },
            2: { easy: [6, 9], medium: [9, 12], hard: [12, 16], shapes: { easy: [3, 4], medium: [4, 5], hard: [5, 6] } },
            3: { easy: [9, 12], medium: [12, 16], hard: [16, 20], shapes: { easy: [3, 5], medium: [5, 6], hard: [6, 7] } },
            4: { easy: [12, 16], medium: [16, 20], hard: [20, 25], shapes: { easy: [4, 6], medium: [6, 7], hard: [7, 8] } },
            5: { easy: [16, 20], medium: [20, 25], hard: [25, 30], shapes: { easy: [5, 7], medium: [7, 9], hard: [8, 10] } },
            6: { easy: [9, 12], medium: [16, 20], hard: [25, 30], shapes: { easy: [4, 5], medium: [6, 8], hard: [8, 10] } }
        };

        const profile = profiles[Math.min(6, Math.max(1, grade))] || profiles[6];
        const level = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";
        const override = generator || {};

        return {
            level: level,
            cells: Array.isArray(override.cells) && override.cells.length === 2
                ? [Number(override.cells[0]), Number(override.cells[1])]
                : profile[level],
            shapes: Array.isArray(override.shapes) && override.shapes.length === 2
                ? [Number(override.shapes[0]), Number(override.shapes[1])]
                : profile.shapes[level]
        };
    },

    chooseGrid: function (cellCount, axis) {
        const candidates = [];

        for (let rows = 2; rows <= 6; rows++) {
            for (let cols = 2; cols <= 7; cols++) {
                const total = rows * cols;
                if (total === cellCount || Math.abs(total - cellCount) <= 1) {
                    candidates.push({ rows: rows, cols: cols });
                }
            }
        }

        if (!candidates.length) {
            const side = Math.max(2, Math.round(Math.sqrt(cellCount)));
            return { rows: side, cols: Math.max(2, Math.ceil(cellCount / side)) };
        }

        const preferred = candidates.filter(function (grid) {
            return axis === "vertical" ? grid.cols >= grid.rows : grid.rows >= grid.cols;
        });

        const pool = preferred.length ? preferred : candidates;
        return pool[Math.floor(Math.random() * pool.length)];
    },

    generateSymmetry: function (data) {
        const grade = this.gradeNumber(data.grade);
        const generator = data.generator || {};
        const difficulty = generator.difficulty || data.difficulty || "medium";
        const config = this.buildDifficultyConfig(grade, difficulty, generator);

        const axis = generator.axis === "random" || !generator.axis
            ? (Math.random() < 0.5 ? "vertical" : "horizontal")
            : generator.axis;

        const requestedCells = this.randomInt(Number(config.cells[0]), Number(config.cells[1]));
        let grid = this.chooseGrid(requestedCells, axis);

        if (axis === "vertical" && grid.cols < 4) {
            grid = { rows: grid.rows, cols: 4 };
        }

        if (axis === "horizontal" && grid.rows < 4) {
            grid = { rows: 4, cols: grid.cols };
        }

        const maxShapesBySide = axis === "vertical"
            ? Math.floor(grid.rows * Math.floor(grid.cols / 2) * 0.7)
            : Math.floor(Math.floor(grid.rows / 2) * grid.cols * 0.7);

        const shapeCount = Math.min(
            this.randomInt(Number(config.shapes[0]), Number(config.shapes[1])),
            Math.max(2, maxShapesBySide)
        );

        const labels = this.shuffle(["●", "■", "▲", "◆", "★", "⬟", "✦", "⬢"]);
        const candidates = [];

        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                if (axis === "vertical") {
                    if (col >= Math.floor(grid.cols / 2)) continue;
                } else {
                    if (row >= Math.floor(grid.rows / 2)) continue;
                }
                candidates.push({ row: row, col: col });
            }
        }

        const sourceCells = this.shuffle(candidates).slice(0, shapeCount);

        const pieces = sourceCells.map(function (cell, index) {
            let targetRow = cell.row;
            let targetCol = cell.col;

            if (axis === "vertical") {
                targetCol = grid.cols - 1 - cell.col;
            } else {
                targetRow = grid.rows - 1 - cell.row;
            }

            return {
                id: "symmetryPiece" + (index + 1),
                label: labels[index % labels.length],
                source: { row: cell.row, col: cell.col },
                target: { row: targetRow, col: targetCol }
            };
        });

        return {
            type: "spatial",
            mode: "symmetry",
            source: "generated",
            instruction: "شکل‌ها را در جای قرینه قرار بده.",
            grid: grid,
            axis: axis,
            pieces: this.shuffle(pieces)
        };
    },

    start: function (engine, data) {
        data = data || {};
        const mode = data.mode ? String(data.mode) : "legacy";
        const grid = data.grid;

        if (mode === "symmetry" && data.generator) {
            return this.start(engine, this.generateSymmetry(data));
        }

        const pieces = Array.isArray(data.pieces)
            ? [...data.pieces]
            : (Array.isArray(data.items) ? [...data.items] : []);

        const options = Array.isArray(data.options) ? [...data.options] : [];

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

            const seenTargets = new Set();

            for (const piece of normalizedPieces) {
                const row = Number(piece.target.row);
                const col = Number(piece.target.col);

                if (!Number.isInteger(row) || !Number.isInteger(col) ||
                    row < 0 || row >= Number(grid.rows) ||
                    col < 0 || col >= Number(grid.cols)) {
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
                instruction: data.instruction || "شکل‌ها را در جای قرینه قرار بده.",
                grid: {
                    rows: Math.max(1, Number(grid.rows)),
                    cols: Math.max(1, Number(grid.cols))
                },
                axis: mode === "symmetry" ? (data.axis || "vertical") : null,
                items: normalizedPieces,
                pieces: normalizedPieces,
                placements: {},
                hasUserMove: false,
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
            engine.puzzle.hasUserMove = true;
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
            if (engine.puzzle.hasUserMove !== true) {
                console.log("Spatial Puzzle: Check blocked before first user move.");
                return false;
            }

            const pieces = engine.puzzle.pieces || [];
            const placements = engine.puzzle.placements || {};

            if (Object.keys(placements).length !== pieces.length) {
                engine.emitWrong();
                return false;
            }

            const correct = pieces.every(function (piece) {
                const placement = placements[String(piece.id)];

                return placement &&
                    Number(placement.row) === Number(piece.target.row) &&
                    Number(placement.col) === Number(piece.target.col);
            });

            if (!correct) {
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

console.log("Spatial Puzzle v2.0 Ready");
