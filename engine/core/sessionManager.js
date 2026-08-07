// =====================================
// Tahouri Edu Platform
// Version 3.0
// Session Manager
// Standard Architecture
// =====================================

const SessionManager = {

    STORAGE_KEY: "Tahouri_Session",

    session: {

        startTime: null,

        endTime: null,

        duration: 0,

        totalScore: 0,

        totalActivities: 0,

        completedActivities: 0

    },



    start: function () {

        const saved = SaveManager.load(
            this.STORAGE_KEY
        );

        if (saved) {

            this.session = saved;

            console.log(
                "Session Loaded",
                this.session
            );

            return;
        }

        this.reset();

        console.log(
            "Session Started"
        );

    },



    addActivity: function (score) {

        this.session.totalActivities++;

        this.session.completedActivities++;

        this.session.totalScore += score;

        this.save();

        console.log(
            "Session Updated",
            this.session
        );

    },



    finish: function () {

        this.session.endTime = Date.now();

        this.session.duration = Math.floor(

            (
                this.session.endTime -
                this.session.startTime
            ) / 1000

        );

        this.save();

        console.log(
            "Session Finished",
            this.session
        );

    },



    save: function () {

        SaveManager.save(

            this.STORAGE_KEY,

            this.session

        );

    },



    load: function () {

        const data = SaveManager.load(
            this.STORAGE_KEY
        );

        if (data) {

            this.session = data;

        }

    },



    reset: function () {

        this.session = {

            startTime: Date.now(),

            endTime: null,

            duration: 0,

            totalScore: 0,

            totalActivities: 0,

            completedActivities: 0

        };

        this.save();

        console.log(
            "Session Reset"
        );

    },



    get: function () {

        return this.session;

    }

};



console.log(
    "Session Manager Ready"
);