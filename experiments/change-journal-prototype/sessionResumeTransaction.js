"use strict";
// Isolated resume transaction prototype. Not wired into ActivitySessionManager.
function createSessionResumeTransaction(options) {
  const o=options||{};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const restoreRuntime=snapshot=>{
    if(typeof o.restoreRuntimeState==="function")o.restoreRuntimeState(snapshot);
  };
  async function resume(session) {
    if(!session||typeof session!=="object")return {ok:false,status:"invalid-session"};
    const previous={
      currentSession:o.getCurrentSession?o.getCurrentSession():null,
      restoringSession:o.getRestoringSession?o.getRestoringSession():false,
      gameplayActive:o.getGameplayActive?o.getGameplayActive():false
    };
    let engineSnapshot,runtimeSnapshot,rawSnapshot;
    try {
      engineSnapshot=typeof o.captureEngineState==="function"?o.captureEngineState():undefined;
      runtimeSnapshot=typeof o.captureRuntimeState==="function"?o.captureRuntimeState():undefined;
      rawSnapshot=typeof o.capturePersistedSnapshot==="function"?o.capturePersistedSnapshot():undefined;
    } catch(error){return {ok:false,status:"capture-failed",error};}
    const candidate=clone(session);
    const rollback=()=>{
      const failures=[];
      try{if(o.rollbackEngineState)o.rollbackEngineState(engineSnapshot);}catch(error){failures.push({part:"engine",error});}
      try{restoreRuntime(runtimeSnapshot);}catch(error){failures.push({part:"runtime",error});}
      try{if(o.setCurrentSession)o.setCurrentSession(previous.currentSession);}catch(error){failures.push({part:"currentSession",error});}
      try{if(o.setGameplayActive)o.setGameplayActive(previous.gameplayActive);}catch(error){failures.push({part:"gameplayActive",error});}
      try{
        if(typeof o.restorePersistedSnapshot==="function"&&rawSnapshot!==undefined)o.restorePersistedSnapshot(rawSnapshot);
        if(typeof o.readPersistedSnapshot==="function"&&rawSnapshot!==undefined&&o.readPersistedSnapshot()!==rawSnapshot)
          throw new Error("Persisted snapshot rollback verification mismatch");
      }catch(error){failures.push({part:"persistedSnapshot",error});}
      return failures;
    };
    try {
      if(o.setRestoringSession)o.setRestoringSession(true);
      const restored=await o.restoreEngine(candidate);
      if(restored!==true) {
        const failures=rollback();
        return {ok:false,status:failures.length?"rollback-failed":"restore-rejected",rollbackFailures:failures};
      }
      candidate.status="active";
      let saved=false;
      try { saved=o.persistSession(candidate)===true; } catch(error) {
        const failures=rollback();
        return {ok:false,status:failures.length?"rollback-failed":"persist-threw",error,rollbackFailures:failures};
      }
      if(!saved) {
        const failures=rollback();
        return {ok:false,status:failures.length?"rollback-failed":"persist-failed",rollbackFailures:failures};
      }
      if(typeof o.readPersistedSnapshot!=="function") {
        const failures=rollback();
        return {ok:false,status:failures.length?"rollback-failed":"readback-unavailable",rollbackFailures:failures};
      }
      let persisted;
      try {
        const raw=o.readPersistedSnapshot();
        persisted=typeof raw==="string"?JSON.parse(raw):raw;
      } catch(error) {
        const failures=rollback();
        return {ok:false,status:failures.length?"rollback-failed":"readback-failed",error,rollbackFailures:failures};
      }
      if(!persisted||JSON.stringify(persisted)!==JSON.stringify(candidate)) {
        const failures=rollback();
        return {ok:false,status:failures.length?"rollback-failed":"readback-mismatch",rollbackFailures:failures};
      }
      // Publish shared state and irreversible notifications only after durable read-back.
      if(o.setCurrentSession)o.setCurrentSession(clone(candidate));
      if(o.setGameplayActive)o.setGameplayActive(true);
      if(typeof o.onCommitted==="function")o.onCommitted(clone(candidate));
      return {ok:true,status:"resumed",session:clone(candidate)};
    } catch(error) {
      const failures=rollback();
      return {ok:false,status:failures.length?"rollback-failed":"restore-threw",error,rollbackFailures:failures};
    } finally {
      if(o.setRestoringSession)o.setRestoringSession(previous.restoringSession);
    }
  }
  return Object.freeze({resume});
}
if(typeof module!=="undefined"&&module.exports)module.exports={createSessionResumeTransaction};
if(typeof window!=="undefined")window.TahouriExperimentalSessionResumeTransaction=Object.freeze({createSessionResumeTransaction});
