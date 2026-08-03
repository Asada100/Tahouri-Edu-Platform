// =====================================
// Tahouri Edu Platform
// Version 1.0
// Session Manager
// =====================================

const SessionManager = {

    session:{

        startTime:null,

        endTime:null,

        duration:0,

        totalScore:0,

        totalActivities:0,

        completedActivities:0

    },



    start:function(){

        this.session.startTime = Date.now();

        this.session.endTime = null;

        this.session.duration = 0;

        this.session.totalScore = 0;

        this.session.totalActivities = 0;

        this.session.completedActivities = 0;

        console.log(
            "Session Started"
        );

    },



    finish:function(){

        this.session.endTime = Date.now();

        this.session.duration =

        Math.floor(

            (this.session.endTime -

            this.session.startTime)

            /1000

        );

        console.log(

            "Session Finished",

            this.session

        );

    },



    addActivity:function(score){

        this.session.totalActivities++;

        this.session.completedActivities++;

        this.session.totalScore += score;

        console.log(

            "Session Updated",

            this.session

        );

    },



    get:function(){

        return this.session;

    },



    reset:function(){

        this.start();

        console.log(
            "Session Reset"
        );

    }

};



console.log(
    "Session Manager Ready"
);