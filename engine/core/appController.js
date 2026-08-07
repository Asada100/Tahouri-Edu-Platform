// =====================================
// Tahouri Edu Platform
// Version 3.2
// App Controller
// Unified Activity Restart
// =====================================

const App = {


    grades: [],

    subjects: [],

    chapters: [],

    activities: [],



    init: async function(){


        console.log(
            "App Controller Started"
        );


        await this.loadData();


        this.showGrades();


    },





    loadData: async function(){


        try{


            this.grades =

            await DataManager.loadJSON(

                "data/grades.json"

            );



            this.subjects =

            await DataManager.loadJSON(

                "data/subjects.json"

            );



            this.chapters =

            await DataManager.loadJSON(

                "data/chapters.json"

            );



            this.activities =

            await DataManager.loadJSON(

                "data/activities.json"

            );



            grades = this.grades;
            subjects = this.subjects;
            chapters = this.chapters;
            activities = this.activities;



            console.log(

                "All Data Loaded Through DataManager"

            );


        }

        catch(error){


            console.error(

                "Loading Error:",

                error

            );


        }


    },




showGrades:function(){

    showGrades();


},





    showSubjects:function(){


        showSubjects(

            AppState.grade

        );


    },





    showChapters:function(){


        showChapters(

            AppState.grade,

            AppState.subject

        );


    },





    showActivities:function(){


        showActivities(

            AppState.grade,

            AppState.subject,

            AppState.chapter

        );


    },





    startActivity:function(activity){


        loadActivity(activity);


    },





    restartActivity:function(activity){


        let activityObject = activity;


        if(typeof activity === "string"){

            activityObject =

            this.activities.find(function(item){

                return item.id === activity;

            });

        }


        if(!activityObject){

            activityObject =

            this.activities.find(function(item){

                return item.id === AppState.activity;

            });

        }


        if(!activityObject){

            console.error(
                "Activity Not Found"
            );

            return;

        }


        loadActivity(
            activityObject
        );


    },





    goHome:function(){


        this.showGrades();


    }


};



console.log(

    "App Controller Ready"

);