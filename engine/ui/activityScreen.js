// =====================================
// Tahouri Edu Platform
// Activity Screen
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


                    return `



                    <button class="activitySelectBtn"

                    data-id="${activity.id}">



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