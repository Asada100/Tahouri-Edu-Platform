// =====================================
// Tahouri Edu Platform
// Version 3.4
// Activity Manager
// Activity State Integration
// =====================================


const ActivityManager = {


    load:function(activity){


        if(!activity){


            console.error(
                "Activity Not Found"
            );


            return;

        }



        console.log(

            "Loading Activity:",

            activity

        );




        // =========================
        // Activity State
        // =========================


        ActivityState.set(

            ActivityState.states.STARTED

        );




        // =========================
        // Save History
        // =========================


        ActivityHistory.set(

            activity

        );





        // =========================
        // Find Engine
        // =========================


        const engine =

        ActivityRegistry[

            activity.engine

        ];






        if(!engine){


            console.error(

                "Engine Not Found:",

                activity.engine

            );


            return;


        }







        // =========================
        // Start Engine
        // =========================


        ActivityState.set(

            ActivityState.states.PLAYING

        );



        engine.start(

            activity

        );



    }




};



console.log(

    "Activity Manager Ready"

);