// =====================================
// Tahouri Edu Platform
// Version 1.2
// Puzzle Engine
// Universal Puzzle System
// Types:
// - ordering
// - sequence
// =====================================


const PuzzleEngine = {

    // =====================================
    // State
    // =====================================

    state: {

        started: false,

        isFinished: false

    },


    // =====================================
    // Activity
    // =====================================

    activity: null,


    // =====================================
    // Puzzle Data
    // =====================================

    puzzle: null,


    // =====================================
    // Current Items
    // =====================================

    items: [],


    // =====================================
    // Moves
    // =====================================

    moves: 0,


    // =====================================
    // Start
    // =====================================

    start: function(activityData) {

        console.log(
            "Puzzle Engine Activity:",
            activityData
        );


        if (!activityData) {

            console.error(
                "Puzzle Engine: Activity Data Missing"
            );

            return null;

        }


        this.activity =
            activityData;


        this.state.started =
            true;


        this.state.isFinished =
            false;


        this.moves =
            0;


        const settings =
            activityData.settings || {};


        const puzzleData =
            activityData.puzzle || {};


        const puzzleType =
            puzzleData.type ||

            settings.puzzleType ||

            "ordering";


        console.log(
            "Puzzle Type:",
            puzzleType
        );


        // =================================
        // Ordering
        // =================================

        if (
            puzzleType === "ordering"
        ) {

            return this.startOrderingPuzzle(
                activityData
            );

        }


        // =================================
        // Sequence
        // =================================

        if (
            puzzleType === "sequence"
        ) {

            return this.startSequencePuzzle(
                activityData
            );

        }


        console.warn(
            "Unknown Puzzle Type:",
            puzzleType
        );


        return null;

    },


    // =====================================
    // Ordering Puzzle
    // =====================================

    startOrderingPuzzle: function(
        activityData
    ) {

        const puzzleData =
            activityData.puzzle || {};


        const items =
            Array.isArray(
                puzzleData.items
            )
            ?
            [...puzzleData.items]
            :
            [];


        const correctOrder =
            Array.isArray(
                puzzleData.correctOrder
            )
            ?
            [...puzzleData.correctOrder]
            :
            this.buildCorrectOrder(
                items,
                puzzleData.order
            );


        if (
            items.length === 0
        ) {

            console.error(
                "Puzzle Engine: No Puzzle Items"
            );

            return null;

        }


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


        console.log(
            "Puzzle Items:",
            this.items
        );


        console.log(
            "Correct Order:",
            this.puzzle.correctOrder
        );


        EventManager.emit(
            "puzzleStarted",
            this.puzzle
        );


        EventManager.emit(
            "activityPlaying"
        );


        return this.getState();

    },


    // =====================================
    // Sequence Puzzle
    // =====================================

    startSequencePuzzle: function(
        activityData
    ) {

        const puzzleData =
            activityData.puzzle || {};


        let sequenceData =
            null;


        // =================================
        // Generated Sequence
        // =================================

        if (
            puzzleData.source ===
            "generated"
        ) {

            sequenceData =
                this.generateRandomSequence({

                    pattern:
                        puzzleData.pattern,

                    length:
                        puzzleData.length,

                    start:
                        puzzleData.start,

                    step:
                        puzzleData.step,

                    stepMin:
                        puzzleData.stepMin,

                    stepMax:
                        puzzleData.stepMax,

                    multiplier:
                        puzzleData.multiplier,

                    multiplierMin:
                        puzzleData.multiplierMin,

                    multiplierMax:
                        puzzleData.multiplierMax,

                    instruction:
                        puzzleData.instruction

                });

        }


        const data =
            sequenceData ||
            puzzleData;


        const items =
            Array.isArray(
                data.items
            )
            ?
            [...data.items]
            :
            [];


        const missingIndex =
            Number.isInteger(
                data.missingIndex
            )
            ?
            data.missingIndex
            :
            -1;


        const answer =
            data.answer;


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
            missingIndex >= items.length
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

            source:
                puzzleData.source ||
                "file",

            instruction:
                data.instruction ||

                "عضو بعدی الگو را پیدا کن",

            items:
                [...items],

            missingIndex:
                missingIndex,

            answer:
                answer,

            pattern:
                data.pattern ||
                null,

            step:
                data.step !== undefined
                ?
                data.step
                :
                null,

            multiplier:
                data.multiplier !== undefined
                ?
                data.multiplier
                :
                null

        };


        // =================================
        // Hide Answer
        // =================================

        this.items =
            [...items];


        this.items[
            missingIndex
        ] = null;


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
            missingIndex
        );


        if (
            this.puzzle.step !== null
        ) {

            console.log(
                "Sequence Step:",
                this.puzzle.step
            );

        }


        if (
            this.puzzle.multiplier !== null
        ) {

            console.log(
                "Sequence Multiplier:",
                this.puzzle.multiplier
            );

        }


        EventManager.emit(
            "puzzleStarted",
            this.puzzle
        );


        EventManager.emit(
            "activityPlaying"
        );


        return this.getState();

    },


    // =====================================
    // Generate Sequence Puzzle
    // =====================================

    generateSequencePuzzle: function(
        options = {}
    ) {

        const length =
            Math.max(
                3,
                Number(options.length) || 4
            );


        const pattern =
            options.pattern ||

            this.randomSequencePattern();


        let start =
            options.start !== undefined
            ?
            Number(options.start)
            :
            this.randomInteger(
                1,
                20
            );


        if (
            !Number.isFinite(start)
        ) {

            start = 1;

        }


        // =================================
        // ADD / SUBTRACT STEP
        // =================================

        const stepMin =
            options.stepMin !== undefined
            ?
            Number(options.stepMin)
            :
            1;


        const stepMax =
            options.stepMax !== undefined
            ?
            Number(options.stepMax)
            :
            10;


        let step =
            options.step !== undefined
            ?
            Number(options.step)
            :
            this.randomInteger(
                Math.max(
                    1,
                    stepMin
                ),
                Math.max(
                    Math.max(
                        1,
                        stepMin
                    ),
                    stepMax
                )
            );


        if (
            !Number.isFinite(step) ||
            step <= 0
        ) {

            step = 1;

        }


        // =================================
        // MULTIPLIER
        // =================================

        const multiplierMin =
            options.multiplierMin !== undefined
            ?
            Number(
                options.multiplierMin
            )
            :
            2;


        const multiplierMax =
            options.multiplierMax !== undefined
            ?
            Number(
                options.multiplierMax
            )
            :
            4;


        let multiplier =
            options.multiplier !== undefined
            ?
            Number(options.multiplier)
            :
            this.randomInteger(
                Math.max(
                    2,
                    multiplierMin
                ),
                Math.max(
                    Math.max(
                        2,
                        multiplierMin
                    ),
                    multiplierMax
                )
            );


        if (
            !Number.isFinite(multiplier) ||
            multiplier < 2
        ) {

            multiplier = 2;

        }


        // =================================
        // Build Items
        // =================================

        const items = [
            start
        ];


        if (
            pattern === "add"
        ) {

            for (

                let i = 1;

                i < length;

                i++

            ) {

                items.push(

                    items[i - 1] +
                    step

                );

            }

        }


        else if (
            pattern === "subtract"
        ) {

            for (

                let i = 1;

                i < length;

                i++

            ) {

                items.push(

                    items[i - 1] -
                    step

                );

            }

        }


        else if (
            pattern === "multiply"
        ) {

            for (

                let i = 1;

                i < length;

                i++

            ) {

                items.push(

                    items[i - 1] *
                    multiplier

                );

            }

        }


        else {

            console.warn(
                "Unknown Sequence Pattern:",
                pattern
            );

            return null;

        }


        return {

            type:
                "sequence",

            source:
                "generated",

            instruction:

                options.instruction ||

                "عضو بعدی الگو را پیدا کن",

            items:
                items,

            missingIndex:
                items.length - 1,

            answer:
                items[
                    items.length - 1
                ],

            pattern:
                pattern,

            step:
                (
                    pattern === "multiply"
                    ?
                    null
                    :
                    step
                ),

            multiplier:
                (
                    pattern === "multiply"
                    ?
                    multiplier
                    :
                    null
                )

        };

    },


    // =====================================
    // Generate Random Sequence
    // =====================================

    generateRandomSequence: function(
        options = {}
    ) {

        const pattern =
            options.pattern ||

            this.randomSequencePattern();


        return this.generateSequencePuzzle({

            ...options,

            pattern:
                pattern

        });

    },


    // =====================================
    // Random Sequence Pattern
    // =====================================

    randomSequencePattern: function() {

        const patterns = [

            "add",

            "subtract",

            "multiply"

        ];


        return patterns[
            this.randomInteger(
                0,
                patterns.length - 1
            )
        ];

    },


    // =====================================
    // Build Correct Order
    // =====================================

    buildCorrectOrder: function(
        items,
        order
    ) {

        const copy =
            [...items];


        if (
            order === "descending"
        ) {

            return copy.sort(
                function(a, b) {

                    return b - a;

                }
            );

        }


        return copy.sort(
            function(a, b) {

                return a - b;

            }
        );

    },


    // =====================================
    // Get State
    // =====================================

    getState: function() {

        if (
            !this.puzzle
        ) {

            return {

                type:
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


        return {

            type:
                this.puzzle.type,

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
    // Set Order
    // =====================================

    setOrder: function(
        newOrder
    ) {

        if (
            !Array.isArray(newOrder)
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
    // Set Sequence Answer
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
    // Check Puzzle
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


        // =================================
        // Ordering
        // =================================

        if (
            this.puzzle.type ===
            "ordering"
        ) {

            return this.checkOrdering();

        }


        // =================================
        // Sequence
        // =================================

        if (
            this.puzzle.type ===
            "sequence"
        ) {

            return this.checkSequence();

        }


        return false;

    },


    // =====================================
    // Check Ordering
    // =====================================

    checkOrdering: function() {

        const correct =
            this.areArraysEqual(

                this.items,

                this.puzzle.correctOrder

            );


        if (correct) {

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
    // Check Sequence
    // =====================================

    checkSequence: function() {

        const currentValue =
            this.items[
                this.puzzle.missingIndex
            ];


        const correct =
            this.valuesEqual(

                currentValue,

                this.puzzle.answer

            );


        if (correct) {

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
    // Value Compare
    // =====================================

    valuesEqual: function(
        a,
        b
    ) {

        const numberA =
            Number(a);


        const numberB =
            Number(b);


        if (
            !Number.isNaN(numberA) &&
            !Number.isNaN(numberB)
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
    // Finish
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
    // Result
    // =====================================

    buildResult: function() {

        const settings =

            this.activity &&
            this.activity.settings

            ?

            this.activity.settings

            :

            {};


        const scorePerCorrect =

            settings.scorePerCorrect ||

            10;


        const score =

            this.state.isFinished

            ?

            scorePerCorrect

            :

            0;


        const percentage =

            score > 0

            ?

            100

            :

            0;


        return {

            activityId:

                this.activity
                ?
                this.activity.id
                :
                null,

            score:
                score,

            percentage:
                percentage,

            stars:
                percentage >= 100
                ?
                5
                :
                0,

            completed:
                this.state.isFinished,

            moves:
                this.moves

        };

    },


    // =====================================
    // Reset
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


        this.moves =
            0;


        console.log(
            "Puzzle Engine Reset"
        );

    },


    // =====================================
    // Array Compare
    // =====================================

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


    // =====================================
    // Random Integer
    // =====================================

    randomInteger: function(
        min,
        max
    ) {

        min =
            Math.ceil(
                Number(min)
            );


        max =
            Math.floor(
                Number(max)
            );


        if (
            !Number.isFinite(min) ||
            !Number.isFinite(max)
        ) {

            return 1;

        }


        if (
            min > max
        ) {

            const temp =
                min;

            min =
                max;

            max =
                temp;

        }


        return Math.floor(

            Math.random() *

            (
                max -
                min +
                1
            )

        ) + min;

    },


    // =====================================
    // Shuffle
    // =====================================

    shuffle: function(
        array
    ) {

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

                    Math.random() *
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

    }

};


// =====================================
// Global
// =====================================

window.PuzzleEngine =
    PuzzleEngine;


// =====================================
// Ready
// =====================================

console.log(
    "Puzzle Engine Ready"
);