// =====================================
// Tahouri Edu Platform
// Version 3.5
// Result Modal
// Quiz + Memory Compatible
// Navigation Buttons
// Dashboard Button
// =====================================

const ResultModal = {

    show: function(result){

        const oldModal =
        document.getElementById(
            "resultModal"
        );


        if(oldModal){

            oldModal.remove();

        }


        const percentage =

        result.percentage !== undefined

        ?

        result.percentage

        :

        0;


        const stars =

        Math.round(
            percentage / 20
        );


        let starText = "";

        for(
            let i = 0;
            i < 5;
            i++
        ){

            starText +=

            i < stars

            ?

            "⭐"

            :

            "☆";

        }


        const modal =

        document.createElement(
            "div"
        );


        modal.id =
        "resultModal";


        modal.style.position="fixed";
        modal.style.top="0";
        modal.style.left="0";
        modal.style.width="100%";
        modal.style.height="100%";
        modal.style.background="rgba(0,0,0,0.5)";
        modal.style.display="flex";
        modal.style.justifyContent="center";
        modal.style.alignItems="center";
        modal.style.zIndex="9999";


        modal.innerHTML = `

        <div class="resultModalWindow"

        style="
        background:white;
        padding:30px;
        border-radius:15px;
        text-align:center;
        min-width:320px;
        ">


        <h1>
        🎉 نتیجه فعالیت
        </h1>


        <hr>


        <h2>
        ${result.title || "فعالیت آموزشی"}
        </h2>


        <p>
        امتیاز:

        <strong>
        ${result.score || 0}
        </strong>

        </p>


        <p>

        درصد موفقیت:

        <strong>
        ${percentage}%
        </strong>

        </p>


        <h2>
        ${starText}
        </h2>


        ${
            result.correctAnswers !== undefined

            ?

            `
            <p>
            پاسخ صحیح:
            ${result.correctAnswers}
            </p>
            `

            :

            ""

        }


        ${
            result.wrongAnswers !== undefined

            ?

            `
            <p>
            پاسخ اشتباه:
            ${result.wrongAnswers}
            </p>
            `

            :

            ""

        }


        ${
            result.pairs !== undefined

            ?

            `
            <p>
            جفت پیدا شده:
            ${result.pairs}
            </p>
            `

            :

            ""

        }


        ${
            result.moves !== undefined

            ?

            `
            <p>
            تعداد حرکت:
            ${result.moves}
            </p>
            `

            :

            ""

        }


        <p>

        ${result.message || ""}

        </p>


        <br>


        <button id="retryActivityBtn">

        🔄 دوباره بازی کن

        </button>


        <button id="backActivitiesBtn">

        📚 بازگشت به فعالیت‌ها

        </button>


        <button id="dashboardBtn">

        📊 گزارش عملکرد من

        </button>


        <button id="homeBtn">

        🏠 صفحه اصلی

        </button>


        </div>

        `;


        document.body.appendChild(
            modal
        );


        // =====================================
        // دوباره بازی
        // =====================================

        document
        .getElementById(
            "retryActivityBtn"
        )
        .onclick=function(){

            modal.remove();

            ActivityManager.restart();

        };


        // =====================================
        // بازگشت به فعالیت‌ها
        // =====================================

        document
        .getElementById(
            "backActivitiesBtn"
        )
        .onclick=function(){

            modal.remove();

            NavigationController.back();

        };


        // =====================================
        // گزارش عملکرد
        // =====================================

        document
        .getElementById(
            "dashboardBtn"
        )
        .onclick=function(){

            modal.remove();

            Navigation.openDashboard();

        };


        // =====================================
        // صفحه اصلی
        // =====================================

        document
        .getElementById(
            "homeBtn"
        )
        .onclick=function(){

            modal.remove();

            App.goHome();

        };

    },


    hide: function(){

        const modal =

        document.getElementById(
            "resultModal"
        );


        if(modal){

            modal.remove();

        }

    }

};


console.log(
    "Result Modal Ready"
);