// =====================================
// Tahouri Edu Platform
// Version 3.7
// Activity Lifecycle
// Session + Statistics + Progress + Content Lock
// =====================================

const ActivityLifecycle = {


    connect:function(){


        EventManager.on(

            "activityStarted",

            function(activity){

                console.log(

                    "Activity Started Event",

                    activity

                );

                ActivityState.set(
                    "started"
                );

                ActivityState.set(
                    "playing"
                );

            }

        );





        EventManager.on(

            "activityFinished",

            function(result){

                console.log(

                    "Activity Finished Event",

                    result

                );



                ActivityState.set(

                    "finished"

                );



                // =========================
                // فعالیت فعلی
                // =========================

                const activity =

                ActivityHistory.get();



                // =========================
                // ثبت پیشرفت
                // =========================

                ProgressTracker.update(

                    activity.id,

                    result

                );



                // =========================
                // باز شدن فعالیت بعدی
                // شرط 4 ستاره
                // =========================

                if(

                    result.percentage >= 80

                ){

                    ContentLockManager.unlock(

                        "memoryDemo"

                    );

                }



                // =========================
                // ثبت امتیاز Session
                // =========================

                SessionManager.addActivity(

                    result.score

                );



                // =========================
                // ثبت آمار
                // =========================

                StatisticsManager.addResult(

                    activity,

                    result

                );



                ActivityState.set(

                    "completed"

                );



                Screen.showFinish(

                    result

                );

            }

        );



        console.log(

            "Activity Lifecycle Connected"

        );

    }

};



ActivityLifecycle.connect();

SessionManager.start();

console.log(

    "Activity Lifecycle Ready"

);