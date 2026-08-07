// =====================================
// Tahouri Edu Platform
// Version 2.0
// Progress Tracker
// Standard Result Support
// Quiz + Memory + Future Engines
// =====================================


const ProgressTracker = {


    progress:{},



    init:function(){


        this.load();


        console.log(
            "Progress Tracker Ready"
        );


    },





    load:function(){


        const data =

        localStorage.getItem(
            "Tahouri_Progress"
        );


        if(data){


            this.progress =

            JSON.parse(data);


        }


    },





    save:function(){


        localStorage.setItem(

            "Tahouri_Progress",

            JSON.stringify(
                this.progress
            )

        );


    },







    get:function(activityId){


        if(
            !this.progress[activityId]
        ){


            this.progress[activityId]={


                played:false,


                bestScore:0,


                stars:0,


                percentage:0,


                completed:false,


                lastPlayed:null


            };


        }



        return this.progress[activityId];


    },









    calculatePercentage:function(result){



        // Quiz Engine

        if(
            result.percentage !== undefined
        ){


            return result.percentage;


        }






        // Memory Engine


        if(

            result.pairs !== undefined &&

            result.totalPairs !== undefined

        ){



            return Math.round(

                (

                    result.pairs /

                    result.totalPairs

                )

                *

                100

            );

        }







        // حالت ساده با امتیاز


        if(
            result.score !== undefined
        ){



            return Math.min(

                result.score,

                100

            );


        }







        return 0;


    },









    update:function(

        activityId,

        result

    ){



        const item =

        this.get(
            activityId
        );





        item.played = true;


        item.completed = true;



        item.lastPlayed =

        Date.now();







        item.percentage =

        this.calculatePercentage(
            result
        );







        item.stars =

        Math.round(

            item.percentage / 20

        );








        if(

            result.score >

            item.bestScore

        ){



            item.bestScore =

            result.score;



        }






        this.save();




        console.log(

            "Progress Updated:",

            activityId,

            item

        );



    },

getAll:function(){


    return this.progress;


},


    getStars:function(activityId){


        return this.get(
            activityId
        ).stars;


    },







    getBestScore:function(activityId){


        return this.get(
            activityId
        ).bestScore;


    },







    isCompleted:function(activityId){


        return this.get(
            activityId
        ).completed;


    }



};







window.ProgressTracker =

ProgressTracker;



ProgressTracker.init();