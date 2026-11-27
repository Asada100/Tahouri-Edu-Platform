"use strict";
const assert=require("node:assert/strict");
const {createSessionPersistenceGuard}=require("./sessionPersistenceGuard");
function fixture(overrides){const data=new Map();let profile="student-A",reads=0;
 const options={getProfileId:()=>profile,getScopedKey:p=>"session:"+p,
 readRaw(k){reads++;return data.has(k)?data.get(k):null;},writeRaw(k,v){data.set(k,v);return true;},
 removeRaw(k){data.delete(k);return true;},createIdentity:()=>"uuid-A",now:()=>123,...overrides};
 return {data,options,guard:createSessionPersistenceGuard(options),setProfile:p=>profile=p,get reads(){return reads;}};}
function test(n,f){f();console.log("PASS — "+n);}
test("missing profile blocks before storage or identity",()=>{let generated=0;const f=fixture({getProfileId:()=>null,createIdentity:()=>{generated++;return"x";}});
 assert.equal(f.guard.begin({id:"q"}).status,"missing-profile");assert.equal(generated,0);assert.equal(f.reads,0);});
test("missing scoped key blocks candidate",()=>{let generated=0;const f=fixture({getScopedKey:()=>null,createIdentity:()=>{generated++;return"x";}});
 assert.equal(f.guard.begin({id:"q"}).status,"missing-key");assert.equal(generated,0);});
test("publishes only after write and exact read-back",()=>{let g;const f=fixture({writeRaw(k,v){assert.equal(g.getCurrentSession(),null);f.data.set(k,v);return true;}});g=f.guard;
 const r=g.begin({id:"quiz"});assert.equal(r.ok,true);assert.equal(g.getCurrentSession().id,"uuid-A");});
test("malformed JSON is preserved",()=>{const f=fixture();f.data.set("session:student-A","{bad");
 assert.equal(f.guard.begin({id:"q"}).status,"invalid-json");assert.equal(f.data.get("session:student-A"),"{bad");});
test("unsupported schema is preserved",()=>{const f=fixture(),raw=JSON.stringify({schemaVersion:99,id:"x",profileId:"student-A"});
 f.data.set("session:student-A",raw);assert.equal(f.guard.begin({id:"q"}).status,"unsupported-schema");assert.equal(f.data.get("session:student-A"),raw);});
test("profile mismatch is preserved",()=>{const f=fixture(),raw=JSON.stringify({schemaVersion:2,id:"x",profileId:"student-B",activityId:"q"});
 f.data.set("session:student-A",raw);assert.equal(f.guard.begin({id:"q"}).status,"profile-mismatch");assert.equal(f.data.get("session:student-A"),raw);});
test("false write does not publish",()=>{const f=fixture({writeRaw:()=>false});assert.equal(f.guard.begin({id:"q"}).status,"write-error");assert.equal(f.guard.getCurrentSession(),null);});
test("throwing write does not publish",()=>{const f=fixture({writeRaw:()=>{throw Error("quota");}});assert.equal(f.guard.begin({id:"q"}).status,"write-error");});
test("read-back exception rolls back candidate",()=>{let n=0;const f=fixture({readRaw(k){n++;if(n>1)throw Error("denied");return null;}});
 assert.equal(f.guard.begin({id:"q"}).status,"readback-error");assert.equal(f.data.has("session:student-A"),false);});
test("read-back mismatch rolls back candidate",()=>{let n=0;const f=fixture({readRaw(){n++;return n===1?null:"wrong";}});
 assert.equal(f.guard.begin({id:"q"}).status,"readback-mismatch");assert.equal(f.data.has("session:student-A"),false);});
test("rollback failure is explicit",()=>{let n=0;const f=fixture({readRaw(){n++;return n===1?null:null;},removeRaw:()=>false});
 assert.equal(f.guard.begin({id:"q"}).status,"rollback-failed");assert.equal(f.guard.getCurrentSession(),null);});
test("load retains persisted identity",()=>{const f=fixture();f.data.set("session:student-A",JSON.stringify({schemaVersion:2,id:"stable",profileId:"student-A",activityId:"q"}));
 assert.equal(f.guard.load().session.id,"stable");});
test("storage read error differs from missing",()=>{const f=fixture({readRaw:()=>{throw Error("blocked");}});
 assert.equal(f.guard.begin({id:"q"}).status,"storage-error");});
test("profile-scoped keys isolate sessions",()=>{const f=fixture();assert.equal(f.guard.begin({id:"q"}).ok,true);f.guard.clear();
 f.setProfile("student-B");f.options.createIdentity=()=>"uuid-B";assert.equal(f.guard.begin({id:"q"}).ok,true);assert.ok(f.data.has("session:student-B"));});
test("failed load clears a previously published session",()=>{const f=fixture();assert.equal(f.guard.begin({id:"q"}).ok,true);
 f.data.set("session:student-A","{broken");assert.equal(f.guard.load().status,"invalid-json");assert.equal(f.guard.getCurrentSession(),null);});
test("failed begin after profile switch cannot expose previous profile session",()=>{const f=fixture();assert.equal(f.guard.begin({id:"q"}).ok,true);
 f.setProfile(null);assert.equal(f.guard.begin({id:"q"}).status,"missing-profile");assert.equal(f.guard.getCurrentSession(),null);});
console.log("SESSION PERSISTENCE GUARD RESULT: PASS (16/16)");
