// =====================================
// Tahouri Edu Platform
// Version 3.2
// Activity Manager
// Registry Integration
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





        ActivityHistory.set(

            activity

        );







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







        engine.start(

            activity

        );



    }



};



console.log(

    "Activity Manager Ready"

);