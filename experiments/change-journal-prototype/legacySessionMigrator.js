"use strict";
// Isolated v1 -> v2 migration prototype. Never wired into runtime.
function createLegacySessionMigrator(options) {
  const o=options||{};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const isFn=name=>typeof o[name]==="function";
  function migrate() {
    let profileId,key;
    try { profileId=isFn("getProfileId")?o.getProfileId():null; }
    catch(error){return {ok:false,status:"profile-error",error};}
    if(typeof profileId!=="string"||!profileId.trim())return {ok:false,status:"missing-profile"};
    try { key=isFn("getScopedKey")?o.getScopedKey(profileId):null; }
    catch(error){return {ok:false,status:"key-error",error};}
    if(typeof key!=="string"||!key.trim())return {ok:false,status:"missing-key"};
    let original;
    try { original=o.readRaw(key); }
    catch(error){return {ok:false,status:"storage-error",error};}
    if(original==null)return {ok:false,status:"missing"};
    if(typeof original!=="string")return {ok:false,status:"storage-error"};
    let legacy;
    try { legacy=JSON.parse(original); }
    catch(error){return {ok:false,status:"invalid-json",preserved:true};}
    if(legacy&&legacy.schemaVersion===2) {
      let valid=false;try{valid=isFn("validateCurrent")&&o.validateCurrent(legacy,profileId)===true;}catch(_){}
      return valid?{ok:true,status:"already-current",session:clone(legacy)}:{ok:false,status:"unsupported-schema",preserved:true};
    }
    const legacySchemaIsKnown=legacy&&typeof legacy==="object"&&!Array.isArray(legacy)&&
      (legacy.schemaVersion===undefined||legacy.schemaVersion===1);
    if(!legacySchemaIsKnown)return {ok:false,status:"unsupported-schema",preserved:true};
    let validLegacy=false;
    try { validLegacy=isFn("validateLegacy")&&o.validateLegacy(legacy,profileId)===true; }
    catch(error){return {ok:false,status:"legacy-validation-error",error,preserved:true};}
    if(!validLegacy||legacy.profileId!==profileId)return {ok:false,status:"invalid-legacy-session",preserved:true};
    let newId;
    try { newId=isFn("createIdentity")?o.createIdentity():null; }
    catch(error){return {ok:false,status:"identity-error",error,preserved:true};}
    if(typeof newId!=="string"||!newId.trim())return {ok:false,status:"identity-error",preserved:true};
    const candidate=clone(legacy);
    candidate.legacyId=legacy.id;
    candidate.id=newId;
    candidate.identityVersion=2;
    candidate.schemaVersion=2;
    let migratedRaw;
    try { migratedRaw=JSON.stringify(candidate); }
    catch(error){return {ok:false,status:"serialization-error",error,preserved:true};}
    function restore(cause,status) {
      try {
        const result=o.writeRaw(key,original);
        if(result===false)throw Error("Original snapshot restore returned false");
        const check=o.readRaw(key);
        if(check!==original)throw Error("Original snapshot restore verification mismatch");
        return {ok:false,status,originalPreserved:true,error:cause,session:null};
      } catch(rollbackError) {
        return {ok:false,status:"rollback-failed",originalPreserved:false,error:cause,rollbackError,session:null};
      }
    }
    try { if(o.writeRaw(key,migratedRaw)===false)throw Error("Migration write returned false"); }
    catch(error){return restore(error,"write-error");}
    let readBack;
    try { readBack=o.readRaw(key); }
    catch(error){return restore(error,"readback-error");}
    if(readBack!==migratedRaw)return restore(Error("Migrated snapshot read-back mismatch"),"readback-mismatch");
    let verified;
    try { verified=JSON.parse(readBack); }
    catch(error){return restore(error,"readback-invalid");}
    let validCurrent=false;
    try { validCurrent=isFn("validateCurrent")&&o.validateCurrent(verified,profileId)===true; }
    catch(error){return restore(error,"validation-error");}
    if(!validCurrent||verified.id!==newId||verified.legacyId!==legacy.id||verified.profileId!==profileId)
      return restore(Error("Migrated snapshot failed current-schema validation"),"validation-error");
    return {ok:true,status:"migrated",session:clone(verified),originalPreserved:false};
  }
  return Object.freeze({migrate});
}
if(typeof module!=="undefined"&&module.exports)module.exports={createLegacySessionMigrator};
if(typeof window!=="undefined")window.TahouriExperimentalLegacySessionMigrator=Object.freeze({createLegacySessionMigrator});
