// =====================================
// Tahouri Edu Platform
// Activity Screen
// Version 2.0
// Content Lock Integration
// =====================================


const ActivityScreen = {



    show:function(activityList){


        const app =
        document.getElementById("app");



        app.innerHTML = `


        <div class="screen">


            <h1>
            انتخاب فعالیت
            </h1>





            ${
                activityList.map(function(activity){


                    const locked =

                    ContentLockManager.isLocked(
                        activity.id
                    );



                    return `


                    <button

                    class="activitySelectBtn"

                    data-id="${activity.id}"

                    ${locked ? "disabled" : ""}

                    >


                    ${
                        locked
                        ?
                        "🔒 "
                        :
                        "🔓 "
                    }


                    ${activity.title}


                    </button>


                    `;


                }).join("")
            }




        </div>


        `;







        document

        .querySelectorAll(
            ".activitySelectBtn"
        )

        .forEach(function(btn){





            btn.onclick = function(){



                const id =

                this.dataset.id;





                const activity =

                activityList.find(function(item){



                    return item.id === id;



                });






                if(
                    !ContentLockManager.canOpen(id)
                ){


                    alert(
                        "🔒 این فعالیت هنوز باز نشده است"
                    );


                    return;


                }





                AppState.activity = id;




                App.startActivity(
                    activity
                );



            };



        });



    }



};





console.log(
    "Activity Screen Ready"
);