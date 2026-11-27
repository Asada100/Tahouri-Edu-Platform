"use strict";
const assert=require("node:assert/strict");
const {createSessionResumeTransaction}=require("./sessionResumeTransaction");
function fixture(overrides){
 const state={current:{id:"prior"},restoring:false,gameplay:false,engine:{value:"before"},
  runtime:{activity:"prior",screen:"prior",css:"prior"},persisted:"raw:legacy"};
 const tx=createSessionResumeTransaction({
  getCurrentSession:()=>state.current,getRestoringSession:()=>state.restoring,getGameplayActive:()=>state.gameplay,
  setCurrentSession:v=>{state.current=v;},setRestoringSession:v=>{state.restoring=v;},setGameplayActive:v=>{state.gameplay=v;},
  captureEngineState:()=>({...state.engine}),rollbackEngineState:s=>{state.engine={...s};},
  captureRuntimeState:()=>({...state.runtime}),restoreRuntimeState:s=>{state.runtime={...s};},
  capturePersistedSnapshot:()=>state.persisted,restorePersistedSnapshot:s=>{state.persisted=s;},
  restoreEngine:async()=>{state.engine.value="restored";state.runtime={activity:"target",screen:"target",css:"playing"};return true;},
  persistSession:candidate=>{state.persisted=JSON.stringify(candidate);return true;},
  ...overrides
 });
 return {state,tx};
}
(async()=>{
 let f=fixture({restoreEngine:async()=>false});
 let r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"restore-rejected");assert.equal(f.state.current.id,"prior");assert.equal(f.state.engine.value,"before");assert.deepEqual(f.state.runtime,{activity:"prior",screen:"prior",css:"prior"});assert.equal(f.state.restoring,false);console.log("PASS — false restore rolls back engine, runtime and published session");
 f=fixture({restoreEngine:async()=>{f.state.engine.value="partial";f.state.runtime.screen="partial";throw Error("restore");}});
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"restore-threw");assert.equal(f.state.current.id,"prior");assert.equal(f.state.engine.value,"before");assert.deepEqual(f.state.runtime,{activity:"prior",screen:"prior",css:"prior"});assert.equal(f.state.restoring,false);console.log("PASS — thrown restore rolls back engine and visible runtime state");
 f=fixture({persistSession:()=>{f.state.persisted="partial-write";return false;}});
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"persist-failed");assert.equal(f.state.current.id,"prior");assert.equal(f.state.engine.value,"before");assert.deepEqual(f.state.runtime,{activity:"prior",screen:"prior",css:"prior"});assert.equal(f.state.persisted,"raw:legacy");assert.equal(f.state.gameplay,false);console.log("PASS — failed partial persistence restores original raw snapshot");
 f=fixture({persistSession:()=>{f.state.persisted="partial-write";throw Error("disk");}});
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"persist-threw");assert.equal(f.state.current.id,"prior");assert.equal(f.state.engine.value,"before");assert.equal(f.state.persisted,"raw:legacy");console.log("PASS — persistence exception restores raw bytes and runtime");
 f=fixture({restorePersistedSnapshot:()=>{throw Error("rollback storage unavailable");},persistSession:()=>false});
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"rollback-failed");assert.equal(r.rollbackFailures[0].part,"persistedSnapshot");console.log("PASS — failed durable rollback is explicit and never reported as clean rollback");
 f=fixture();
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.ok,true);assert.equal(r.session.status,"active");assert.equal(f.state.current.id,"target");assert.equal(JSON.parse(f.state.persisted).status,"active");assert.equal(f.state.gameplay,true);assert.equal(f.state.restoring,false);console.log("PASS — verified persistence precedes publishing active session");
 console.log("SESSION RESUME TRANSACTION PROTOTYPE: PASS (6/6)");
})().catch(e=>{console.error(e);process.exitCode=1;});
