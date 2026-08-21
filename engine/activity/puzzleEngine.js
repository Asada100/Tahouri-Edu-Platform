// =====================================
// Tahouri Edu Platform
// Puzzle Engine
// Version 2.3
//
// Responsibilities:
// - Puzzle Core
// - Provider Bridge
// - Type Routing
// - Unified State
// - Generic Answers
// - Type-specific Answers
// - Check Routing
// - Finish
// - Result
// - Shared Utilities
//
// Supported Types:
// - ordering
// - sequence
// - visualMath
// - inputOutput
// - sentence
// - grid
// - wordGrid
// - crossGrid
//
// Architecture:
//
// PuzzleProvider
//      ↓
// PuzzleEngine
//      ↓
// PuzzleTypeRegistry
//      ↓
// Puzzle Type Handler
//      ↓
// PuzzleScreen
// =====================================


const PuzzleEngine = {


    // =====================================
    // STATE
    // =====================================

    state: {

        started:
            false,

        isFinished:
            false

    },


    // =====================================
    // CURRENT ACTIVITY
    // =====================================

    activity:
        null,


    // =====================================
    // CURRENT PUZZLE
    // =====================================

    puzzle:
        null,


    // =====================================
    // CURRENT ITEMS
    // =====================================

    items:
        [],


    // =====================================
    // USER ANSWER
    // =====================================

    userAnswer:
        null,


    // =====================================
    // MOVES
    // =====================================

    moves:
        0,


    // =====================================
    // START
    // =====================================

    start: async function (
        activityData
    ) {

        if (
            !activityData
        ) {

            console.error(
                "Puzzle Engine: Activity Data Missing"
            );

            return null;

        }


        // =================================
        // RESET CURRENT RUN
        // =================================

        this.activity =
            activityData;


        this.state.started =
            true;


        this.state.isFinished =
            false;


        this.puzzle =
            null;


        this.items =
            [];


        this.userAnswer =
            null;


        this.moves =
            0;


        console.log(
            "Puzzle Engine Activity:",
            activityData
        );


        // =================================
        // QUESTION PROVIDER
        // =================================

        if (
            typeof QuestionProvider ===
            "undefined"
        ) {

            console.error(
                "Puzzle Engine: QuestionProvider Not Available"
            );


            this.state.started =
                false;


            return null;

        }


        // =================================
        // TYPE REGISTRY
        // =================================

        if (
            typeof PuzzleTypeRegistry ===
            "undefined"
        ) {

            console.error(
                "Puzzle Engine: PuzzleTypeRegistry Not Available"
            );


            this.state.started =
                false;


            return null;

        }


        // =================================
        // PREPARE PROVIDER ACTIVITY
        // =================================

        const providerActivity =
            this.prepareProviderActivity(
                activityData
            );


        // =================================
        // LOAD CONTENT
        // =================================

        let puzzleQuestions =
            [];


        try {

            puzzleQuestions =
                await QuestionProvider.getPuzzleQuestions(
                    providerActivity
                );

        }

        catch (
            error
        ) {

            console.error(
                "Puzzle Engine: QuestionProvider Error:",
                error
            );


            this.state.started =
                false;


            return null;

        }


        if (
            !Array.isArray(
                puzzleQuestions
            )
            ||
            puzzleQuestions.length ===
            0
        ) {

            console.error(
                "Puzzle Engine: No Puzzle Content Available"
            );


            this.state.started =
                false;


            return null;

        }


        const puzzle =
            puzzleQuestions[0];


        if (
            !puzzle
        ) {

            console.error(
                "Puzzle Engine: Invalid Puzzle Content"
            );


            this.state.started =
                false;


            return null;

        }


        console.log(
            "Puzzle Question Received:",
            puzzle
        );


        // =================================
        // ROUTER
        // =================================

        const handler =
            PuzzleTypeRegistry.get(
                puzzle.type
            );


        if (
            !handler
        ) {

            console.error(
                "Puzzle Engine: Unsupported Puzzle Type:",
                puzzle.type
            );


            this.state.started =
                false;


            return null;

        }


        if (
            typeof handler.start !==
            "function"
        ) {

            console.error(
                "Puzzle Engine: Invalid Puzzle Handler:",
                puzzle.type
            );


            this.state.started =
                false;


            return null;

        }


        console.log(
            "Puzzle Engine Routing:",
            puzzle.type
        );


        return handler.start(
            this,
            puzzle
        );

    },


    // =====================================
    // PROVIDER PREPARATION
    // =====================================

    prepareProviderActivity: function (
        activityData
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const settings =
            activityData.settings ||
            {};


        const hasExplicitSource =

            puzzle.source !==
            undefined

            ||

            settings.questionSource !==
            undefined;


        if (
            hasExplicitSource
        ) {

            return activityData;

        }


        // =================================
        // FIXED DATA DETECTION
        // =================================

        const hasFixedData =

            Array.isArray(
                puzzle.items
            )

            ||

            Array.isArray(
                puzzle.correctOrder
            )

            ||

            Array.isArray(
                puzzle.options
            )

            ||

            Array.isArray(
                puzzle.words
            )

            ||

            Array.isArray(
                puzzle.cells
            )

            ||

            Array.isArray(
                puzzle.inputs
            )

            ||

            Array.isArray(
                puzzle.outputs
            );


        if (
            hasFixedData
        ) {

            return {

                ...activityData,

                settings: {

                    ...settings,

                    questionSource:
                        "file"

                },

                puzzle: {

                    ...puzzle,

                    source:
                        "file"

                }

            };

        }


        // =================================
        // GENERATED
        // =================================

        return {

            ...activityData,

            settings: {

                ...settings,

                questionSource:
                    "generated"

            },

            puzzle: {

                ...puzzle,

                source:
                    "generated"

            }

        };

    },


    // =====================================
    // GET STATE
    // =====================================

    getState: function () {

        // =================================
        // EMPTY STATE
        // =================================

        if (
            !this.puzzle
        ) {

            return {

                type:
                    null,

                dataType:
                    null,

                source:
                    null,

                instruction:
                    "",

                items:
                    [],

                correctOrder:
                    [],

                missingIndex:
                    null,

                missingIndices:
                    [],

                answer:
                    null,

                answers:
                    [],

                pattern:
                    null,

                step:
                    null,

                multiplier:
                    null,

                operation:
                    null,

                comparison:
                    null,

                inputs:
                    [],

                outputs:
                    [],

                rule:
                    null,

                words:
                    [],

                correctWords:
                    [],

                grammar:
                    null,

                mode:
                    null,

                rows:
                    null,

                cols:
                    null,

                cells:
                    [],

                horizontalPaths:
                    [],

                verticalPaths:
                    [],

                paths:
                    [],

                rules:
                    [],

                relation:
                    null,

                relationType:
                    null,

                targets:
                    [],

                userAnswer:
                    this.userAnswer,

                moves:
                    this.moves,

                finished:
                    this.state.isFinished

            };

        }


        // =================================
        // COMMON STATE
        // =================================

        const state = {

            type:
                this.puzzle.type,

            dataType:
                this.puzzle.dataType ||
                null,

            source:
                this.puzzle.source ||
                null,

            instruction:
                this.puzzle.instruction ||
                "",

            items:
                Array.isArray(
                    this.items
                )
                    ? [
                        ...this.items
                    ]
                    : [],

            userAnswer:
                this.userAnswer,

            moves:
                this.moves,

            finished:
                this.state.isFinished

        };


        // =================================
        // ORDERING
        // =================================

        if (
            this.puzzle.type ===
            "ordering"
        ) {

            state.correctOrder =

                Array.isArray(
                    this.puzzle.correctOrder
                )

                    ? [
                        ...this.puzzle.correctOrder
                    ]

                    : [];

        }


        // =================================
        // SEQUENCE
        // =================================

        if (
            this.puzzle.type ===
            "sequence"
        ) {

            state.missingIndex =
                this.puzzle.missingIndex;


            state.answer =
                this.puzzle.answer;


            state.pattern =
                this.puzzle.pattern;


            state.step =
                this.puzzle.step;


            state.multiplier =
                this.puzzle.multiplier;

        }


        // =================================
        // VISUAL MATH
        // =================================

        if (
            this.puzzle.type ===
            "visualMath"
        ) {

            state.operation =
                this.puzzle.operation;


            state.comparison =
                this.puzzle.comparison;


            state.answer =
                this.puzzle.answer;

        }


        // =================================
        // INPUT / OUTPUT
        // =================================

        if (
            this.puzzle.type ===
            "inputOutput"
        ) {

            state.inputs =

                Array.isArray(
                    this.puzzle.inputs
                )

                    ? [
                        ...this.puzzle.inputs
                    ]

                    : [];


            state.outputs =

                Array.isArray(
                    this.items
                )

                    ? [
                        ...this.items
                    ]

                    : [];


            state.missingIndex =
                this.puzzle.missingIndex;


            state.rule =
                this.puzzle.rule;


            state.answer =
                this.puzzle.answer;

        }


        // =================================
        // SENTENCE
        // =================================

        if (
            this.puzzle.type ===
            "sentence"
        ) {

            state.mode =
                this.puzzle.mode;


            state.words =

                Array.isArray(
                    this.puzzle.words
                )

                    ? [
                        ...this.puzzle.words
                    ]

                    : [];


            state.correctWords =

                Array.isArray(
                    this.puzzle.correctOrder
                )

                    ? [
                        ...this.puzzle.correctOrder
                    ]

                    : [];


            state.grammar =
                this.puzzle.grammar;


            state.targets =

                Array.isArray(
                    this.puzzle.targets
                )

                    ? [
                        ...this.puzzle.targets
                    ]

                    : [];


            state.answers =

                Array.isArray(
                    this.puzzle.answers
                )

                    ? [
                        ...this.puzzle.answers
                    ]

                    : [];

        }


        // =================================
        // GRID
        // =================================

        if (
            this.puzzle.type ===
            "grid"
        ) {

            state.rows =
                this.puzzle.rows;


            state.cols =
                this.puzzle.cols;


            state.cells =

                Array.isArray(
                    this.puzzle.cells
                )

                    ? [
                        ...this.puzzle.cells
                    ]

                    : [];


            state.missingIndices =

                Array.isArray(
                    this.puzzle.missingIndices
                )

                    ? [
                        ...this.puzzle.missingIndices
                    ]

                    : [];


            state.answers =

                Array.isArray(
                    this.puzzle.answers
                )

                    ? [
                        ...this.puzzle.answers
                    ]

                    : [];


            state.rules =

                Array.isArray(
                    this.puzzle.rules
                )

                    ? [
                        ...this.puzzle.rules
                    ]

                    : [];


            state.answer =
                this.puzzle.answer;

        }


        // =================================
        // WORD GRID
        // =================================

        if (
            this.puzzle.type ===
            "wordGrid"
        ) {

            state.rows =
                this.puzzle.rows;


            state.cols =
                this.puzzle.cols;


            state.cells =

                Array.isArray(
                    this.puzzle.cells
                )

                    ? [
                        ...this.puzzle.cells
                    ]

                    : [];


            state.missingIndices =

                Array.isArray(
                    this.puzzle.missingIndices
                )

                    ? [
                        ...this.puzzle.missingIndices
                    ]

                    : [];


            state.answers =

                Array.isArray(
                    this.puzzle.answers
                )

                    ? [
                        ...this.puzzle.answers
                    ]

                    : [];


            state.relation =
                this.puzzle.relation;


            state.relationType =
                this.puzzle.relationType;


            state.answer =
                this.puzzle.answer;

        }


        // =================================
        // CROSS GRID
        // =================================

        if (
            this.puzzle.type ===
            "crossGrid"
        ) {

            state.rows =
                this.puzzle.rows;


            state.cols =
                this.puzzle.cols;


            state.cells =

                Array.isArray(
                    this.puzzle.cells
                )

                    ? [
                        ...this.puzzle.cells
                    ]

                    : [];


            state.missingIndices =

                Array.isArray(
                    this.puzzle.missingIndices
                )

                    ? [
                        ...this.puzzle.missingIndices
                    ]

                    : [];


            state.horizontalPaths =

                Array.isArray(
                    this.puzzle.horizontalPaths
                )

                    ? [
                        ...this.puzzle.horizontalPaths
                    ]

                    : [];


            state.verticalPaths =

                Array.isArray(
                    this.puzzle.verticalPaths
                )

                    ? [
                        ...this.puzzle.verticalPaths
                    ]

                    : [];


            state.paths =

                Array.isArray(
                    this.puzzle.paths
                )

                    ? [
                        ...this.puzzle.paths
                    ]

                    : [];


            state.rules =

                Array.isArray(
                    this.puzzle.rules
                )

                    ? [
                        ...this.puzzle.rules
                    ]

                    : [];


            state.answers =

                Array.isArray(
                    this.puzzle.answers
                )

                    ? [
                        ...this.puzzle.answers
                    ]

                    : [];


            state.answer =
                this.puzzle.answer;

        }


        return state;

    },


    // =====================================
    // ORDER
    // =====================================

    setOrder: function (
        newOrder
    ) {

        if (
            !Array.isArray(
                newOrder
            )
        ) {

            console.error(
                "Puzzle Engine: Invalid Order"
            );

            return false;

        }


        this.items =
            [
                ...newOrder
            ];


        this.moves++;


        EventManager.emit(
            "puzzleChanged",
            this.getState()
        );


        return true;

    },


    // =====================================
    // SEQUENCE ANSWER
    // =====================================

    setSequenceAnswer: function (
        value
    ) {

        if (

            !this.puzzle
            ||
            this.puzzle.type !==
            "sequence"

        ) {

            console.error(
                "Puzzle Engine: No Active Sequence"
            );

            return false;

        }


        this.items[
            this.puzzle.missingIndex
        ] =
            value;


        this.moves++;


        EventManager.emit(
            "puzzleChanged",
            this.getState()
        );


        return true;

    },


    // =====================================
    // VISUAL MATH ANSWER
    // =====================================

    setVisualMathAnswer: function (
        value
    ) {

        if (

            !this.puzzle
            ||
            this.puzzle.type !==
            "visualMath"

        ) {

            console.error(
                "Puzzle Engine: No Active Visual Math Puzzle"
            );

            return false;

        }


        if (
            this.puzzle.operation ===
            "comparison"
        ) {

            if (

                value !== "left"
                &&
                value !== "right"
                &&
                value !== "equal"

            ) {

                console.error(
                    "Puzzle Engine: Invalid Comparison Answer"
                );

                return false;

            }


            this.userAnswer =
                value;


            this.moves++;


            EventManager.emit(
                "puzzleChanged",
                this.getState()
            );


            return true;

        }


        const numericValue =
            Number(
                value
            );


        if (
            !Number.isFinite(
                numericValue
            )
        ) {

            console.error(
                "Puzzle Engine: Invalid Visual Math Answer"
            );

            return false;

        }


        this.userAnswer =
            numericValue;


        this.moves++;


        EventManager.emit(
            "puzzleChanged",
            this.getState()
        );


        return true;

    },


    // =====================================
    // GENERIC ANSWER
    // =====================================

    setGenericAnswer: function (
        value
    ) {

        if (
            !this.puzzle
        ) {

            console.error(
                "Puzzle Engine: No Active Puzzle"
            );

            return false;

        }


        this.userAnswer =
            value;


        // =================================
        // INPUT / OUTPUT
        // =================================

        if (
            this.puzzle.type ===
            "inputOutput"
        ) {

            const missingIndex =
                this.puzzle.missingIndex;


            if (
                Number.isInteger(
                    missingIndex
                )
            ) {

                this.items[
                    missingIndex
                ] =
                    value;

            }

        }


        // =================================
        // SENTENCE GRAMMAR
        // =================================

        if (
            this.puzzle.type ===
            "sentence"
        ) {

            if (
                this.puzzle.mode ===
                "sentenceGrammar"
            ) {

                this.userAnswer =
                    Array.isArray(
                        value
                    )
                        ? [
                            ...value
                        ]
                        :
                        value;

            }

        }


        this.moves++;


        EventManager.emit(
            "puzzleChanged",
            this.getState()
        );


        return true;

    },


    // =====================================
    // SET TYPE ANSWER
    // =====================================
    //
    // Used by:
    // - sentence
    // - grid
    // - wordGrid
    // - crossGrid
    //
    // The actual validation remains
    // inside the type handler.
    // =====================================

    setTypeAnswer: function (
        value
    ) {

        if (
            !this.puzzle
        ) {

            console.error(
                "Puzzle Engine: No Active Puzzle"
            );

            return false;

        }


        const handler =
            PuzzleTypeRegistry.get(
                this.puzzle.type
            );


        if (
            !handler
        ) {

            console.error(
                "Puzzle Engine: Handler Not Found:",
                this.puzzle.type
            );

            return false;

        }


        if (
            typeof handler.setAnswer ===
            "function"
        ) {

            const result =
                handler.setAnswer(
                    this,
                    value
                );


            return result;

        }


        this.userAnswer =
            value;


        this.moves++;


        EventManager.emit(
            "puzzleChanged",
            this.getState()
        );


        return true;

    },


    // =====================================
    // SET CELL
    // =====================================

    setCell: function (
        index,
        value
    ) {

        if (
            !this.puzzle
        ) {

            console.error(
                "Puzzle Engine: No Active Puzzle"
            );

            return false;

        }


        const handler =
            PuzzleTypeRegistry.get(
                this.puzzle.type
            );


        if (
            !handler
        ) {

            return false;

        }


        if (
            typeof handler.setCell !==
            "function"
        ) {

            console.error(
                "Puzzle Engine: Cell API Not Available:",
                this.puzzle.type
            );

            return false;

        }


        return handler.setCell(
            this,
            index,
            value
        );

    },


    // =====================================
    // SET CELLS
    // =====================================

    setCells: function (
        values
    ) {

        if (
            !this.puzzle
        ) {

            return false;

        }


        const handler =
            PuzzleTypeRegistry.get(
                this.puzzle.type
            );


        if (
            !handler
        ) {

            return false;

        }


        if (
            typeof handler.setCells !==
            "function"
        ) {

            console.error(
                "Puzzle Engine: Multiple Cell API Not Available:",
                this.puzzle.type
            );

            return false;

        }


        return handler.setCells(
            this,
            values
        );

    },


    // =====================================
    // CHECK
    // =====================================

    check: function () {

        if (
            !this.puzzle
        ) {

            console.error(
                "Puzzle Engine: No Active Puzzle"
            );

            return false;

        }


        const handler =
            PuzzleTypeRegistry.get(
                this.puzzle.type
            );


        if (
            !handler
        ) {

            console.error(
                "Puzzle Engine: Check Handler Not Found:",
                this.puzzle.type
            );

            return false;

        }


        if (
            typeof handler.check !==
            "function"
        ) {

            console.error(
                "Puzzle Engine: Invalid Check Handler:",
                this.puzzle.type
            );

            return false;

        }


        return handler.check(
            this
        );

    },


    // =====================================
    // WRONG ANSWER
    // =====================================

    emitWrong: function () {

        EventManager.emit(
            "puzzleWrong",
            this.getState()
        );

    },


    // =====================================
    // STARTED
    // =====================================

    emitStarted: function () {

        EventManager.emit(
            "puzzleStarted",
            this.puzzle
        );


        EventManager.emit(
            "activityPlaying"
        );

    },


    // =====================================
    // FINISH
    // =====================================

    finish: function () {

        if (
            this.state.isFinished
        ) {

            return;

        }


        this.state.isFinished =
            true;


        const result =
            this.buildResult();


        console.log(
            "Puzzle Finished:",
            result
        );


        EventManager.emit(
            "puzzleFinished",
            result
        );


        EventManager.emit(
            "activityFinished",
            result
        );

    },


    // =====================================
    // RESULT
    // =====================================

    buildResult: function () {

        const settings =

            this.activity
            &&
            this.activity.settings

                ?

                this.activity.settings

                :

                {};


        const scorePerCorrect =
            settings.scorePerCorrect ||
            10;


        const completed =
            this.state.isFinished;


        return {

            activityId:
                this.activity
                    ? this.activity.id
                    : null,

            score:
                completed
                    ? scorePerCorrect
                    : 0,

            percentage:
                completed
                    ? 100
                    : 0,

            stars:
                completed
                    ? 5
                    : 0,

            completed:
                completed,

            moves:
                this.moves

        };

    },


    // =====================================
    // RESET
    // =====================================

    reset: function () {

        this.state.started =
            false;


        this.state.isFinished =
            false;


        this.activity =
            null;


        this.puzzle =
            null;


        this.items =
            [];


        this.userAnswer =
            null;


        this.moves =
            0;


        console.log(
            "Puzzle Engine Reset"
        );

    },


    // =====================================
    // BUILD CORRECT ORDER
    // =====================================

    buildCorrectOrder: function (
        items,
        order
    ) {

        const copy =
            Array.isArray(
                items
            )
                ? [
                    ...items
                ]
                : [];


        if (
            order ===
            "descending"
        ) {

            return copy.sort(
                function (
                    a,
                    b
                ) {

                    return b - a;

                }
            );

        }


        if (
            this.detectDataType(
                copy
            ) ===
            "number"
        ) {

            return copy.sort(
                function (
                    a,
                    b
                ) {

                    return a - b;

                }
            );

        }


        return copy.sort();

    },


    // =====================================
    // DATA TYPE
    // =====================================

    detectDataType: function (
        items
    ) {

        if (
            !Array.isArray(
                items
            )
        ) {

            return "text";

        }


        if (
            items.length ===
            0
        ) {

            return "text";

        }


        if (
            items.every(
                function (
                    item
                ) {

                    return (

                        typeof item ===
                        "string"

                        &&

                        (

                            /\.(png|jpg|jpeg|gif|webp|svg)$/i
                                .test(
                                    item
                                )

                            ||

                            item.startsWith(
                                "data:image/"
                            )

                        )

                    );

                }
            )
        ) {

            return "image";

        }


        if (
            items.every(
                function (
                    item
                ) {

                    return (
                        typeof item ===
                        "number"
                    );

                }
            )
        ) {

            return "number";

        }


        return "text";

    },


    // =====================================
    // VALUES EQUAL
    // =====================================

    valuesEqual: function (
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
                a === b
            );

        }


        const numberA =
            Number(
                a
            );


        const numberB =
            Number(
                b
            );


        if (

            !Number.isNaN(
                numberA
            )
            &&
            !Number.isNaN(
                numberB
            )

        ) {

            return (
                numberA ===
                numberB
            );

        }


        return (
            String(a) ===
            String(b)
        );

    },


    // =====================================
    // ARRAYS EQUAL
    // =====================================

    areArraysEqual: function (
        a,
        b
    ) {

        if (
            !Array.isArray(a)
            ||
            !Array.isArray(b)
        ) {

            return false;

        }


        if (
            a.length !==
            b.length
        ) {

            return false;

        }


        for (
            let i = 0;

            i < a.length;

            i++
        ) {

            if (
                !this.valuesEqual(
                    a[i],
                    b[i]
                )
            ) {

                return false;

            }

        }


        return true;

    },


    // =====================================
    // SHUFFLE
    // =====================================

    shuffle: function (
        array
    ) {

        if (
            !Array.isArray(
                array
            )
        ) {

            return [];

        }


        const list =
            [
                ...array
            ];


        for (
            let i =
                list.length - 1;

            i > 0;

            i--
        ) {

            const j =
                Math.floor(
                    Math.random()
                    *
                    (
                        i + 1
                    )
                );


            const temp =
                list[i];


            list[i] =
                list[j];


            list[j] =
                temp;

        }


        return list;

    },


    // =====================================
    // LOG ORDERING
    // =====================================

    logOrdering: function () {

        if (
            !this.puzzle
        ) {

            return;

        }


        console.log(
            "Puzzle Data Type:",
            this.puzzle.dataType
        );


        console.log(
            "Puzzle Items:",
            this.items
        );


        console.log(
            "Correct Order:",
            this.puzzle.correctOrder
        );

    },


    // =====================================
    // LOG SEQUENCE
    // =====================================

    logSequence: function () {

        if (
            !this.puzzle
        ) {

            return;

        }


        console.log(
            "Sequence Data Type:",
            this.puzzle.dataType
        );


        console.log(
            "Sequence Items:",
            this.items
        );


        console.log(
            "Sequence Pattern:",
            this.puzzle.pattern
        );


        console.log(
            "Sequence Missing Index:",
            this.puzzle.missingIndex
        );


        if (
            this.puzzle.step !==
            null
        ) {

            console.log(
                "Sequence Step:",
                this.puzzle.step
            );

        }


        if (
            this.puzzle.multiplier !==
            null
        ) {

            console.log(
                "Sequence Multiplier:",
                this.puzzle.multiplier
            );

        }

    }

};


// =====================================
// GLOBAL
// =====================================

window.PuzzleEngine =
    PuzzleEngine;


// =====================================
// READY
// =====================================

console.log(
    "Puzzle Engine v2.3 Ready"
);