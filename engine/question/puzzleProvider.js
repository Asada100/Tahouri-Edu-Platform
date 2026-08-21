// =====================================
// Tahouri Edu Platform
// Puzzle Provider
// Version 2.0
//
// Responsibilities:
// - Puzzle content loading
// - Puzzle generation
// - Puzzle normalization
// - Sequence
// - Ordering
// - Visual Math
// - Input / Output
// - Sentence
// - Grid
// - Word Grid
// - Cross Grid
// - Mixed Puzzle
//
// Architecture:
//
// QuestionProvider
//      ↓
// PuzzleProvider
//      ↓
// PuzzleEngine
//      ↓
// PuzzleTypeRegistry
// =====================================


const PuzzleProvider = {


    // =====================================
    // STATE
    // =====================================

    lastSource:
        null,

    lastQuestions:
        [],


    // =====================================
    // MAIN ENTRY
    // =====================================

    getPuzzleQuestions: async function (
        activityData
    ) {

        if (!activityData) {

            console.error(
                "PuzzleProvider: Puzzle Activity Missing"
            );

            return [];

        }


        const puzzle =
            activityData.puzzle ||
            {};


        const settings =
            activityData.settings ||
            {};


        const source =
            puzzle.source ||
            settings.questionSource ||
            "generated";


        console.log(
            "PuzzleProvider Source:",
            source
        );


        // =================================
        // FILE
        // =================================

        if (
            source === "file"
        ) {

            const result =
                await this.loadPuzzleFromFile(
                    activityData
                );


            this.lastSource =
                "file";


            this.lastQuestions =
                result;


            return result;

        }


        // =================================
        // GENERATED
        // =================================

        if (
            source === "generated"
        ) {

            const result =
                this.generatePuzzleQuestions(
                    activityData
                );


            this.lastSource =
                "generated";


            this.lastQuestions =
                result;


            return result;

        }


        // =================================
        // MIXED
        // =================================

        if (
            source === "mixed"
        ) {

            const result =
                await this.getMixedPuzzleQuestions(
                    activityData
                );


            this.lastSource =
                "mixed";


            this.lastQuestions =
                result;


            return result;

        }


        console.warn(
            "PuzzleProvider: Unknown Puzzle Source:",
            source
        );


        return [];

    },


    // =====================================
    // FILE SOURCE
    // =====================================

    loadPuzzleFromFile: async function (
        activityData
    ) {

        try {

            const puzzle =
                activityData.puzzle ||
                {};


            if (
                Object.keys(
                    puzzle
                ).length === 0
            ) {

                return [];

            }


            return [

                this.normalizePuzzle(
                    puzzle
                )

            ];

        }

        catch (
            error
        ) {

            console.error(
                "PuzzleProvider: Puzzle File Error:",
                error
            );


            return [];

        }

    },


    // =====================================
    // MAIN GENERATOR
    // =====================================

    generatePuzzleQuestions: function (
        activityData
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const settings =
            activityData.settings ||
            {};


        const type =
            puzzle.type ||
            settings.puzzleType ||
            "sequence";


        const count =
            Math.max(

                1,

                Number(
                    settings.questions
                ) || 1

            );


        // =================================
        // SEQUENCE
        // =================================

        if (
            type ===
            "sequence"
        ) {

            return this.generatePuzzleSequences(
                activityData,
                count
            );

        }


        // =================================
        // ORDERING
        // =================================

        if (
            type ===
            "ordering"
        ) {

            return this.generatePuzzleOrdering(
                activityData,
                count
            );

        }


        // =================================
        // VISUAL MATH
        // =================================

        if (
            type ===
            "visualMath"
        ) {

            return this.generateVisualMathQuestions(
                activityData,
                count
            );

        }


        // =================================
        // INPUT / OUTPUT
        // =================================

        if (
            type ===
            "inputOutput"
        ) {

            return this.generateInputOutputQuestions(
                activityData,
                count
            );

        }


        // =================================
        // SENTENCE
        // =================================

        if (
            type ===
            "sentence"
        ) {

            return this.generateSentenceQuestions(
                activityData,
                count
            );

        }


        // =================================
        // GRID
        // =================================

        if (
            type ===
            "grid"
        ) {

            return this.generateGridQuestions(
                activityData,
                count
            );

        }


        // =================================
        // WORD GRID
        // =================================

        if (
            type ===
            "wordGrid"
        ) {

            return this.generateWordGridQuestions(
                activityData,
                count
            );

        }


        // =================================
        // CROSS GRID
        // =================================

        if (
            type ===
            "crossGrid"
        ) {

            return this.generateCrossGridQuestions(
                activityData,
                count
            );

        }


        console.warn(
            "PuzzleProvider: Unknown Puzzle Type:",
            type
        );


        return [];

    },


    // =====================================
    // NORMALIZE
    // =====================================

    normalizePuzzle: function (
        puzzle
    ) {

        const normalized = {

            ...puzzle

        };


        // =================================
        // ORDERING
        // =================================

        if (
            normalized.type ===
            "ordering"
        ) {

            normalized.dataType =
                normalized.dataType ||

                this.detectDataType(
                    normalized.items ||
                    []
                );

        }


        // =================================
        // SEQUENCE
        // =================================

        if (
            normalized.type ===
            "sequence"
        ) {

            normalized.dataType =
                normalized.dataType ||

                this.detectDataType(
                    normalized.items ||
                    []
                );

        }


        // =================================
        // VISUAL MATH
        // =================================

        if (
            normalized.type ===
            "visualMath"
        ) {

            normalized.dataType =
                "image";

        }


        // =================================
        // INPUT / OUTPUT
        // =================================

        if (
            normalized.type ===
            "inputOutput"
        ) {

            normalized.dataType =
                normalized.dataType ||
                "number";

        }


        // =================================
        // SENTENCE
        // =================================

        if (
            normalized.type ===
            "sentence"
        ) {

            normalized.dataType =
                "text";

        }


        // =================================
        // GRID
        // =================================

        if (
            normalized.type ===
            "grid"
        ) {

            normalized.dataType =
                normalized.dataType ||
                "number";

        }


        // =================================
        // WORD GRID
        // =================================

        if (
            normalized.type ===
            "wordGrid"
        ) {

            normalized.dataType =
                "text";

        }


        // =================================
        // CROSS GRID
        // =================================

        if (
            normalized.type ===
            "crossGrid"
        ) {

            normalized.dataType =
                normalized.dataType ||
                "number";

        }


        return normalized;

    },


    // =====================================
    // SEQUENCE
    // =====================================

    generatePuzzleSequences: function (
        activityData,
        count
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const settings =
            activityData.settings ||
            {};


        const result =
            [];


        for (
            let i = 0;
            i < count;
            i++
        ) {

            const generated =
                this.generateSequencePuzzle(
                    puzzle,
                    settings
                );


            if (
                generated
            ) {

                result.push(
                    generated
                );

            }

        }


        console.log(
            "Generated Puzzle Sequences:",
            result.length
        );


        return result;

    },


    generateSequencePuzzle: function (
        puzzle,
        settings
    ) {

        const length =
            Math.max(

                3,

                Number(
                    puzzle.length ||
                    settings.length
                ) || 4

            );


        const pattern =
            puzzle.pattern ||
            this.randomSequencePattern();


        let start =

            puzzle.start !==
            undefined

                ?

                Number(
                    puzzle.start
                )

                :

                this.randomInteger(

                    this.safeMin(
                        puzzle.startMin,
                        1
                    ),

                    this.safeMax(
                        puzzle.startMax,
                        20
                    )

                );


        if (
            !Number.isFinite(
                start
            )
        ) {

            start =
                1;

        }


        let step =

            puzzle.step !==
            undefined

                ?

                Number(
                    puzzle.step
                )

                :

                this.randomInteger(

                    this.safeMin(
                        puzzle.stepMin,
                        1
                    ),

                    this.safeMax(
                        puzzle.stepMax,
                        10
                    )

                );


        if (

            !Number.isFinite(
                step
            )
            ||
            step <= 0

        ) {

            step =
                1;

        }


        let multiplier =

            puzzle.multiplier !==
            undefined

                ?

                Number(
                    puzzle.multiplier
                )

                :

                this.randomInteger(

                    this.safeMin(
                        puzzle.multiplierMin,
                        2
                    ),

                    this.safeMax(
                        puzzle.multiplierMax,
                        4
                    )

                );


        if (

            !Number.isFinite(
                multiplier
            )
            ||
            multiplier < 2

        ) {

            multiplier =
                2;

        }


        const items =
            [start];


        for (
            let i = 1;
            i < length;
            i++
        ) {

            const previous =
                items[
                    i - 1
                ];


            if (
                pattern ===
                "add"
            ) {

                items.push(
                    previous +
                    step
                );


                continue;

            }


            if (
                pattern ===
                "subtract"
            ) {

                items.push(
                    previous -
                    step
                );


                continue;

            }


            if (
                pattern ===
                "multiply"
            ) {

                items.push(
                    previous *
                    multiplier
                );


                continue;

            }


            console.warn(
                "PuzzleProvider: Unknown Sequence Pattern:",
                pattern
            );


            return null;

        }


        return {

            type:
                "sequence",

            source:
                "generated",

            dataType:
                "number",

            instruction:
                puzzle.instruction ||
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
                pattern ===
                "multiply"
                    ? null
                    : step,

            multiplier:
                pattern ===
                "multiply"
                    ? multiplier
                    : null

        };

    },


    // =====================================
    // ORDERING
    // =====================================

    generatePuzzleOrdering: function (
        activityData,
        count
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const items =
            Array.isArray(
                puzzle.items
            )
                ? [
                    ...puzzle.items
                ]
                : [];


        if (
            items.length ===
            0
        ) {

            console.warn(
                "PuzzleProvider: Ordering Items Missing"
            );


            return [];

        }


        const result =
            [];


        for (
            let i = 0;
            i < count;
            i++
        ) {

            const shuffled =
                this.shuffle(
                    items
                );


            const correctOrder =

                Array.isArray(
                    puzzle.correctOrder
                )

                    ?

                    [
                        ...puzzle.correctOrder
                    ]

                    :

                    this.buildCorrectOrder(
                        items,
                        puzzle.order
                    );


            result.push({

                type:
                    "ordering",

                source:
                    "generated",

                dataType:

                    puzzle.dataType ||

                    this.detectDataType(
                        items
                    ),

                instruction:

                    puzzle.instruction ||

                    "موارد را به ترتیب درست قرار بده",

                items:
                    shuffled,

                correctOrder:
                    correctOrder

            });

        }


        console.log(
            "Generated Puzzle Ordering:",
            result.length
        );


        return result;

    },


    // =====================================
    // VISUAL MATH
    // =====================================

    generateVisualMathQuestions: function (
        activityData,
        count
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const settings =
            activityData.settings ||
            {};


        const operation =
            puzzle.operation ||
            settings.operation ||
            "addition";


        if (

            operation !==
            "addition"

            &&

            operation !==
            "subtraction"

            &&

            operation !==
            "counting"

            &&

            operation !==
            "comparison"

        ) {

            console.warn(
                "PuzzleProvider: Unsupported Visual Math Operation:",
                operation
            );


            return [];

        }


        const image =
            puzzle.image ||
            settings.image ||
            "assets/images/green_frog.jpg";


        const minCount =
            Math.max(

                1,

                Number(
                    puzzle.minCount
                ) || 1

            );


        const maxCount =
            Math.max(

                minCount,

                Number(
                    puzzle.maxCount
                ) || 5

            );


        const result =
            [];


        for (
            let i = 0;
            i < count;
            i++
        ) {

            if (
                operation ===
                "counting"
            ) {

                const itemCount =
                    this.randomInteger(
                        minCount,
                        maxCount
                    );


                result.push({

                    type:
                        "visualMath",

                    source:
                        "generated",

                    dataType:
                        "image",

                    operation:
                        "counting",

                    instruction:

                        puzzle.instruction ||

                        "شکل‌ها را بشمار",

                    items: [

                        {

                            image:
                                image,

                            count:
                                itemCount

                        }

                    ],

                    answer:
                        itemCount

                });


                continue;

            }


            if (
                operation ===
                "comparison"
            ) {

                const firstCount =
                    this.randomInteger(
                        minCount,
                        maxCount
                    );


                const secondCount =
                    this.randomInteger(
                        minCount,
                        maxCount
                    );


                let comparison;


                if (
                    firstCount >
                    secondCount
                ) {

                    comparison =
                        "more";

                }

                else if (
                    firstCount <
                    secondCount
                ) {

                    comparison =
                        "less";

                }

                else {

                    comparison =
                        "equal";

                }


                const answer =

                    comparison ===
                    "more"

                        ?

                        "left"

                        :

                    comparison ===
                    "less"

                        ?

                        "right"

                        :

                        "equal";


                result.push({

                    type:
                        "visualMath",

                    source:
                        "generated",

                    dataType:
                        "image",

                    operation:
                        "comparison",

                    instruction:

                        puzzle.instruction ||

                        "کدام گروه بیشتر است؟",

                    comparison:
                        comparison,

                    items: [

                        {

                            image:
                                image,

                            count:
                                firstCount

                        },

                        {

                            image:
                                image,

                            count:
                                secondCount

                        }

                    ],

                    answer:
                        answer

                });


                continue;

            }


            let firstCount =
                this.randomInteger(
                    minCount,
                    maxCount
                );


            let secondCount =
                this.randomInteger(
                    minCount,
                    maxCount
                );


            if (
                operation ===
                "subtraction"
            ) {

                if (
                    secondCount >
                    firstCount
                ) {

                    const temp =
                        firstCount;


                    firstCount =
                        secondCount;


                    secondCount =
                        temp;

                }

            }


            const answer =

                operation ===
                "addition"

                    ?

                    firstCount +
                    secondCount

                    :

                    firstCount -
                    secondCount;


            const instruction =

                puzzle.instruction ||

                (

                    operation ===
                    "addition"

                        ?

                        "شکل‌ها را بشمار و حاصل جمع را پیدا کن"

                        :

                        "شکل‌ها را بشمار و حاصل تفریق را پیدا کن"

                );


            result.push({

                type:
                    "visualMath",

                source:
                    "generated",

                dataType:
                    "image",

                operation:
                    operation,

                instruction:
                    instruction,

                items: [

                    {

                        image:
                            image,

                        count:
                            firstCount

                    },

                    {

                        image:
                            image,

                        count:
                            secondCount

                    }

                ],

                answer:
                    answer

            });

        }


        console.log(
            "Generated Visual Math Questions:",
            result.length
        );


        console.log(
            "Visual Math Operation:",
            operation
        );


        return result;

    },


    // =====================================
    // INPUT / OUTPUT
    // =====================================

    generateInputOutputQuestions: function (
        activityData,
        count
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const settings =
            activityData.settings ||
            {};


        const result =
            [];


        // =================================
        // FIXED INPUTS / OUTPUTS
        // =================================

        const hasFixedData =

            Array.isArray(
                puzzle.inputs
            )
            &&
            Array.isArray(
                puzzle.outputs
            );


        if (
            hasFixedData
        ) {

            for (
                let i = 0;
                i < count;
                i++
            ) {

                const inputs =
                    [
                        ...puzzle.inputs
                    ];


                const outputs =
                    [
                        ...puzzle.outputs
                    ];


                const missingIndex =
                    this.findMissingIndex(
                        outputs
                    );


                if (
                    missingIndex < 0
                ) {

                    console.warn(
                        "PuzzleProvider: Input Output Missing Value Not Found"
                    );

                    break;

                }


                let answer =
                    puzzle.answer;


                if (
                    answer ===
                    undefined
                ) {

                    answer =
                        this.calculateInputOutputAnswer(
                            inputs[
                                missingIndex
                            ],
                            puzzle.rule
                        );

                }


                result.push({

                    type:
                        "inputOutput",

                    source:
                        "generated",

                    dataType:
                        "number",

                    instruction:

                        puzzle.instruction ||

                        "خروجی ماشین را پیدا کن",

                    inputs:
                        inputs,

                    outputs:
                        outputs,

                    missingIndex:
                        missingIndex,

                    rule:
                        puzzle.rule ||
                        null,

                    answer:
                        answer

                });

            }


            console.log(
                "Generated Input Output Questions:",
                result.length
            );


            return result;

        }


        // =================================
        // GENERATED RULE
        // =================================

        const generatedRule =
            puzzle.rule ||
            this.generateInputOutputRule(
                settings
            );


        const generatedCount =
            Math.max(
                3,
                Number(
                    puzzle.rows ||
                    settings.rows
                ) || 4
            );


        for (
            let q = 0;
            q < count;
            q++
        ) {

            const inputs = [];


            const outputs = [];


            for (
                let i = 0;
                i < generatedCount;
                i++
            ) {

                const input =
                    this.randomInteger(
                        Number(
                            puzzle.minInput
                        ) || 1,
                        Number(
                            puzzle.maxInput
                        ) || 20
                    );


                const output =
                    this.calculateInputOutputAnswer(
                        input,
                        generatedRule
                    );


                inputs.push(
                    input
                );


                outputs.push(
                    output
                );

            }


            const missingIndex =
                this.randomInteger(
                    0,
                    outputs.length - 1
                );


            const answer =
                outputs[
                    missingIndex
                ];


            outputs[
                missingIndex
            ] =
                null;


            result.push({

                type:
                    "inputOutput",

                source:
                    "generated",

                dataType:
                    "number",

                instruction:

                    puzzle.instruction ||

                    "خروجی ماشین را پیدا کن",

                inputs:
                    inputs,

                outputs:
                    outputs,

                missingIndex:
                    missingIndex,

                rule:
                    puzzle.showRule
                        ? generatedRule
                        : null,

                answer:
                    answer

            });

        }


        console.log(
            "Generated Input Output Questions:",
            result.length
        );


        return result;

    },


    // =====================================
    // SENTENCE
    // =====================================

    generateSentenceQuestions: function (
        activityData,
        count
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const mode =
            puzzle.mode ||
            "sentenceOrder";


        const result =
            [];


        // =================================
        // ORDER
        // =================================

        if (
            mode ===
            "sentenceOrder"
        ) {

            const words =
                Array.isArray(
                    puzzle.words
                )
                    ? [
                        ...puzzle.words
                    ]
                    : [];


            const correctOrder =
                Array.isArray(
                    puzzle.correctOrder
                )
                    ? [
                        ...puzzle.correctOrder
                    ]
                    : [];


            if (
                words.length < 2
            ) {

                console.warn(
                    "PuzzleProvider: Sentence Words Missing"
                );


                return [];

            }


            const finalOrder =

                correctOrder.length ===
                words.length

                    ?

                    correctOrder

                    :

                    words.map(
                        function (
                            value,
                            index
                        ) {

                            return index;

                        }
                    );


            for (
                let i = 0;
                i < count;
                i++
            ) {

                result.push({

                    type:
                        "sentence",

                    source:
                        "generated",

                    dataType:
                        "text",

                    mode:
                        "sentenceOrder",

                    instruction:

                        puzzle.instruction ||

                        "کلمات را به ترتیب درست قرار بده",

                    words:
                        [
                            ...words
                        ],

                    correctOrder:
                        [
                            ...finalOrder
                        ],

                    grammar:
                        puzzle.grammar ||
                        null

                });

            }


            return result;

        }


        // =================================
        // GRAMMAR
        // =================================

        if (
            mode ===
            "sentenceGrammar"
        ) {

            const words =
                Array.isArray(
                    puzzle.words
                )
                    ? [
                        ...puzzle.words
                    ]
                    : [];


            if (
                words.length ===
                0
            ) {

                console.warn(
                    "PuzzleProvider: Sentence Grammar Words Missing"
                );


                return [];

            }


            const answers =
                Array.isArray(
                    puzzle.answers
                )
                    ? [
                        ...puzzle.answers
                    ]
                    : [];


            for (
                let i = 0;
                i < count;
                i++
            ) {

                result.push({

                    type:
                        "sentence",

                    source:
                        "generated",

                    dataType:
                        "text",

                    mode:
                        "sentenceGrammar",

                    instruction:

                        puzzle.instruction ||

                        "نقش دستوری کلمات را مشخص کن",

                    words:
                        [
                            ...words
                        ],

                    grammar:
                        puzzle.grammar ||
                        {},

                    targets:

                        Array.isArray(
                            puzzle.targets
                        )
                            ? [
                                ...puzzle.targets
                            ]
                            : [],

                    answers:
                        [
                            ...answers
                        ]

                });

            }


            return result;

        }


        console.warn(
            "PuzzleProvider: Unknown Sentence Mode:",
            mode
        );


        return [];

    },


    // =====================================
    // GRID
    // =====================================

    generateGridQuestions: function (
        activityData,
        count
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const rows =
            Math.max(
                1,
                Number(
                    puzzle.rows
                ) || 3
            );


        const cols =
            Math.max(
                1,
                Number(
                    puzzle.cols
                ) || 3
            );


        const cells =
            Array.isArray(
                puzzle.cells
            )
                ? [
                    ...puzzle.cells
                ]
                : [];


        if (
            cells.length !==
            rows * cols
        ) {

            console.warn(
                "PuzzleProvider: Grid Cells Missing"
            );


            return [];

        }


        const result =
            [];


        for (
            let i = 0;
            i < count;
            i++
        ) {

            result.push(

                this.normalizePuzzle({

                    type:
                        "grid",

                    source:
                        "generated",

                    dataType:
                        puzzle.dataType ||
                        "number",

                    instruction:

                        puzzle.instruction ||

                        "خانه‌های خالی را کامل کن",

                    rows:
                        rows,

                    cols:
                        cols,

                    cells:
                        [
                            ...cells
                        ],

                    rules:
                        Array.isArray(
                            puzzle.rules
                        )
                            ? [
                                ...puzzle.rules
                            ]
                            : [],

                    answers:
                        Array.isArray(
                            puzzle.answers
                        )
                            ? [
                                ...puzzle.answers
                            ]
                            : [],

                    answer:
                        puzzle.answer !==
                        undefined

                            ?

                            puzzle.answer

                            :

                            null

                })

            );

        }


        console.log(
            "Generated Grid Questions:",
            result.length
        );


        return result;

    },


    // =====================================
    // WORD GRID
    // =====================================

    generateWordGridQuestions: function (
        activityData,
        count
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const rows =
            Math.max(
                1,
                Number(
                    puzzle.rows
                ) || 3
            );


        const cols =
            Math.max(
                1,
                Number(
                    puzzle.cols
                ) || 3
            );


        const cells =
            Array.isArray(
                puzzle.cells
            )
                ? [
                    ...puzzle.cells
                ]
                : [];


        if (
            cells.length !==
            rows * cols
        ) {

            console.warn(
                "PuzzleProvider: Word Grid Cells Missing"
            );


            return [];

        }


        const result =
            [];


        for (
            let i = 0;
            i < count;
            i++
        ) {

            result.push(

                this.normalizePuzzle({

                    type:
                        "wordGrid",

                    source:
                        "generated",

                    dataType:
                        "text",

                    instruction:

                        puzzle.instruction ||

                        "خانه‌های خالی را با واژه مناسب کامل کن",

                    rows:
                        rows,

                    cols:
                        cols,

                    cells:
                        [
                            ...cells
                        ],

                    relation:
                        puzzle.relation ||
                        {
                            type:
                                "semantic"
                        },

                    answers:
                        Array.isArray(
                            puzzle.answers
                        )
                            ? [
                                ...puzzle.answers
                            ]
                            : [],

                    answer:
                        puzzle.answer !==
                        undefined

                            ?

                            puzzle.answer

                            :

                            null

                })

            );

        }


        console.log(
            "Generated Word Grid Questions:",
            result.length
        );


        return result;

    },


    // =====================================
    // CROSS GRID
    // =====================================

    generateCrossGridQuestions: function (
        activityData,
        count
    ) {

        const puzzle =
            activityData.puzzle ||
            {};


        const rows =
            Math.max(
                1,
                Number(
                    puzzle.rows
                ) || 3
            );


        const cols =
            Math.max(
                1,
                Number(
                    puzzle.cols
                ) || 3
            );


        const cells =
            Array.isArray(
                puzzle.cells
            )
                ? [
                    ...puzzle.cells
                ]
                : [];


        if (
            cells.length !==
            rows * cols
        ) {

            console.warn(
                "PuzzleProvider: Cross Grid Cells Missing"
            );


            return [];

        }


        const result =
            [];


        for (
            let i = 0;
            i < count;
            i++
        ) {

            result.push(

                this.normalizePuzzle({

                    type:
                        "crossGrid",

                    source:
                        "generated",

                    dataType:
                        puzzle.dataType ||
                        "number",

                    instruction:

                        puzzle.instruction ||

                        "خانه‌های خالی را کامل کن",

                    rows:
                        rows,

                    cols:
                        cols,

                    cells:
                        [
                            ...cells
                        ],

                    horizontalPaths:

                        Array.isArray(
                            puzzle.horizontalPaths
                        )
                            ? [
                                ...puzzle.horizontalPaths
                            ]
                            : [],

                    verticalPaths:

                        Array.isArray(
                            puzzle.verticalPaths
                        )
                            ? [
                                ...puzzle.verticalPaths
                            ]
                            : [],

                    paths:

                        Array.isArray(
                            puzzle.paths
                        )
                            ? [
                                ...puzzle.paths
                            ]
                            : [],

                    rules:

                        Array.isArray(
                            puzzle.rules
                        )
                            ? [
                                ...puzzle.rules
                            ]
                            : [],

                    answers:

                        Array.isArray(
                            puzzle.answers
                        )
                            ? [
                                ...puzzle.answers
                            ]
                            : [],

                    answer:
                        puzzle.answer !==
                        undefined

                            ?

                            puzzle.answer

                            :

                            null

                })

            );

        }


        console.log(
            "Generated Cross Grid Questions:",
            result.length
        );


        return result;

    },


    // =====================================
    // MIXED
    // =====================================

    getMixedPuzzleQuestions: async function (
        activityData
    ) {

        const settings =
            activityData.settings ||
            {};


        const total =
            Math.max(

                1,

                Number(
                    settings.questions
                ) || 1

            );


        const bankCount =
            Math.max(

                0,

                Math.min(

                    Number(
                        settings.bankQuestions
                    )

                    ||

                    Math.floor(
                        total / 2
                    ),

                    total

                )

            );


        const generatedCount =
            Math.max(

                0,

                total -
                bankCount

            );


        let bankQuestions =
            [];


        if (
            bankCount > 0
        ) {

            bankQuestions =
                await this.loadPuzzleFromFile(
                    activityData
                );


            bankQuestions =
                this.takeRandomUnique(
                    bankQuestions,
                    bankCount
                );

        }


        let generatedQuestions =
            [];


        if (
            generatedCount > 0
        ) {

            generatedQuestions =
                this.generatePuzzleQuestions({

                    ...activityData,

                    settings: {

                        ...settings,

                        questions:
                            generatedCount

                    }

                });

        }


        const combined =
            this.shuffle([

                ...bankQuestions,

                ...generatedQuestions

            ]).slice(

                0,

                total

            );


        console.log(
            "Mixed Puzzle Questions:",
            combined.length
        );


        return combined;

    },


    // =====================================
    // INPUT / OUTPUT HELPERS
    // =====================================

    generateInputOutputRule: function (
        settings
    ) {

        const operations = [

            {
                operation:
                    "multiplyAdd",

                multiply:
                    2,

                add:
                    1

            },

            {
                operation:
                    "addMultiply",

                add:
                    2,

                multiply:
                    2

            },

            {
                operation:
                    "multiply",

                multiply:
                    2

            },

            {
                operation:
                    "add",

                add:
                    3

            }

        ];


        const index =
            this.randomInteger(
                0,
                operations.length - 1
            );


        return {
            ...operations[
                index
            ]
        };

    },


    calculateInputOutputAnswer: function (
        input,
        rule
    ) {

        const value =
            Number(
                input
            );


        if (
            !Number.isFinite(
                value
            )
        ) {

            return null;

        }


        const currentRule =
            rule ||
            {
                operation:
                    "multiplyAdd",

                multiply:
                    2,

                add:
                    1

            };


        if (
            currentRule.operation ===
            "add"
        ) {

            return (

                value +
                Number(
                    currentRule.add
                )

            );

        }


        if (
            currentRule.operation ===
            "multiply"
        ) {

            return (

                value *
                Number(
                    currentRule.multiply
                )

            );

        }


        if (
            currentRule.operation ===
            "subtract"
        ) {

            return (

                value -
                Number(
                    currentRule.subtract
                )

            );

        }


        if (
            currentRule.operation ===
            "divide"
        ) {

            const divisor =
                Number(
                    currentRule.divide
                );


            if (
                divisor ===
                0
            ) {

                return null;

            }


            return (
                value /
                divisor
            );

        }


        if (
            currentRule.operation ===
            "multiplyAdd"
        ) {

            return (

                (
                    value *
                    Number(
                        currentRule.multiply
                    )
                )
                +
                Number(
                    currentRule.add
                )

            );

        }


        if (
            currentRule.operation ===
            "addMultiply"
        ) {

            return (

                (
                    value +
                    Number(
                        currentRule.add
                    )
                )
                *
                Number(
                    currentRule.multiply
                )

            );

        }


        return null;

    },


    findMissingIndex: function (
        values
    ) {

        if (
            !Array.isArray(
                values
            )
        ) {

            return -1;

        }


        return values.findIndex(
            function (
                value
            ) {

                return (

                    value ===
                    null

                    ||

                    value ===
                    undefined

                );

            }
        );

    },


    // =====================================
    // CORRECT ORDER
    // =====================================

    buildCorrectOrder: function (
        items,
        order
    ) {

        const copy =
            [
                ...items
            ];


        if (
            order ===
            "descending"
        ) {

            return copy.sort(
                function (
                    a,
                    b
                ) {

                    return (
                        b -
                        a
                    );

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

                    return (
                        a -
                        b
                    );

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
    // UNIQUE RANDOM
    // =====================================

    takeRandomUnique: function (
        array,
        count
    ) {

        if (
            !Array.isArray(
                array
            )
        ) {

            return [];

        }


        const shuffled =
            this.shuffle(
                array
            );


        return shuffled.slice(

            0,

            Math.max(
                0,
                Number(count) || 0
            )

        );

    },


    // =====================================
    // RANDOM INTEGER
    // =====================================

    randomInteger: function (
        min,
        max
    ) {

        min =
            Math.ceil(
                Number(
                    min
                )
            );


        max =
            Math.floor(
                Number(
                    max
                )
            );


        if (

            !Number.isFinite(
                min
            )

            ||

            !Number.isFinite(
                max
            )

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


        return (

            Math.floor(

                Math.random() *

                (
                    max -
                    min +
                    1
                )

            )
            +
            min

        );

    },


    // =====================================
    // SAFE MIN
    // =====================================

    safeMin: function (
        value,
        fallback
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ?
            number
            :
            fallback;

    },


    // =====================================
    // SAFE MAX
    // =====================================

    safeMax: function (
        value,
        fallback
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ?
            number
            :
            fallback;

    },


    // =====================================
    // RANDOM SEQUENCE PATTERN
    // =====================================

    randomSequencePattern: function () {

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

    },


    // =====================================
    // LAST SOURCE
    // =====================================

    getLastSource: function () {

        return this.lastSource;

    },


    // =====================================
    // LAST QUESTIONS
    // =====================================

    getLastQuestions: function () {

        return this.lastQuestions;

    },


    // =====================================
    // RESET
    // =====================================

    reset: function () {

        this.lastSource =
            null;


        this.lastQuestions =
            [];

    }

};


// =====================================
// GLOBAL
// =====================================

window.PuzzleProvider =
    PuzzleProvider;


// =====================================
// READY
// =====================================

console.log(
    "Puzzle Provider v2.0 Ready"
);