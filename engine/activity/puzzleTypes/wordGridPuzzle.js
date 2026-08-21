// =====================================
// Tahouri Edu Platform
// Word Grid Puzzle
// Version 2.0
//
// Purpose:
// - Word Grid Puzzle
// - Missing Word Cells
// - Semantic Relations
// - Synonym
// - Antonym
// - Category
// - Grammar
// - Single / Multiple Answers
// - Engine Cell API compatibility
//
// Architecture:
// PuzzleEngine
//      ↓
// WordGridPuzzle
//      ↓
// PuzzleScreen
// =====================================


const WordGridPuzzle = {


    // =====================================
    // START
    // =====================================

    start: function (
        engine,
        data
    ) {

        if (!data) {

            console.error(
                "Word Grid Puzzle: Data Missing"
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
                "Word Grid Puzzle: Invalid Cell Count",
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
                "Word Grid Puzzle: No Missing Cell"
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
                "Word Grid Puzzle: Answer Count Must Match Missing Cells",
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
        // RELATION
        // =================================

        const relation =
            data.relation
            &&
            typeof data.relation ===
            "object"

                ?

                {
                    ...data.relation
                }

                :

                {
                    type:
                        "semantic"
                };


        const relationType =
            relation.type ||
            "semantic";


        const validRelations = [

            "semantic",
            "synonym",
            "antonym",
            "category",
            "grammar"

        ];


        if (
            !validRelations.includes(
                relationType
            )
        ) {

            console.warn(
                "Word Grid Puzzle: Unknown Relation:",
                relationType
            );

        }


        // =================================
        // SAVE PUZZLE
        // =================================

        engine.puzzle = {

            type:
                "wordGrid",

            dataType:
                "text",

            source:
                data.source ||
                "file",

            instruction:
                data.instruction ||
                "خانه‌های خالی را با واژه مناسب کامل کن.",

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

            relation:
                relation,

            relationType:
                relationType,

            answers:
                [
                    ...answers
                ],

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
            "Word Grid Puzzle Started"
        );


        console.log(
            "Word Grid Size:",
            rows,
            "x",
            cols
        );


        console.log(
            "Word Grid Relation:",
            relationType
        );


        console.log(
            "Word Grid Missing Cells:",
            missingIndices
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
                "Word Grid Puzzle: Invalid Answer Structure"
            );

            return false;

        }


        // =================================
        // ALL FILLED?
        // =================================

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

                        String(
                            value
                        ).trim() !==
                        ""

                    );

                }
            );


        if (
            !allFilled
        ) {

            console.log(
                "Word Grid Puzzle: Answer Not Complete"
            );


            engine.emitWrong();


            return false;

        }


        // =================================
        // CHECK
        // =================================

        const correct =
            missingIndices.every(
                function (
                    cellIndex,
                    answerIndex
                ) {

                    return this.wordsEqual(

                        engine.items[
                            cellIndex
                        ],

                        answers[
                            answerIndex
                        ]

                    );

                },
                this
            );


        if (
            correct
        ) {

            console.log(
                "Word Grid Correct"
            );


            engine.finish();


            return true;

        }


        console.log(
            "Word Grid Wrong"
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
                "Word Grid Puzzle: No Active Puzzle"
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
                "Word Grid Puzzle: Invalid Cell Index"
            );

            return false;

        }


        if (
            !engine.puzzle.missingIndices.includes(
                cellIndex
            )
        ) {

            console.error(
                "Word Grid Puzzle: Cell Is Not Editable:",
                cellIndex
            );

            return false;

        }


        // =================================
        // EMPTY
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
        // TEXT
        // =================================

        const normalizedValue =
            String(
                value
            ).trim();


        if (
            normalizedValue ===
            ""
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
                "Word Grid Puzzle: Answer Count Mismatch"
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

    },


    // =====================================
    // WORD COMPARISON
    // =====================================

    wordsEqual: function (
        a,
        b
    ) {

        if (
            a === null
            ||
            a === undefined
            ||
            b === null
            ||
            b === undefined
        ) {

            return (
                a ===
                b
            );

        }


        const normalize =
            function (
                value
            ) {

                return String(
                    value
                )
                    .trim()
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .replace(
                        /ي/g,
                        "ی"
                    )
                    .replace(
                        /ك/g,
                        "ک"
                    );

            };


        return (
            normalize(a) ===
            normalize(b)
        );

    }

};


// =====================================
// GLOBAL
// =====================================

window.WordGridPuzzle =
    WordGridPuzzle;


// =====================================
// REGISTRY
// =====================================

PuzzleTypeRegistry.register(
    "wordGrid",
    WordGridPuzzle
);


// =====================================
// READY
// =====================================

console.log(
    "Word Grid Puzzle v2.0 Ready"
);