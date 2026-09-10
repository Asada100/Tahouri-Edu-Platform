// =====================================
// Tahouri Edu Platform
// Matching Engine
// Version 1.0
//
// Responsibilities:
// - Generic matching core
// - Pair selection
// - Match validation
// - Move tracking
// - Completion state
// - Session state
//
// Design:
// - Subject-agnostic
// - No mathematics / Persian / science logic
// - No rendering
// - No content generation
// - No provider dependency in the core
//
// Expected content shape:
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


const MatchingEngine = {


    // =====================================
    // STATE
    // =====================================

    state: {

        started: false,

        isFinished: false,

        locked: false

    },


    // =====================================
    // CURRENT ACTIVITY
    // =====================================

    activity: null,


    // =====================================
    // CURRENT MATCHING DATA
    // =====================================

    matching: null,


    // =====================================
    // ITEMS
    // =====================================

    leftItems: [],

    rightItems: [],


    // =====================================
    // MATCH STATE
    // =====================================

    selected: {

        left: null,

        right: null

    },

    matchedPairs: [],

    moves: 0,


    // =====================================
    // START
    // =====================================

    start: function(activityData) {

        if (!activityData) {

            console.error(
                "Matching Engine: Activity Data Missing"
            );

            return null;

        }


        this.reset();


        this.activity = activityData;


        const matching =
            this.extractMatchingData(activityData);


        if (!matching) {

            console.error(
                "Matching Engine: Matching Data Missing"
            );

            return null;

        }


        const normalized =
            this.normalizeMatchingData(matching);


        if (!normalized || normalized.pairs.length === 0) {

            console.error(
                "Matching Engine: No Matching Pairs Available"
            );

            return null;

        }


        this.matching = normalized;


        this.leftItems =
            normalized.pairs.map(function(pair) {

                return pair.left;

            });


        this.rightItems =
            normalized.pairs.map(function(pair) {

                return pair.right;

            });


        this.shuffle(this.rightItems);


        this.state.started = true;

        this.state.isFinished = false;

        this.state.locked = false;


        console.log(
            "Matching Engine Started",
            {
                pairs: normalized.pairs.length
            }
        );


        return this.getState();

    },


    // =====================================
    // EXTRACT DATA
    // =====================================

    extractMatchingData: function(activityData) {

        if (activityData.matching) {

            return activityData.matching;

        }


        if (activityData.pairs) {

            return activityData;

        }


        if (activityData.content && activityData.content.pairs) {

            return activityData.content;

        }


        return null;

    },


    // =====================================
    // NORMALIZE DATA
    // =====================================

    normalizeMatchingData: function(data) {

        if (!data || !Array.isArray(data.pairs)) {

            return null;

        }


        const pairs = [];


        data.pairs.forEach(function(pair, index) {

            if (!pair) {

                return;

            }


            const pairId =
                pair.id !== undefined
                    ? String(pair.id)
                    : "pair-" + (index + 1);


            const left =
                MatchingEngine.normalizeItem(
                    pair.left,
                    "left-" + (index + 1)
                );


            const right =
                MatchingEngine.normalizeItem(
                    pair.right,
                    "right-" + (index + 1)
                );


            if (!left || !right) {

                return;

            }


            pairs.push({

                id: pairId,

                left: left,

                right: right

            });

        });


        return {

            type:
                data.type || "matching",

            instruction:
                data.instruction || "",

            pairs: pairs

        };

    },


    // =====================================
    // NORMALIZE ITEM
    // =====================================

    normalizeItem: function(item, fallbackId) {

        if (item === null || item === undefined) {

            return null;

        }


        if (typeof item === "object" && !Array.isArray(item)) {

            if (item.id === undefined || item.id === null) {

                return {

                    ...item,

                    id: fallbackId

                };

            }


            return {

                ...item,

                id: String(item.id)

            };

        }


        return {

            id: fallbackId,

            value: item

        };

    },


    // =====================================
    // SELECT ITEM
    // =====================================

    select: function(side, itemId) {

        if (!this.state.started || this.state.isFinished) {

            return this.getState();

        }


        if (this.state.locked) {

            return this.getState();

        }


        if (side !== "left" && side !== "right") {

            console.warn(
                "Matching Engine: Invalid Selection Side",
                side
            );

            return this.getState();

        }


        const item =
            this.findItem(side, itemId);


        if (!item) {

            console.warn(
                "Matching Engine: Item Not Found",
                side,
                itemId
            );

            return this.getState();

        }


        if (this.isMatched(side, item.id)) {

            return this.getState();

        }


        this.selected[side] = item;


        if (this.selected.left && this.selected.right) {

            return this.checkMatch();

        }


        return this.getState();

    },


    // =====================================
    // FIND ITEM
    // =====================================

    findItem: function(side, itemId) {

        const list =
            side === "left"
                ? this.leftItems
                : this.rightItems;


        const normalizedId =
            String(itemId);


        return list.find(function(item) {

            return String(item.id) === normalizedId;

        }) || null;

    },


    // =====================================
    // CHECK MATCH
    // =====================================

    checkMatch: function() {

        const left = this.selected.left;

        const right = this.selected.right;


        if (!left || !right) {

            return this.getState();

        }


        this.moves += 1;


        const pair =
            this.findPairForLeft(left.id);


        const isCorrect =
            !!pair &&
            String(pair.right.id) === String(right.id);


        const result = {

            correct:
                isCorrect,

            left:
                left,

            right:
                right,

            pairId:
                pair ? pair.id : null,

            moves:
                this.moves

        };


        if (isCorrect) {

            this.matchedPairs.push(pair.id);

        }


        this.selected.left = null;

        this.selected.right = null;


        if (this.matchedPairs.length >= this.matching.pairs.length) {

            this.finish();

        }


        return result;

    },


    // =====================================
    // FIND PAIR
    // =====================================

    findPairForLeft: function(leftId) {

        return this.matching.pairs.find(function(pair) {

            return String(pair.left.id) === String(leftId);

        }) || null;

    },


    // =====================================
    // MATCHED CHECK
    // =====================================

    isMatched: function(side, itemId) {

        if (!this.matching) {

            return false;

        }


        const item =
            this.findItem(side, itemId);


        if (!item) {

            return false;

        }


        return this.matching.pairs.some(function(pair) {

            if (side === "left") {

                return String(pair.left.id) === String(item.id)
                    &&
                    MatchingEngine.matchedPairs.includes(pair.id);

            }


            return String(pair.right.id) === String(item.id)
                &&
                MatchingEngine.matchedPairs.includes(pair.id);

        });

    },


    // =====================================
    // FINISH
    // =====================================

    finish: function() {

        this.state.isFinished = true;

        this.state.locked = true;


        console.log(
            "Matching Engine Finished",
            {
                moves: this.moves,

                matchedPairs:
                    this.matchedPairs.length
            }
        );


        return this.getState();

    },


    // =====================================
    // RESET
    // =====================================

    reset: function() {

        this.state.started = false;

        this.state.isFinished = false;

        this.state.locked = false;


        this.activity = null;

        this.matching = null;


        this.leftItems = [];

        this.rightItems = [];


        this.selected = {

            left: null,

            right: null

        };


        this.matchedPairs = [];

        this.moves = 0;

    },


    // =====================================
    // GET STATE
    // =====================================

    getState: function() {

        return {

            started:
                this.state.started,

            finished:
                this.state.isFinished,

            locked:
                this.state.locked,

            instruction:
                this.matching
                    ? this.matching.instruction
                    : "",

            type:
                this.matching
                    ? this.matching.type
                    : null,

            leftItems:
                this.leftItems.map(function(item) {

                    return { ...item };

                }),

            rightItems:
                this.rightItems.map(function(item) {

                    return { ...item };

                }),

            selected: {

                left:
                    this.selected.left
                        ? { ...this.selected.left }
                        : null,

                right:
                    this.selected.right
                        ? { ...this.selected.right }
                        : null

            },

            matchedPairs:
                [...this.matchedPairs],

            totalPairs:
                this.matching
                    ? this.matching.pairs.length
                    : 0,

            moves:
                this.moves

        };

    },


    // =====================================
    // SESSION STATE
    // =====================================

    getSessionState: function() {

        return {

            type: "matching",

            activity:
                this.activity,

            matching:
                this.matching
                    ? JSON.parse(JSON.stringify(this.matching))
                    : null,

            leftItems:
                JSON.parse(JSON.stringify(this.leftItems)),

            rightItems:
                JSON.parse(JSON.stringify(this.rightItems)),

            selected: {

                left:
                    this.selected.left
                        ? { ...this.selected.left }
                        : null,

                right:
                    this.selected.right
                        ? { ...this.selected.right }
                        : null

            },

            matchedPairs:
                [...this.matchedPairs],

            moves:
                this.moves,

            state: {

                started:
                    this.state.started,

                isFinished:
                    this.state.isFinished,

                locked:
                    this.state.locked

            }

        };

    },


    // =====================================
    // RESTORE SESSION
    // =====================================

    restoreSession: function(snapshot) {

        if (!snapshot || snapshot.type !== "matching") {

            return null;

        }


        this.activity =
            snapshot.activity || null;


        this.matching =
            snapshot.matching
                ? JSON.parse(JSON.stringify(snapshot.matching))
                : null;


        this.leftItems =
            Array.isArray(snapshot.leftItems)
                ? JSON.parse(JSON.stringify(snapshot.leftItems))
                : [];


        this.rightItems =
            Array.isArray(snapshot.rightItems)
                ? JSON.parse(JSON.stringify(snapshot.rightItems))
                : [];


        this.selected = {

            left:
                snapshot.selected && snapshot.selected.left
                    ? { ...snapshot.selected.left }
                    : null,

            right:
                snapshot.selected && snapshot.selected.right
                    ? { ...snapshot.selected.right }
                    : null

        };


        this.matchedPairs =
            Array.isArray(snapshot.matchedPairs)
                ? [...snapshot.matchedPairs]
                : [];


        this.moves =
            Number.isFinite(snapshot.moves)
                ? snapshot.moves
                : 0;


        this.state.started =
            !!(snapshot.state && snapshot.state.started);

        this.state.isFinished =
            !!(snapshot.state && snapshot.state.isFinished);

        this.state.locked =
            !!(snapshot.state && snapshot.state.locked);


        return this.getState();

    },


    // =====================================
    // SHUFFLE
    // =====================================

    shuffle: function(items) {

        for (let i = items.length - 1; i > 0; i -= 1) {

            const j =
                Math.floor(Math.random() * (i + 1));


            const temp =
                items[i];


            items[i] =
                items[j];


            items[j] =
                temp;

        }


        return items;

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.MatchingEngine =
    MatchingEngine;


// =====================================
// READY
// =====================================

console.log(
    "Matching Engine Ready v1.0"
);