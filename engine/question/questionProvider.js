// =====================================
// Tahouri Edu Platform
// Question Provider
// Version 4.0
//
// Central Educational Content Provider
//
// Supports:
// - Quiz
//   - evenOdd
//   - divisibility
//
// - Puzzle
//   - ordering
//   - sequence
//   - visualMath
//
// - Memory
//   - cards
//   - pairs
//
// Sources:
// - file
// - generated
// - mixed
//
// Existing Quiz API preserved:
// QuestionProvider.getQuestions()
// =====================================


const QuestionProvider = {

    // =====================================
    // STATE
    // =====================================

    lastSource: null,

    lastQuestions: [],


    // =====================================
    // MAIN QUIZ ENTRY
    // =====================================

    getQuestions: async function(
        activityData
    ){

        if(
            !activityData
        ){

            console.error(
                "QuestionProvider: Activity Data Missing"
            );

            return [];

        }


        const settings =
            activityData.settings || {};


        const source =
            settings.questionSource ||
            "generated";


        console.log(
            "QuestionProvider Source:",
            source
        );


        // =================================
        // FILE
        // =================================

        if(
            source === "file"
        ){

            const questions =
                await this.loadFromFile(
                    activityData
                );


            this.lastSource =
                "file";


            this.lastQuestions =
                questions;


            return questions;

        }


        // =================================
        // GENERATED
        // =================================

        if(
            source === "generated"
        ){

            const questions =
                this.generateQuestions(
                    activityData
                );


            this.lastSource =
                "generated";


            this.lastQuestions =
                questions;


            return questions;

        }


        // =================================
        // MIXED
        // =================================

        if(
            source === "mixed"
        ){

            const questions =
                await this.getMixedQuestions(
                    activityData
                );


            this.lastSource =
                "mixed";


            this.lastQuestions =
                questions;


            return questions;

        }


        console.warn(
            "QuestionProvider: Unknown Source:",
            source
        );


        return [];

    },


    // =====================================
    // LOAD QUIZ QUESTIONS FROM FILE
    // =====================================

    loadFromFile: async function(
        activityData
    ){

        try{

            const questions =
                await DataManager.getQuestions(
                    activityData
                );


            if(
                !Array.isArray(
                    questions
                )
            ){

                console.error(
                    "QuestionProvider: Invalid Questions File"
                );

                return [];

            }


            const normalized =
                this.normalizeQuestions(
                    questions,
                    activityData
                );


            const shuffled =
                this.shuffle(
                    normalized
                );


            console.log(
                "QuestionProvider: Questions Loaded:",
                shuffled.length
            );


            return shuffled;

        }

        catch(error){

            console.error(
                "QuestionProvider: File Load Error:",
                error
            );


            return [];

        }

    },


    // =====================================
    // NORMALIZE QUIZ QUESTIONS
    // =====================================

    normalizeQuestions: function(
        questions,
        activityData
    ){

        const settings =
            activityData.settings || {};


        const mode =
            settings.mode ||
            "evenOdd";


        return questions.map(
            function(question){

                const normalized = {
                    ...question
                };


                if(

                    Array.isArray(
                        normalized.options
                    )

                    &&

                    normalized.options.length >= 2

                ){

                    return normalized;

                }


                if(
                    mode === "divisibility"
                ){

                    normalized.options = [

                        "بله",
                        "خیر"

                    ];


                    return normalized;

                }


                if(
                    mode === "evenOdd"
                ){

                    normalized.options = [

                        "زوج",
                        "فرد"

                    ];


                    return normalized;

                }


                normalized.options = [

                    "بله",
                    "خیر"

                ];


                return normalized;

            }
        );

    },


    // =====================================
    // QUIZ GENERATOR
    // =====================================

    generateQuestions: function(
        activityData
    ){

        const settings =
            activityData.settings || {};


        const count =
            Math.max(
                0,
                Number(
                    settings.questions
                ) || 10
            );


        const mode =
            settings.mode ||
            "evenOdd";


        if(
            count === 0
        ){

            return [];

        }


        if(
            mode === "evenOdd"
        ){

            return this.generateEvenOddQuestions(
                activityData,
                count
            );

        }


        if(
            mode === "divisibility"
        ){

            return this.generateDivisibilityQuestions(
                activityData,
                count
            );

        }


        console.warn(
            "QuestionProvider: Unknown Mode:",
            mode
        );


        return [];

    },


    // =====================================
    // EVEN / ODD
    // =====================================

    generateEvenOddQuestions: function(
        activityData,
        count
    ){

        const settings =
            activityData.settings || {};


        const min =
            settings.minNumber !== undefined
                ? settings.minNumber
                : 1;


        const max =
            settings.maxNumber !== undefined
                ? settings.maxNumber
                : 1000;


        const usedNumbers =
            new Set();


        const questions =
            [];


        let attempts =
            0;


        const maxAttempts =
            Math.max(
                count * 100,
                100
            );


        while(

            questions.length < count

            &&

            attempts < maxAttempts

        ){

            attempts++;


            const number =
                this.randomNumber(
                    min,
                    max
                );


            if(
                usedNumbers.has(
                    number
                )
            ){

                continue;

            }


            usedNumbers.add(
                number
            );


            questions.push({

                type:
                    "quiz",

                mode:
                    "evenOdd",

                text:
                    `عدد ${number} زوج است یا فرد؟`,

                answer:
                    number % 2 === 0
                        ? "زوج"
                        : "فرد",

                options: [

                    "زوج",
                    "فرد"

                ],

                number:
                    number

            });

        }


        return this.shuffle(
            questions
        );

    },


    // =====================================
    // DIVISIBILITY
    // =====================================

    generateDivisibilityQuestions: function(
        activityData,
        count
    ){

        const settings =
            activityData.settings || {};


        const divisor =
            Number(
                settings.divisor
            ) || 2;


        const difficulty =
            settings.difficulty ||
            "medium";


        const range =
            this.getDifficultyRange(
                settings,
                difficulty
            );


        const min =
            range.min;


        const max =
            range.max;


        console.log(
            "Difficulty:",
            difficulty
        );


        console.log(
            "Difficulty Range:",
            min,
            max
        );


        const distribution =
            this.getSafeCorrectDistribution(
                count,
                settings
            );


        const correctTarget =
            distribution.correct;


        const wrongTarget =
            distribution.wrong;


        console.log(
            "Generated Correct Target:",
            correctTarget
        );


        console.log(
            "Generated Wrong Target:",
            wrongTarget
        );


        const answerPattern =
            this.buildAnswerPattern(
                correctTarget,
                wrongTarget,
                settings.maxSameAnswers
            );


        console.log(
            "Generated Answer Pattern:",
            answerPattern
        );


        const usedNumbers =
            new Set();


        const questions =
            [];


        for(

            let i = 0;

            i < answerPattern.length;

            i++

        ){

            const shouldBeDivisible =
                answerPattern[i] ===
                "بله";


            const number =
                this.getUniqueDivisibilityNumber(
                    shouldBeDivisible,
                    divisor,
                    min,
                    max,
                    usedNumbers
                );


            if(
                number === null
            ){

                console.error(
                    "QuestionProvider: Could Not Generate Unique Number"
                );

                continue;

            }


            usedNumbers.add(
                number
            );


            questions.push({

                type:
                    "quiz",

                mode:
                    "divisibility",

                text:
                    `آیا عدد ${number} بر ${divisor} بخش‌پذیر است؟`,

                answer:
                    shouldBeDivisible
                        ? "بله"
                        : "خیر",

                options: [

                    "بله",
                    "خیر"

                ],

                number:
                    number,

                divisor:
                    divisor,

                difficulty:
                    difficulty

            });

        }


        console.log(
            "Generated Divisibility Questions:",
            questions.length
        );


        return questions;

    },


    // =====================================
    // SAFE CORRECT DISTRIBUTION
    // =====================================

    getSafeCorrectDistribution: function(
        count,
        settings
    ){

        const total =
            Math.max(
                0,
                Number(count) || 0
            );


        if(
            total === 0
        ){

            return {

                correct: 0,

                wrong: 0

            };

        }


        let correctMin =
            settings.correctMin !== undefined
                ? Number(
                    settings.correctMin
                )
                : 6;


        let correctMax =
            settings.correctMax !== undefined
                ? Number(
                    settings.correctMax
                )
                : 8;


        if(
            !Number.isFinite(
                correctMin
            )
        ){

            correctMin =
                6;

        }


        if(
            !Number.isFinite(
                correctMax
            )
        ){

            correctMax =
                8;

        }


        correctMin =
            Math.max(
                0,
                Math.min(
                    correctMin,
                    total
                )
            );


        correctMax =
            Math.max(
                0,
                Math.min(
                    correctMax,
                    total
                )
            );


        if(
            correctMin >
            correctMax
        ){

            const temp =
                correctMin;


            correctMin =
                correctMax;


            correctMax =
                temp;

        }


        if(
            total >= 10
        ){

            const correct =
                this.randomInteger(
                    correctMin,
                    correctMax
                );


            return {

                correct:
                    correct,

                wrong:
                    total - correct

            };

        }


        const smallMin =
            Math.max(
                1,
                Math.ceil(
                    total * 0.6
                )
            );


        const smallMax =
            Math.min(
                total,
                Math.ceil(
                    total * 0.8
                )
            );


        const finalMin =
            Math.min(
                smallMin,
                smallMax
            );


        const finalMax =
            Math.max(
                smallMin,
                smallMax
            );


        const correct =
            this.randomInteger(
                finalMin,
                finalMax
            );


        return {

            correct:
                correct,

            wrong:
                total - correct

        };

    },


    // =====================================
    // DIFFICULTY RANGE
    // =====================================

    getDifficultyRange: function(
        settings,
        difficulty
    ){

        const configuredMin =
            settings.minNumber !== undefined
                ? settings.minNumber
                : 1;


        const configuredMax =
            settings.maxNumber !== undefined
                ? settings.maxNumber
                : 10000;


        if(
            difficulty ===
            "easy"
        ){

            return {

                min:
                    configuredMin,

                max:
                    Math.min(
                        configuredMax,
                        Math.max(
                            configuredMin,
                            999
                        )
                    )

            };

        }


        if(
            difficulty ===
            "medium"
        ){

            const mediumMin =
                Math.max(
                    configuredMin,
                    100
                );


            const mediumMax =
                Math.min(
                    configuredMax,
                    9999
                );


            if(
                mediumMin <=
                mediumMax
            ){

                return {

                    min:
                        mediumMin,

                    max:
                        mediumMax

                };

            }

        }


        if(
            difficulty ===
            "hard"
        ){

            const hardMin =
                Math.max(
                    configuredMin,
                    1000
                );


            if(
                hardMin <=
                configuredMax
            ){

                return {

                    min:
                        hardMin,

                    max:
                        configuredMax

                };

            }

        }


        return {

            min:
                configuredMin,

            max:
                configuredMax

        };

    },


    // =====================================
    // ANSWER PATTERN
    // =====================================

    buildAnswerPattern: function(
        correctCount,
        wrongCount,
        maxSameAnswers
    ){

        const limit =
            maxSameAnswers !== undefined
                ? Math.max(
                    1,
                    Number(
                        maxSameAnswers
                    )
                )
                : 3;


        let bestPattern =
            [];


        let bestScore =
            Number.POSITIVE_INFINITY;


        for(

            let attempt = 0;

            attempt < 300;

            attempt++

        ){

            const pattern =
                this.randomAnswerPattern(
                    correctCount,
                    wrongCount
                );


            const maxRun =
                this.getMaxSameRun(
                    pattern
                );


            const score =
                this.patternScore(
                    pattern,
                    maxRun,
                    limit
                );


            if(
                score <
                bestScore
            ){

                bestScore =
                    score;

                bestPattern =
                    pattern;

            }


            if(
                maxRun <= limit
            ){

                return pattern;

            }

        }


        return bestPattern;

    },


    // =====================================
    // RANDOM ANSWER PATTERN
    // =====================================

    randomAnswerPattern: function(
        correctCount,
        wrongCount
    ){

        const pattern =
            [];


        for(

            let i = 0;

            i < correctCount;

            i++

        ){

            pattern.push(
                "بله"
            );

        }


        for(

            let i = 0;

            i < wrongCount;

            i++

        ){

            pattern.push(
                "خیر"
            );

        }


        return this.shuffle(
            pattern
        );

    },


    // =====================================
    // PATTERN SCORE
    // =====================================

    patternScore: function(
        pattern,
        maxRun,
        limit
    ){

        let score =
            0;


        if(
            maxRun > limit
        ){

            score +=
                (
                    maxRun -
                    limit
                ) * 100;

        }


        for(

            let i = 1;

            i < pattern.length;

            i++

        ){

            if(
                pattern[i] ===
                pattern[i - 1]
            ){

                score++;

            }

        }


        if(
            maxRun >= 3
        ){

            score +=
                maxRun * 2;

        }


        return score;

    },


    // =====================================
    // MAX SAME RUN
    // =====================================

    getMaxSameRun: function(
        pattern
    ){

        if(
            !pattern.length
        ){

            return 0;

        }


        let currentRun =
            1;


        let maxRun =
            1;


        for(

            let i = 1;

            i < pattern.length;

            i++

        ){

            if(
                pattern[i] ===
                pattern[i - 1]
            ){

                currentRun++;

            }
            else{

                currentRun =
                    1;

            }


            if(
                currentRun >
                maxRun
            ){

                maxRun =
                    currentRun;

            }

        }


        return maxRun;

    },


    // =====================================
    // DIVISIBLE NUMBER
    // =====================================

    getUniqueDivisibilityNumber: function(
        shouldBeDivisible,
        divisor,
        min,
        max,
        usedNumbers
    ){

        for(

            let attempt = 0;

            attempt < 1000;

            attempt++

        ){

            const number =

                shouldBeDivisible

                    ?

                this.randomDivisibleNumber(
                    divisor,
                    min,
                    max
                )

                    :

                this.randomNonDivisibleNumber(
                    divisor,
                    min,
                    max
                );


            if(
                number === null
            ){

                return null;

            }


            if(
                !usedNumbers.has(
                    number
                )
            ){

                return number;

            }

        }


        return null;

    },


    // =====================================
    // RANDOM DIVISIBLE
    // =====================================

    randomDivisibleNumber: function(
        divisor,
        min,
        max
    ){

        const firstMultiple =
            Math.ceil(
                min /
                divisor
            );


        const lastMultiple =
            Math.floor(
                max /
                divisor
            );


        if(
            firstMultiple >
            lastMultiple
        ){

            return null;

        }


        const multiplier =
            this.randomInteger(
                firstMultiple,
                lastMultiple
            );


        return (
            multiplier *
            divisor
        );

    },


    // =====================================
    // RANDOM NON DIVISIBLE
    // =====================================

    randomNonDivisibleNumber: function(
        divisor,
        min,
        max
    ){

        if(
            min > max
        ){

            return null;

        }


        for(

            let attempt = 0;

            attempt < 200;

            attempt++

        ){

            const number =
                this.randomInteger(
                    min,
                    max
                );


            if(
                number %
                divisor !==
                0
            ){

                return number;

            }

        }


        return null;

    },


    // =====================================
    // PUZZLE ENTRY
    // =====================================

    getPuzzleQuestions: async function(
        activityData
    ){

        if(
            !activityData
        ){

            console.error(
                "QuestionProvider: Puzzle Activity Missing"
            );

            return [];

        }


        const puzzle =
            activityData.puzzle ||
            {};


        const source =
            puzzle.source ||
            activityData.settings?.questionSource ||
            "generated";


        console.log(
            "Puzzle Question Source:",
            source
        );


        // =================================
        // FILE
        // =================================

        if(
            source === "file"
        ){

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

        if(
            source === "generated"
        ){

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

        if(
            source === "mixed"
        ){

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
            "QuestionProvider: Unknown Puzzle Source:",
            source
        );


        return [];

    },


    // =====================================
    // PUZZLE FILE
    // =====================================

    loadPuzzleFromFile: async function(
        activityData
    ){

        try{

            const puzzle =
                activityData.puzzle ||
                {};


            if(
                Object.keys(
                    puzzle
                ).length
                > 0
            ){

                return [

                    this.normalizePuzzle(
                        puzzle
                    )

                ];

            }


            return [];

        }

        catch(error){

            console.error(
                "QuestionProvider: Puzzle File Error:",
                error
            );


            return [];

        }

    },


    // =====================================
    // PUZZLE GENERATOR
    // =====================================

    generatePuzzleQuestions: function(
        activityData
    ){

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


        if(
            type === "sequence"
        ){

            return this.generatePuzzleSequences(
                activityData,
                count
            );

        }


        if(
            type === "ordering"
        ){

            return this.generatePuzzleOrdering(
                activityData,
                count
            );

        }


        if(
            type === "visualMath"
        ){

            return this.generateVisualMathQuestions(
                activityData,
                count
            );

        }


        console.warn(
            "QuestionProvider: Unknown Puzzle Type:",
            type
        );


        return [];

    },


    // =====================================
    // PUZZLE NORMALIZE
    // =====================================

    normalizePuzzle: function(
        puzzle
    ){

        const normalized = {
            ...puzzle
        };


        if(
            normalized.type ===
            "ordering"
        ){

            normalized.dataType =
                normalized.dataType ||
                this.detectDataType(
                    normalized.items || []
                );

        }


        if(
            normalized.type ===
            "sequence"
        ){

            normalized.dataType =
                normalized.dataType ||
                this.detectDataType(
                    normalized.items || []
                );

        }


        if(
            normalized.type ===
            "visualMath"
        ){

            normalized.dataType =
                "image";

        }


        return normalized;

    },


    // =====================================
    // PUZZLE SEQUENCE GENERATOR
    // =====================================

    generatePuzzleSequences: function(
        activityData,
        count
    ){

        const puzzle =
            activityData.puzzle ||
            {};


        const settings =
            activityData.settings ||
            {};


        const result =
            [];


        for(

            let i = 0;

            i < count;

            i++

        ){

            const generated =
                this.generateSequencePuzzle(
                    puzzle,
                    settings
                );


            if(
                generated
            ){

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


    // =====================================
    // SEQUENCE PUZZLE
    // =====================================

    generateSequencePuzzle: function(
        puzzle,
        settings
    ){

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
            puzzle.start !== undefined
                ? Number(
                    puzzle.start
                )
                : this.randomInteger(
                    Number(
                        puzzle.startMin
                    ) || 1,
                    Number(
                        puzzle.startMax
                    ) || 20
                );


        if(
            !Number.isFinite(
                start
            )
        ){

            start =
                1;

        }


        let step =
            puzzle.step !== undefined
                ? Number(
                    puzzle.step
                )
                : this.randomInteger(

                    this.safeMin(
                        puzzle.stepMin,
                        1
                    ),

                    this.safeMax(
                        puzzle.stepMax,
                        10
                    )

                );


        if(
            !Number.isFinite(
                step
            ) ||
            step <= 0
        ){

            step =
                1;

        }


        let multiplier =
            puzzle.multiplier !== undefined
                ? Number(
                    puzzle.multiplier
                )
                : this.randomInteger(

                    this.safeMin(
                        puzzle.multiplierMin,
                        2
                    ),

                    this.safeMax(
                        puzzle.multiplierMax,
                        4
                    )

                );


        if(
            !Number.isFinite(
                multiplier
            ) ||
            multiplier < 2
        ){

            multiplier =
                2;

        }


        const items =
            [start];


        for(

            let i = 1;

            i < length;

            i++

        ){

            const previous =
                items[
                    i - 1
                ];


            if(
                pattern ===
                "add"
            ){

                items.push(
                    previous +
                    step
                );

                continue;

            }


            if(
                pattern ===
                "subtract"
            ){

                items.push(
                    previous -
                    step
                );

                continue;

            }


            if(
                pattern ===
                "multiply"
            ){

                items.push(
                    previous *
                    multiplier
                );

                continue;

            }


            console.warn(
                "QuestionProvider: Unknown Sequence Pattern:",
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
                items.length -
                1,

            answer:
                items[
                    items.length -
                    1
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
    // ORDERING GENERATOR
    // =====================================

    generatePuzzleOrdering: function(
        activityData,
        count
    ){

        const puzzle =
            activityData.puzzle ||
            {};


        const items =
            Array.isArray(
                puzzle.items
            )
                ? [...puzzle.items]
                : [];


        if(
            !items.length
        ){

            console.warn(
                "QuestionProvider: Ordering Items Missing"
            );


            return [];

        }


        const result =
            [];


        for(

            let i = 0;

            i < count;

            i++

        ){

            const shuffled =
                this.shuffle(
                    items
                );


            const correctOrder =
                Array.isArray(
                    puzzle.correctOrder
                )
                    ? [...puzzle.correctOrder]
                    : this.buildCorrectOrder(
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
    // VISUAL MATH GENERATOR
    // =====================================

    generateVisualMathQuestions: function(
        activityData,
        count
    ){

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


        if(
            operation !==
            "addition"
        ){

            console.warn(
                "QuestionProvider: Unsupported Visual Math Operation:",
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
                ) ||
                1
            );


        const maxCount =
            Math.max(
                minCount,
                Number(
                    puzzle.maxCount
                ) ||
                5
            );


        const result =
            [];


        for(

            let i = 0;

            i < count;

            i++

        ){

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


            result.push({

                type:
                    "visualMath",

                source:
                    "generated",

                dataType:
                    "image",

                operation:
                    "addition",

                instruction:
                    puzzle.instruction ||
                    "شکل‌ها را بشمار و پاسخ را پیدا کن",

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
                    firstCount +
                    secondCount

            });

        }


        console.log(
            "Generated Visual Math Questions:",
            result.length
        );


        return result;

    },


    // =====================================
    // MIXED PUZZLE
    // =====================================

    getMixedPuzzleQuestions: async function(
        activityData
    ){

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
                    ) ||
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


        if(
            bankCount > 0
        ){

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


        if(
            generatedCount > 0
        ){

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
    // MEMORY ENTRY
    // =====================================

    getMemoryCards: async function(
        activityData
    ){

        if(
            !activityData
        ){

            console.error(
                "QuestionProvider: Memory Activity Missing"
            );

            return [];

        }


        const settings =
            activityData.settings ||
            {};


        const source =
            settings.cardSource ||
            settings.questionSource ||
            "file";


        console.log(
            "Memory Content Source:",
            source
        );


        if(
            source === "file"
        ){

            return this.loadMemoryCards(
                activityData
            );

        }


        if(
            source === "generated"
        ){

            return this.generateMemoryCards(
                activityData
            );

        }


        if(
            source === "mixed"
        ){

            const bank =
                await this.loadMemoryCards(
                    activityData
                );


            const generated =
                this.generateMemoryCards(
                    activityData
                );


            return this.shuffle([

                ...bank,

                ...generated

            ]);

        }


        console.warn(
            "QuestionProvider: Unknown Memory Source:",
            source
        );


        return [];

    },


    // =====================================
    // LOAD MEMORY CARDS
    // =====================================

    loadMemoryCards: async function(
        activityData
    ){

        try{

            if(
                typeof DataManager ===
                "undefined"
            ){

                console.error(
                    "QuestionProvider: DataManager Not Available"
                );

                return [];

            }


            const cards =
                await DataManager.getCards(
                    activityData
                );


            if(
                !Array.isArray(
                    cards
                )
            ){

                console.error(
                    "QuestionProvider: Invalid Memory Cards"
                );

                return [];

            }


            const normalized =
                cards.map(
                    function(card, index){

                        return {

                            id:
                                card.id !==
                                undefined
                                    ? card.id
                                    : `card_${index}`,

                            value:
                                card.value,

                            pairId:
                                card.pairId !==
                                undefined
                                    ? card.pairId
                                    : card.value,

                            dataType:
                                card.dataType ||
                                "text"

                        };

                    }
                );


            return this.shuffle(
                normalized
            );

        }

        catch(error){

            console.error(
                "QuestionProvider: Memory Card Load Error:",
                error
            );


            return [];

        }

    },


    // =====================================
    // MEMORY GENERATOR
    // =====================================

    generateMemoryCards: function(
        activityData
    ){

        const settings =
            activityData.settings ||
            {};


        const pairs =
            Math.max(
                1,
                Number(
                    settings.pairs
                ) || 4
            );


        const values =
            Array.isArray(
                settings.values
            )
                ? [...settings.values]
                : [];


        if(
            values.length <
            pairs
        ){

            console.warn(
                "QuestionProvider: Memory Generated Values Missing"
            );

            return [];

        }


        const cards =
            [];


        for(

            let i = 0;

            i < pairs;

            i++

        ){

            const value =
                values[i];


            cards.push({

                id:
                    `memory_${i}_a`,

                value:
                    value,

                pairId:
                    `pair_${i}`,

                dataType:
                    this.detectDataType([
                        value
                    ])

            });


            cards.push({

                id:
                    `memory_${i}_b`,

                value:
                    value,

                pairId:
                    `pair_${i}`,

                dataType:
                    this.detectDataType([
                        value
                    ])

            });

        }


        return this.shuffle(
            cards
        );

    },


    // =====================================
    // MEMORY MIXED
    // =====================================

    getMixedMemoryCards: async function(
        activityData
    ){

        const settings =
            activityData.settings ||
            {};


        const totalPairs =
            Math.max(
                1,
                Number(
                    settings.pairs
                ) || 4
            );


        const bank =
            await this.loadMemoryCards(
                activityData
            );


        const generated =
            this.generateMemoryCards(
                activityData
            );


        return this.shuffle([

            ...bank,

            ...generated

        ]);

    },


    // =====================================
    // ORDER BUILD
    // =====================================

    buildCorrectOrder: function(
        items,
        order
    ){

        const copy =
            [...items];


        if(
            order ===
            "descending"
        ){

            return copy.sort(
                function(a, b){

                    return b - a;

                }
            );

        }


        if(
            this.detectDataType(
                copy
            ) ===
            "number"
        ){

            return copy.sort(
                function(a, b){

                    return a - b;

                }
            );

        }


        return copy.sort();

    },


    // =====================================
    // DATA TYPE
    // =====================================

    detectDataType: function(
        items
    ){

        if(
            !Array.isArray(
                items
            )
        ){

            return "text";

        }


        if(
            items.length === 0
        ){

            return "text";

        }


        if(
            items.every(
                function(item){

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
        ){

            return "image";

        }


        if(
            items.every(
                function(item){

                    return (
                        typeof item ===
                        "number"
                    );

                }
            )
        ){

            return "number";

        }


        return "text";

    },


    // =====================================
    // TAKE RANDOM UNIQUE
    // =====================================

    takeRandomUnique: function(
        array,
        count
    ){

        if(
            !Array.isArray(
                array
            )
        ){

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
    // RANDOM NUMBER
    // =====================================

    randomNumber: function(
        min,
        max
    ){

        return this.randomInteger(
            min,
            max
        );

    },


    // =====================================
    // RANDOM INTEGER
    // =====================================

    randomInteger: function(
        min,
        max
    ){

        min =
            Math.ceil(
                Number(min)
            );


        max =
            Math.floor(
                Number(max)
            );


        if(
            !Number.isFinite(min) ||
            !Number.isFinite(max)
        ){

            return 1;

        }


        if(
            min >
            max
        ){

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
    // SAFE MIN
    // =====================================

    safeMin: function(
        value,
        fallback
    ){

        const number =
            Number(value);


        return Number.isFinite(
            number
        )
            ? number
            : fallback;

    },


    // =====================================
    // SAFE MAX
    // =====================================

    safeMax: function(
        value,
        fallback
    ){

        const number =
            Number(value);


        return Number.isFinite(
            number
        )
            ? number
            : fallback;

    },


    // =====================================
    // SHUFFLE
    // =====================================

    shuffle: function(
        array
    ){

        if(
            !Array.isArray(
                array
            )
        ){

            return [];

        }


        const list =
            [...array];


        for(

            let i =
                list.length - 1;

            i > 0;

            i--

        ){

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
    // UNIFIED CONTENT API
    // Version 4.1
    // Compatibility Layer
    // =====================================

    getContent: async function(
        activityData
    ){

        if(
            !activityData
        ){

            console.error(
                "QuestionProvider: Activity Data Missing"
            );

            return [];

        }


        const settings =
            activityData.settings || {};

        const puzzle =
            activityData.puzzle || {};

        const engine =
            activityData.engine ||
            activityData.type ||
            "";


        // =================================
        // QUIZ
        // =================================

        if(
            engine === "quiz" ||
            engine === "QuizEngine"
        ){

            return this.getQuestions(
                activityData
            );

        }


        // =================================
        // PUZZLE
        // =================================

        if(
            engine === "puzzle" ||
            engine === "PuzzleEngine"
        ){

            return this.getPuzzleQuestions(
                activityData
            );

        }


        // =================================
        // MEMORY
        // =================================

        if(
            engine === "memory" ||
            engine === "MemoryEngine"
        ){

            const cards =
                await this.getMemoryCards(
                    activityData
                );


            return [

                {

                    type:
                        "memory",

                    dataType:
                        cards.length > 0
                            ? (
                                cards[0].dataType ||
                                "text"
                            )
                            : "text",

                    source:
                        settings.cardSource ||
                        settings.questionSource ||
                        "file",

                    cards:
                        cards

                }

            ];

        }


        // =================================
        // AUTO DETECTION
        // =================================

        if(
            puzzle.type
        ){

            return this.getPuzzleQuestions(
                activityData
            );

        }


        if(
            settings.mode
        ){

            return this.getQuestions(
                activityData
            );

        }


        console.warn(
            "QuestionProvider: Cannot Detect Content Type",
            activityData
        );


        return [];

    },


    // =====================================
    // LAST SOURCE
    // =====================================

    getLastSource: function(){

        return this.lastSource;

    },


    // =====================================
    // LAST QUESTIONS
    // =====================================

    getLastQuestions: function(){

        return this.lastQuestions;

    },


    // =====================================
    // RESET
    // =====================================

    reset: function(){

        this.lastSource =
            null;


        this.lastQuestions =
            [];

    }

};


// =====================================
// GLOBAL
// =====================================

window.QuestionProvider =
    QuestionProvider;


// =====================================
// READY
// =====================================

console.log(
    "Question Provider v4.1 Ready"
);