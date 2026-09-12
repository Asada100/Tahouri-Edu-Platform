// Activity Session Manager v1.0.4
// Completion cleanup is performed by ActivityLifecycle after completion data is processed.
const ActivitySessionManager = {
 BASE_KEY:"Tahouri_ActivitySession", VERSION:"1.0.4", currentSession:null,
 exitControlId:"activitySessionControl", overlayId:"activitySessionOverlay", gameplayActive:false, initialized:false,
 storageKey(){return typeof ProfileContext!=="undefined"&&typeof ProfileContext.key==="function"?ProfileContext.key(this.BASE_KEY):null;},
 load(){const k=this.storageKey();if(!k||typeof SaveManager==="undefined")return null;const s=SaveManager.load(k);if(!s||!s.activityId)return null;
  // Discard the broken empty Classification session created before the content
  // was loaded correctly. It must not be offered for resume or block a new run.
  if((s.activityType==="classification"||s.activityType==="ClassificationEngine")&&s.engineState&&Array.isArray(s.engineState.items)&&Array.isArray(s.engineState.categories)&&s.engineState.items.length===0&&s.engineState.categories.length===0){
    console.warn("ActivitySessionManager: Ignoring invalid empty classification session",s.activityId);
    SaveManager.remove(k);this.currentSession=null;return null;
  }
  this.currentSession=s;return s;},
 save(s){const k=this.storageKey();if(!k||typeof SaveManager==="undefined"||!s)return false;s.version=this.VERSION;s.updatedAt=Date.now();const ok=SaveManager.save(k,s);if(ok)this.currentSession=s;return ok;},
 clear(){const k=this.storageKey();if(k&&typeof SaveManager!=="undefined")SaveManager.remove(k);this.currentSession=null;},
 getEngine(n){if(typeof EngineManager==="undefined")return null;try{return EngineManager.getEngine(n);}catch(e){console.error("ActivitySessionManager engine error",e);return null;}},
 type(a){return a?(a.engine||a.type||null):null;},
 snapshot(a){const n=this.type(a),e=this.getEngine(n);if(!e)return null;if(typeof e.getSessionState==="function")return e.getSessionState();
  if(n==="QuizEngine"||n==="quiz")return {kind:"quiz",activity:e.activity||a,state:{...(e.state||{})},questions:Array.isArray(e.questions)?JSON.parse(JSON.stringify(e.questions)):[],currentQuestion:Number(e.currentQuestion||0),score:Number(typeof ScoreManager!=="undefined"?ScoreManager.score||0:0),correct:Number(typeof ScoreManager!=="undefined"?ScoreManager.correct||0:0),wrong:Number(typeof ScoreManager!=="undefined"?ScoreManager.wrong||0:0)};
  if(n==="MemoryEngine"||n==="memory")return {kind:"memory",activity:e.activity||a,cards:Array.isArray(e.cards)?JSON.parse(JSON.stringify(e.cards)):[],matchedPairs:Number(e.matchedPairs||0),moves:Number(e.moves||0),totalPairs:Number(e.totalPairs||0),finished:!!e.finished,score:Number(typeof ScoreManager!=="undefined"?ScoreManager.score||0:0),correct:Number(typeof ScoreManager!=="undefined"?ScoreManager.correct||0:0),wrong:Number(typeof ScoreManager!=="undefined"?ScoreManager.wrong||0:0)};
  if(n==="PuzzleEngine"||n==="puzzle")return {kind:"puzzle",activity:e.activity||a,state:{...(e.state||{})},puzzle:e.puzzle?JSON.parse(JSON.stringify(e.puzzle)):null,items:Array.isArray(e.items)?JSON.parse(JSON.stringify(e.items)):[],userAnswer:e.userAnswer,moves:Number(e.moves||0)};
  return null;},
 begin(a){if(!a||!a.id)return null;const old=this.load();if(old&&old.activityId===a.id&&old.status==="resumable")return old;const s={version:this.VERSION,id:"activity-session-"+a.id+"-"+Date.now(),profileId:typeof ProfileContext!=="undefined"&&typeof ProfileContext.getStudentId==="function"?ProfileContext.getStudentId():null,activityId:a.id,activityType:this.type(a),status:"active",startedAt:Date.now(),updatedAt:Date.now(),engineState:null};this.currentSession=s;this.save(s);this.gameplayActive=true;document.body.classList.add("activity-playing");return s;},
 capture(status){const a=typeof ActivityManager!=="undefined"?ActivityManager.getCurrent():null;if(!a||!a.id)return false;let s=this.currentSession;if(!s||s.activityId!==a.id)s=this.begin(a);const state=this.snapshot(a);if(!state)return false;s.activityId=a.id;s.activityType=this.type(a);s.engineState=state;s.status=status||"resumable";return this.save(s);},
 exit(){if(!this.capture("resumable"))return false;this.gameplayActive=false;document.body.classList.remove("activity-playing");this.hideOverlay();this.removeExitControl();if(typeof ActivityManager!=="undefined"&&typeof ActivityManager.resetRuntime==="function")ActivityManager.resetRuntime();EventManager.emit("activityExited",this.currentSession);if(typeof DashboardController!=="undefined"&&typeof DashboardController.open==="function")DashboardController.open();else if(typeof App!=="undefined"&&typeof App.goHome==="function")App.goHome();return true;},
 getResumable(){const s=this.load();return s&&s.status==="resumable"&&s.engineState?s:null;},
 async resume(){const s=this.getResumable();if(!s)return false;if(typeof App==="undefined"||typeof App.resolveActivityById!=="function")return false;const a=App.resolveActivityById(s.activityId);if(!a){this.clear();return false;}if(!await this.restoreEngine(a,s))return false;s.status="active";this.save(s);this.gameplayActive=true;document.body.classList.add("activity-playing");EventManager.emit("activityResumed",s);this.installExitControl();return true;},
 async restoreEngine(a,s){
  const d=s.engineState,n=s.activityType||this.type(a),e=this.getEngine(n);if(!e||!d)return false;
  ActivityManager.currentActivity=a;ActivityState.set("started");ActivityState.set("playing");
  if(d.kind==="quiz"&&(n==="QuizEngine"||n==="quiz")){e.activity=d.activity||a;e.questions=Array.isArray(d.questions)?JSON.parse(JSON.stringify(d.questions)):[];e.currentQuestion=Number(d.currentQuestion||0);e.state={...(d.state||{}),started:true,isFinished:false};if(typeof ScoreManager!=="undefined"){ScoreManager.score=Number(d.score||0);ScoreManager.correct=Number(d.correct||0);ScoreManager.wrong=Number(d.wrong||0);}const q=typeof e.getQuestion==="function"?e.getQuestion():null;if(q&&typeof QuizScreen!=="undefined"&&typeof QuizScreen.show==="function"){QuizScreen.reset();QuizScreen.show({title:a.title,score:ScoreManager.score,currentQuestion:e.currentQuestion+1,totalQuestions:e.questions.length,question:q});}return true;}
  if(d.kind==="memory"&&(n==="MemoryEngine"||n==="memory")){e.activity=d.activity||a;e.cards=Array.isArray(d.cards)?JSON.parse(JSON.stringify(d.cards)):[];e.firstCard=null;e.secondCard=null;e.lockBoard=false;e.matchedPairs=Number(d.matchedPairs||0);e.moves=Number(d.moves||0);e.totalPairs=Number(d.totalPairs||0);e.finished=false;if(typeof ScoreManager!=="undefined"){ScoreManager.score=Number(d.score||0);ScoreManager.correct=Number(d.correct||0);ScoreManager.wrong=Number(d.wrong||0);}if(typeof MemoryScreen!=="undefined"&&typeof MemoryScreen.show==="function")MemoryScreen.show({title:a.title||"بازی حافظه",cards:e.cards});return true;}
  if(d.kind==="puzzle"&&(n==="PuzzleEngine"||n==="puzzle")){e.activity=d.activity||a;e.state={...(d.state||{}),started:true,isFinished:false};e.puzzle=d.puzzle?JSON.parse(JSON.stringify(d.puzzle)):null;e.items=Array.isArray(d.items)?JSON.parse(JSON.stringify(d.items)):[];e.userAnswer=d.userAnswer;e.moves=Number(d.moves||0);if(typeof PuzzleScreen!=="undefined"&&typeof PuzzleScreen.show==="function")PuzzleScreen.show(e.getState());return true;}
  if(n==="classification"||n==="ClassificationEngine"){
      if(typeof e.restoreSession!=="function")return false;
      if(!d||!Array.isArray(d.items)||!Array.isArray(d.categories)||d.items.length===0||d.categories.length===0)return false;
      let fullActivity=a;
      if(typeof ActivityManager!=="undefined"&&typeof ActivityManager.loadActivityConfig==="function"){
          fullActivity=await ActivityManager.loadActivityConfig(a);
      }
      if(!fullActivity||!fullActivity.classification)return false;
      ActivityManager.currentActivity=fullActivity;
      e.activityData=fullActivity;
      if(!e.restoreSession(d))return false;
      if(typeof ClassificationScreen!=="undefined"&&typeof ClassificationScreen.show==="function"){
          ClassificationScreen.currentActivity=fullActivity;ClassificationScreen.currentState=e.getState();ClassificationScreen.lastMessage="";ClassificationScreen.show(e.getState());
      }
      return true;
  }
  return false;
 },
 complete(){this.clear();this.gameplayActive=false;document.body.classList.remove("activity-playing");document.body.classList.remove("activity-result-open");this.hideOverlay();this.removeExitControl();},
 installExitControl(){this.removeExitControl();if(!this.gameplayActive)return;const b=document.createElement("button");b.id=this.exitControlId;b.type="button";b.textContent="☰";b.title="مکث و خروج";b.setAttribute("aria-label","مکث و خروج از فعالیت");b.onclick=()=>this.showOverlay();document.body.appendChild(b);},
 removeExitControl(){const b=document.getElementById(this.exitControlId);if(b)b.remove();},
 showOverlay(){this.capture("resumable");this.hideOverlay();const o=document.createElement("div");o.id=this.overlayId;o.dir="rtl";const box=document.createElement("div");box.className="activityRuntimeModal";box.innerHTML='<h2>فعالیت متوقف شد</h2><p>وضعیت فعلی ذخیره شده است.</p><div class="activityRuntimeActions"><button id="activitySessionResumeBtn" type="button">ادامه فعالیت</button><button id="activitySessionExitBtn" type="button">خروج و ذخیره</button></div>';o.appendChild(box);document.body.appendChild(o);document.getElementById("activitySessionResumeBtn").onclick=()=>this.hideOverlay();document.getElementById("activitySessionExitBtn").onclick=()=>this.exit();},
 hideOverlay(){const o=document.getElementById(this.overlayId);if(o)o.remove();},
 connect(){if(this.initialized)return;this.initialized=true;EventManager.on("activityReady",p=>{if(!p||!p.activity)return;this.begin(p.activity);this.gameplayActive=true;document.body.classList.add("activity-playing");this.installExitControl();});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&this.gameplayActive)this.capture("resumable");});window.addEventListener("beforeunload",()=>{if(this.gameplayActive)this.capture("resumable");});console.log("Activity Session Manager v1.0.4 Ready");}
};window.ActivitySessionManager=ActivitySessionManager;ActivitySessionManager.connect();