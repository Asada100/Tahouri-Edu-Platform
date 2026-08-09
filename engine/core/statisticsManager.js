// =====================================
// Tahouri Edu Platform
// Statistics Manager
// Version 3.0
// Overall + Subject + Activity Statistics
// =====================================

const StatisticsManager = {

    // =====================================
    // Storage
    // =====================================

    STORAGE_KEY:
        "Tahouri_Statistics",


    // =====================================
    // ساختار اصلی آمار
    // =====================================

    statistics: {

        // ---------------------------------
        // آمار کلی
        // ---------------------------------

        overall: {

            totalActivities: 0,

            totalScore: 0,

            averageScore: 0,

            bestScore: 0,

            totalCorrect: 0,

            totalWrong: 0

        },


        // ---------------------------------
        // آمار بر اساس درس
        // ---------------------------------

        subjects: {},


        // ---------------------------------
        // آمار بر اساس فعالیت
        // ---------------------------------

        activities: {}

    },


    // =====================================
    // INIT
    // =====================================

    init: function(){

        const saved =

            SaveManager.load(
                this.STORAGE_KEY
            );


        if(saved){

            // ---------------------------------
            // پشتیبانی از ساختار جدید
            // ---------------------------------

            if(
                saved.overall &&
                saved.subjects &&
                saved.activities
            ){

                this.statistics = saved;

            }

            else{

                // ---------------------------------
                // اگر داده قدیمی وجود داشته باشد
                // آن را پاک نمی‌کنیم.
                // ساختار جدید از صفر شروع می‌شود.
                // ---------------------------------

                console.log(
                    "Old Statistics Structure Detected"
                );

                this.reset();

            }

        }

        else{

            this.save();

        }


        console.log(
            "Statistics Loaded",
            this.statistics
        );

    },


    // =====================================
    // ثبت نتیجه فعالیت
    // =====================================

    addResult: function(activity, result){

        if(!activity){

            console.error(
                "Statistics Activity Missing"
            );

            return;

        }


        if(!result){

            console.error(
                "Statistics Result Missing"
            );

            return;

        }


        // =================================
        // اطلاعات پایه فعالیت
        // =================================

        const activityId =

            activity.id ||
            result.activityId ||
            "unknown";


        const subjectId =

            activity.subject ||
            "unknown";


        const gradeId =

            activity.grade ||
            "unknown";


        const chapterId =

            activity.chapter ||
            "unknown";


        const score =

            Number(
                result.score || 0
            );


        const correct =

            Number(
                result.correctAnswers ||
                result.correct ||
                0
            );


        const wrong =

            Number(
                result.wrongAnswers ||
                result.wrong ||
                0
            );


        const percentage =

            Number(
                result.percentage || 0
            );


        // =================================
        // 1
        // ثبت آمار کلی
        // =================================

        this.updateOverall({

            score: score,

            correct: correct,

            wrong: wrong

        });


        // =================================
        // 2
        // ثبت آمار درس
        // =================================

        this.updateSubject(

            subjectId,

            gradeId,

            {

                score: score,

                correct: correct,

                wrong: wrong,

                percentage: percentage

            }

        );


        // =================================
        // 3
        // ثبت آمار فعالیت
        // =================================

        this.updateActivity(

            activityId,

            subjectId,

            gradeId,

            chapterId,

            {

                score: score,

                correct: correct,

                wrong: wrong,

                percentage: percentage

            }

        );


        // =================================
        // ذخیره
        // =================================

        this.save();


        console.log(

            "Statistics Updated:",

            activityId,

            this.getActivity(activityId)

        );

    },


    // =====================================
    // UPDATE OVERALL
    // =====================================

    updateOverall: function(data){

        const overall =

            this.statistics.overall;


        overall.totalActivities++;


        overall.totalScore +=

            data.score;


        overall.totalCorrect +=

            data.correct;


        overall.totalWrong +=

            data.wrong;


        if(
            data.score >
            overall.bestScore
        ){

            overall.bestScore =
                data.score;

        }


        overall.averageScore =

            Math.round(

                overall.totalScore /
                overall.totalActivities

            );

    },


    // =====================================
    // UPDATE SUBJECT
    // =====================================

    updateSubject: function(
        subjectId,
        gradeId,
        data
    ){

        if(
            !this.statistics.subjects[
                subjectId
            ]
        ){

            this.statistics.subjects[
                subjectId
            ] = {

                subjectId:
                    subjectId,

                gradeId:
                    gradeId,

                totalActivities: 0,

                totalScore: 0,

                averageScore: 0,

                bestScore: 0,

                totalCorrect: 0,

                totalWrong: 0

            };

        }


        const subject =

            this.statistics.subjects[
                subjectId
            ];


        subject.totalActivities++;


        subject.totalScore +=
            data.score;


        subject.totalCorrect +=
            data.correct;


        subject.totalWrong +=
            data.wrong;


        if(
            data.score >
            subject.bestScore
        ){

            subject.bestScore =
                data.score;

        }


        subject.averageScore =

            Math.round(

                subject.totalScore /
                subject.totalActivities

            );

    },


    // =====================================
    // UPDATE ACTIVITY
    // =====================================

    updateActivity: function(
        activityId,
        subjectId,
        gradeId,
        chapterId,
        data
    ){

        if(
            !this.statistics.activities[
                activityId
            ]
        ){

            this.statistics.activities[
                activityId
            ] = {

                activityId:
                    activityId,

                subjectId:
                    subjectId,

                gradeId:
                    gradeId,

                chapterId:
                    chapterId,

                totalActivities: 0,

                totalScore: 0,

                averageScore: 0,

                bestScore: 0,

                totalCorrect: 0,

                totalWrong: 0,

                bestPercentage: 0

            };

        }


        const activity =

            this.statistics.activities[
                activityId
            ];


        activity.totalActivities++;


        activity.totalScore +=
            data.score;


        activity.totalCorrect +=
            data.correct;


        activity.totalWrong +=
            data.wrong;


        if(
            data.score >
            activity.bestScore
        ){

            activity.bestScore =
                data.score;

        }


        if(
            data.percentage >
            activity.bestPercentage
        ){

            activity.bestPercentage =
                data.percentage;

        }


        activity.averageScore =

            Math.round(

                activity.totalScore /
                activity.totalActivities

            );

    },


    // =====================================
    // SAVE
    // =====================================

    save: function(){

        SaveManager.save(

            this.STORAGE_KEY,

            this.statistics

        );

    },


    // =====================================
    // LOAD
    // =====================================

    load: function(){

        const saved =

            SaveManager.load(
                this.STORAGE_KEY
            );


        if(saved){

            this.statistics =
                saved;

        }

    },


    // =====================================
    // GET OVERALL
    // =====================================

    get: function(){

        return {

            ...this.statistics.overall

        };

    },


    // =====================================
    // GET SUBJECT
    // =====================================

    getSubject: function(subjectId){

        if(
            !this.statistics.subjects[
                subjectId
            ]
        ){

            return {

                subjectId:
                    subjectId,

                totalActivities: 0,

                totalScore: 0,

                averageScore: 0,

                bestScore: 0,

                totalCorrect: 0,

                totalWrong: 0

            };

        }


        return {

            ...this.statistics.subjects[
                subjectId
            ]

        };

    },


    // =====================================
    // GET ALL SUBJECTS
    // =====================================

    getSubjects: function(){

        return {

            ...this.statistics.subjects

        };

    },


    // =====================================
    // GET ACTIVITY
    // =====================================

    getActivity: function(activityId){

        if(
            !this.statistics.activities[
                activityId
            ]
        ){

            return {

                activityId:
                    activityId,

                totalActivities: 0,

                totalScore: 0,

                averageScore: 0,

                bestScore: 0,

                totalCorrect: 0,

                totalWrong: 0,

                bestPercentage: 0

            };

        }


        return {

            ...this.statistics.activities[
                activityId
            ]

        };

    },


    // =====================================
    // GET ALL ACTIVITIES
    // =====================================

    getActivities: function(){

        return {

            ...this.statistics.activities

        };

    },


    // =====================================
    // RESET ALL
    // =====================================

    reset: function(){

        this.statistics = {

            overall: {

                totalActivities: 0,

                totalScore: 0,

                averageScore: 0,

                bestScore: 0,

                totalCorrect: 0,

                totalWrong: 0

            },


            subjects: {},


            activities: {}

        };


        this.save();


        console.log(
            "Statistics Reset"
        );

    },


    // =====================================
    // توابع کمکی
    // =====================================

    getAverage: function(){

        return this.statistics
            .overall
            .averageScore;

    },


    getBestScore: function(){

        return this.statistics
            .overall
            .bestScore;

    },


    getTotalActivities: function(){

        return this.statistics
            .overall
            .totalActivities;

    },


    getTotalScore: function(){

        return this.statistics
            .overall
            .totalScore;

    },


    getTotalCorrect: function(){

        return this.statistics
            .overall
            .totalCorrect;

    },


    getTotalWrong: function(){

        return this.statistics
            .overall
            .totalWrong;

    }

};


// =====================================
// Global
// =====================================

window.StatisticsManager =
    StatisticsManager;


// =====================================
// Initialize
// =====================================

StatisticsManager.init();


console.log(
    "Statistics Manager Ready"
);