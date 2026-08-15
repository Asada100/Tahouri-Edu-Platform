// =====================================
// Tahouri Edu Platform
// Puzzle Engine
// Version 1.5
// Execution Only
// QuestionProvider Integration
//
// Supports:
// - ordering
// - sequence
// - visualMath
//
// Content generation is handled by:
// QuestionProvider v4.0
// =====================================


const PuzzleEngine = {

    // =====================================
    // STATE
    // =====================================

    state: {

        started: false,

        isFinished: false

    },


    // =====================================
    // CURRENT ACTIVITY
    // =====================================

    activity: null,


    // =====================================
    // CURRENT PUZZLE
    // =====================================

    puzzle: null,


    // =====================================
    // CURRENT ITEMS
    // =====================================

    items: [],


    // =====================================
    // USER ANSWER
    // =====================================

    userAnswer: null,


    // =====================================
    // MOVES
    // =====================================

    moves: 0,


    // =====================================
    // START
    // =====================================

    start: async function(activityData) {

        if (!activityData) {

            console.error(
                "Puzzle Engine: Activity Data Missing"
            );

            return null;

        }


        // =================================
        // Reset Current Puzzle State
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
        // QuestionProvider Check
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
        // Prepare Activity
        // =================================
        //
        // Backward compatibility:
        // If puzzle contains fixed data but
        // has no source, treat it as file.
        // =================================

        const providerActivity =
            this.prepareProviderActivity(
                activityData
            );


        // =================================
        // Get Puzzle Content
        // =================================

        let puzzleQuestions = [];


        try {

            puzzleQuestions =
                await QuestionProvider.getPuzzleQuestions(
                    providerActivity
                );

        }

        catch (error) {

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
            ) ||

            puzzleQuestions.length === 0

        ) {

            console.error(
                "Puzzle Engine: No Puzzle Content Available"
            );

            this.state.started =
                false;

            return null;

        }


        // =================================
        // Current Puzzle
        // =================================

        const puzzle =
            puzzleQuestions[0];


        if (!puzzle) {

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
        // Select Puzzle Type
        // =================================

        if (
            puzzle.type ===
            "ordering"
        ) {

            return this.startOrdering(
                puzzle
            );

        }


        if (
            puzzle.type ===
            "sequence"
        ) {

            return this.startSequence(
                puzzle
            );

        }


        if (
            puzzle.type ===
            "visualMath"
        ) {

            return this.startVisualMath(
                puzzle
            );

        }


        console.error(
            "Puzzle Engine: Unsupported Puzzle Type:",
            puzzle.type
        );


        this.state.started =
            false;


        return null;

    },


    // =====================================
    // PREPARE PROVIDER ACTIVITY
    // =====================================

    prepareProviderActivity: function(
        activityData
    ) {

        const puzzle =
            activityData.puzzle ||
            {};

        const settings =
            activityData.settings ||
            {};


        const hasExplicitSource =
            puzzle.source !== undefined ||

            settings.questionSource !== undefined;


        // ---------------------------------
        // Already Explicit
        // ---------------------------------

        if (
            hasExplicitSource
        ) {

            return activityData;

        }


        // ---------------------------------
        // Fixed Puzzle Data
        // ---------------------------------
        //
        // Existing activities often have
        // items directly inside puzzle.
        // Preserve their old behavior.
        // ---------------------------------

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


        // ---------------------------------
        // Generated Puzzle
        // ---------------------------------

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
    // ORDERING
    // =====================================

    startOrdering: function(
        puzzleData
    ) {

        const items =
            Array.isArray(
                puzzleData.items
            )
                ? [...puzzleData.items]
                : [];


        if (
            items.length === 0
        ) {

            console.error(
                "Puzzle Engine: Ordering Items Missing"
            );

            return null;

        }


        const correctOrder =
            Array.isArray(
                puzzleData.correctOrder
            )
                ? [...puzzleData.correctOrder]
                : this.buildCorrectOrder(
                    items,
                    puzzleData.order
                );


        if (
            correctOrder.length === 0
        ) {

            console.error(
                "Puzzle Engine: Correct Order Missing"
            );

            return null;

        }


        this.puzzle = {

            type:
                "ordering",

            dataType:
                puzzleData.dataType ||
                this.detectDataType(
                    items
                ),

            source:
                puzzleData.source ||
                "file",

            instruction:
                puzzleData.instruction ||
                "موارد را به ترتیب درست قرار بده",

            items:
                [...items],

            correctOrder:
                [...correctOrder]

        };


        this.items =
            this.shuffle(
                items
            );


        this.logOrdering();


        this.emitStarted();


        return this.getState();

    },


    // =====================================
    // SEQUENCE
    // =====================================

    startSequence: function(
        puzzleData
    ) {

        const items =
            Array.isArray(
                puzzleData.items
            )
                ? [...puzzleData.items]
                : [];


        const missingIndex =
            Number.isInteger(
                puzzleData.missingIndex
            )
                ? puzzleData.missingIndex
                : -1;


        const answer =
            puzzleData.answer;


        if (
            items.length === 0
        ) {

            console.error(
                "Puzzle Engine: Sequence Items Missing"
            );

            return null;

        }


        if (
            missingIndex < 0 ||

            missingIndex >=
            items.length

        ) {

            console.error(
                "Puzzle Engine: Invalid Missing Index"
            );

            return null;

        }


        if (
            answer === undefined ||

            answer === null

        ) {

            console.error(
                "Puzzle Engine: Sequence Answer Missing"
            );

            return null;

        }


        this.puzzle = {

            type:
                "sequence",

            dataType:
                puzzleData.dataType ||
                this.detectDataType(
                    items
                ),

            source:
                puzzleData.source ||
                "file",

            instruction:
                puzzleData.instruction ||
                "عضو بعدی الگو را پیدا کن",

            items:
                [...items],

            missingIndex:
                missingIndex,

            answer:
                answer,

            pattern:
                puzzleData.pattern ||
                null,

            step:
                puzzleData.step !== undefined
                    ? puzzleData.step
                    : null,

            multiplier:
                puzzleData.multiplier !== undefined
                    ? puzzleData.multiplier
                    : null

        };


        this.items =
            [...items];


        this.items[
            missingIndex
        ] = null;


        this.logSequence();


        this.emitStarted();


        return this.getState();

    },


    // =====================================
    // VISUAL MATH
    // =====================================

    startVisualMath: function(
        puzzleData
    ) {

        const operation =
            puzzleData.operation ||
            "addition";


        if (
            operation !==
            "addition"
        ) {

            console.error(
                "Puzzle Engine: Unsupported Visual Math Operation:",
                operation
            );

            return null;

        }


        const items =
            Array.isArray(
                puzzleData.items
            )
                ? puzzleData.items
                : [];


        if (
            items.length !== 2
        ) {

            console.error(
                "Puzzle Engine: Visual Math Requires Two Groups"
            );

            return null;

        }


        const normalizedItems =
            items.map(
                function(item) {

                    return {

                        image:
                            item.image,

                        count:
                            Number(
                                item.count
                            )

                    };

                }
            );


        const validItems =
            normalizedItems.every(
                function(item) {

                    return (

                        typeof item.image ===
                        "string"

                        &&

                        Number.isInteger(
                            item.count
                        )

                        &&

                        item.count > 0

                    );

                }
            );


        if (
            !validItems
        ) {

            console.error(
                "Puzzle Engine: Invalid Visual Math Items"
            );

            return null;

        }


        this.puzzle = {

            type:
                "visualMath",

            dataType:
                "image",

            source:
                puzzleData.source ||
                "file",

            instruction:
                puzzleData.instruction ||
                "با شمردن شکل‌ها پاسخ را پیدا کن",

            operation:
                operation,

            items:
                normalizedItems,

            answer:
                Number(
                    puzzleData.answer
                )

        };


        if (
            !Number.isFinite(
                this.puzzle.answer
            )
        ) {

            console.error(
                "Puzzle Engine: Visual Math Answer Missing"
            );

            return null;

        }


        this.items =
            normalizedItems.map(
                function(item) {

                    return {

                        image:
                            item.image,

                        count:
                            item.count

                    };

                }
            );


        console.log(
            "Visual Math Operation:",
            this.puzzle.operation
        );


        console.log(
            "Visual Math Items:",
            this.puzzle.items
        );


        console.log(
            "Visual Math Answer Ready"
        );


        this.emitStarted();


        return this.getState();

    },


    // =====================================
    // STATE
    // =====================================

    getState: function() {

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

                answer:
                    null,

                pattern:
                    null,

                step:
                    null,

                multiplier:
                    null,

                operation:
                    null,

                moves:
                    this.moves,

                finished:
                    this.state.isFinished

            };

        }


        if (
            this.puzzle.type ===
            "sequence"
        ) {

            return {

                type:
                    "sequence",

                dataType:
                    this.puzzle.dataType,

                source:
                    this.puzzle.source,

                instruction:
                    this.puzzle.instruction,

                items:
                    [...this.items],

                missingIndex:
                    this.puzzle.missingIndex,

                answer:
                    this.puzzle.answer,

                pattern:
                    this.puzzle.pattern,

                step:
                    this.puzzle.step,

                multiplier:
                    this.puzzle.multiplier,

                moves:
                    this.moves,

                finished:
                    this.state.isFinished

            };

        }


        if (
            this.puzzle.type ===
            "visualMath"
        ) {

            return {

                type:
                    "visualMath",

                dataType:
                    "image",

                source:
                    this.puzzle.source,

                instruction:
                    this.puzzle.instruction,

                operation:
                    this.puzzle.operation,

                items:
                    [...this.items],

                answer:
                    this.puzzle.answer,

                moves:
                    this.moves,

                finished:
                    this.state.isFinished

            };

        }


        return {

            type:
                this.puzzle.type,

            dataType:
                this.puzzle.dataType,

            source:
                this.puzzle.source,

            instruction:
                this.puzzle.instruction,

            items:
                [...this.items],

            correctOrder:
                [...this.puzzle.correctOrder],

            moves:
                this.moves,

            finished:
                this.state.isFinished

        };

    },


    // =====================================
    // ORDER UPDATE
    // =====================================

    setOrder: function(
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
            [...newOrder];


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

    setSequenceAnswer: function(
        value
    ) {

        if (
            !this.puzzle ||

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

    setVisualMathAnswer: function(
        value
    ) {

        if (
            !this.puzzle ||

            this.puzzle.type !==
            "visualMath"

        ) {

            console.error(
                "Puzzle Engine: No Active Visual Math Puzzle"
            );

            return false;

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
    // CHECK
    // =====================================

    check: function() {

        if (
            !this.puzzle
        ) {

            console.error(
                "Puzzle Engine: No Active Puzzle"
            );

            return false;

        }


        if (
            this.puzzle.type ===
            "ordering"
        ) {

            return this.checkOrdering();

        }


        if (
            this.puzzle.type ===
            "sequence"
        ) {

            return this.checkSequence();

        }


        if (
            this.puzzle.type ===
            "visualMath"
        ) {

            return this.checkVisualMath();

        }


        return false;

    },


    // =====================================
    // CHECK ORDERING
    // =====================================

    checkOrdering: function() {

        const correct =
            this.areArraysEqual(

                this.items,

                this.puzzle.correctOrder

            );


        if (
            correct
        ) {

            console.log(
                "Puzzle Correct"
            );


            this.finish();


            return true;

        }


        console.log(
            "Puzzle Wrong"
        );


        EventManager.emit(
            "puzzleWrong",
            this.getState()
        );


        return false;

    },


    // =====================================
    // CHECK SEQUENCE
    // =====================================

    checkSequence: function() {

        const value =
            this.items[
                this.puzzle.missingIndex
            ];


        const correct =
            this.valuesEqual(

                value,

                this.puzzle.answer

            );


        if (
            correct
        ) {

            console.log(
                "Sequence Correct"
            );


            this.finish();


            return true;

        }


        console.log(
            "Sequence Wrong"
        );


        EventManager.emit(
            "puzzleWrong",
            this.getState()
        );


        return false;

    },


    // =====================================
    // CHECK VISUAL MATH
    // =====================================

    checkVisualMath: function() {

        const correct =
            this.valuesEqual(

                this.userAnswer,

                this.puzzle.answer

            );


        if (
            correct
        ) {

            console.log(
                "Visual Math Correct"
            );


            this.finish();


            return true;

        }


        console.log(
            "Visual Math Wrong"
        );


        EventManager.emit(
            "puzzleWrong",
            this.getState()
        );


        return false;

    },


    // =====================================
    // FINISH
    // =====================================

    finish: function() {

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

    buildResult: function() {

        const settings =
            this.activity &&
            this.activity.settings

                ? this.activity.settings

                : {};


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

    reset: function() {

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
    // UTILITIES
    // =====================================

    buildCorrectOrder: function(
        items,
        order
    ) {

        const copy =
            [...items];


        if (
            order ===
            "descending"
        ) {

            return copy.sort(
                function(a, b) {

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
                function(a, b) {

                    return a - b;

                }
            );

        }


        return copy.sort();

    },


    detectDataType: function(
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
            items.length === 0
        ) {

            return "text";

        }


        if (
            items.every(
                function(item) {

                    return (

                        typeof item ===
                        "string"

                        &&

                        (
                            /\.(png|jpg|jpeg|gif|webp|svg)$/i
                                .test(item)

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
                function(item) {

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


    valuesEqual: function(
        a,
        b
    ) {

        if (
            a === null ||
            a === undefined ||
            b === null ||
            b === undefined
        ) {

            return (
                a === b
            );

        }


        const numberA =
            Number(a);


        const numberB =
            Number(b);


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


    areArraysEqual: function(
        a,
        b
    ) {

        if (
            !Array.isArray(a) ||

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


    logOrdering: function() {

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


    logSequence: function() {

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

    },


    emitStarted: function() {

        EventManager.emit(
            "puzzleStarted",
            this.puzzle
        );


        EventManager.emit(
            "activityPlaying"
        );

    },


    // =====================================
    // SHUFFLE
    // =====================================

    shuffle: function(
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
            [...array];


        for (
            let i =
                list.length - 1;

            i > 0;

            i--

        ) {

            const j =
                Math.floor(

                    Math.random()
                    * (
                        i + 1
                    )

                );


            [

                list[i],

                list[j]

            ] = [

                list[j],

                list[i]

            ];

        }


        return list;

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
    "Puzzle Engine v1.5 Ready"
);