// =====================================
// Tahouri Edu Platform
// Version 2.2
// Base Activity Engine
// Common Engine Template
// =====================================


class BaseActivityEngine {


    constructor(){

        this.activity = null;

        this.started = false;

        this.finished = false;

        this.result = null;

    }




    start(activityData){

        this.activity = activityData;

        this.started = true;

        this.finished = false;

        console.log(
            "Activity Started:",
            activityData.id
        );


        EventManager.emit(
            "activity:start",
            activityData
        );


    }





    finish(result){


        this.finished = true;


        this.result = result;


        console.log(
            "Activity Finished",
            result
        );



        EventManager.emit(
            "activity:finish",
            result
        );


        return result;


    }





    reset(){


        this.activity = null;

        this.started = false;

        this.finished = false;

        this.result = null;


        console.log(
            "Activity Reset"
        );


    }





    getResult(){


        return this.result;


    }


}



console.log(

"Base Activity Engine Ready"

);