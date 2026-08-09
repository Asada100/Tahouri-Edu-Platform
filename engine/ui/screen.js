// =====================================
// Tahouri Edu Platform
// Version 3.5
// Screen Manager
// Result Modal Integration
// Grade Navigation
// =====================================

const Screen = {


// =====================================
// نمایش پایه‌ها
// =====================================
showGrades:function(){

    const app =
    document.getElementById("app");


    app.innerHTML = `

    <div class="screen">

        <h1>
        پلتفرم آموزشی طهوری
        </h1>

        <h2>
        انتخاب پایه
        </h2>

        <div id="gradesContainer">

        ${
            grades.map(function(grade){

                return `

                <button
                class="gradeBtn"
                data-id="${grade.id}">

                ${grade.title}

                </button>

                `;

            }).join("")
        }

        </div>

    </div>

    `;


    // =====================================
    // اتصال دکمه‌های پایه
    // =====================================

    document
    .querySelectorAll(".gradeBtn")
    .forEach(function(btn){

        btn.onclick = function(){

            const gradeId =
            this.dataset.id;


            Navigation.selectGrade(
                gradeId
            );


            showSubjects(
                gradeId
            );

        };

    });


    console.log(
        "Grades Displayed:",
        grades.length
    );

},


// =====================================
// نمایش آزمون
// =====================================
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


// =====================================
// پیام پاسخ
// =====================================
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


// =====================================
// نمایش بازی حافظه
// =====================================
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


// =====================================
// نمایش نتیجه
// =====================================
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