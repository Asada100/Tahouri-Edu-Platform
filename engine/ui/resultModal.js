// =====================================
// Tahouri Edu Platform
// Version 3.2
// Result Modal
// =====================================

const ResultModal = {

    show:function(result){

        const oldModal =
        document.getElementById(
            "resultModal"
        );

        if(oldModal){

            oldModal.remove();

        }

       const modal =
document.createElement("div");

modal.id = "resultModal";

modal.style.position = "fixed";
modal.style.top = "0";
modal.style.left = "0";
modal.style.width = "100%";
modal.style.height = "100%";
modal.style.background = "rgba(0,0,0,0.5)";
modal.style.display = "flex";
modal.style.justifyContent = "center";
modal.style.alignItems = "center";
modal.style.zIndex = "9999";

        modal.innerHTML = `

       <div class="resultModalWindow"
style="
background:white;
padding:30px;
border-radius:15px;
text-align:center;
min-width:300px;
">

            <h1>
            🎉 فعالیت تمام شد
            </h1>

            <hr>

            <p>

            امتیاز:

            ${result.score}

            </p>

            ${
                result.pairs !== undefined
                ?
                `
                <p>
                جفت‌های پیدا شده:
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
                پاسخ غلط:
                ${result.wrongAnswers}
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

            🔄 دوباره امتحان کن

            </button>

            <button id="backActivitiesBtn">

            📚 بازگشت به فعالیت‌ها

            </button>

            <button id="homeBtn">

            🏠 صفحه اصلی

            </button>

        </div>

        `;

        document.body.appendChild(
            modal
        );

        document
        .getElementById(
            "retryActivityBtn"
        )
        .onclick = function(){

            modal.remove();

            App.restartActivity(
                AppState.activity
            );

        };

        document
        .getElementById(
            "backActivitiesBtn"
        )
        .onclick = function(){

            modal.remove();

            App.showActivities();

        };

        document
        .getElementById(
            "homeBtn"
        )
        .onclick = function(){

            modal.remove();

            App.goHome();

        };

    },



    hide:function(){

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