// =====================================
// Tahouri Edu Platform
// Puzzle Screen
// Version 2.1
//
// Supported:
// - ordering
// - sequence
// - visualMath
// - inputOutput
// - sentence
// - grid
// - wordGrid
// - crossGrid
//
// Jigsaw is handled by JigsawScreen.
// PuzzleScreen must not render jigsaw states.
// =====================================


const PuzzleScreen = {

    currentOrder: [],

    activityReadyConnected: false,


    // =====================================
    // INIT
    // =====================================

    init: function () {

        if (
            typeof EventManager ===
            "undefined"
        ) {

            console.error(
                "Puzzle Screen: EventManager Not Available"
            );

            return;

        }


        if (
            this.activityReadyConnected
        ) {

            return;

        }


        EventManager.on(
            "activityReady",
            function (payload) {

                PuzzleScreen.handleActivityReady(
                    payload
                );

            }
        );


        this.activityReadyConnected =
            true;


        console.log(
            "Puzzle Screen: Activity Ready Listener Connected"
        );

    },


    // =====================================
    // ACTIVITY READY
    // =====================================

    handleActivityReady: function (
        payload
    ) {

        if (!payload) {

            return;

        }


        const engineName =
            payload.engineName;


        if (
            engineName !== "PuzzleEngine"
            &&
            engineName !== "puzzle"
        ) {

            return;

        }


        const result =
            payload.result;


        if (!result) {

            console.error(
                "Puzzle Screen: Puzzle Result Missing"
            );

            return;

        }


        // Jigsaw has its own screen. Do not let the generic
        // PuzzleScreen consume or overwrite its UI.
        if (result.type === "jigsaw") {

            return;

        }


        console.log(
            "Puzzle Screen: Activity Ready Received",
            payload.activity
                ? payload.activity.id
                : null
        );


        this.show(
            result
        );

    },


    // =====================================
    // SHOW ROUTER
    // =====================================

    show: function (
        state
    ) {

        if (!state) {

            console.error(
                "Puzzle Screen: State Missing"
            );

            return;

        }


        // Jigsaw has a dedicated responsive UI and must also
        // be rendered through it when a saved puzzle session is resumed.
        if (state.type === "jigsaw") {

            if (
                typeof JigsawScreen !== "undefined"
                &&
                typeof JigsawScreen.render === "function"
            ) {

                JigsawScreen.render(
                    state
                );

            }

            return;

        }


        switch (
            state.type
        ) {

            case "ordering":

                this.showOrdering(
                    state
                );

                return;


            case "sequence":

                this.showSequence(
                    state
                );

                return;


            case "visualMath":

                this.showVisualMath(
                    state
                );

                return;


            case "inputOutput":

                this.showInputOutput(
                    state
                );

                return;


            case "sentence":

                this.showSentence(
                    state
                );

                return;


            case "grid":

                this.showGrid(
                    state
                );

                return;


            case "wordGrid":

                this.showWordGrid(
                    state
                );

                return;


            case "crossGrid":

                this.showCrossGrid(
                    state
                );

                return;


            default:

                console.warn(
                    "Puzzle Screen: Unsupported Type:",
                    state.type
                );

        }

    },


    // =====================================
    // ORDERING
    // =====================================

    showOrdering: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }

        // Existing implementation continues below.
