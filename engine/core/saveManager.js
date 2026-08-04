// =====================================
// Tahouri Edu Platform
// Version 1.0
// Save Manager
// =====================================

const SaveManager = {

    save:function(key,data){

        try{

            localStorage.setItem(

                key,

                JSON.stringify(data)

            );

            console.log(

                "Saved:",

                key

            );

            return true;

        }

        catch(error){

            console.error(

                "Save Error:",

                error

            );

            return false;

        }

    },



    load:function(key){

        try{

            const data =

            localStorage.getItem(

                key

            );

            if(data===null){

                return null;

            }

            return JSON.parse(data);

        }

        catch(error){

            console.error(

                "Load Error:",

                error

            );

            return null;

        }

    },



    remove:function(key){

        localStorage.removeItem(

            key

        );

    },



    exists:function(key){

        return localStorage.getItem(

            key

        ) !== null;

    },



    clear:function(){

        localStorage.clear();

    }

};



console.log(

    "Save Manager Ready"

);