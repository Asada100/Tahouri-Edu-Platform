// =====================================
// Tahouri Edu Platform
// Content Lock Manager
// Version 1.1
// JSON Based Lock System
// =====================================


const ContentLockManager = {


    lockedContents:{},



    init:function(){


        console.log(
            "Content Lock Manager Loading..."
        );


        this.loadLocks();


    },





    loadLocks:function(){


        fetch(
            "data/contentLocks.json"
        )

        .then(function(response){

            return response.json();

        })

        .then(function(data){


            data.forEach(function(item){


                ContentLockManager.lockedContents[item.id] =
                item.locked;


            });



            console.log(
                "Content Locks Loaded",
                ContentLockManager.lockedContents
            );



        })


        .catch(function(error){


            console.error(
                "Content Lock Load Error",
                error
            );


        });


    },







    isLocked:function(contentId){


        return this.lockedContents[contentId] === true;


    },








    lock:function(contentId){


        this.lockedContents[contentId] = true;


        console.log(
            "Content Locked:",
            contentId
        );


    },








    unlock:function(contentId){


        this.lockedContents[contentId] = false;


        console.log(
            "Content Unlocked:",
            contentId
        );


    },








    canOpen:function(contentId){


        if(
            this.isLocked(contentId)
        ){


            console.log(
                "Content Is Locked:",
                contentId
            );


            return false;


        }



        return true;


    }



};





window.ContentLockManager =
ContentLockManager;



ContentLockManager.init();


console.log(
"Content Lock Manager Ready"
);