// =====================================
// Tahouri Edu Platform
// Matching Provider
// Version 1.1
//
// Responsibilities:
// - Prepare Matching activity content
// - Normalize generic relations
// - Validate matching structure
// - Preserve subject-agnostic content
//
// Design:
// - One left item has one correct right target
// - A right item MAY be the correct target for many left items
// - Supports one-to-one and many-to-one Matching
// - No mathematics / Persian / science logic
// - No rendering
// - No game-state management
// =====================================

const MatchingProvider = {

    lastSource: null,
    lastContent: null,

    getContent: function(activityData) {
        this.lastSource = null;
        this.lastContent = null;

        if (!activityData) {
            console.error("MatchingProvider: Activity Data Missing");
            return null;
        }

        const matching = this.extractMatchingData(activityData);

        if (!matching) {
            console.error("MatchingProvider: Matching Data Missing");
            return null;
        }

        const normalized = this.normalize(matching);

        if (!normalized) {
            console.error("MatchingProvider: Invalid Matching Data");
            return null;
        }

        this.lastSource = this.detectSource(activityData);
        this.lastContent = normalized;

        console.log("MatchingProvider: Content Ready", {
            relations: normalized.pairs.length,
            leftItems: normalized.leftItems.length,
            rightItems: normalized.rightItems.length,
            source: this.lastSource
        });

        return normalized;
    },

    extractMatchingData: function(activityData) {
        if (activityData.matching) return activityData.matching;
        if (Array.isArray(activityData.pairs)) return activityData;
        if (activityData.content && Array.isArray(activityData.content.pairs)) {
            return activityData.content;
        }
        return null;
    },

    normalize: function(data) {
        if (!data || !Array.isArray(data.pairs)) return null;

        const pairs = [];
        const leftItems = [];
        const rightItems = [];
        const pairIds = Object.create(null);
        const leftIds = Object.create(null);
        const rightIds = Object.create(null);

        for (let index = 0; index < data.pairs.length; index += 1) {
            const pair = data.pairs[index];
            if (!pair || !pair.left || !pair.right) continue;

            const pairId = String(pair.id || "pair-" + (index + 1));
            const left = this.normalizeItem(pair.left, "left-" + (index + 1));
            const right = this.normalizeItem(pair.right, "right-" + (index + 1));

            if (!left || !right) continue;

            if (pairIds[pairId]) {
                console.warn("MatchingProvider: Duplicate Pair ID Skipped:", pairId);
                continue;
            }

            if (leftIds[left.id]) {
                console.warn("MatchingProvider: Duplicate Left ID Skipped:", left.id);
                continue;
            }

            pairIds[pairId] = true;
            leftIds[left.id] = true;

            // A right ID is intentionally allowed to repeat.
            // This is what enables many-to-one Matching.
            if (!rightIds[right.id]) {
                rightIds[right.id] = true;
                rightItems.push(right);
            }

            leftItems.push(left);
            pairs.push({
                id: pairId,
                left: left,
                right: right
            });
        }

        if (pairs.length === 0) return null;

        return {
            type: "matching",
            matchingType: data.matchingType || data.type || "basic",
            instruction: data.instruction || "",
            pairs: pairs,
            leftItems: leftItems,
            rightItems: rightItems
        };
    },

    normalizeItem: function(item, fallbackId) {
        if (item === null || typeof item === "undefined") return null;

        if (typeof item !== "object" || Array.isArray(item)) {
            return { id: fallbackId, value: item };
        }

        const id = String(item.id || fallbackId);
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

    validate: function(activityData) {
        const content = this.getContent(activityData);

        if (!content) {
            return {
                valid: false,
                pairs: 0,
                leftItems: 0,
                rightItems: 0,
                errors: ["Matching content is invalid."]
            };
        }

        return {
            valid: true,
            pairs: content.pairs.length,
            leftItems: content.leftItems.length,
            rightItems: content.rightItems.length,
            errors: []
        };
    },

    detectSource: function(activityData) {
        if (activityData.matching) return "matching";
        if (Array.isArray(activityData.pairs)) return "activity";
        if (activityData.content && Array.isArray(activityData.content.pairs)) {
            return "content";
        }
        return null;
    },

    getLastContent: function() {
        return this.lastContent;
    },

    getLastSource: function() {
        return this.lastSource;
    },

    reset: function() {
        this.lastSource = null;
        this.lastContent = null;
        console.log("MatchingProvider Reset");
    }
};

window.MatchingProvider = MatchingProvider;

console.log("Matching Provider v1.1 Ready");