// =====================================
// Tahouri Edu Platform
// Cross Math Puzzle
// Version 2.0
//
// Type:
// - crossGrid
//
// Purpose:
// - Cross Math / Cross Grid
// - Horizontal paths
// - Vertical paths
// - Multiple operations
// - One or more missing cells
//
// Architecture:
// PuzzleEngine
//      ↓
// CrossGridPuzzle
//      ↓
// PuzzleScreen
//
// Rule:
// Each path is evaluated from its
// start cell through its operations.
// =====================================


const CrossGridPuzzle = {


    // =====================================
    // START
    // =====================================

    start: function (
        engine,
        data
    ) {

        if (!data) {

            console.error(
                "Cross Math Puzzle: Data Missing"
            );

            return null;

        }


        const rows =
            Math.max(
                1,
                Number(data.rows) || 1
            );


        const cols =
            Math.max(
                1,
                Number(data.cols) || 1
            );


        const expectedCells =
            rows * cols;


        const rawCells =
            Array.isArray(data.cells)
                ? [...data.cells]
                : [];


        if (
            rawCells.length !==
            expectedCells
        ) {

            console.error(
                "Cross Math Puzzle: Invalid Cell Count",
                {
                    expected:
                        expectedCells,

                    actual:
                        rawCells.length
                }
            );

            return null;

        }


        // =================================
        // NORMALIZE CELLS
        // =================================

        const cells =
            rawCells.map(
                function (
                    cell
                ) {

                    if (
                        cell !== null
                        &&
                        typeof cell ===
                        "object"
                    ) {

                        return {

                            type:
                                cell.type ||
                                "value",

                            value:
                                cell.value !==
                                undefined
                                    ? cell.value
                                    : null,

                            operator:
                                cell.operator ||
                                null,

                            label:
                                cell.label ||
                                null

                        };

                    }


                    return {

                        type:
                            "value",

                        value:
                            cell,

                        operator:
                            null,

                        label:
                            null

                    };

                }
            );


        // =================================
        // MISSING CELLS
        // =================================

        const missingIndices =
            [];


        cells.forEach(
            function (
                cell,
                index
            ) {

                if (
                    cell.type ===
                    "value"
                    &&
                    (
                        cell.value ===
                        null
                        ||
                        cell.value ===
                        undefined
                        ||
                        cell.value ===
                        ""
                    )
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
                "Cross Math Puzzle: No Missing Cell"
            );

            return null;

        }


        // =================================
        // PATHS
        // =================================

        const horizontalPaths =
            this.normalizePaths(
                data.horizontalPaths
            );


        const verticalPaths =
            this.normalizePaths(
                data.verticalPaths
            );


        const paths =
            this.normalizePaths(
                data.paths
            );


        const allPaths = [
            ...horizontalPaths,
            ...verticalPaths,
            ...paths
        ];


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
                "Cross Math Puzzle: Answer Count Must Match Missing Cells",
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
                "crossGrid",

            dataType:
                data.dataType ||
                "number",

            source:
                data.source ||
                "file",

            instruction:
                data.instruction ||

                "از مسیرهای افقی و عمودی استفاده کن و خانه‌های خالی را پیدا کن.",

            rows:
                rows,

            cols:
                cols,

            cells:
                cells,

            missingIndices:
                [
                    ...missingIndices
                ],

            horizontalPaths:
                horizontalPaths,

            verticalPaths:
                verticalPaths,

            paths:
                paths,

            allPaths:
                allPaths,

            rules:
                Array.isArray(
                    data.rules
                )
                    ? [
                        ...data.rules
                    ]
                    : [],

            answers:
                [
                    ...answers
                ],

            answer:
                answers.length ===
                1
                    ? answers[0]
                    : null

        };


        // =================================
        // CURRENT ITEMS
        // =================================

        engine.items =
            cells.map(
                function (
                    cell
                ) {

                    return cell.value;

                }
            );


        // =================================
        // START
        // =================================

        engine.emitStarted();


        console.log(
            "Cross Math Puzzle Started"
        );


        console.log(
            "Cross Math Grid:",
            rows,
            "x",
            cols
        );


        console.log(
            "Cross Math Paths:",
            allPaths.length
        );


        console.log(
            "Cross Math Missing Cells:",
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


        // =================================
        // COMPLETE ANSWERS
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

                        value !==
                        ""

                    );

                }
            );


        if (
            !allFilled
        ) {

            console.log(
                "Cross Math: Answer Not Complete"
            );


            engine.emitWrong();


            return false;

        }


        // =================================
        // CHECK ANSWERS
        // =================================

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


        // =================================
        // OPTIONAL PATH VALIDATION
        // =================================

        const pathsValid =
            this.validateAllPaths(
                engine
            );


        if (
            correct
            &&
            pathsValid
        ) {

            console.log(
                "Cross Math Correct"
            );


            engine.finish();


            return true;

        }


        console.log(
            "Cross Math Wrong"
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
                "Cross Math Puzzle: No Active Puzzle"
            );

            return false;

        }


        const cellIndex =
            Number(index);


        if (
            !Number.isInteger(
                cellIndex
            )
        ) {

            console.error(
                "Cross Math Puzzle: Invalid Cell Index"
            );

            return false;

        }


        if (
            !engine.puzzle.missingIndices.includes(
                cellIndex
            )
        ) {

            console.error(
                "Cross Math Puzzle: Cell Is Not Editable:",
                cellIndex
            );

            return false;

        }


        // =================================
        // EMPTY
        // =================================

        if (
            value ===
            ""
            ||
            value ===
            null
            ||
            value ===
            undefined
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
        // NUMBER
        // =================================

        const numericValue =
            Number(value);


        if (
            !Number.isFinite(
                numericValue
            )
        ) {

            console.error(
                "Cross Math Puzzle: Invalid Number"
            );

            return false;

        }


        engine.items[
            cellIndex
        ] =
            numericValue;


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
                "Cross Math Puzzle: Answer Count Mismatch"
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
    // PATH VALIDATION
    // =====================================

    validateAllPaths: function (
        engine
    ) {

        const paths =
            engine.puzzle
                ? engine.puzzle.allPaths
                : [];


        if (
            !Array.isArray(
                paths
            )
            ||
            paths.length ===
            0
        ) {

            return true;

        }


        for (
            let i = 0;

            i < paths.length;

            i++
        ) {

            const valid =
                this.validatePath(
                    engine,
                    paths[i]
                );


            if (
                !valid
            ) {

                return false;

            }

        }


        return true;

    },


    // =====================================
    // VALIDATE ONE PATH
    // =====================================

    validatePath: function (
        engine,
        path
    ) {

        if (
            !path
        ) {

            return true;

        }


        const cellIndexes =
            Array.isArray(
                path.cells
            )
                ? path.cells
                : [];


        if (
            cellIndexes.length ===
            0
        ) {

            return true;

        }


        let result =
            null;


        let operationIndex =
            0;


        for (
            let i = 0;

            i < cellIndexes.length;

            i++
        ) {

            const cellIndex =
                Number(
                    cellIndexes[i]
                );


            const cell =
                engine.puzzle.cells[
                    cellIndex
                ];


            if (
                !cell
            ) {

                return false;

            }


            // =============================
            // VALUE
            // =============================

            if (
                cell.type ===
                "value"
            ) {

                const value =
                    engine.items[
                        cellIndex
                    ];


                if (
                    value ===
                    null
                    ||
                    value ===
                    undefined
                    ||
                    value ===
                    ""
                ) {

                    return false;

                }


                const numericValue =
                    Number(value);


                if (
                    !Number.isFinite(
                        numericValue
                    )
                ) {

                    return false;

                }


                if (
                    result ===
                    null
                ) {

                    result =
                        numericValue;

                }

                else {

                    const operation =
                        this.getPathOperation(
                            path,
                            operationIndex
                        );


                    if (
                        !operation
                    ) {

                        return true;

                    }


                    result =
                        this.applyOperation(
                            result,
                            numericValue,
                            operation
                        );


                    if (
                        result ===
                        null
                    ) {

                        return false;

                    }


                    operationIndex++;

                }

            }

        }


        // =================================
        // OPTIONAL TARGET
        // =================================

        if (
            path.target !==
            undefined
        ) {

            return engine.valuesEqual(

                result,

                path.target

            );

        }


        return true;

    },


    // =====================================
    // PATH OPERATION
    // =====================================

    getPathOperation: function (
        path,
        index
    ) {

        if (
            Array.isArray(
                path.operations
            )
        ) {

            return (
                path.operations[index]
                ||
                null
            );

        }


        if (
            Array.isArray(
                path.operators
            )
        ) {

            return (
                path.operators[index]
                ||
                null
            );

        }


        if (
            path.operation
        ) {

            return path.operation;

        }


        return null;

    },


    // =====================================
    // APPLY OPERATION
    // =====================================

    applyOperation: function (
        left,
        right,
        operation
    ) {

        switch (
            operation
        ) {

            case "+":

                return (
                    left +
                    right
                );


            case "add":

                return (
                    left +
                    right
                );


            case "-":

                return (
                    left -
                    right
                );


            case "subtract":

                return (
                    left -
                    right
                );


            case "×":

                return (
                    left *
                    right
                );


            case "*":

                return (
                    left *
                    right
                );


            case "multiply":

                return (
                    left *
                    right
                );


            case "÷":

                if (
                    right ===
                    0
                ) {

                    return null;

                }

                return (
                    left /
                    right
                );


            case "/":

                if (
                    right ===
                    0
                ) {

                    return null;

                }

                return (
                    left /
                    right
                );


            case "divide":

                if (
                    right ===
                    0
                ) {

                    return null;

                }

                return (
                    left /
                    right
                );


            default:

                console.warn(
                    "Cross Math: Unknown Operation:",
                    operation
                );


                return null;

        }

    },


    // =====================================
    // NORMALIZE PATHS
    // =====================================

    normalizePaths: function (
        paths
    ) {

        if (
            !Array.isArray(
                paths
            )
        ) {

            return [];

        }


        return paths
            .filter(
                function (
                    path
                ) {

                    return (
                        path
                        &&
                        Array.isArray(
                            path.cells
                        )
                    );

                }
            )
            .map(
                function (
                    path,
                    index
                ) {

                    return {

                        id:
                            path.id ||
                            (
                                "path_" +
                                index
                            ),

                        direction:
                            path.direction ||
                            "horizontal",

                        cells:
                            [
                                ...path.cells
                            ],

                        operations:

                            Array.isArray(
                                path.operations
                            )
                                ? [
                                    ...path.operations
                                ]
                                : (

                                    Array.isArray(
                                        path.operators
                                    )
                                        ? [
                                            ...path.operators
                                        ]
                                        : []

                                ),

                        operators:

                            Array.isArray(
                                path.operators
                            )
                                ? [
                                    ...path.operators
                                ]
                                : [],

                        operation:
                            path.operation ||
                            null,

                        target:
                            path.target !==
                            undefined
                                ? path.target
                                : undefined,

                        label:
                            path.label ||
                            null

                    };

                }
            );

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
            Number(row);


        const c =
            Number(col);


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
            Number(index);


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

window.CrossGridPuzzle =
    CrossGridPuzzle;


// =====================================
// REGISTRY
// =====================================

PuzzleTypeRegistry.register(
    "crossGrid",
    CrossGridPuzzle
);


// =====================================
// READY
// =====================================

console.log(
    "Cross Math Puzzle v2.0 Ready"
);