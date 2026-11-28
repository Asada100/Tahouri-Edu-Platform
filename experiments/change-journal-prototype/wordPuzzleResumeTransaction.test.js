"use strict";
const assert = require("node:assert/strict");
const { executeWordPuzzleResumeTransaction } = require("./wordPuzzleResumeTransaction");

const valid = { version:"1.9", schemaVersion:1, id:"session-2", profileId:"profile-a",
  activityId:"word-puzzle", activityType:"WordPuzzleEngine", status:"resumable",
  engineState:{ kind:"wordPuzzle", state:{correct:1}, round:{type:"wordBuilder"} } };
const clone = x => JSON.parse(JSON.stringify(x));

async function scenario(fault) {
  let raw = JSON.stringify({id:"previous",profileId:"profile-a",status:"resumable"});
  const initialRaw = raw;
  let runtime = {sessionId:"previous",host:"active-A"};
  const initialRuntime = clone(runtime);
  let events = 0, disposed = 0, hostCommits = 0, publishes = 0;
  const storage = {
    readRaw: () => raw,
    writeRaw: (_key,value) => { if(fault==="write") return false; raw=value; return true; },
    restoreRaw: (_key,value) => { if(fault==="rollback") return false; raw=value; return true; }
  };
  const publication = {
    capture: () => clone(runtime),
    publish: () => { publishes++; if(fault==="publish") return false; runtime={sessionId:"session-2",host:"candidate-B"}; return true; },
    restore: value => { runtime=clone(value); return true; }
  };
  const result = await executeWordPuzzleResumeTransaction({
    storage, storageKey:"profile-a:session", candidateSession:clone(valid),
    validate: s => !!s && s.profileId==="profile-a" && s.activityId==="word-puzzle" &&
      s.activityType==="WordPuzzleEngine" && s.engineState?.kind==="wordPuzzle",
    prepareHost: async () => {
      if(fault==="prepare") return null;
      return { commit: async()=>{hostCommits++;return fault!=="host";},
        dispose: async()=>{disposed++;return true;} };
    },
    publication, emitResumed:()=>{events++;}
  });
  if(fault==="success"){
    assert.equal(result.ok,true); assert.equal(events,1); assert.equal(hostCommits,1);
    assert.equal(JSON.parse(raw).status,"active"); assert.equal(runtime.sessionId,"session-2");
    assert.equal(disposed,0); return;
  }
  assert.equal(result.ok,false, fault);
  assert.equal(events,0, fault+" must not emit activityResumed");
  assert.equal(raw,initialRaw, fault+" must restore exact previous storage bytes");
  assert.deepEqual(runtime,initialRuntime, fault+" must preserve published runtime");
  if(fault==="rollback") assert.equal(result.rollbackOk,false,"rollback failure must be explicit");
  else assert.equal(result.rollbackOk,true,fault+" rollback should verify");
  assert.equal(disposed, fault==="prepare" ? 0 : 1);
}

(async()=>{
 for(const fault of ["success","prepare","write","host","publish","rollback"]) {
   await scenario(fault); console.log("PASS — "+fault);
 }
 // Exact raw-value rollback after read-back mismatch, including whitespace and key ordering.
 let raw=' {"legacy":true, "profileId":"profile-a"} ';
 const original=raw; let events=0;
 const storage={readRaw:()=>raw,writeRaw:(_k,v)=>{raw=v;return true;},
   restoreRaw:(_k,v)=>{raw=v;return true;}};
 const result=await executeWordPuzzleResumeTransaction({
  storage,storageKey:"profile-a:session",candidateSession:clone(valid),
  validate:s=>!!s&&s.profileId==="profile-a"&&s.engineState?.kind==="wordPuzzle",
  prepareHost:async()=>({commit:async()=>true,dispose:async()=>true}),
  publication:{capture:()=>({}),publish:()=>true,restore:()=>true},
  emitResumed:()=>events++
 });
 assert.equal(result.ok,false); assert.equal(result.reason,"storage-readback-mismatch");
 assert.equal(raw,original); assert.equal(events,0);
 console.log("PASS — read-back mismatch restores exact raw bytes");
 // Invalid profile is rejected before preparation or writes.
 let prepared=false, writes=0;
 const invalid=await executeWordPuzzleResumeTransaction({
  storage:{readRaw:()=>null,writeRaw:()=>{writes++;return true;},restoreRaw:()=>true},
  storageKey:"profile-b:session",candidateSession:clone(valid),
  validate:()=>false,prepareHost:async()=>{prepared=true;return null;},
  publication:{capture:()=>({}),publish:()=>true,restore:()=>true},emitResumed:()=>events++
 });
 assert.equal(invalid.reason,"invalid-session"); assert.equal(prepared,false); assert.equal(writes,0);
 console.log("PASS — invalid profile/session rejected before preparation");
 console.log("WORDPUZZLE RESUME TRANSACTION COORDINATOR: 8/8 PASS (experiment only)");
})().catch(error=>{console.error(error);process.exitCode=1;});
