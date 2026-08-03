// =====================================
// Tahouri Edu Platform
// Version 3.1
// Activity Lifecycle
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

            }

        );





        EventManager.on(

            "activityPlaying",

            function(activity){

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



                // ثبت نتیجه در Session

                SessionManager.addActivity(

                    result.score || 0

                );



                ActivityState.set(

                    "completed"

                );

            }

        );



        console.log(

            "Activity Lifecycle Connected"

        );

    },





    startSession:function(){

        SessionManager.start();

    },





    finishSession:function(){

        SessionManager.finish();

    }

};



ActivityLifecycle.connect();

ActivityLifecycle.startSession();



console.log(

    "Activity Lifecycle Ready"

);