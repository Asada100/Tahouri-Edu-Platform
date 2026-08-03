// =====================================
// Tahouri Edu Platform
// Version 1.2
// Stage Based Learning Flow
// Grade -> Subject -> Chapter -> Activity
// =====================================


console.log(
    "Tahouri Edu Platform Started"
);



const app =
document.getElementById("app");





let grades = [];

let subjects = [];

let chapters = [];

let activities = [];









async function loadData(){



    try{



        const gradesResponse =
        await fetch(
            "data/grades.json"
        );

        grades =
        await gradesResponse.json();






        const subjectsResponse =
        await fetch(
            "data/subjects.json"
        );

        subjects =
        await subjectsResponse.json();







        const chaptersResponse =
        await fetch(
            "data/chapters.json"
        );

        chapters =
        await chaptersResponse.json();








        const activitiesResponse =
        await fetch(
            "data/activities.json"
        );

        activities =
        await activitiesResponse.json();






        console.log(
            "All Data Loaded"
        );



        showGrades();



    }



    catch(error){


        console.error(
            "Data Loading Error:",
            error
        );


    }



}









function showGrades(){



    app.innerHTML = `


    <div>


        <h1>
        انتخاب پایه
        </h1>



        ${
            grades.map(function(grade){


                return `


                <button class="gradeBtn"
                data-id="${grade.id}">

                ${grade.title}

                </button>


                `;


            }).join("")
        }



    </div>



    `;







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



}









function showSubjects(gradeId){



    const gradeSubjects =

    subjects.filter(function(subject){



        return subject.grades.includes(
            gradeId
        );


    });







    app.innerHTML = `


    <div>


        <h1>
        انتخاب درس
        </h1>




        ${
            gradeSubjects.map(function(subject){


                return `


                <button class="subjectBtn"
                data-id="${subject.id}">


                ${subject.title}


                </button>



                `;



            }).join("")
        }



    </div>



    `;







    document
    .querySelectorAll(".subjectBtn")
    .forEach(function(btn){



        btn.onclick = function(){



            const subjectId =

            this.dataset.id;




            Navigation.selectSubject(
                subjectId
            );



            showChapters(
                AppState.grade,
                subjectId
            );



        };



    });



}









function showChapters(
gradeId,
subjectId
){



    const subjectChapters =

    chapters.filter(function(chapter){



        return (

            chapter.grade === gradeId

            &&

            chapter.subject === subjectId

        );


    });








    app.innerHTML = `


    <div>


        <h1>
        انتخاب فصل
        </h1>




        ${
            subjectChapters.map(function(chapter){


                return `


                <button class="chapterBtn"
                data-id="${chapter.id}">


                ${chapter.title}


                </button>



                `;



            }).join("")
        }



    </div>



    `;








    document
    .querySelectorAll(".chapterBtn")
    .forEach(function(btn){



        btn.onclick = function(){



            const chapterId =

            this.dataset.id;




            Navigation.selectChapter(
                chapterId
            );



            showActivities(
                gradeId,
                subjectId,
                chapterId
            );



        };



    });



}









function showActivities(
gradeId,
subjectId,
chapterId
){



    const chapterActivities =

    activities.filter(function(activity){



        return (

            activity.grade === gradeId

            &&

            activity.subject === subjectId

            &&

            activity.chapter === chapterId

        );


    });








    app.innerHTML = `


    <div>


        <h1>
        انتخاب فعالیت
        </h1>




        ${
            chapterActivities.map(function(activity){


                return `


                <button class="activityBtn"
                data-id="${activity.id}">


                ${activity.title}


                </button>



                `;



            }).join("")
        }



    </div>



    `;








    document
    .querySelectorAll(".activityBtn")
    .forEach(function(btn){



        btn.onclick = function(){



            const activityId =

            this.dataset.id;




            Navigation.selectActivity(
                activityId
            );



            const activity =

            activities.find(function(item){


                return item.id === activityId;


            });




            loadActivity(
                activity
            );



        };



    });



}








function loadActivity(activity){


    ActivityManager.load(
        activity
    );


}



// شروع برنامه از AppController

App.init();