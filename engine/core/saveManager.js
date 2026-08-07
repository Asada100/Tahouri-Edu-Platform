// =====================================
// Tahouri Edu Platform
// Version 2.0
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

            return JSON.parse(

                data

            );

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

        try{

            localStorage.removeItem(

                key

            );

            console.log(

                "Removed:",

                key

            );

        }

        catch(error){

            console.error(

                "Remove Error:",

                error

            );

        }

    },





    exists:function(key){

        return (

            localStorage.getItem(

                key

            ) !== null

        );

    },





    clear:function(){

        try{

            localStorage.clear();

            console.log(

                "All Local Storage Cleared"

            );

        }

        catch(error){

            console.error(

                "Clear Error:",

                error

            );

        }

    },





    keys:function(){

        return Object.keys(

            localStorage

        );

    },





    init:function(){

        console.log(

            "Save Manager Initialized"

        );

    }

};



window.SaveManager =

SaveManager;



SaveManager.init();



console.log(

    "Save Manager Ready"

);