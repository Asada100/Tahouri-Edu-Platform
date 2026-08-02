// =====================================
// Tahouri Edu Platform
// Version 2.5
// Screen Manager
// Quiz + Memory Result Support
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


        </div>

        `;


    },







    showQuiz:function(data){



        const app =
        document.getElementById("app");



        app.innerHTML = `


        <div class="quizScreen">


            <h1>
            پلتفرم آموزشی طهوری
            </h1>


            <hr>


            <h2>
            ${data.title}
            </h2>


            <div class="scoreBox">

            امتیاز:
            ${data.score}

            </div>




            <div class="questionBox">

            سؤال
            ${data.currentQuestion}

            از

            ${data.totalQuestions}

            </div>




            <hr>



            <h2>

            ${data.question.text}

            </h2>



            <br>



            <button id="evenBtn">

            زوج

            </button>



            <button id="oddBtn">

            فرد

            </button>



            <div id="messageBox">

            </div>



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


            ${data.cards.map(function(card){


                return `


                <button

                class="memoryCard"

                data-id="${card.id}">


                ${card.flipped ? card.value : "❓"}


                </button>


                `;


            }).join("")}



            </div>



        </div>



        `;


    },









    showFinish:function(result){



        const app =

        document.getElementById("app");



        let content = "";





        // نتیجه Quiz

        if(result.totalQuestions){



            content = `



            <p>

            امتیاز:

            ${result.score}

            </p>



            <p>

            تعداد سؤال:

            ${result.totalQuestions}

            </p>



            <p>

            پاسخ صحیح:

            ${result.correctAnswers}

            </p>



            <p>

            پاسخ اشتباه:

            ${result.wrongAnswers}

            </p>



            <p>

            درصد موفقیت:

            ${result.percentage}٪

            </p>



            `;



        }






        // نتیجه Memory

        else if(result.pairs !== undefined){



            content = `



            <p>

            امتیاز:

            ${result.score}

            </p>



            <p>

            جفت‌های پیدا شده:

            ${result.pairs}

            </p>



            <p>

            تعداد حرکت:

            ${result.moves}

            </p>



            <p>

            ${result.message || ""}

            </p>



            `;


        }





        app.innerHTML = `



        <div class="finishScreen">



            <h1>

            🎉 فعالیت تمام شد

            </h1>




            <hr>




            <h2>

            نتیجه بازی

            </h2>




            ${content}




            <br>




            <button id="retryBtn">

            دوباره امتحان کن

            </button>




            <button id="backActivitiesBtn">

            بازگشت به فعالیت‌ها

            </button>



        </div>



        `;



        console.log(

            "Finish Screen Ready"

        );



    }



};





console.log(

"Screen Manager Ready"

);