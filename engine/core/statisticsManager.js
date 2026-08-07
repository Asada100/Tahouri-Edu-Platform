// =====================================
// Tahouri Edu Platform
// Version 2.0
// Statistics Manager
// SaveManager Integration
// =====================================

const StatisticsManager = {

    STORAGE_KEY:

    "Tahouri_Statistics",



    statistics:{

        totalActivities:0,

        totalScore:0,

        averageScore:0,

        bestScore:0,

        totalCorrect:0,

        totalWrong:0

    },



    init:function(){

        const saved =

        SaveManager.load(

            this.STORAGE_KEY

        );

        if(saved){

            this.statistics = saved;

            console.log(

                "Statistics Loaded",

                this.statistics

            );

        }

        else{

            this.save();

        }

    },



    addResult:function(activity,result){

        if(!result){

            console.error(

                "Statistics Result Missing"

            );

            return;

        }



        this.statistics.totalActivities++;



        this.statistics.totalScore +=

        result.score || 0;



        this.statistics.totalCorrect +=

        result.correctAnswers ||

        result.correct ||

        0;



        this.statistics.totalWrong +=

        result.wrongAnswers ||

        result.wrong ||

        0;



        if(

            (result.score || 0)

            >

            this.statistics.bestScore

        ){

            this.statistics.bestScore =

            result.score;

        }



        this.statistics.averageScore =

        Math.round(

            this.statistics.totalScore /

            this.statistics.totalActivities

        );



        this.save();



        console.log(

            "Statistics Updated",

            this.statistics

        );

    },



    save:function(){

        SaveManager.save(

            this.STORAGE_KEY,

            this.statistics

        );

    },



    load:function(){

        const saved =

        SaveManager.load(

            this.STORAGE_KEY

        );

        if(saved){

            this.statistics = saved;

        }

    },



    get:function(){

        return {

            totalActivities:

            this.statistics.totalActivities,

            totalScore:

            this.statistics.totalScore,

            averageScore:

            this.statistics.averageScore,

            bestScore:

            this.statistics.bestScore,

            totalCorrect:

            this.statistics.totalCorrect,

            totalWrong:

            this.statistics.totalWrong

        };

    },



    reset:function(){

        this.statistics={

            totalActivities:0,

            totalScore:0,

            averageScore:0,

            bestScore:0,

            totalCorrect:0,

            totalWrong:0

        };

        this.save();

        console.log(

            "Statistics Reset"

        );

    },



    getAverage:function(){

        return

        this.statistics.averageScore;

    },



    getBestScore:function(){

        return

        this.statistics.bestScore;

    },



    getTotalActivities:function(){

        return

        this.statistics.totalActivities;

    },



    getTotalScore:function(){

        return

        this.statistics.totalScore;

    },



    getTotalCorrect:function(){

        return

        this.statistics.totalCorrect;

    },



    getTotalWrong:function(){

        return

        this.statistics.totalWrong;

    }

};



window.StatisticsManager =

StatisticsManager;



StatisticsManager.init();



console.log(

    "Statistics Manager Ready"

);