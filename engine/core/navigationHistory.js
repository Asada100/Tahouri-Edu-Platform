// =====================================
// Tahouri Edu Platform
// Version 3.3
// Navigation History
// =====================================


const NavigationHistory = {


    stack: [],



    push:function(page,data){


        this.stack.push({

            page:page,

            data:data

        });


        console.log(
            "History Added:",
            page
        );


    },



    back:function(){


        if(this.stack.length <= 1){

            return null;

        }


        this.stack.pop();


        const previous =

        this.stack[
            this.stack.length - 1
        ];


        console.log(
            "Back To:",
            previous
        );


        return previous;


    },



    clear:function(){


        this.stack = [];


        console.log(
            "Navigation History Cleared"
        );


    }


};



console.log(
    "Navigation History Ready"
);