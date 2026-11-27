"use strict";
const assert=require("node:assert/strict");
const {createLegacySessionMigrator}=require("./legacySessionMigrator");
function fixture(overrides){const rawStore=new Map();const key="session:student-A";const legacy={version:"1.9",schemaVersion:1,id:"activity-session-old",profileId:"student-A",activityId:"quiz-6",activityType:"quiz",status:"resumable",engineState:{kind:"quiz",state:{},questions:[{id:1}],currentQuestion:0}};
 rawStore.set(key,JSON.stringify(legacy));let generated=0,reads=0,writes=0;
 const options={getProfileId:()=>"student-A",getScopedKey:p=>"session:"+p,
 readRaw(k){reads++;return rawStore.has(k)?rawStore.get(k):null;},
 writeRaw(k,v){writes++;rawStore.set(k,v);return true;},createIdentity(){generated++;return "activity-session-uuid-v4";},
 validateLegacy(s,p){return s.version==="1.9"&&s.activityId==="quiz-6"&&s.profileId===p&&s.status==="resumable"&&!!s.engineState;},
 validateCurrent(s,p){return s.schemaVersion===2&&s.identityVersion===2&&s.profileId===p&&s.id==="activity-session-uuid-v4"&&s.legacyId==="activity-session-old";},...overrides};
 return {options,store:rawStore,key,legacy,run:()=>createLegacySessionMigrator(options).migrate(),get generated(){return generated;},get reads(){return reads;},get writes(){return writes;}};}
function test(name,fn){fn();console.log("PASS — "+name);}
test("valid v1 snapshot migrates and preserves legacy identity",()=>{const f=fixture(),r=f.run();assert.equal(r.ok,true);assert.equal(r.status,"migrated");assert.equal(r.session.legacyId,f.legacy.id);assert.equal(r.session.id,"activity-session-uuid-v4");assert.equal(JSON.parse(f.store.get(f.key)).schemaVersion,2);});
test("migration is idempotent and does not rotate v2 identity",()=>{const f=fixture();assert.equal(f.run().ok,true);const writes=f.writes,generated=f.generated;const r=f.run();assert.equal(r.status,"already-current");assert.equal(f.writes,writes);assert.equal(f.generated,generated);});
test("failed identity generation preserves exact original bytes",()=>{const f=fixture({createIdentity:()=>{throw Error("no crypto");}}),raw=f.store.get(f.key);assert.equal(f.run().status,"identity-error");assert.equal(f.store.get(f.key),raw);});
test("invalid legacy session remains byte-for-byte unchanged",()=>{const f=fixture({validateLegacy:()=>false}),raw=f.store.get(f.key);assert.equal(f.run().status,"invalid-legacy-session");assert.equal(f.store.get(f.key),raw);});
test("unsupported schema remains unchanged",()=>{const f=fixture(),raw=JSON.stringify({schemaVersion:77,id:"future",profileId:"student-A"});f.store.set(f.key,raw);assert.equal(f.run().status,"unsupported-schema");assert.equal(f.store.get(f.key),raw);});
test("malformed JSON remains unchanged",()=>{const f=fixture(),raw="{malformed";f.store.set(f.key,raw);assert.equal(f.run().status,"invalid-json");assert.equal(f.store.get(f.key),raw);});
test("profile mismatch remains unchanged",()=>{const f=fixture(),raw=JSON.stringify({...f.legacy,profileId:"student-B"});f.store.set(f.key,raw);assert.equal(f.run().status,"invalid-legacy-session");assert.equal(f.store.get(f.key),raw);});
test("write failure restores original raw snapshot",()=>{let n=0;const f=fixture({writeRaw(k,v){n++;if(n===1){f.store.set(k,v);return false;}f.store.set(k,v);return true;}}),raw=f.store.get(f.key);const r=f.run();assert.equal(r.status,"write-error");assert.equal(f.store.get(f.key),raw);assert.equal(r.originalPreserved,true);});
test("read-back failure restores original raw snapshot",()=>{let n=0;const f=fixture({readRaw(k){n++;if(n===2)throw Error("read denied");return f.store.has(k)?f.store.get(k):null;}}),raw=f.store.get(f.key);const r=f.run();assert.equal(r.status,"readback-error");assert.equal(f.store.get(f.key),raw);});
test("read-back mismatch restores original raw snapshot",()=>{let n=0;const f=fixture({readRaw(k){n++;return n===2?"mismatch":f.store.get(k);}}),raw=f.store.get(f.key);const r=f.run();assert.equal(r.status,"readback-mismatch");assert.equal(f.store.get(f.key),raw);assert.equal(r.originalPreserved,true);});
test("rollback failure is explicit and does not claim preservation",()=>{let n=0;const f=fixture({readRaw(k){n++;return n===1?f.store.get(k):"mismatch";},writeRaw(k,v){if(n>1)return false;f.store.set(k,v);return true;}});const r=f.run();assert.equal(r.status,"rollback-failed");assert.equal(r.originalPreserved,false);});
test("missing profile blocks before reading or generating identity",()=>{const f=fixture({getProfileId:()=>null});assert.equal(f.run().status,"missing-profile");assert.equal(f.reads,0);assert.equal(f.generated,0);});
test("missing storage snapshot is not treated as a migration",()=>{const f=fixture();f.store.delete(f.key);assert.equal(f.run().status,"missing");assert.equal(f.generated,0);});
test("already-current but invalid v2 snapshot is preserved",()=>{const f=fixture(),raw=JSON.stringify({schemaVersion:2,id:"x",profileId:"student-A"});f.store.set(f.key,raw);assert.equal(f.run().status,"unsupported-schema");assert.equal(f.store.get(f.key),raw);});
console.log("LEGACY SESSION MIGRATION RESULT: PASS (14/14)");
