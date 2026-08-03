// =====================================
// Tahouri Edu Platform
// Version 3.3
// Activity History Manager
// =====================================


const ActivityHistory = {


    currentActivity:null,



    set:function(activity){


        this.currentActivity = activity;


        console.log(
            "Activity History Saved:",
            activity.id
        );


    },




    get:function(){


        return this.currentActivity;


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