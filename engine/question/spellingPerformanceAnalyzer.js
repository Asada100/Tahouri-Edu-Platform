// =====================================
// Tahouri Edu Platform
// Spelling Performance Analyzer
// Version 1.1
// =====================================
(function (window) {
    "use strict";
    function resolveRecords(source, level) {
        if (Array.isArray(source)) return source;
        if (!source || typeof source !== "object") return [];
        if (level === "target" && Array.isArray(source.targetAnswers)) return source.targetAnswers;
        if (Array.isArray(source.records)) return source.records;
        if (Array.isArray(source.answers)) return source.answers;
        if (Array.isArray(source.targetAnswers)) return source.targetAnswers;
        return [];
    }
    const SpellingPerformanceAnalyzer = {
        version: "1.1",
        getRecords: function (source, level) { return resolveRecords(source, level); },
        analyze: function (records) {
            const list=resolveRecords(records), byRule={}, byTarget={};
            list.forEach(function(record){
                if(!record)return;
                const rule=record.spellingRule||"unclassified", target=record.target||"unknown";
                const b=byRule[rule]||(byRule[rule]={rule:rule,attempts:0,completed:0,characterErrors:0,accuracy:0});
                b.attempts++; b.completed+=record.completed?1:0; b.characterErrors+=Number(record.characterErrors)||0;
                const t=byTarget[target]||(byTarget[target]={target:target,rule:rule,attempts:0,completed:0,characterErrors:0,accuracy:0});
                t.attempts++; t.completed+=record.completed?1:0; t.characterErrors+=Number(record.characterErrors)||0;
            });
            Object.keys(byRule).forEach(function(id){const x=byRule[id];x.accuracy=x.attempts?x.completed/x.attempts:0;x.errorRate=x.attempts?x.characterErrors/x.attempts:0;});
            Object.keys(byTarget).forEach(function(id){const x=byTarget[id];x.accuracy=x.attempts?x.completed/x.attempts:0;x.errorRate=x.attempts?x.characterErrors/x.attempts:0;});
            return {byRule:byRule,byTarget:byTarget};
        },
        analyzeSession: function(session) {
            return {questions:this.analyze(resolveRecords(session,"question")),targets:this.analyze(resolveRecords(session,"target"))};
        },
        rankRules: function(records) {
            const a=this.analyze(records);
            return Object.keys(a.byRule).map(function(id){return a.byRule[id];}).sort(function(x,y){return(y.errorRate-x.errorRate)||(x.accuracy-y.accuracy);});
        },
        rankTargets: function(records) {
            const a=this.analyze(resolveRecords(records,"target"));
            return Object.keys(a.byTarget).map(function(id){return a.byTarget[id];}).sort(function(x,y){return(y.errorRate-x.errorRate)||(x.accuracy-y.accuracy);});
        },
        summarize: function(records) {
            const a=this.analyze(records), list=resolveRecords(records);
            return {total:list.length,rules:Object.keys(a.byRule).length,targets:Object.keys(a.byTarget).length,
                weakRules:this.rankRules(records).filter(function(x){return x.errorRate>0;}),
                weakTargets:this.rankTargets(records).filter(function(x){return x.errorRate>0;})};
        },
        summarizeSession: function(session) {
            const q=resolveRecords(session,"question"), t=resolveRecords(session,"target");
            return {questionCount:q.length,targetCount:t.length,questions:this.analyze(q),targets:this.analyze(t),
                weakRules:this.rankRules(t).filter(function(x){return x.errorRate>0;}),
                weakTargets:this.rankTargets(t).filter(function(x){return x.errorRate>0;})};
        }
    };
    window.SpellingPerformanceAnalyzer=SpellingPerformanceAnalyzer;
})(window);
console.log("Spelling Performance Analyzer v1.1 Ready");
