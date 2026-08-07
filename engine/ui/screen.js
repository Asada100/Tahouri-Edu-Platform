// =====================================
// Tahouri Edu Platform
// Version 3.2
// Screen Manager
// Result Modal Integration
// =====================================

const Screen = {

   showGrades:function(){

    const app =
    document.getElementById("app");

    app.innerHTML = `

    <div class="screen">


        <h1>
        انتخاب پایه
        </h1>



        <button id="grade6Btn">
        پایه ششم
        </button>



        <br><br>



        <button id="dashboardBtn">

        📊 گزارش عملکرد من

        </button>



    </div>

    `;


    Components.bindDashboardButton();


},



    showQuiz:function(data){

        const app =
        document.getElementById("app");

        app.innerHTML = `

        <div class="quizScreen">

            <h1>
            پلتفرم آموزشی طهوری
            </h1>

            <h2>
            ${data.title}
            </h2>

            <div class="scoreBox">

            امتیاز:
            ${data.score}

            </div>

            <div class="questionBox">

            سؤال ${data.currentQuestion}
            از ${data.totalQuestions}

            </div>

            <h2>

            ${data.question.text}

            </h2>

            <button id="evenBtn">
            زوج
            </button>

            <button id="oddBtn">
            فرد
            </button>

            <div id="messageBox"></div>

        </div>

        `;

    },



    showMessage:function(message,type){

        const box =
        document.getElementById(
            "messageBox"
        );

        if(!box){

            return;

        }

        box.innerHTML = message;

        box.className = type;

    },



    showMemory:function(data){

        const app =
        document.getElementById("app");

        app.innerHTML = `

        <div class="memoryScreen">

            <h1>
            پلتفرم آموزشی طهوری
            </h1>

            <hr>

            <h2>
            ${data.title}
            </h2>

            <div class="scoreBox">

            امتیاز:
            ${ScoreManager.score}

            </div>


            <div class="memoryBoard">

            ${
                data.cards.map(function(card){

                    return `

                    <button
                    class="memoryCard"
                    data-id="${card.id}">

                    ${
                        card.flipped || card.matched
                        ?
                        card.value
                        :
                        "❓"
                    }

                    </button>

                    `;

                }).join("")
            }

            </div>

        </div>

        `;

    },



    showFinish:function(result){


        console.log(
            "SHOW FINISH USING RESULT MODAL",
            result
        );


        ResultModal.show(
            result
        );


    }


};



console.log(
    "Screen Manager Ready"
);