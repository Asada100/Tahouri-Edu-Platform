"use strict";
// Isolated resume transaction prototype. Not wired into ActivitySessionManager.
function createSessionResumeTransaction(options) {
  const o=options||{};
  const clone=value=>JSON.parse(JSON.stringify(value));
  async function resume(session) {
    if(!session||typeof session!=="object")return {ok:false,status:"invalid-session"};
    const previous={currentSession:o.getCurrentSession?o.getCurrentSession():null,
      restoringSession:o.getRestoringSession?o.getRestoringSession():false,
      gameplayActive:o.getGameplayActive?o.getGameplayActive():false};
    let rollbackEngine;
    try { rollbackEngine=typeof o.captureEngineState==="function"?o.captureEngineState():undefined; }
    catch(error){return {ok:false,status:"capture-failed",error};}
    const candidate=clone(session);
    try {
      if(o.setRestoringSession)o.setRestoringSession(true);
      const restored=await o.restoreEngine(candidate);
      if(restored!==true) {
        if(o.rollbackEngineState)o.rollbackEngineState(rollbackEngine);
        if(o.setCurrentSession)o.setCurrentSession(previous.currentSession);
        if(o.setGameplayActive)o.setGameplayActive(previous.gameplayActive);
        return {ok:false,status:"restore-rejected"};
      }
      candidate.status="active";
      let saved=false;
      try { saved=o.persistSession(candidate)===true; } catch(error) {
        if(o.rollbackEngineState)o.rollbackEngineState(rollbackEngine);
        if(o.setCurrentSession)o.setCurrentSession(previous.currentSession);
        if(o.setGameplayActive)o.setGameplayActive(previous.gameplayActive);
        return {ok:false,status:"persist-threw",error};
      }
      if(!saved) {
        if(o.rollbackEngineState)o.rollbackEngineState(rollbackEngine);
        if(o.setCurrentSession)o.setCurrentSession(previous.currentSession);
        if(o.setGameplayActive)o.setGameplayActive(previous.gameplayActive);
        return {ok:false,status:"persist-failed"};
      }
      if(o.setCurrentSession)o.setCurrentSession(clone(candidate));
      if(o.setGameplayActive)o.setGameplayActive(true);
      return {ok:true,status:"resumed",session:clone(candidate)};
    } catch(error) {
      try { if(o.rollbackEngineState)o.rollbackEngineState(rollbackEngine); } catch(rollbackError) {
        return {ok:false,status:"rollback-failed",error,rollbackError};
      }
      if(o.setCurrentSession)o.setCurrentSession(previous.currentSession);
      if(o.setGameplayActive)o.setGameplayActive(previous.gameplayActive);
      return {ok:false,status:"restore-threw",error};
    } finally {
      if(o.setRestoringSession)o.setRestoringSession(previous.restoringSession);
    }
  }
  return Object.freeze({resume});
}
if(typeof module!=="undefined"&&module.exports)module.exports={createSessionResumeTransaction};
if(typeof window!=="undefined")window.TahouriExperimentalSessionResumeTransaction=Object.freeze({createSessionResumeTransaction});
