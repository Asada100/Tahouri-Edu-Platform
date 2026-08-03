// =====================================
// Tahouri Edu Platform
// Version 3.3
// Activity History Manager
// =====================================

const ActivityHistory = {

    currentActivity:null,



    set:function(activity){

        if(!activity){

            return;

        }

        this.currentActivity = activity;

        console.log(
            "Activity Saved:",
            activity.id
        );

    },



    get:function(){

        return this.currentActivity;

    },



    hasActivity:function(){

        return this.currentActivity !== null;

    },



    clear:function(){

        this.currentActivity = null;

        console.log(
            "Activity History Cleared"
        );

    }

};



console.log(
    "Activity History Ready"
);