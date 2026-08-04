// =====================================
// Tahouri Edu Platform
// Version 1.0
// Progress Manager
// =====================================

const ProgressManager = {

    progress: {

        currentGrade: null,

        currentSubject: null,

        currentChapter: null,

        currentActivity: null,

        completedActivities: [],

        unlockedActivities: []

    },



    setCurrent:function(activity){

        if(!activity){

            return;

        }

        this.progress.currentGrade = activity.grade;

        this.progress.currentSubject = activity.subject;

        this.progress.currentChapter = activity.chapter;

        this.progress.currentActivity = activity.id;

    },



    complete:function(activityId){

        if(

            !this.progress.completedActivities.includes(

                activityId

            )

        ){

            this.progress.completedActivities.push(

                activityId

            );

        }

    },



    unlock:function(activityId){

        if(

            !this.progress.unlockedActivities.includes(

                activityId

            )

        ){

            this.progress.unlockedActivities.push(

                activityId

            );

        }

    },



    isCompleted:function(activityId){

        return this.progress.completedActivities.includes(

            activityId

        );

    },



    isUnlocked:function(activityId){

        return this.progress.unlockedActivities.includes(

            activityId

        );

    },



    get:function(){

        return this.progress;

    },



    reset:function(){

        this.progress = {

            currentGrade: null,

            currentSubject: null,

            currentChapter: null,

            currentActivity: null,

            completedActivities: [],

            unlockedActivities: []

        };

    }

};



console.log(

    "Progress Manager Ready"

);