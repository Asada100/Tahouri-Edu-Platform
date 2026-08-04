// =====================================
// Tahouri Edu Platform
// Engine Manager
// Version 1.3
// Engine Name Resolver
// =====================================


const EngineManager = {


    engines:{},



    register:function(id, engine){


        if(engine){


            this.engines[id] = engine;


            console.log(
                "Engine Registered:",
                id
            );


        }


    },





    getEngine:function(id){


        if(!id){

            return null;

        }



        // نام مستقیم

        if(this.engines[id]){

            return this.engines[id];

        }





        // تبدیل نام کلاس به نام ثبت شده

        const normalized =

        id
        .replace("Engine","")
        .toLowerCase();





        if(this.engines[normalized]){


            return this.engines[normalized];


        }



        return null;


    },





    init:function(){



        if(window.QuizEngine){


            this.register(
                "quiz",
                window.QuizEngine
            );


        }





        if(window.MemoryEngine){


            this.register(
                "memory",
                window.MemoryEngine
            );


        }





        console.log(
            "Engine Manager Initialized"
        );



    }


};





window.EngineManager = EngineManager;



console.log(
    "Engine Manager Ready"
);



EngineManager.init();