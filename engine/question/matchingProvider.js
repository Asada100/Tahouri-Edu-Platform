// =====================================
// Tahouri Edu Platform
// Matching Provider
// Version 1.0
//
// Responsibilities:
// - Prepare Matching activity content
// - Normalize generic pairs
// - Validate matching structure
// - Preserve subject-agnostic content
//
// Design:
// - No mathematics logic
// - No Persian logic
// - No science logic
// - No rendering
// - No game-state management
// - No dependency on MatchingEngine
//
// Supported content shape:
// {
//     type: "matching",
//     instruction: "...",
//     pairs: [
//         {
//             id: "pair-1",
//             left: { id: "l1", value: "..." },
//             right: { id: "r1", value: "..." }
//         }
//     ]
// }
// =====================================


const MatchingProvider = {


    // =====================================
    // STATE
    // =====================================

    lastSource: null,

    lastContent: null,


    // =====================================
    // GET CONTENT
    // =====================================

    getContent: function(activityData) {

        this.lastSource = null;
        this.lastContent = null;


        if (!activityData) {

            console.error(
                "MatchingProvider: Activity Data Missing"
            );

            return null;

        }


        const matching =
            this.extractMatchingData(activityData);


        if (!matching) {

            console.error(
                "MatchingProvider: Matching Data Missing"
            );

            return null;

        }


        const normalized =
            this.normalize(matching);


        if (!normalized) {

            console.error(
                "MatchingProvider: Invalid Matching Data"
            );

            return null;

        }


        this.lastSource =
            this.detectSource(activityData);

        this.lastContent = normalized;


        console.log(
            "MatchingProvider: Content Ready",
            {
                pairs: normalized.pairs.length,
                source: this.lastSource
            }
        );


        return normalized;

    },


    // =====================================
    // EXTRACT
    // =====================================

    extractMatchingData: function(activityData) {

        if (activityData.matching) {

            return activityData.matching;

        }


        if (Array.isArray(activityData.pairs)) {

            return activityData;

        }


        if (
            activityData.content &&
            Array.isArray(activityData.content.pairs)
        ) {

            return activityData.content;

        }


        return null;

    },


    // =====================================
    // NORMALIZE
    // =====================================

    normalize: function(data) {

        if (!data || !Array.isArray(data.pairs)) {

            return null;

        }


        const pairs = [];
        const pairIds = {};
        const leftIds = {};
        const rightIds = {};


        for (let index = 0; index < data.pairs.length; index++) {

            const pair = data.pairs[index];

            if (!pair || !pair.left || !pair.right) {

                continue;

            }

            const pairId =
                String(pair.id || "pair-" + (index + 1));

            const left =
                this.normalizeItem(pair.left, "left-" + (index + 1));
            const right =
                this.normalizeItem(pair.right, "right-" + (index + 1));


            if (!left || !right) {

                continue;

            }

            if (pairIds[pairId]) {

                console.warn(
                    "MatchingProvider: Duplicate Pair ID Skipped:",
                    pairId
                );

                continue;

            }

            if (leftIds[left.id]) {

                console.warn(
                    "MatchingProvider: Duplicate Left ID Skipped:",
                    left.id
                );

                continue;

            }

            if (rightIds[right.id]) {

                console.warn(
                    "MatchingProvider: Duplicate Right ID Skipped:",
                    right.id
                );

                continue;

            }


            pairIds[pairId] = true;
            leftIds[left.id] = true;
            rightIds[right.id] = true;


            pairs.push({
                id: pairId,
                left: left,
                right: right
            });

        }


        if (pairs.length === 0) {

            return null;

        }


        return {
            type: "matching",
            instruction: data.instruction || "",
            pairs: pairs
        };

    },


    // =====================================
    // NORMALIZE ITEM
    // =====================================

    normalizeItem: function(item, fallbackId) {

        if (
            item === null ||
            typeof item === "undefined"
        ) {

            return null;

        }


        if (
            typeof item !== "object" ||
            Array.isArray(item)
        ) {

            return {
                id: fallbackId,
                value: item
            };

        }


        const id =
            String(item.id || fallbackId);


        const normalized = {};

        Object.keys(item).forEach(function(key) {
            normalized[key] = item[key];
        });

        normalized.id = id;

        if (!Object.prototype.hasOwnProperty.call(normalized, "value")) {
            normalized.value = "";
        }


        return normalized;

    },


    // =====================================
    // VALIDATE
    // =====================================

    validate: function(activityData) {

        const content =
            this.getContent(activityData);


        if (!content) {

            return {
                valid: false,
                pairs: 0,
                errors: ["Matching content is invalid."]
            };

        }


        return {
            valid: true,
            pairs: content.pairs.length,
            errors: []
        };

    },


    // =====================================
    // SOURCE
    // =====================================

    detectSource: function(activityData) {

        if (activityData.matching) {
            return "matching";
        }

        if (Array.isArray(activityData.pairs)) {
            return "activity";
        }

        if (
            activityData.content &&
            Array.isArray(activityData.content.pairs)
        ) {
            return "content";
        }

        return null;

    },


    // =====================================
    // LAST CONTENT
    // =====================================

    getLastContent: function() {

        return this.lastContent;

    },


    // =====================================
    // LAST SOURCE
    // =====================================

    getLastSource: function() {

        return this.lastSource;

    },


    // =====================================
    // RESET
    // =====================================

    reset: function() {

        this.lastSource = null;
        this.lastContent = null;

        console.log(
            "MatchingProvider Reset"
        );

    }

};


// =====================================
// GLOBAL
// =====================================

window.MatchingProvider =
    MatchingProvider;


// =====================================
// READY
// =====================================

console.log(
    "Matching Provider v1.0 Ready"
);