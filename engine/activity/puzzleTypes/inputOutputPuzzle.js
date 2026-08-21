// =====================================
// Tahouri Edu Platform
// Input / Output Puzzle
// Version 1.0
//
// Puzzle Type:
// - inputOutput
//
// Examples:
// 2 -> 5
// 4 -> 9
// 7 -> 15
// 9 -> ?
//
// The rule may be known or unknown.
// =====================================


const InputOutputPuzzle = {


    // =====================================
    // START
    // =====================================

    start: function (
        engine,
        data
    ) {

        const inputs =
            Array.isArray(
                data.inputs
            )
                ? [...data.inputs]
                : [];


        const outputs =
            Array.isArray(
                data.outputs
            )
                ? [...data.outputs]
                : [];


        if (
            inputs.length === 0
        ) {

            console.error(
                "Input Output Puzzle: Inputs Missing"
            );

            return null;

        }


        if (
            outputs.length !==
            inputs.length
        ) {

            console.error(
                "Input Output Puzzle: Inputs And Outputs Length Mismatch"
            );

            return null;

        }


        // =================================
        // FIND MISSING OUTPUT
        // =================================

        const missingIndices = [];


        outputs.forEach(
            function (
                value,
                index
            ) {

                if (
                    value === null
                    ||
                    value === undefined
                ) {

                    missingIndices.push(
                        index
                    );

                }

            }
        );


        if (
            missingIndices.length !==
            1
        ) {

            console.error(
                "Input Output Puzzle: Exactly One Missing Output Is Required"
            );

            return null;

        }


        const missingIndex =
            missingIndices[0];


        // =================================
        // OPTIONAL RULE
        // =================================

        const rule =
            data.rule ||
            null;


        // =================================
        // SAVE PUZZLE
        // =================================

        engine.puzzle = {

            type:
                "inputOutput",

            dataType:
                data.dataType ||
                "number",

            source:
                data.source ||
                "generated",

            instruction:
                data.instruction ||
                "خروجی مناسب را پیدا کن",

            inputs:
                inputs,

            outputs:
                outputs,

            missingIndex:
                missingIndex,

            rule:
                rule,

            answer:
                data.answer

        };


        // =================================
        // CURRENT ITEMS
        // =================================

        engine.items =
            outputs.map(
                function (
                    value
                ) {

                    return value;

                }
            );


        // =================================
        // START
        // =================================

        engine.emitStarted();


        console.log(
            "Input Output Puzzle Started"
        );


        return engine.getState();

    },


    // =====================================
    // CHECK
    // =====================================

    check: function (
        engine
    ) {

        const value =
            engine.items[
                engine.puzzle.missingIndex
            ];


        const correct =
            engine.valuesEqual(

                value,

                engine.puzzle.answer

            );


        if (
            correct
        ) {

            console.log(
                "Input Output Correct"
            );


            engine.finish();


            return true;

        }


        console.log(
            "Input Output Wrong"
        );


        engine.emitWrong();


        return false;

    }

};


window.InputOutputPuzzle =
    InputOutputPuzzle;


PuzzleTypeRegistry.register(
    "inputOutput",
    InputOutputPuzzle
);


console.log(
    "Input Output Puzzle v1.0 Ready"
);