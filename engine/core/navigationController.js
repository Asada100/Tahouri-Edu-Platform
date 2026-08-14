// =====================================
// Tahouri Edu Platform
// Version 4.5
// Navigation Controller
// Back System + Dashboard + Home
// =====================================

const NavigationController = {

    back: function() {

        const previous =
            NavigationHistory.back();


        if(!previous) {

            console.log(
                "No Previous Page"
            );

            return;

        }


        console.log(
            "Navigate Back:",
            previous
        );


        switch(previous.page) {


            // =============================
            // Home
            // =============================

            case "home":

                Screen.showHome();

                break;


            // =============================
            // Grade
            // =============================

            case "grade":

                App.showGrades();

                break;


            // =============================
            // Subject
            // =============================

            case "subject":

                App.showSubjects();

                break;


            // =============================
            // Chapter
            // =============================

            case "chapter":

                App.showChapters();

                break;


            // =============================
            // Activity
            // =============================

            case "activity":

                App.showActivities();

                break;


            // =============================
            // Dashboard
            // =============================

            case "dashboard":

                App.start();

                break;


            // =============================
            // Unknown
            // =============================

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