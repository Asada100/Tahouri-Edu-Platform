"use strict";
const assert=require("node:assert/strict");
const {validateLegacySession}=require("./legacySessionValidator");
const base={version:"1.9",schemaVersion:1,id:"activity-session-legacy",profileId:"student-A",activityId:"activity-1",status:"resumable"};
const fixtures=[
 ["DictationEngine",{kind:"dictation",state:{index:0},content:{questions:[{id:"q1"}]}}],
 ["dictation",{kind:"dictation",state:{index:0},content:{questions:[{id:"q1"}]}}],
 ["WordPuzzleEngine",{kind:"wordPuzzle",state:{},round:{}}],
 ["wordPuzzle",{kind:"wordPuzzle",state:{},round:{}}],
 ["QuizEngine",{kind:"quiz",state:{},questions:[{id:"q1"}],currentQuestion:0}],
 ["quiz",{kind:"quiz",state:{},questions:[{id:"q1"}],currentQuestion:0}],
 ["MemoryEngine",{kind:"memory",cards:[{id:1}],totalPairs:1,matchedPairs:0}],
 ["memory",{kind:"memory",cards:[{id:1}],totalPairs:1,matchedPairs:0}],
 ["PuzzleEngine",{kind:"puzzle",state:{},items:[{id:1}],puzzle:{}}],
 ["puzzle",{kind:"puzzle",state:{},items:[{id:1}],puzzle:{}}],
 ["ClassificationEngine",{items:[{id:1}],categories:[{id:"c"}]}],
 ["classification",{items:[{id:1}],categories:[{id:"c"}]}]
];
for(const [activityType,engineState] of fixtures){
 assert.equal(validateLegacySession({...base,activityType,engineState},"student-A"),true,activityType);
 console.log("PASS — accepts runtime v1 shape: "+activityType);
}
function rejected(name,change){const value={...base,activityType:"quiz",engineState:{kind:"quiz",state:{},questions:[{id:"q1"}],currentQuestion:0}};change(value);assert.equal(validateLegacySession(value,"student-A"),false,name);console.log("PASS — rejects invalid "+name);}
rejected("profile mismatch",s=>s.profileId="student-B");
rejected("missing legacy id",s=>delete s.id);
rejected("wrong manager version",s=>s.version="2.0");
rejected("unsupported schema",s=>s.schemaVersion=3);
rejected("unknown activity engine",s=>s.activityType="UnknownEngine");
rejected("invalid quiz index",s=>s.engineState.currentQuestion=2);
rejected("empty quiz questions",s=>s.engineState.questions=[]);
rejected("invalid memory pair count",s=>{s.activityType="memory";s.engineState={kind:"memory",cards:[{}],totalPairs:1,matchedPairs:2};});
rejected("invalid word puzzle round",s=>{s.activityType="wordPuzzle";s.engineState={kind:"wordPuzzle",state:{},round:[]};});
console.log("LEGACY SESSION VALIDATOR RESULT: PASS (21/21)");
