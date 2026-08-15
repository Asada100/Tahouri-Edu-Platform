// =====================================
// Tahouri Edu Platform
// Engine Manager
// Version 1.4
// Engine Name Resolver
// Quiz + Memory + Puzzle
// =====================================


const EngineManager = {


    engines: {},


    // =====================================
    // Register Engine
    // =====================================

    register: function(id, engine) {

        if(engine){

            this.engines[id] =
                engine;

            console.log(
                "Engine Registered:",
                id
            );

        }

    },


    // =====================================
    // Get Engine
    // =====================================

    getEngine: function(id) {

        if(!id){

            return null;

        }


        // =================================
        // Direct Name
        // =================================

        if(
            this.engines[id]
        ){

            return this.engines[id];

        }


        // =================================
        // Normalize Engine Name
        // =================================

        const normalized =

            id
            .replace("Engine", "")
            .toLowerCase();


        if(
            this.engines[normalized]
        ){

            return this.engines[
                normalized
            ];

        }


        return null;

    },


    // =====================================
    // Initialize
    // =====================================

    init: function() {


        // =================================
        // Quiz Engine
        // =================================

        if(
            window.QuizEngine
        ){

            this.register(

                "quiz",

                window.QuizEngine

            );

        }


        // =================================
        // Memory Engine
        // =================================

        if(
            window.MemoryEngine
        ){

            this.register(

                "memory",

                window.MemoryEngine

            );

        }


        // =================================
        // Puzzle Engine
        // =================================

        if(
            window.PuzzleEngine
        ){

            this.register(

                "puzzle",

                window.PuzzleEngine

            );

        }


        console.log(
            "Engine Manager Initialized"
        );

    }

};


// =====================================
// Global Access
// =====================================

window.EngineManager =
    EngineManager;


// =====================================
// Ready
// =====================================

console.log(
    "Engine Manager Ready"
);


// =====================================
// Initialize
// =====================================

EngineManager.init();