// =====================================
// Tahouri Edu Platform
// Version 3.3
// Navigation Controller
// Back System
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