// =====================================
// Tahouri Edu Platform
// Spelling Performance Analyzer
// Version 1.0
// =====================================

(function (window) {
    "use strict";

    function key(rule, target) {
        return (rule || "unclassified") + "::" + (target || "unknown");
    }

    const SpellingPerformanceAnalyzer = {
        version: "1.0",

        analyze: function (records) {
            const list = Array.isArray(records) ? records : [];
            const byRule = {};
            const byTarget = {};

            list.forEach(function (record) {
                if (!record) return;
                const rule = record.spellingRule || "unclassified";
                const target = record.target || "unknown";
                const bucket = byRule[rule] || (byRule[rule] = {
                    rule: rule, attempts: 0, completed: 0, characterErrors: 0, accuracy: 0
                });
                bucket.attempts += 1;
                bucket.completed += record.completed ? 1 : 0;
                bucket.characterErrors += Number(record.characterErrors) || 0;

                const targetBucket = byTarget[target] || (byTarget[target] = {
                    target: target, rule: rule, attempts: 0, completed: 0, characterErrors: 0, accuracy: 0
                });
                targetBucket.attempts += 1;
                targetBucket.completed += record.completed ? 1 : 0;
                targetBucket.characterErrors += Number(record.characterErrors) || 0;
            });

            Object.keys(byRule).forEach(function (id) {
                const item = byRule[id];
                item.accuracy = item.attempts ? item.completed / item.attempts : 0;
                item.errorRate = item.attempts
                    ? item.characterErrors / item.attempts
                    : 0;
            });

            Object.keys(byTarget).forEach(function (id) {
                const item = byTarget[id];
                item.accuracy = item.attempts ? item.completed / item.attempts : 0;
                item.errorRate = item.attempts
                    ? item.characterErrors / item.attempts
                    : 0;
            });

            return { byRule: byRule, byTarget: byTarget };
        },

        rankRules: function (records) {
            const analysis = this.analyze(records);
            return Object.keys(analysis.byRule).map(function (id) {
                return analysis.byRule[id];
            }).sort(function (a, b) {
                return (b.errorRate - a.errorRate) ||
                    (a.accuracy - b.accuracy);
            });
        },

        rankTargets: function (records) {
            const analysis = this.analyze(records);
            return Object.keys(analysis.byTarget).map(function (id) {
                return analysis.byTarget[id];
            }).sort(function (a, b) {
                return (b.errorRate - a.errorRate) ||
                    (a.accuracy - b.accuracy);
            });
        },

        summarize: function (records) {
            const analysis = this.analyze(records);
            return {
                total: Array.isArray(records) ? records.length : 0,
                rules: Object.keys(analysis.byRule).length,
                targets: Object.keys(analysis.byTarget).length,
                weakRules: this.rankRules(records).filter(function (item) {
                    return item.errorRate > 0;
                }),
                weakTargets: this.rankTargets(records).filter(function (item) {
                    return item.errorRate > 0;
                })
            };
        }
    };

    window.SpellingPerformanceAnalyzer = SpellingPerformanceAnalyzer;
})(window);

console.log("Spelling Performance Analyzer v1.0 Ready");
