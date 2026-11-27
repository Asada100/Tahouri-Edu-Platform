"use strict";
// Isolated prototype only; this module is not wired into platform runtime.
function createSessionPersistenceGuard(o) {
  o=o||{}; let current=null;
  const validate=o.validateSession||((s)=>!!s&&s.schemaVersion===2&&typeof s.id==="string"&&typeof s.profileId==="string"&&typeof s.activityId==="string");
  const clone=v=>JSON.parse(JSON.stringify(v));
  function ctx(){let p,k;try{p=o.getProfileId&&o.getProfileId();}catch(e){return {status:"profile-error",error:e};}
    if(typeof p!=="string"||!p.trim())return {status:"missing-profile"};
    try{k=o.getScopedKey&&o.getScopedKey(p);}catch(e){return {status:"key-error",error:e};}
    if(typeof k!=="string"||!k.trim())return {status:"missing-key"};return {profileId:p,key:k};}
  function inspect(c){let raw;try{raw=o.readRaw(c.key);}catch(e){return {status:"storage-error",error:e};}
    if(raw==null)return {status:"missing",raw:null};if(typeof raw!=="string")return {status:"storage-error"};
    let value;try{value=JSON.parse(raw);}catch(e){return {status:"invalid-json",raw,error:e};}
    if(!validate(value))return {status:"unsupported-schema",raw,value};
    if(value.profileId!==c.profileId)return {status:"profile-mismatch",raw,value};
    return {status:"valid",raw,value};}
  function rollback(key,cause,status){try{if(typeof o.removeRaw!=="function")throw Error("Rollback unavailable");
      if(o.removeRaw(key)===false)throw Error("Rollback returned false");
      return {ok:false,status,rollback:"removed-candidate",error:cause,session:null};
    }catch(e){return {ok:false,status:"rollback-failed",error:cause,rollbackError:e,session:null};}}
  function begin(activity){current=null;const c=ctx();if(c.status)return {ok:false,status:c.status,session:null};
    const prior=inspect(c);if(prior.status!=="missing")return {ok:false,status:prior.status,stored:prior,session:null};
    let id;try{id=o.createIdentity&&o.createIdentity();}catch(e){return {ok:false,status:"identity-error",error:e,session:null};}
    if(typeof id!=="string"||!id.trim())return {ok:false,status:"identity-error",session:null};
    const activityId=String(activity&&activity.id||"");if(!activityId)return {ok:false,status:"invalid-activity",session:null};
    const candidate={schemaVersion:2,id,profileId:c.profileId,activityId,startedAt:(o.now||Date.now)(),status:"active"};
    const raw=JSON.stringify(candidate);
    try{if(o.writeRaw(c.key,raw)===false)throw Error("Storage write returned false");}
    catch(e){return {ok:false,status:"write-error",error:e,session:null};}
    let readback;try{readback=o.readRaw(c.key);}catch(e){return rollback(c.key,e,"readback-error");}
    if(readback!==raw)return rollback(c.key,Error("Read-back mismatch"),"readback-mismatch");
    let verified;try{verified=JSON.parse(readback);}catch(e){return rollback(c.key,e,"readback-invalid");}
    if(!validate(verified)||verified.profileId!==c.profileId||verified.id!==id)
      return rollback(c.key,Error("Read-back validation failed"),"readback-invalid");
    current=clone(verified);return {ok:true,status:"created",session:clone(current)};}
  function load(){current=null;const c=ctx();if(c.status)return {ok:false,status:c.status,session:null};
    const r=inspect(c);if(r.status!=="valid")return {ok:false,status:r.status,stored:r,session:null};
    current=clone(r.value);return {ok:true,status:"loaded",session:clone(current)};}
  function clear(){current=null;const c=ctx();if(c.status)return {ok:false,status:c.status};
    try{if(o.removeRaw(c.key)===false)return {ok:false,status:"remove-error"};current=null;return {ok:true,status:"cleared"};}
    catch(e){return {ok:false,status:"remove-error",error:e};}}
  return Object.freeze({begin,load,clear,getCurrentSession:()=>current?clone(current):null});
}
if(typeof module!=="undefined"&&module.exports)module.exports={createSessionPersistenceGuard};
if(typeof window!=="undefined")window.TahouriExperimentalSessionPersistenceGuard=Object.freeze({createSessionPersistenceGuard});
