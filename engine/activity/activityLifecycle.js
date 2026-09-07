// =====================================
// Tahouri Edu Platform
// Version 4.3
// Activity Lifecycle
// =====================================
const ActivityLifecycle = {
 connect:function(){
  EventManager.on("activityStarted",function(activity){console.log("Activity Started Event",activity);ActivityState.set("started");ActivityState.set("playing");});
  EventManager.on("activityFinished",function(result){
   console.log("Activity Finished Event",result);ActivityState.set("finished");
   let activity=null;
   if(result&&result.activityId&&typeof App!=="undefined"&&Array.isArray(App.activities)) activity=App.activities.find(function(x){return x&&x.id===result.activityId;});
   if(!activity&&typeof ActivityHistory!=="undefined") activity=ActivityHistory.get();
   if(!activity){console.error("Activity Lifecycle: Activity data not found:",result&&result.activityId);return;}
   if(typeof DailyLearningStreak!=="undefined"&&typeof DailyLearningStreak.recordActivity==="function"){DailyLearningStreak.recordActivity(activity,result);console.log("Daily Learning Streak Updated:",DailyLearningStreak.getDisplayData());}
   ProgressTracker.update(activity.id,result);
   const successful=result.percentage>=80;console.log("Activity Success:",successful,activity.id,result.percentage);
   if(successful){
    const unlocks={evenOdd:"divisibleBy2",divisibleBy2:"divisibleBy3",divisibleBy3:"divisibleBy5",divisibleBy5:"divisibleBy6",divisibleBy6:"divisibleBy9",divisibleBy9:"divisibleBy10",divisibleBy10:"divisibleBy100",divisibleBy100:"memoryDemo"};
    if(unlocks[activity.id]){ContentLockManager.unlock(unlocks[activity.id]);console.log("Unlocked:",unlocks[activity.id]);}
   }
   SessionManager.addActivity(result.score);StatisticsManager.addResult(activity,result);ActivityState.set("completed");
   // IMPORTANT: cleanup only after all completion consumers have read ActivityHistory.
   if(typeof ActivitySessionManager!=="undefined"&&typeof ActivitySessionManager.complete==="function") ActivitySessionManager.complete();
   Screen.showFinish(result);
  });
  console.log("Activity Lifecycle Connected");
 }
};
ActivityLifecycle.connect();SessionManager.start();console.log("Activity Lifecycle Ready");
