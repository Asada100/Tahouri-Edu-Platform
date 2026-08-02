// =====================================
// Tahouri Edu Platform
// Version 2.5
// Memory Engine
// Score + Finish System
// =====================================


const MemoryEngine = {


    cards:[],


    firstCard:null,


    secondCard:null,


    lockBoard:false,


    activity:null,


    matchedPairs:0,


    moves:0,


    totalPairs:4,



    start:function(activity){


        console.log(
            "Memory Engine Started"
        );


        this.activity = activity;


        this.firstCard = null;


        this.secondCard = null;


        this.lockBoard = false;


        this.matchedPairs = 0;


        this.moves = 0;



        this.cards =

        this.generateCards();



        this.refresh();


    },







    generateCards:function(){



        const values = [


            "🍎","🍎",

            "🍌","🍌",

            "🍇","🍇",

            "🍓","🍓"


        ];



        const list = [];



        for(

            let i = 0;

            i < values.length;

            i++

        ){


            list.push({


                id:i,


                value:values[i],


                flipped:false,


                matched:false


            });


        }



        return this.shuffle(list);



    },







    shuffle:function(cards){



        const array = [...cards];



        for(

            let i = array.length - 1;

            i > 0;

            i--

        ){



            const j = Math.floor(

                Math.random() * (i + 1)

            );



            const temp = array[i];


            array[i] = array[j];


            array[j] = temp;



        }



        return array;


    },







    flipCard:function(id){



        if(this.lockBoard){

            return;

        }



        const card =

        this.cards.find(function(item){


            return item.id == id;


        });





        if(!card){

            return;

        }





        if(card.flipped || card.matched){

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



            this.resetTurn();




            if(

                this.matchedPairs ===

                this.totalPairs

            ){


                this.finish();


            }



        }

        else{



            setTimeout(function(){



                MemoryEngine.firstCard.flipped = false;


                MemoryEngine.secondCard.flipped = false;



                MemoryEngine.resetTurn();



            },1000);



        }



    },







    resetTurn:function(){



        this.firstCard = null;


        this.secondCard = null;


        this.lockBoard = false;



        this.refresh();



    },








    finish:function(){



        const result = {



            score:

            ScoreManager.score,



            pairs:

            this.matchedPairs,



            moves:

            this.moves,



            message:

            "🎉 بازی حافظه تمام شد"



        };



        console.log(

            "Memory Finished",

            result

        );



        console.log(
    "Sending Result To Screen",
    result
);

Screen.showFinish(result);



    },








    refresh:function(){



        Screen.showMemory({



            title:

            this.activity

            ?

            this.activity.title

            :

            "بازی حافظه",



            cards:this.cards



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