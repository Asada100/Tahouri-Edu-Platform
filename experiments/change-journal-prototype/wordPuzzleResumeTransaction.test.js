"use strict";
const assert=require("node:assert/strict");
const {executeWordPuzzleResumeTransaction}=require("./wordPuzzleResumeTransaction");
const valid={version:"1.9",schemaVersion:1,id:"session-2",profileId:"profile-a",
 activityId:"word-puzzle",activityType:"WordPuzzleEngine",status:"resumable",
 engineState:{kind:"wordPuzzle",state:{correct:1},round:{type:"wordBuilder"}}};
const initialRaw=' {"legacy":true, "profileId":"profile-a"} ';

async function scenario(fault){
 let raw=initialRaw,runtime={sessionId:"previous",host:"active-A"},hostState="old";
 const initialRuntime=structuredClone(runtime);
 let events=0,disposed=0,prepared=0,publishCalls=0,restoreCalls=0;
 const storage={
  readRaw:()=>{if(fault==="readback-throw"&&raw!==initialRaw)throw Error("readback-throw");
   if(fault==="readback-mismatch"&&raw!==initialRaw)return raw+" ";return raw;},
  writeRaw:(_k,v)=>{raw=v;if(fault==="write-false")return false;if(fault==="write-throw")throw Error("write-throw");return true;},
  restoreRaw:(_k,v)=>{if(fault==="rollback-fail")return false;raw=v;return true;}
 };
 const publication={
  capture:()=>structuredClone(runtime),
  publish:()=>{publishCalls++;runtime={sessionId:"session-2",host:"candidate-B"};
   if(fault==="publish-false"||fault==="rollback-fail"||fault==="publish-rollback-fail")return false;if(fault==="publish-throw")throw Error("publish-throw");return true;},
  restore:v=>{restoreCalls++;if(fault==="publish-rollback-fail")return false;runtime=structuredClone(v);return true;}
 };
 const result=await executeWordPuzzleResumeTransaction({
  storage,storageKey:"profile-a:session",candidateSession:structuredClone(valid),
  validate:s=>!!s&&s.profileId==="profile-a"&&s.activityId==="word-puzzle"&&
   s.activityType==="WordPuzzleEngine"&&s.engineState?.kind==="wordPuzzle",
  prepareHost:async()=>{prepared++;if(fault==="prepare")return null;
   return {commit:async()=>{hostState="partially-committed";
     if(fault==="host-false"||fault==="dispose-fail")return false;if(fault==="host-throw")throw Error("host-throw");return true;},
    dispose:async()=>{disposed++;hostState="old";return fault!=="dispose-fail";}};},
  publication,emitResumed:()=>{events++;if(fault==="event-throw")throw Error("event-throw");}
 });
 if(fault==="success"){
  assert.equal(result.ok,true);assert.equal(result.eventCount,1);assert.equal(events,1);
  assert.equal(JSON.parse(raw).status,"active");assert.equal(runtime.sessionId,"session-2");return;
 }
 if(fault==="event-throw"){
  assert.equal(result.ok,true);assert.equal(result.eventCount,null);assert.equal(result.eventDeliveryError,"event-throw");
  assert.equal(events,1);assert.equal(runtime.sessionId,"session-2");return;
 }
 assert.equal(result.ok,false,fault);assert.equal(events,0,fault+" must not emit resume event");
 const rollbackExpected=fault!=="rollback-fail"&&fault!=="publish-rollback-fail"&&fault!=="dispose-fail";
 assert.equal(result.rollbackOk,rollbackExpected,fault+" rollback status");
 if(fault==="rollback-fail")assert.notEqual(raw,initialRaw);
 else assert.equal(raw,initialRaw,fault+" must restore exact raw bytes");
 if(fault==="publish-rollback-fail")assert.equal(runtime.sessionId,"session-2");
 else assert.deepEqual(runtime,initialRuntime,fault+" must restore published runtime");
 if(fault==="prepare"){assert.equal(prepared,1);assert.equal(disposed,0);}
 else assert.equal(disposed,1,fault+" candidate host disposed");
 if(fault==="publish-false"||fault==="publish-throw"||fault==="rollback-fail"||fault==="publish-rollback-fail")assert.equal(restoreCalls,1);
 else assert.equal(restoreCalls,0);
}
(async()=>{
 const cases=["success","prepare","write-false","write-throw","readback-throw","readback-mismatch",
  "host-false","host-throw","publish-false","publish-throw","rollback-fail",
  "publish-rollback-fail","dispose-fail","event-throw"];
 for(const fault of cases){await scenario(fault);console.log("PASS — "+fault);}
 // Invalid candidate must fail before host preparation or storage write.
 let prepared=false,writes=0;
 const invalid=await executeWordPuzzleResumeTransaction({
  storage:{readRaw:()=>null,writeRaw:()=>{writes++;return true;},restoreRaw:()=>true},
  storageKey:"profile-b:session",candidateSession:valid,validate:()=>false,
  prepareHost:async()=>{prepared=true;return null;},
  publication:{capture:()=>({}),publish:()=>true,restore:()=>true},emitResumed:()=>{}
 });
 assert.equal(invalid.reason,"invalid-session");assert.equal(prepared,false);assert.equal(writes,0);
 console.log("PASS — invalid-session");
 console.log("WORDPUZZLE RESUME TRANSACTION: 15/15 scenarios PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});
