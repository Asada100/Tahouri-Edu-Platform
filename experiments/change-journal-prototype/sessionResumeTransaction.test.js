"use strict";
const assert=require("node:assert/strict");
const {createSessionResumeTransaction}=require("./sessionResumeTransaction");
function fixture(overrides){
 const state={current:{id:"prior"},restoring:false,gameplay:false,engine:{value:"before"},persisted:{id:"legacy",status:"resumable"}};
 const calls=[];
 const tx=createSessionResumeTransaction({
  getCurrentSession:()=>state.current,getRestoringSession:()=>state.restoring,getGameplayActive:()=>state.gameplay,
  setCurrentSession:v=>{state.current=v;},setRestoringSession:v=>{state.restoring=v;},setGameplayActive:v=>{state.gameplay=v;},
  captureEngineState:()=>({...state.engine}),
  rollbackEngineState:s=>{state.engine={...s};calls.push("rollback");},
  restoreEngine:async candidate=>{state.engine.value="restored";return true;},
  persistSession:candidate=>{state.persisted=JSON.parse(JSON.stringify(candidate));return true;},
  ...overrides
 });
 return {state,calls,tx};
}
(async()=>{
 let f=fixture({restoreEngine:async()=>false});
 let r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"restore-rejected");assert.equal(f.state.current.id,"prior");assert.equal(f.state.engine.value,"before");assert.equal(f.state.restoring,false);console.log("PASS — false restore rolls back memory and engine");
 f=fixture({restoreEngine:async()=>{f.state.engine.value="partial";throw Error("restore");}});
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"restore-threw");assert.equal(f.state.current.id,"prior");assert.equal(f.state.engine.value,"before");assert.equal(f.state.restoring,false);console.log("PASS — thrown restore rolls back memory and engine");
 f=fixture({persistSession:()=>false});
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"persist-failed");assert.equal(f.state.current.id,"prior");assert.equal(f.state.engine.value,"before");assert.equal(f.state.persisted.status,"resumable");assert.equal(f.state.gameplay,false);console.log("PASS — persistence failure does not publish active resume");
 f=fixture({persistSession:()=>{throw Error("disk");}});
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.status,"persist-threw");assert.equal(f.state.current.id,"prior");assert.equal(f.state.engine.value,"before");console.log("PASS — persistence exception rolls back engine and memory");
 f=fixture();
 r=await f.tx.resume({id:"target",status:"resumable"});
 assert.equal(r.ok,true);assert.equal(r.session.status,"active");assert.equal(f.state.current.id,"target");assert.equal(f.state.persisted.status,"active");assert.equal(f.state.gameplay,true);assert.equal(f.state.restoring,false);console.log("PASS — verified persistence precedes publishing active session");
 console.log("SESSION RESUME TRANSACTION PROTOTYPE: PASS (5/5)");
})().catch(e=>{console.error(e);process.exitCode=1;});
