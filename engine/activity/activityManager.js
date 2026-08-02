// =====================================
// Tahouri Edu Platform
// Version 2.2
// Activity Manager
// Registry System
// =====================================

const ActivityManager = {

    currentActivity:null,



    load:function(activity){

        this.currentActivity = activity;

        console.log(
            "Loading Activity:",
            activity
        );



        const engine =

        ActivityRegistry[
            activity.engine
        ];



        if(!engine){

            console.error(
                "Unknown Engine:",
                activity.engine
            );

            return;

        }



        engine.start(
            activity
        );

    }

};



console.log(
    "Activity Manager Ready"
);