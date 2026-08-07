// =====================================
// Tahouri Edu Platform
// Version 1.0
// Dashboard Screen
// Statistics Display
// =====================================


const DashboardScreen = {


    show:function(){


        const stats =

        StatisticsManager.get();



        const app =

        document.getElementById(

            "app"

        );



        if(!app){

            console.error(

                "Dashboard App Container Missing"

            );

            return;

        }






        app.innerHTML = `


        <div class="dashboard-container">


            <h1>

                📊 گزارش عملکرد من

            </h1>



            <div class="dashboard-cards">



                <div class="dashboard-card">

                    <h3>
                    تعداد فعالیت‌ها
                    </h3>

                    <p>
                    ${stats.totalActivities}
                    </p>

                </div>





                <div class="dashboard-card">

                    <h3>
                    امتیاز کل
                    </h3>

                    <p>
                    ${stats.totalScore}
                    </p>

                </div>





                <div class="dashboard-card">

                    <h3>
                    میانگین امتیاز
                    </h3>

                    <p>
                    ${stats.averageScore}
                    </p>

                </div>





                <div class="dashboard-card">

                    <h3>
                    بهترین امتیاز
                    </h3>

                    <p>
                    ${stats.bestScore}
                    </p>

                </div>



            </div>





            <div class="dashboard-detail">


                <h2>
                آمار پاسخ‌ها
                </h2>



                <p>

                ✅ پاسخ صحیح:

                ${stats.totalCorrect}

                </p>




                <p>

                ❌ پاسخ اشتباه:

                ${stats.totalWrong}

                </p>



            </div>



        </div>


        `;



        console.log(

            "Dashboard Displayed",

            stats

        );


    }





};



window.DashboardScreen =

DashboardScreen;



console.log(

    "Dashboard Screen Ready"

);