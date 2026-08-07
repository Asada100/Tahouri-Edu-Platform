// =====================================
// Tahouri Edu Platform
// Version 3.1
// Memory Engine
// Activity Result Integration
// Statistics Compatible
// Stable Event System
// =====================================


const MemoryEngine = {


    cards: [],


    firstCard: null,


    secondCard: null,


    lockBoard: false,


    activity: null,


    matchedPairs: 0,


    moves: 0,


    totalPairs: 0,


    finished: false,





    start: async function(activity){


        console.log(
            "Memory Engine Started"
        );



        this.activity = activity;



        this.firstCard = null;

        this.secondCard = null;

        this.lockBoard = false;

        this.matchedPairs = 0;

        this.moves = 0;

        this.finished = false;



        ScoreManager.reset();





        const cards =

        await DataManager.getCards(

            activity

        );





        this.cards = cards.map(function(card){



            return {


                id: card.id,


                value: card.value,


                flipped:false,


                matched:false


            };



        });






        this.totalPairs =

        this.cards.length / 2;





        this.cards =

        this.shuffle(

            this.cards

        );





        this.refresh();




        EventManager.emit(

            "activityStarted",

            activity

        );



        EventManager.emit(

            "activityPlaying"

        );



    },









    shuffle:function(cards){



        const array = [

            ...cards

        ];




        for(

            let i = array.length - 1;

            i > 0;

            i--

        ){



            const j = Math.floor(

                Math.random() *

                (i + 1)

            );



            const temp = array[i];


            array[i] = array[j];


            array[j] = temp;



        }



        return array;



    },









    flipCard:function(id){



        if(

            this.lockBoard ||

            this.finished

        ){

            return;

        }






        const card =

        this.cards.find(function(item){



            return item.id == id;



        });






        if(!card){


            return;


        }






        if(

            card.flipped ||

            card.matched

        ){

            return;

        }






        card.flipped = true;





        if(!this.firstCard){



            this.firstCard = card;



            this.refresh();



            return;



        }






        this.secondCard = card;



        this.moves++;




        this.refresh();



        this.checkMatch();




    },
        checkMatch:function(){



        this.lockBoard = true;





        if(

            this.firstCard.value ===

            this.secondCard.value

        ){



            this.firstCard.matched = true;


            this.secondCard.matched = true;




            this.matchedPairs++;




            ScoreManager.addCorrect();




            console.log(

                "Memory Match"

            );






            if(

                this.matchedPairs ===

                this.totalPairs

            ){



                setTimeout(function(){



                    MemoryEngine.finish();



                },800);



            }

            else{



                this.resetTurn();



            }



        }

        else{



            ScoreManager.addWrong();



            setTimeout(function(){



                if(

                    MemoryEngine.firstCard

                ){


                    MemoryEngine.firstCard.flipped = false;


                }




                if(

                    MemoryEngine.secondCard

                ){


                    MemoryEngine.secondCard.flipped = false;


                }





                MemoryEngine.resetTurn();



            },1000);



        }



    },









    resetTurn:function(){



        this.firstCard = null;


        this.secondCard = null;


        this.lockBoard = false;





        if(!this.finished){



            this.refresh();



        }



    },









    finish:function(){



        this.finished = true;


        this.lockBoard = true;





        const scoreResult =

        ScoreManager.getResult(

            this.totalPairs

        );






        const result =

        ActivityResult.create({



            activityId:

            this.activity

            ?

            this.activity.id

            :

            null,



            score:

            scoreResult.score || 0,



            totalQuestions:

            this.totalPairs,



            correctAnswers:

            this.matchedPairs,



            wrongAnswers:

            scoreResult.wrong || 0,



            percentage:

            Math.round(

                (

                    this.matchedPairs /

                    this.totalPairs

                )

                *

                100

            ),



            message:

            "🎉 بازی حافظه تمام شد"



        });







        console.log(

            "Memory Finished",

            result

        );







        EventManager.emit(

            "activityFinished",

            result

        );



    },









    refresh:function(){



        if(this.finished){



            return;



        }






        Screen.showMemory({



            title:

            this.activity

            ?

            this.activity.title

            :

            "بازی حافظه",



            cards:

            this.cards



        });






        Components.bindMemoryCards();



    },









    getCards:function(){



        return this.cards;



    }



};






console.log(

    "Memory Engine Ready"

);





window.MemoryEngine = MemoryEngine;