// =====================================
// Tahouri Edu Platform
// Version 1.2
// Statistics Manager
// =====================================


const StatisticsManager = {


    statistics:{


        totalActivities:0,

        totalScore:0,

        averageScore:0,

        bestScore:0,

        totalCorrect:0,

        totalWrong:0


    },




    addResult:function(activity, result){



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

        result.correctAnswers || 0;







        this.statistics.totalWrong +=

        result.wrongAnswers || 0;








        if(

            result.score >

            this.statistics.bestScore

        ){


            this.statistics.bestScore =

            result.score;


        }








        this.statistics.averageScore =


        Math.floor(


            this.statistics.totalScore /

            this.statistics.totalActivities


        );








        console.log(


            "Statistics Updated",


            this.statistics


        );




    },






    get:function(){


        return this.statistics;


    },






    reset:function(){


        this.statistics = {


            totalActivities:0,

            totalScore:0,

            averageScore:0,

            bestScore:0,

            totalCorrect:0,

            totalWrong:0


        };



        console.log(

            "Statistics Reset"

        );


    }



};





console.log(

    "Statistics Manager Ready"

);