// =====================================
// Tahouri Edu Platform
// Version 3.2
// Components Manager
// Result Modal Integration
// =====================================

const Components = {

    isLocked:false,



    bindQuizButtons:function(){

        const evenBtn =
        document.getElementById("evenBtn");

        const oddBtn =
        document.getElementById("oddBtn");

        if(!evenBtn || !oddBtn){

            console.log(
                "Quiz Buttons Not Found"
            );

            return;

        }

        evenBtn.onclick = function(){

            Components.answer("زوج");

        };

        oddBtn.onclick = function(){

            Components.answer("فرد");

        };

    },



    answer:function(answer){

        if(this.isLocked){

            return;

        }

        this.isLocked = true;

        const evenBtn =
        document.getElementById("evenBtn");

        const oddBtn =
        document.getElementById("oddBtn");

        if(evenBtn){

            evenBtn.disabled = true;

        }

        if(oddBtn){

            oddBtn.disabled = true;

        }

        const result =
        QuizEngine.checkAnswer(
            answer
        );

        if(result){

            Screen.showMessage(
                "✅ پاسخ صحیح",
                "correct"
            );

        }

        else{

            Screen.showMessage(
                "❌ پاسخ اشتباه",
                "wrong"
            );

        }

        setTimeout(function(){

            const nextQuestion =
            QuizEngine.next();

            if(nextQuestion){

                Screen.showQuiz({

                    title:
                    "اعداد زوج و فرد",

                    score:
                    ScoreManager.score,

                    currentQuestion:
                    QuizEngine.currentQuestion + 1,

                    totalQuestions:
                    QuizEngine.questions.length,

                    question:
                    nextQuestion

                });

                Components.isLocked = false;

                Components.bindQuizButtons();

            }

            else{

                const finalResult =

                ResultManager.create(

                    QuizEngine.getResult()

                );

                Components.isLocked = false;

                ResultModal.show(
                    finalResult
                );

            }

        },1200);

    },



    bindMemoryCards:function(){

        const cards =

        document.querySelectorAll(
            ".memoryCard"
        );

        cards.forEach(function(card){

            card.onclick = function(){

                const id = Number(
                    this.dataset.id
                );

                MemoryEngine.flipCard(id);

                MemoryEngine.refresh();

                Components.bindMemoryCards();

            };

        });

    }

};

console.log(
    "Components Manager Ready"
);