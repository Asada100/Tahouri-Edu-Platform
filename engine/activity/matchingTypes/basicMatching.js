// =====================================
// Tahouri Edu Platform
// Basic Matching Handler
// Version 1.0
//
// Responsibilities:
// - Define the base Matching type
// - Accept normalized generic pairs
// - Keep type-specific preparation minimal
//
// Design:
// - Subject-agnostic
// - No mathematics logic
// - No Persian logic
// - No science logic
// - No rendering
// - No game-state management
// =====================================


const BasicMatching = {


    type: "basic",


    prepare: function (data) {

        if (!data || !Array.isArray(data.pairs)) {

            console.error(
                "Basic Matching: Invalid Data"
            );

            return null;

        }


        if (data.pairs.length === 0) {

            console.error(
                "Basic Matching: No Pairs Available"
            );

            return null;

        }


        return {

            type: "basic",

            instruction: data.instruction || "",

            pairs: data.pairs.map(function (pair) {

                return {

                    id: pair.id,

                    left: { ...pair.left },

                    right: { ...pair.right }

                };

            })

        };

    }

};


window.BasicMatching =
    BasicMatching;


MatchingTypeRegistry.register(
    "basic",
    BasicMatching
);


console.log(
    "Basic Matching v1.0 Ready"
);