// =====================================
// Tahouri Edu Platform
// Grid Puzzle
// Version 2.0
//
// Purpose:
// - Numeric Grid Puzzle
// - Missing Cell(s)
// - Clear rule support
// - Single / Multiple answers
// - Engine Cell API compatibility
//
// Architecture:
// PuzzleEngine
//      ↓
// GridPuzzle
//      ↓
// PuzzleScreen
// =====================================


const GridPuzzle = {


    // =====================================
    // START
    // =====================================

    start: function (
        engine,
        data
    ) {

        if (!data) {

            console.error(
                "Grid Puzzle: Data Missing"
            );

            return null;

        }


        const rows =
            Math.max(
                1,
                Number(
                    data.rows
                ) || 1
            );


        const cols =
            Math.max(
                1,
                Number(
                    data.cols
                ) || 1
            );


        const expectedCells =
            rows * cols;


        const cells =
            Array.isArray(
                data.cells
            )
                ? [...data.cells]
                : [];


        if (
            cells.length !==
            expectedCells
        ) {

            console.error(
                "Grid Puzzle: Invalid Cell Count",
                {
                    expected:
                        expectedCells,

                    actual:
                        cells.length
                }
            );


            return null;

        }


        // =================================
        // MISSING CELLS
        // =================================

        const missingIndices =
            [];


        cells.forEach(
            function (
                value,
                index
            ) {

                if (
                    value === null
                    ||
                    value === undefined
                    ||
                    value === ""
                ) {

                    missingIndices.push(
                        index
                    );

                }

            }
        );


        if (
            missingIndices.length ===
            0
        ) {

            console.error(
                "Grid Puzzle: No Missing Cell"
            );

            return null;

        }


        // =================================
        // ANSWERS
        // =================================

        let answers =
            Array.isArray(
                data.answers
            )
                ? [
                    ...data.answers
                ]
                : [];


        if (
            answers.length === 0
            &&
            data.answer !==
            undefined
        ) {

            answers = [
                data.answer
            ];

        }


        if (
            answers.length !==
            missingIndices.length
        ) {

            console.error(
                "Grid Puzzle: Answer Count Must Match Missing Cells",
                {
                    missing:
                        missingIndices.length,

                    answers:
                        answers.length
                }
            );


            return null;

        }


        // =================================
        // SAVE PUZZLE
        // =================================

        engine.puzzle = {

            type:
                "grid",

            dataType:
                data.dataType ||
                "number",

            source:
                data.source ||
                "file",

            instruction:
                data.instruction ||
                "خانه‌های خالی را کامل کن.",

            rows:
                rows,

            cols:
                cols,

            cells:
                [...cells],

            missingIndices:
                [
                    ...missingIndices
                ],

            answers:
                [
                    ...answers
                ],

            rules:
                Array.isArray(
                    data.rules
                )
                    ? [
                        ...data.rules
                    ]
                    : [],

            answer:
                answers.length === 1
                    ? answers[0]
                    : null

        };


        // =================================
        // CURRENT ITEMS
        // =================================

        engine.items =
            [...cells];


        // =================================
        // START
        // =================================

        engine.emitStarted();


        console.log(
            "Grid Puzzle Started"
        );


        console.log(
            "Grid Size:",
            rows,
            "x",
            cols
        );


        console.log(
            "Missing Cells:",
            missingIndices
        );


        console.log(
            "Grid Rules:",
            engine.puzzle.rules
        );


        return engine.getState();

    },


    // =====================================
    // CHECK
    // =====================================

    check: function (
        engine
    ) {

        if (
            !engine.puzzle
        ) {

            return false;

        }


        const missingIndices =
            engine.puzzle.missingIndices;


        const answers =
            engine.puzzle.answers;


        if (
            missingIndices.length !==
            answers.length
        ) {

            console.error(
                "Grid Puzzle: Invalid Answer Structure"
            );

            return false;

        }


        const allFilled =
            missingIndices.every(
                function (
                    index
                ) {

                    const value =
                        engine.items[
                            index
                        ];


                    return (
                        value !==
                        null

                        &&
                        value !==
                        undefined

                        &&
                        value !==
                        ""
                    );

                }
            );


        if (
            !allFilled
        ) {

            console.log(
                "Grid Puzzle: Answer Not Complete"
            );


            engine.emitWrong();


            return false;

        }


        const correct =
            missingIndices.every(
                function (
                    cellIndex,
                    answerIndex
                ) {

                    return engine.valuesEqual(

                        engine.items[
                            cellIndex
                        ],

                        answers[
                            answerIndex
                        ]

                    );

                }
            );


        if (
            correct
        ) {

            console.log(
                "Grid Puzzle Correct"
            );


            engine.finish();


            return true;

        }


        console.log(
            "Grid Puzzle Wrong"
        );


        engine.emitWrong();


        return false;

    },


    // =====================================
    // SET ANSWER
    // =====================================

    setAnswer: function (
        engine,
        index,
        value
    ) {

        return this.setCell(
            engine,
            index,
            value
        );

    },


    // =====================================
    // SET CELL
    // =====================================

    setCell: function (
        engine,
        index,
        value
    ) {

        if (
            !engine.puzzle
        ) {

            console.error(
                "Grid Puzzle: No Active Puzzle"
            );

            return false;

        }


        const cellIndex =
            Number(
                index
            );


        if (
            !Number.isInteger(
                cellIndex
            )
        ) {

            console.error(
                "Grid Puzzle: Invalid Cell Index"
            );

            return false;

        }


        if (
            !engine.puzzle.missingIndices.includes(
                cellIndex
            )
        ) {

            console.error(
                "Grid Puzzle: Cell Is Not Editable:",
                cellIndex
            );

            return false;

        }


        // =================================
        // EMPTY VALUE
        // =================================

        if (
            value === ""
            ||
            value === null
            ||
            value === undefined
        ) {

            engine.items[
                cellIndex
            ] =
                null;


            EventManager.emit(
                "puzzleChanged",
                engine.getState()
            );


            return true;

        }


        // =================================
        // NUMBER NORMALIZATION
        // =================================

        let normalizedValue =
            value;


        if (
            engine.puzzle.dataType ===
            "number"
        ) {

            normalizedValue =
                Number(
                    value
                );


            if (
                !Number.isFinite(
                    normalizedValue
                )
            ) {

                console.error(
                    "Grid Puzzle: Invalid Numeric Value"
                );

                return false;

            }

        }

        else {

            normalizedValue =
                String(
                    value
                ).trim();

        }


        engine.items[
            cellIndex
        ] =
            normalizedValue;


        engine.moves++;


        EventManager.emit(
            "puzzleChanged",
            engine.getState()
        );


        return true;

    },


    // =====================================
    // SET ALL ANSWERS
    // =====================================

    setAnswers: function (
        engine,
        values
    ) {

        if (
            !Array.isArray(
                values
            )
        ) {

            return false;

        }


        const missingIndices =
            engine.puzzle
                ? engine.puzzle.missingIndices
                : [];


        if (
            values.length !==
            missingIndices.length
        ) {

            console.error(
                "Grid Puzzle: Answer Count Mismatch"
            );

            return false;

        }


        for (
            let i = 0;

            i < values.length;

            i++
        ) {

            const result =
                this.setCell(

                    engine,

                    missingIndices[i],

                    values[i]

                );


            if (
                !result
            ) {

                return false;

            }

        }


        return true;

    },


    // =====================================
    // GET CELL
    // =====================================

    getCell: function (
        engine,
        row,
        col
    ) {

        if (
            !engine.puzzle
        ) {

            return null;

        }


        const index =
            this.getIndex(
                engine,
                row,
                col
            );


        if (
            index < 0
        ) {

            return null;

        }


        return engine.items[
            index
        ];

    },


    // =====================================
    // GET INDEX
    // =====================================

    getIndex: function (
        engine,
        row,
        col
    ) {

        if (
            !engine.puzzle
        ) {

            return -1;

        }


        const r =
            Number(
                row
            );


        const c =
            Number(
                col
            );


        if (
            !Number.isInteger(r)
            ||
            !Number.isInteger(c)
        ) {

            return -1;

        }


        if (
            r < 0
            ||
            r >=
            engine.puzzle.rows
            ||
            c < 0
            ||
            c >=
            engine.puzzle.cols
        ) {

            return -1;

        }


        return (
            r *
            engine.puzzle.cols
        )
        +
        c;

    },


    // =====================================
    // RESET CELL
    // =====================================

    resetCell: function (
        engine,
        index
    ) {

        if (
            !engine.puzzle
        ) {

            return false;

        }


        const cellIndex =
            Number(
                index
            );


        if (
            !engine.puzzle.missingIndices.includes(
                cellIndex
            )
        ) {

            return false;

        }


        engine.items[
            cellIndex
        ] =
            null;


        EventManager.emit(
            "puzzleChanged",
            engine.getState()
        );


        return true;

    }

};


// =====================================
// GLOBAL
// =====================================

window.GridPuzzle =
    GridPuzzle;


// =====================================
// REGISTRY
// =====================================

PuzzleTypeRegistry.register(
    "grid",
    GridPuzzle
);


// =====================================
// READY
// =====================================

console.log(
    "Grid Puzzle v2.0 Ready"
);