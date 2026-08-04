// =====================================
// Tahouri Edu Platform
// Version 3.5
// Activity Lifecycle
// Session + Statistics Integration
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



                // ثبت امتیاز در Session

                SessionManager.addActivity(

                    result.score

                );



                // ثبت آمار کلی

                const activity =

                ActivityHistory.get();



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