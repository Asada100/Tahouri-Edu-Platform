// =====================================
// Tahouri Edu Platform
// Version 1.0
// Dashboard Controller
// Statistics + Progress Integration
// =====================================


const DashboardController = {


    open:function(){


        console.log(
            "Dashboard Controller Opening"
        );


        if(
            typeof DashboardScreen === "undefined"
        ){

            console.error(
                "DashboardScreen Not Found"
            );

            return;

        }



        const statistics =

        StatisticsManager.get();



        const progress =

        ProgressTracker.getAll();



        DashboardScreen.show({

            statistics:

            statistics,


            progress:

            progress


        });



        console.log(
            "Dashboard Controller Ready"
        );


    }



};



window.DashboardController = DashboardController;


console.log(
    "Dashboard Controller Loaded"
);