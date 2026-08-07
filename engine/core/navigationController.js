// =====================================
// Tahouri Edu Platform
// Version 3.4
// Navigation Controller
// Back System + Dashboard
// =====================================


const NavigationController = {


back:function(){


    const previous =

    NavigationHistory.back();



    if(!previous){


        console.log(

            "No Previous Page"

        );


        return;


    }




    console.log(

        "Navigate Back:",

        previous

    );





    switch(previous.page){



        case "grade":


            App.showGrades();


            break;




        case "subject":


            App.showSubjects();


            break;




        case "chapter":


            App.showChapters();


            break;




        case "activity":


            App.showActivities();


            break;




        case "dashboard":


            App.start();


            break;




        default:


            console.log(

                "Unknown Page:",

                previous.page

            );


    }



}



};





console.log(

"Navigation Controller Ready"

);