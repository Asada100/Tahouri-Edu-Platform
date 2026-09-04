// =====================================
// Tahouri Edu Platform
// Daily Learning Streak v1.3
// Stores activity details + score for daily reports
// Replace dailyLearningStreak.js
// =====================================

const DailyLearningStreak = {

    STORAGE_KEY:
        "tahouri_daily_learning_streak",

    state: {

        days: {},

        currentStreak: 0,

        bestStreak: 0,

        lastCompletedDate: null

    },


    // =====================================
    // DATE KEY
    // =====================================

    key: function (d) {

        return (
            d.getFullYear() +
            "-" +
            String(d.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(d.getDate()).padStart(2, "0")
        );

    },


    today: function () {

        return this.key(
            new Date()
        );

    },


    // =====================================
    // INIT
    // =====================================

    init: function () {

        this.load();

        this.ensureToday();

        console.log(
            "Daily Learning Streak Ready",
            this.state
        );

    },


    // =====================================
    // LOAD
    // =====================================

    load: function () {

        try {

            const raw =
                localStorage.getItem(
                    this.STORAGE_KEY
                );


            if (raw) {

                const saved =
                    JSON.parse(raw);


                this.state = {

                    days:
                        saved.days || {},

                    currentStreak:
                        Number(
                            saved.currentStreak || 0
                        ),

                    bestStreak:
                        Number(
                            saved.bestStreak || 0
                        ),

                    lastCompletedDate:
                        saved.lastCompletedDate ||
                        null

                };


                Object.values(
                    this.state.days
                ).forEach(
                    function (day) {

                        day.subjects =
                            day.subjects || {};

                        day.activities =
                            Array.isArray(
                                day.activities
                            )
                                ? day.activities
                                : [];

                        day.activityCount =
                            Number(
                                day.activityCount || 0
                            );

                        day.totalScore =
                            Number(
                                day.totalScore || 0
                            );

                    }
                );

            }

        }

        catch (error) {

            console.error(
                "DailyLearningStreak Load Error",
                error
            );

        }

    },


    // =====================================
    // SAVE
    // =====================================

    save: function () {

        try {

            localStorage.setItem(

                this.STORAGE_KEY,

                JSON.stringify(
                    this.state
                )

            );

        }

        catch (error) {

            console.error(
                "DailyLearningStreak Save Error",
                error
            );

        }

    },


    // =====================================
    // ENSURE TODAY
    // =====================================

    ensureToday: function () {

        const key =
            this.today();


        if (
            !this.state.days[key]
        ) {

            this.state.days[key] = {

                date:
                    key,

                subjects: {},

                activities: [],

                activityCount: 0,

                totalScore: 0,

                status:
                    "empty",

                completedAt:
                    null

            };


            this.save();

        }

    },


    // =====================================
    // RECORD ACTIVITY
    // =====================================

    recordActivity: function (
        activity,
        result
    ) {

        if (!activity) {

            return;

        }


        this.ensureToday();


        const key =
            this.today();


        const day =
            this.state.days[key];


        const subject =
            activity.subject ||
            "unknown";


        const id =
            activity.id ||
            null;


        const score =
            Number(
                result?.score || 0
            );


        // =================================
        // SUBJECT
        // =================================

        if (
            !day.subjects[subject]
        ) {

            day.subjects[subject] = {

                activityCount: 0,

                activities: []

            };

        }


        day.subjects[
            subject
        ].activityCount++;


        if (
            id &&
            !day.subjects[
                subject
            ].activities.includes(id)
        ) {

            day.subjects[
                subject
            ].activities.push(id);

        }


        // =================================
        // ACTIVITY DETAIL
        // =================================

        day.activities.push({

            id:
                id,

            activity:
                id,

            title:
                activity.title ||
                activity.name ||
                id ||
                "فعالیت آموزشی",

            subject:
                subject,

            score:
                score,

            percentage:
                result?.percentage ??
                null,

            stars:
                result?.stars ??
                null,

            completedAt:
                new Date().toISOString()

        });


        day.activityCount++;

        day.totalScore += score;


        // =================================
        // EVALUATE
        // =================================

        this.evaluateToday();


        this.save();


        console.log(
            "DailyLearningStreak: Activity Recorded",
            {

                date:
                    key,

                subject:
                    subject,

                activity:
                    id,

                status:
                    day.status

            }
        );

    },


    // =====================================
    // GET SUBJECTS
    // =====================================

    subjects: function () {

        const grade =
            window.AppState?.grade;


        const activities =
            Array.isArray(
                window.App?.activities
            )
                ? window.App.activities
                : [];


        const subjects =
            new Set();


        activities.forEach(
            function (activity) {

                if (!activity) {

                    return;

                }


                if (
                    grade &&
                    activity.grade !== grade
                ) {

                    return;

                }


                if (
                    activity.subject
                ) {

                    subjects.add(
                        activity.subject
                    );

                }

            }
        );


        return [
            ...subjects
        ];

    },


    // =====================================
    // EVALUATE TODAY
    // =====================================

    evaluateToday: function () {

        const key =
            this.today();


        const day =
            this.state.days[key];


        const subjects =
            this.subjects();


        if (
            subjects.length === 0
        ) {

            day.status =
                day.activityCount > 0
                    ? "partial"
                    : "empty";

            return false;

        }


        const completed =
            subjects.every(
                function (subject) {

                    return (
                        day.subjects[subject] &&
                        day.subjects[
                            subject
                        ].activityCount > 0
                    );

                }
            );


        if (completed) {

            if (
                day.status !==
                "completed"
            ) {

                day.status =
                    "completed";


                day.completedAt =
                    new Date().toISOString();


                this.updateStreak();

            }


            return true;

        }


        day.status =
            day.activityCount > 0
                ? "partial"
                : "empty";


        return false;

    },


    // =====================================
    // STREAK
    // =====================================

    updateStreak: function () {

        const today =
            this.today();


        if (
            this.state.lastCompletedDate ===
            today
        ) {

            return;

        }


        const previous =
            this.previous(today);


        if (
            this.state.lastCompletedDate ===
            previous
        ) {

            this.state.currentStreak++;

        }

        else {

            this.state.currentStreak =
                1;

        }


        if (
            this.state.currentStreak >
            this.state.bestStreak
        ) {

            this.state.bestStreak =
                this.state.currentStreak;

        }


        this.state.lastCompletedDate =
            today;

    },


    // =====================================
    // PREVIOUS DATE
    // =====================================

    previous: function (key) {

        const date =
            new Date(
                key +
                "T00:00:00"
            );


        date.setDate(
            date.getDate() - 1
        );


        return this.key(date);

    },


    // =====================================
    // TODAY
    // =====================================

    getToday: function () {

        this.ensureToday();


        return JSON.parse(
            JSON.stringify(
                this.state.days[
                    this.today()
                ]
            )
        );

    },


    // =====================================
    // GET DAY
    // =====================================

    getDay: function (key) {

        if (
            this.state.days[key]
        ) {

            return JSON.parse(
                JSON.stringify(
                    this.state.days[key]
                )
            );

        }


        return {

            date:
                key,

            subjects: {},

            activities: [],

            activityCount: 0,

            totalScore: 0,

            status:
                "empty",

            completedAt:
                null

        };

    },


    // =====================================
    // STREAK GETTERS
    // =====================================

    getCurrentStreak: function () {

        return this.state.currentStreak;

    },


    getBestStreak: function () {

        return this.state.bestStreak;

    },


    // =====================================
    // DISPLAY DATA
    // =====================================

    getDisplayData: function () {

        const day =
            this.getToday();


        let icon =
            "❄️";


        let title =
            "مسیر یادگیری امروز";


        let message =
            "امروز هنوز مسیر یادگیری‌ات را شروع نکرده‌ای.";


        if (
            day.status ===
            "completed"
        ) {

            icon =
                "🔥";

            title =
                "زنجیره یادگیری فعال است";

            message =
                "عالی! امروز از همه درس‌ها یاد گرفتی.";

        }

        else if (
            day.status ===
            "partial"
        ) {

            icon =
                "📚";

            title =
                "مسیر یادگیری ادامه دارد";

            message =
                "چند قدم دیگر مانده تا مسیر امروز کامل شود.";

        }


        return {

            icon:
                icon,

            title:
                title,

            message:
                message,

            status:
                day.status,

            currentStreak:
                this.state.currentStreak,

            bestStreak:
                this.state.bestStreak,

            activityCount:
                day.activityCount,

            totalScore:
                day.totalScore

        };

    },


    // =====================================
    // RECENT DAYS
    // =====================================

    getRecentDays: function (
        count = 7
    ) {

        const result = [];

        const today =
            new Date();


        for (
            let i = 0;
            i < count;
            i++
        ) {

            const date =
                new Date(today);


            date.setDate(
                today.getDate() - i
            );


            const key =
                this.key(date);


            const day =
                this.state.days[key];


            result.push({

                date:
                    key,

                status:
                    day?.status ||
                    "empty",

                activityCount:
                    day?.activityCount ||
                    0,

                totalScore:
                    day?.totalScore ||
                    0

            });

        }


        return result;

    },


    // =====================================
    // RESET
    // =====================================

    reset: function () {

        this.state = {

            days: {},

            currentStreak: 0,

            bestStreak: 0,

            lastCompletedDate:
                null

        };


        this.save();

    },


    // =====================================
    // TEST
    // =====================================

    test: function () {

        return {

            today:
                this.getToday(),

            display:
                this.getDisplayData(),

            recentDays:
                this.getRecentDays(),

            currentStreak:
                this.getCurrentStreak(),

            bestStreak:
                this.getBestStreak()

        };

    }

};


window.DailyLearningStreak =
    DailyLearningStreak;


DailyLearningStreak.init();


console.log(
    "Daily Learning Streak v1.3 Ready"
);