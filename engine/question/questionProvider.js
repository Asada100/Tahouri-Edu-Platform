// =====================================
// Tahouri Edu Platform
// Version 3.3
// Question Provider
// Smart Math Generator
// Controlled Answer Distribution
// Anti-Pattern Ordering
// No Duplicate Numbers
// Difficulty Support
// Mixed Question Fix
// =====================================


const QuestionProvider = {


    // =====================================
    // State
    // =====================================

    lastSource: null,

    lastQuestions: [],


    // =====================================
    // Main Entry
    // =====================================

    getQuestions: async function(activityData){

        if(!activityData){

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


        // =====================================
        // FILE
        // =====================================

        if(source === "file"){

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


        // =====================================
        // GENERATED
        // =====================================

        if(source === "generated"){

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


        // =====================================
        // MIXED
        // =====================================

        if(source === "mixed"){

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
    // Load From File
    // =====================================

    loadFromFile: async function(activityData){

        try{

            const questions =
                await DataManager.getQuestions(
                    activityData
                );


            if(
                !Array.isArray(questions)
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
    // Normalize File Questions
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
    // Smart Question Generator
    // =====================================

    generateQuestions: function(activityData){

        const settings =
            activityData.settings || {};


        const count =
            Math.max(
                0,
                Number(settings.questions) || 10
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
    // Even / Odd Generator
    // =====================================

    generateEvenOddQuestions: function(
        activityData,
        count
    ){

        const settings =
            activityData.settings || {};


        const min =
            settings.minNumber !== undefined
            ?
            settings.minNumber
            :
            1;


        const max =
            settings.maxNumber !== undefined
            ?
            settings.maxNumber
            :
            1000;


        const usedNumbers =
            new Set();


        const questions = [];


        let attempts = 0;


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
                usedNumbers.has(number)
            ){

                continue;

            }


            usedNumbers.add(number);


            questions.push({

                text:
                `عدد ${number} زوج است یا فرد؟`,

                answer:

                number % 2 === 0
                ?
                "زوج"
                :
                "فرد",

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
    // Divisibility Generator
    // =====================================

    generateDivisibilityQuestions: function(
        activityData,
        count
    ){

        const settings =
            activityData.settings || {};


        const divisor =
            Number(settings.divisor) || 2;


        // =====================================
        // Difficulty
        // =====================================

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


        // =====================================
        // Safe Correct Distribution
        // =====================================

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


        // =====================================
        // Answer Pattern
        // =====================================

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


        // =====================================
        // Used Numbers
        // =====================================

        const usedNumbers =
            new Set();


        const questions = [];


        // =====================================
        // Build Questions
        // =====================================

        for(

            let i = 0;

            i < answerPattern.length;

            i++

        ){

            const shouldBeDivisible =
                answerPattern[i] === "بله";


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

                text:
                `آیا عدد ${number} بر ${divisor} بخش‌پذیر است؟`,

                answer:
                shouldBeDivisible
                ?
                "بله"
                :
                "خیر",

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
    // Safe Correct Distribution
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


        // =====================================
        // User Settings
        // =====================================

        let correctMin =
            settings.correctMin !== undefined
            ?
            Number(settings.correctMin)
            :
            6;


        let correctMax =
            settings.correctMax !== undefined
            ?
            Number(settings.correctMax)
            :
            8;


        if(
            !Number.isFinite(correctMin)
        ){

            correctMin = 6;

        }


        if(
            !Number.isFinite(correctMax)
        ){

            correctMax = 8;

        }


        // =====================================
        // Clamp To Count
        // =====================================

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
            correctMin > correctMax
        ){

            const temp =
                correctMin;

            correctMin =
                correctMax;

            correctMax =
                temp;

        }


        // =====================================
        // Normal 10 Question Quiz
        // =====================================

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


        // =====================================
        // Smaller Generated Set
        // =====================================
        //
        // Example:
        // 5 generated questions
        // → 3 or 4 correct
        //
        // This prevents:
        // correct = 6
        // wrong = -1
        //

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
    // Difficulty Range
    // =====================================

    getDifficultyRange: function(
        settings,
        difficulty
    ){

        const configuredMin =
            settings.minNumber !== undefined
            ?
            settings.minNumber
            :
            1;


        const configuredMax =
            settings.maxNumber !== undefined
            ?
            settings.maxNumber
            :
            10000;


        // =====================================
        // EASY
        // =====================================

        if(
            difficulty === "easy"
        ){

            const easyMax =
                Math.min(
                    configuredMax,
                    Math.max(
                        configuredMin,
                        999
                    )
                );


            return {

                min:
                configuredMin,

                max:
                easyMax

            };

        }


        // =====================================
        // MEDIUM
        // =====================================

        if(
            difficulty === "medium"
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
                mediumMin <= mediumMax
            ){

                return {

                    min:
                    mediumMin,

                    max:
                    mediumMax

                };

            }

        }


        // =====================================
        // HARD
        // =====================================

        if(
            difficulty === "hard"
        ){

            const hardMin =
                Math.max(
                    configuredMin,
                    1000
                );


            if(
                hardMin <= configuredMax
            ){

                return {

                    min:
                    hardMin,

                    max:
                    configuredMax

                };

            }

        }


        // =====================================
        // FALLBACK
        // =====================================

        return {

            min:
            configuredMin,

            max:
            configuredMax

        };

    },


    // =====================================
    // Controlled Answer Pattern
    // =====================================

    buildAnswerPattern: function(
        correctCount,
        wrongCount,
        maxSameAnswers
    ){

        const limit =
            maxSameAnswers !== undefined
            ?
            Math.max(
                1,
                Number(maxSameAnswers)
            )
            :
            3;


        let bestPattern = [];


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
                score < bestScore
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
    // Random Answer Pattern
    // =====================================

    randomAnswerPattern: function(
        correctCount,
        wrongCount
    ){

        const pattern = [];


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
    // Pattern Score
    // =====================================

    patternScore: function(
        pattern,
        maxRun,
        limit
    ){

        let score = 0;


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

                score += 1;

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
    // Maximum Same Run
    // =====================================

    getMaxSameRun: function(
        pattern
    ){

        if(
            !pattern.length
        ){

            return 0;

        }


        let currentRun = 1;

        let maxRun = 1;


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

                currentRun = 1;

            }


            if(
                currentRun > maxRun
            ){

                maxRun =
                    currentRun;

            }

        }


        return maxRun;

    },


    // =====================================
    // Unique Divisibility Number
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
                !usedNumbers.has(number)
            ){

                return number;

            }

        }


        return null;

    },


    // =====================================
    // Random Divisible Number
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
    // Random Non-Divisible Number
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
                number % divisor !== 0
            ){

                return number;

            }

        }


        return null;

    },


    // =====================================
    // Random Number
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
    // Random Integer
    // =====================================

    randomInteger: function(
        min,
        max
    ){

        if(
            min > max
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
    // Mixed Questions
    // =====================================

    getMixedQuestions: async function(
        activityData
    ){

        const settings =
            activityData.settings || {};


        const total =
            Math.max(
                0,
                Number(settings.questions) || 10
            );


        if(
            total === 0
        ){

            return [];

        }


        // =====================================
        // Bank Count
        // =====================================

        let bankCount =
            settings.bankQuestions !== undefined
            ?
            Number(settings.bankQuestions)
            :
            Math.floor(
                total / 2
            );


        // =====================================
        // Generated Count
        // =====================================

        let generatedCount =
            settings.generatedQuestions !== undefined
            ?
            Number(settings.generatedQuestions)
            :
            total - bankCount;


        bankCount =
            Math.max(
                0,
                Math.min(
                    bankCount,
                    total
                )
            );


        generatedCount =
            Math.max(
                0,
                Math.min(
                    generatedCount,
                    total - bankCount
                )
            );


        // =====================================
        // Correct Total
        // =====================================

        const targetTotal =
            total;


        // =====================================
        // Log Distribution
        // =====================================

        console.log(
            "Mixed Questions Target:",
            targetTotal
        );


        console.log(
            "Mixed Bank Questions Target:",
            bankCount
        );


        console.log(
            "Mixed Generated Questions Target:",
            generatedCount
        );


        // =====================================
        // Load Bank
        // =====================================

        let bankQuestions = [];


        if(
            bankCount > 0
        ){

            bankQuestions =
                await this.loadFromFile(
                    activityData
                );

        }


        bankQuestions =
            this.takeRandomUnique(
                bankQuestions,
                bankCount
            );


        // =====================================
        // Generated Questions
        // =====================================

        let generatedQuestions = [];


        if(
            generatedCount > 0
        ){

            generatedQuestions =
                this.generateQuestions({

                    ...activityData,

                    settings: {

                        ...settings,

                        questions:
                            generatedCount

                    }

                });

        }


        // =====================================
        // Combine
        // =====================================

        let combined = [

            ...bankQuestions,

            ...generatedQuestions

        ];


        // =====================================
        // Safety Trim
        // =====================================

        if(
            combined.length > targetTotal
        ){

            combined =
                combined.slice(
                    0,
                    targetTotal
                );

        }


        // =====================================
        // Final Shuffle
        // =====================================

        combined =
            this.shuffle(
                combined
            );


        console.log(
            "Mixed Questions Bank:",
            bankQuestions.length
        );


        console.log(
            "Mixed Questions Generated:",
            generatedQuestions.length
        );


        console.log(
            "Mixed Questions Final:",
            combined.length
        );


        // =====================================
        // Final Count Check
        // =====================================

        if(
            combined.length !==
            targetTotal
        ){

            console.warn(
                "QuestionProvider: Mixed Question Count Mismatch",
                {
                    expected:
                        targetTotal,

                    actual:
                        combined.length
                }
            );

        }


        return combined;

    },


    // =====================================
    // Take Random Unique
    // =====================================

    takeRandomUnique: function(
        array,
        count
    ){

        if(
            !Array.isArray(array)
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
    // Shuffle
    // =====================================

    shuffle: function(
        array
    ){

        if(
            !Array.isArray(array)
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
    // Last Source
    // =====================================

    getLastSource: function(){

        return this.lastSource;

    },


    // =====================================
    // Last Questions
    // =====================================

    getLastQuestions: function(){

        return this.lastQuestions;

    },


    // =====================================
    // Reset
    // =====================================

    reset: function(){

        this.lastSource =
            null;


        this.lastQuestions =
            [];

    }

};


// =====================================
// Global Access
// =====================================

window.QuestionProvider =
    QuestionProvider;


// =====================================
// Ready
// =====================================

console.log(
    "Question Provider Ready"
);