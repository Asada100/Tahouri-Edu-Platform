// =====================================
// Tahouri Edu Platform
// Dashboard Screen v10.1
//
// Persian Learning Calendar
// Compact Calendar Grid
// Clickable Calendar Grid
// Daily Report Page
//
// IMPORTANT:
// - No external CSS required
// - Does not modify DailyLearningStreak
// - Does not modify StatisticsManager
// - Does not modify ProgressManager
// - Does not modify ContentLockManager
// =====================================


const DashboardScreen = {

    // =====================================
    // CALENDAR STATE
    // =====================================

    calendarState: null,


    // =====================================
    // DATE KEY
    // =====================================

    dateKey: function (date) {

        return (
            date.getFullYear() +
            "-" +
            String(date.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(date.getDate()).padStart(2, "0")
        );

    },


    // =====================================
    // PERSIAN DATE PARTS
    // =====================================

    pparts: function (date) {

        try {

            const parts =
                new Intl.DateTimeFormat(
                    "en-US-u-ca-persian",
                    {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric"
                    }
                ).formatToParts(date);


            const result = {};


            parts.forEach(
                function (part) {

                    if (
                        part.type === "year" ||
                        part.type === "month" ||
                        part.type === "day"
                    ) {

                        result[part.type] =
                            Number(part.value);

                    }

                }
            );


            return result;

        }

        catch (error) {

            console.error(
                "Persian Date Error:",
                error
            );

            return null;

        }

    },


    // =====================================
    // PERSIAN DATE
    // =====================================

    pdate: function (date) {

        try {

            return new Intl.DateTimeFormat(
                "fa-IR-u-ca-persian",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            ).format(date);

        }

        catch (error) {

            return "";

        }

    },


    // =====================================
    // PERSIAN MONTH NAME
    // =====================================

    pmonth: function (month) {

        const months = [

            "فروردین",
            "اردیبهشت",
            "خرداد",
            "تیر",
            "مرداد",
            "شهریور",
            "مهر",
            "آبان",
            "آذر",
            "دی",
            "بهمن",
            "اسفند"

        ];


        return (
            months[month - 1] ||
            ""
        );

    },


    // =====================================
    // PERSIAN WEEKDAY
    // =====================================

    pweekday: function (date) {

        const days = [

            "یکشنبه",
            "دوشنبه",
            "سه‌شنبه",
            "چهارشنبه",
            "پنجشنبه",
            "جمعه",
            "شنبه"

        ];


        return (
            days[date.getDay()] ||
            ""
        );

    },


    // =====================================
    // FIND PERSIAN MONTH START
    // =====================================

    findMonthStart: function (
        year,
        month
    ) {

        const now =
            new Date();


        const current =
            this.pparts(now);


        if (!current) {

            return null;

        }


        let approximate =
            new Date(now);


        const yearDifference =
            year -
            current.year;


        const monthDifference =
            month -
            current.month;


        approximate.setDate(
            approximate.getDate() +
            (
                yearDifference * 365
            ) +
            (
                monthDifference * 30
            ) -
            (
                current.day - 1
            )
        );


        for (
            let offset = -45;
            offset <= 45;
            offset++
        ) {

            const candidate =
                new Date(approximate);


            candidate.setDate(
                candidate.getDate() +
                offset
            );


            const parts =
                this.pparts(candidate);


            if (
                parts &&
                parts.year === year &&
                parts.month === month &&
                parts.day === 1
            ) {

                return candidate;

            }

        }


        return null;

    },


    // =====================================
    // NUMBER OF DAYS
    // =====================================

    monthDays: function (
        year,
        month
    ) {

        const start =
            this.findMonthStart(
                year,
                month
            );


        if (!start) {

            return month <= 6
                ? 31
                : 30;

        }


        const nextYear =
            month === 12
                ? year + 1
                : year;


        const nextMonth =
            month === 12
                ? 1
                : month + 1;


        const next =
            this.findMonthStart(
                nextYear,
                nextMonth
            );


        if (!next) {

            if (month <= 6) {

                return 31;

            }

            if (month <= 11) {

                return 30;

            }

            return 29;

        }


        return Math.round(
            (
                next - start
            ) /
            86400000
        );

    },


    // =====================================
    // CURRENT STATE
    // =====================================

    getState: function () {

        const parts =
            this.pparts(new Date());


        if (!parts) {

            return {
                year: 1405,
                month: 6
            };

        }


        return {

            year: parts.year,
            month: parts.month

        };

    },


    // =====================================
    // GET DAY DATA
    // =====================================

    getDayData: function (key) {

        try {

            if (
                window.DailyLearningStreak &&
                typeof
                window.DailyLearningStreak.getDay ===
                "function"
            ) {

                return (
                    window.DailyLearningStreak.getDay(key) ||
                    null
                );

            }

        }

        catch (error) {

            console.error(
                "Daily Learning Streak getDay Error:",
                error
            );

        }


        return null;

    },


    // =====================================
    // CALENDAR
    // =====================================

    calendar: function () {

        const state =
            this.calendarState ||
            this.getState();


        this.calendarState =
            state;


        const first =
            this.findMonthStart(
                state.year,
                state.month
            );


        const total =
            this.monthDays(
                state.year,
                state.month
            );


        if (!first) {

            return `
                <div class="learning-calendar-error">
                    خطا در نمایش تقویم
                </div>
            `;

        }


        let cells = "";


        const lead =
            (
                first.getDay() + 1
            ) % 7;


        // =====================================
        // EMPTY CELLS
        // =====================================

        for (
            let i = 0;
            i < lead;
            i++
        ) {

            cells += `
                <div class="learning-calendar-cell empty-cell"></div>
            `;

        }


        // =====================================
        // DAYS
        // =====================================

        for (
            let dayNumber = 1;
            dayNumber <= total;
            dayNumber++
        ) {

            const date =
                new Date(first);


            date.setDate(
                first.getDate() +
                dayNumber -
                1
            );


            const key =
                this.dateKey(date);


            const day =
                this.getDayData(key);


            const status =
                day && day.status
                    ? day.status
                    : "empty";


            const today =
                key ===
                this.dateKey(new Date());


            let icon = "";


            if (
                status === "completed"
            ) {

                icon = "🔥";

            }

            else if (
                status === "partial"
            ) {

                icon = "📚";

            }

            else if (
                status === "freeze"
            ) {

                icon = "❄️";

            }


            let classes =
                "learning-calendar-cell";


            if (
                status === "completed"
            ) {

                classes +=
                    " calendar-completed";

            }

            else if (
                status === "partial"
            ) {

                classes +=
                    " calendar-partial";

            }

            else if (
                status === "freeze"
            ) {

                classes +=
                    " calendar-freeze";

            }

            else {

                classes +=
                    " calendar-empty";

            }


            if (today) {

                classes +=
                    " calendar-today";

            }


            const activityCount =
                Number(
                    day?.activityCount || 0
                );


            cells += `

                <div
                    class="${classes}"
                    data-learning-date="${key}"
                    role="button"
                    tabindex="0"
                    title="گزارش ${dayNumber} ${this.pmonth(state.month)}"
                >

                    <span class="calendar-day-number">
                        ${dayNumber}
                    </span>

                    <span class="calendar-day-icon">
                        ${icon}
                    </span>

                    ${
                        activityCount > 0
                        ?
                        `
                            <span class="calendar-day-count">
                                ${activityCount}
                            </span>
                        `
                        :
                        ""
                    }

                </div>

            `;

        }


        return `

            <!-- ========================= -->
            <!-- MONTH HEADER -->
            <!-- ========================= -->

            <div
                class="learning-calendar-header">

                <div
                    id="learningCalendarPrev"
                    class="calendar-month-arrow"
                    role="button"
                    tabindex="0">

                    ‹

                </div>


                <div
                    class="calendar-month-title">

                    ${this.pmonth(state.month)}

                    <span>
                        ${state.year}
                    </span>

                </div>


                <div
                    id="learningCalendarNext"
                    class="calendar-month-arrow"
                    role="button"
                    tabindex="0">

                    ›

                </div>

            </div>


            <!-- ========================= -->
            <!-- WEEK DAYS -->
            <!-- ========================= -->

            <div
                class="learning-calendar-weekdays">

                <span>ش</span>
                <span>ی</span>
                <span>د</span>
                <span>س</span>
                <span>چ</span>
                <span>پ</span>
                <span>ج</span>

            </div>


            <!-- ========================= -->
            <!-- CALENDAR GRID -->
            <!-- ========================= -->

            <div
                class="learning-calendar-grid">

                ${cells}

            </div>


            <!-- ========================= -->
            <!-- LEGEND -->
            <!-- ========================= -->

            <div
                class="learning-calendar-legend">

                <span>
                    🔥 فعالیت کامل
                </span>

                <span>
                    📚 فعالیت ناقص
                </span>

                <span>
                    ❄️ بدون فعالیت
                </span>

            </div>

        `;

    },


    // =====================================
    // SHOW DASHBOARD
    // =====================================

    show: function (data) {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        data =
            data || {};


        const overall =
            data.overall || {};


        const continueLearning =
            data.continueLearning || {};


        const profile =
            window.ProfileManager &&
            typeof
            window.ProfileManager.get ===
            "function"
                ?
                window.ProfileManager.get()
                :
                {};


        const studentName =
            profile.name ||
            "دانش‌آموز";


        const gradeTitles = {

            grade1: "پایه اول",
            grade2: "پایه دوم",
            grade3: "پایه سوم",
            grade4: "پایه چهارم",
            grade5: "پایه پنجم",
            grade6: "پایه ششم",
            grade7: "پایه هفتم",
            grade8: "پایه هشتم",
            grade9: "پایه نهم"

        };


        const gradeTitle =
            gradeTitles[profile.grade] ||
            profile.grade ||
            "";


        const totalActivities =
            Number(
                overall.totalActivities || 0
            );


        let streak = 0;


        try {

            if (
                window.DailyLearningStreak &&
                typeof
                window.DailyLearningStreak.getCurrentStreak ===
                "function"
            ) {

                streak =
                    Number(
                        window.DailyLearningStreak
                            .getCurrentStreak() || 0
                    );

            }

        }

        catch (error) {

            console.error(
                "Streak Error:",
                error
            );

        }


        this.calendarState = null;


        app.innerHTML = `

            <div class="screen dashboard-screen">

                <!-- ========================= -->
                <!-- WELCOME -->
                <!-- ========================= -->

                <div class="dashboard-welcome">

                    <h1>
                        👋 سلام ${studentName}
                    </h1>


                    ${
                        gradeTitle
                        ?
                        `
                            <p>
                                🎓 ${gradeTitle}
                            </p>
                        `
                        :
                        ""
                    }

                </div>


                <hr>


                <!-- ========================= -->
                <!-- LEARNING CALENDAR -->
                <!-- ========================= -->

                <div
                    class="
                        dashboard-card
                        learning-calendar-card
                    ">

                    <div
                        class="learning-calendar-heading">

                        <div>

                            <h2>
                                📅 تقویم مسیر یادگیری
                            </h2>

                            <p>
                                برای دیدن گزارش هر روز،
                                روی خانه همان روز کلیک کن.
                            </p>

                        </div>


                        <div
                            class="streak-badge">

                            🔥

                            <strong>
                                ${streak}
                            </strong>

                            <span>
                                روز
                            </span>

                        </div>

                    </div>


                    <div
                        id="learningCalendarContainer">

                        ${this.calendar()}

                    </div>

                </div>


                <!-- ========================= -->
                <!-- CONTINUE LEARNING -->
                <!-- ========================= -->

                <div class="dashboard-card">

                    <h2>
                        🧭 ادامه مسیر من
                    </h2>


                    ${
                        continueLearning &&
                        continueLearning.activityId

                        ?

                        `

                            <div
                                class="dashboard-next-learning">

                                <span>
                                    🎯
                                </span>


                                <div>

                                    <strong>
                                        ${
                                            continueLearning.activityTitle ||
                                            "فعالیت بعدی"
                                        }
                                    </strong>


                                    ${
                                        continueLearning.subject
                                        ?
                                        `
                                            <small>
                                                ${
                                                    this.subjectTitle(
                                                        continueLearning.subject
                                                    )
                                                }
                                            </small>
                                        `
                                        :
                                        ""
                                    }

                                </div>

                            </div>


                            <div
                                id="dashboardContinueBtn"
                                class="dashboard-small-action"
                                role="button"
                                tabindex="0">

                                ▶️ ادامه یادگیری

                            </div>

                        `

                        :

                        `

                            <div
                                class="dashboard-empty">

                                🎉

                                مسیر فعلی را کامل کردی!

                            </div>

                        `
                    }

                </div>


                <!-- ========================= -->
                <!-- PERSONAL MESSAGE -->
                <!-- ========================= -->

                <div class="dashboard-card">

                    <h2>
                        💬 یک جمله برای تو
                    </h2>


                    <div
                        class="dashboard-message">

                        <span>
                            🚀
                        </span>


                        <p>
                            قدم‌به‌قدم داری جلو می‌ری.
                            با همین تمرکز ادامه بده!
                        </p>

                    </div>

                </div>


                <!-- ========================= -->
                <!-- STATUS -->
                <!-- ========================= -->

                <div class="dashboard-card">

                    <h2>
                        🏅 وضعیت من
                    </h2>


                    <p>

                        تا اینجا

                        <strong>
                            ${totalActivities}
                        </strong>

                        بار در فعالیت‌هایت
                        تلاش کرده‌ای.

                    </p>

                </div>


                <hr>


                <!-- ========================= -->
                <!-- SMALL ACTIONS -->
                <!-- ========================= -->

                <div class="dashboard-actions">

                    <div
                        id="dashboardReportsBtn"
                        class="dashboard-action-item"
                        role="button"
                        tabindex="0">

                        📈
                        <span>
                            گزارش عملکرد
                        </span>

                    </div>


                    <div
                        id="dashboardGradesBtn"
                        class="dashboard-action-item"
                        role="button"
                        tabindex="0">

                        🎓
                        <span>
                            انتخاب پایه
                        </span>

                    </div>


                    <div
                        id="dashboardHomeBtn"
                        class="dashboard-action-item"
                        role="button"
                        tabindex="0">

                        🏠
                        <span>
                            صفحه اصلی
                        </span>

                    </div>

                </div>

            </div>

        `;


        this.styles();


        this.bind(
            continueLearning
        );


        console.log(
            "Dashboard Screen v10.1 Ready"
        );

    },


    // =====================================
    // SUBJECT TITLE
    // =====================================

    subjectTitle: function (
        subject
    ) {

        const titles = {

            math: "ریاضی",
            science: "علوم",
            computer: "رایانه",
            persian: "فارسی",
            social: "مطالعات اجتماعی",
            arabic: "عربی",
            english: "زبان انگلیسی"

        };


        return (
            titles[subject] ||
            subject ||
            ""
        );

    },


    // =====================================
    // BIND EVENTS
    // =====================================

    bind: function (
        continueLearning
    ) {

        const calendar =
            document.getElementById(
                "learningCalendarContainer"
            );


        // =====================================
        // CALENDAR CLICK
        // =====================================

        if (calendar) {

            calendar.onclick =
                function (event) {

                    const day =
                        event.target.closest(
                            "[data-learning-date]"
                        );


                    if (day) {

                        DashboardScreen.showDailyReport(
                            day.dataset.learningDate
                        );

                        return;

                    }


                    const previous =
                        event.target.closest(
                            "#learningCalendarPrev"
                        );


                    if (previous) {

                        DashboardScreen.changeMonth(-1);

                        return;

                    }


                    const next =
                        event.target.closest(
                            "#learningCalendarNext"
                        );


                    if (next) {

                        DashboardScreen.changeMonth(1);

                    }

                };


            calendar.onkeydown =
                function (event) {

                    if (
                        event.key !== "Enter" &&
                        event.key !== " "
                    ) {

                        return;

                    }


                    const target =
                        event.target.closest(
                            "[data-learning-date], #learningCalendarPrev, #learningCalendarNext"
                        );


                    if (!target) {

                        return;

                    }


                    event.preventDefault();


                    if (
                        target.dataset &&
                        target.dataset.learningDate
                    ) {

                        DashboardScreen.showDailyReport(
                            target.dataset.learningDate
                        );

                        return;

                    }


                    if (
                        target.id ===
                        "learningCalendarPrev"
                    ) {

                        DashboardScreen.changeMonth(-1);

                        return;

                    }


                    if (
                        target.id ===
                        "learningCalendarNext"
                    ) {

                        DashboardScreen.changeMonth(1);

                    }

                };

        }


        // =====================================
        // CONTINUE
        // =====================================

        const continueButton =
            document.getElementById(
                "dashboardContinueBtn"
            );


        if (continueButton) {

            continueButton.onclick =
                function () {

                    if (
                        window.DashboardController &&
                        typeof
                        window.DashboardController
                            .continueLearning ===
                        "function"
                    ) {

                        window.DashboardController
                            .continueLearning(
                                continueLearning
                            );

                    }

                };

        }


        // =====================================
        // REPORTS
        // =====================================

        const reports =
            document.getElementById(
                "dashboardReportsBtn"
            );


        if (reports) {

            reports.onclick =
                function () {

                    if (
                        window.ReportsController &&
                        typeof
                        window.ReportsController.open ===
                        "function"
                    ) {

                        window.ReportsController.open();

                    }

                };

        }


        // =====================================
        // GRADES
        // =====================================

        const grades =
            document.getElementById(
                "dashboardGradesBtn"
            );


        if (grades) {

            grades.onclick =
                function () {

                    if (
                        window.Screen &&
                        typeof
                        window.Screen.showGrades ===
                        "function"
                    ) {

                        window.Screen.showGrades();

                    }

                };

        }


        // =====================================
        // HOME
        // =====================================

        const home =
            document.getElementById(
                "dashboardHomeBtn"
            );


        if (home) {

            home.onclick =
                function () {

                    if (
                        window.Screen &&
                        typeof
                        window.Screen.showHome ===
                        "function"
                    ) {

                        window.Screen.showHome();

                    }

                };

        }

    },


    // =====================================
    // CHANGE MONTH
    // =====================================

    changeMonth: function (
        step
    ) {

        const state =
            this.calendarState ||
            this.getState();


        state.month += step;


        if (state.month < 1) {

            state.month = 12;
            state.year--;

        }


        if (state.month > 12) {

            state.month = 1;
            state.year++;

        }


        this.calendarState =
            state;


        const container =
            document.getElementById(
                "learningCalendarContainer"
            );


        if (container) {

            container.innerHTML =
                this.calendar();

        }

    },


    // =====================================
    // DAILY REPORT
    // =====================================

    showDailyReport: function (
        key
    ) {

        const app =
            document.getElementById("app");


        if (!app) {

            return;

        }


        console.log(
            "Opening Daily Report:",
            key
        );


        const day =
            this.getDayData(key) ||
            {

                activities: [],
                activityCount: 0,
                totalScore: 0,
                status: "empty"

            };


        const activities =
            Array.isArray(day.activities)
                ?
                day.activities
                :
                [];


        const date =
            this.parseKey(key);


        const subjectTitles = {

            math: "ریاضی",
            science: "علوم",
            computer: "رایانه",
            persian: "فارسی",
            social: "مطالعات اجتماعی",
            arabic: "عربی",
            english: "زبان انگلیسی"

        };


        let score = 0;


        activities.forEach(
            function (activity) {

                score +=
                    Number(
                        activity.score ||
                        activity.totalScore ||
                        0
                    );

            }
        );


        if (
            score === 0 &&
            day.totalScore
        ) {

            score =
                Number(day.totalScore);

        }


        let statusIcon =
            "❄️";


        let statusText =
            "امروز فعالیتی انجام نشده است";


        if (
            day.status === "completed"
        ) {

            statusIcon =
                "🔥";

            statusText =
                "مسیر امروز کامل شده";

        }

        else if (
            day.status === "partial"
        ) {

            statusIcon =
                "📚";

            statusText =
                "مسیر امروز هنوز کامل نشده";

        }

        else if (
            activities.length > 0
        ) {

            statusIcon =
                "📚";

            statusText =
                "امروز فعالیت انجام شده است";

        }


        let activityHTML = "";


        if (
            activities.length > 0
        ) {

            activityHTML =
                activities.map(
                    function (activity) {

                        const subject =
                            subjectTitles[
                                activity.subject
                            ] ||
                            activity.subject ||
                            "درس";


                        const title =
                            activity.title ||
                            activity.activityTitle ||
                            activity.activity ||
                            "فعالیت آموزشی";


                        const activityScore =
                            Number(
                                activity.score ||
                                activity.totalScore ||
                                0
                            );


                        return `

                            <div class="daily-report-activity">

                                <div class="daily-report-check">
                                    ✓
                                </div>


                                <div class="daily-report-activity-info">

                                    <strong>
                                        ${subject}
                                    </strong>


                                    <span>
                                        ${title}
                                    </span>

                                </div>


                                <div class="daily-report-activity-score">

                                    ⭐
                                    ${activityScore}

                                </div>

                            </div>

                        `;

                    }
                ).join("");

        }

        else {

            activityHTML = `

                <div class="daily-report-empty">

                    امروز هنوز فعالیتی ثبت نشده است.

                </div>

            `;

        }


        let currentStreak = 0;


        try {

            if (
                window.DailyLearningStreak &&
                typeof
                window.DailyLearningStreak
                    .getCurrentStreak ===
                "function"
            ) {

                currentStreak =
                    Number(
                        window.DailyLearningStreak
                            .getCurrentStreak() || 0
                    );

            }

        }

        catch (error) {

            console.error(
                "Daily Report Streak Error:",
                error
            );

        }


        app.innerHTML = `

            <div
                class="
                    screen
                    daily-report-screen
                ">


                <!-- ========================= -->
                <!-- HEADER -->
                <!-- ========================= -->

                <div
                    class="daily-report-top">

                    <div
                        id="dailyReportBackBtn"
                        class="daily-report-back"
                        role="button"
                        tabindex="0">

                        ←
                        <span>
                            بازگشت
                        </span>

                    </div>


                    <div
                        class="daily-report-title">

                        <h1>
                            گزارش روزانه
                        </h1>


                        <p>

                            📅

                            ${this.pweekday(date)}

                            ${this.pdate(date)}

                        </p>

                    </div>

                </div>


                <!-- ========================= -->
                <!-- ACTIVITIES -->
                <!-- ========================= -->

                <div
                    class="daily-report-card">

                    <h2>
                        📚 فعالیت‌های امروز
                    </h2>


                    <div>

                        ${activityHTML}

                    </div>

                </div>


                <!-- ========================= -->
                <!-- SUMMARY -->
                <!-- ========================= -->

                <div
                    class="daily-report-summary">


                    <div
                        class="daily-report-summary-item">

                        <span>
                            ${statusIcon}
                        </span>


                        <small>
                            وضعیت روز
                        </small>


                        <strong>
                            ${statusText}
                        </strong>

                    </div>


                    <div
                        class="daily-report-summary-item">

                        <span>
                            ⭐
                        </span>


                        <small>
                            امتیاز امروز
                        </small>


                        <strong>
                            ${score}
                        </strong>

                    </div>


                    <div
                        class="daily-report-summary-item">

                        <span>
                            🎯
                        </span>


                        <small>
                            تعداد فعالیت
                        </small>


                        <strong>
                            ${activities.length}
                        </strong>

                    </div>

                </div>


                <!-- ========================= -->
                <!-- STREAK -->
                <!-- ========================= -->

                <div
                    class="daily-report-streak">

                    🔥

                    زنجیره فعلی:

                    <strong>
                        ${currentStreak}
                    </strong>

                    روز

                </div>


            </div>

        `;


        const back =
            document.getElementById(
                "dailyReportBackBtn"
            );


        if (back) {

            back.onclick =
                function () {

                    if (
                        window.DashboardController &&
                        typeof
                        window.DashboardController.open ===
                        "function"
                    ) {

                        window.DashboardController.open();

                        return;

                    }


                    if (
                        window.Screen &&
                        typeof
                        window.Screen.showDashboard ===
                        "function"
                    ) {

                        window.Screen.showDashboard();

                    }

                };


            back.onkeydown =
                function (event) {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        back.click();

                    }

                };

        }


        this.styles();


        console.log(
            "Daily Report Displayed:",
            key
        );

    },


    // =====================================
    // PARSE INTERNAL DATE KEY
    // =====================================

    parseKey: function (
        key
    ) {

        if (
            !key ||
            typeof key !== "string"
        ) {

            return new Date();

        }


        const parts =
            key.split("-");


        if (
            parts.length !== 3
        ) {

            return new Date();

        }


        const year =
            Number(parts[0]);


        const month =
            Number(parts[1]);


        const day =
            Number(parts[2]);


        return new Date(
            year,
            month - 1,
            day
        );

    },


    // =====================================
    // STYLES
    // =====================================

    styles: function () {

        const styleId =
            "tahouriDashboardV10Styles";


        const old =
            document.getElementById(styleId);


        if (old) {

            old.remove();

        }


        const style =
            document.createElement("style");


        style.id =
            styleId;


        style.textContent = `

            /* ================================= */
            /* DASHBOARD CALENDAR */
            /* ================================= */

            .learning-calendar-card {

                overflow:
                    hidden;

            }


            .learning-calendar-heading {

                display:
                    flex;

                justify-content:
                    space-between;

                align-items:
                    center;

                gap:
                    15px;

            }


            .learning-calendar-heading h2 {

                margin:
                    0 0 5px 0;

            }


            .learning-calendar-heading p {

                margin:
                    0;

                opacity:
                    .65;

                font-size:
                    13px;

            }


            .streak-badge {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    5px;

                padding:
                    7px 11px;

                border-radius:
                    12px;

                background:
                    #fff3e0;

                font-size:
                    13px;

                white-space:
                    nowrap;

            }


            .streak-badge strong {

                font-size:
                    16px;

            }


            /* ================================= */
            /* COMPACT CALENDAR WRAPPER */
            /* ================================= */

            #learningCalendarContainer {

                width:
                    100%;

                max-width:
                    430px;

                margin:
                    0 auto;

            }


            /* ================================= */
            /* MONTH HEADER */
            /* ================================= */

            .learning-calendar-header {

                display:
                    grid;

                grid-template-columns:
                    34px 1fr 34px;

                align-items:
                    center;

                width:
                    100%;

                margin:
                    16px 0 10px;

            }


            .calendar-month-title {

                text-align:
                    center;

                font-weight:
                    bold;

                font-size:
                    17px;

            }


            .calendar-month-title span {

                margin-right:
                    5px;

            }


            .calendar-month-arrow {

                width:
                    28px;

                height:
                    28px;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                border-radius:
                    8px;

                background:
                    #f1f3f5;

                cursor:
                    pointer;

                user-select:
                    none;

                font-size:
                    20px;

                line-height:
                    1;

            }


            .calendar-month-arrow:hover {

                background:
                    #e4e7eb;

            }


            /* ================================= */
            /* WEEK DAYS */
            /* ================================= */

            .learning-calendar-weekdays {

                display:
                    grid;

                grid-template-columns:
                    repeat(
                        7,
                        minmax(0, 1fr)
                    );

                gap:
                    5px;

                width:
                    100%;

                margin-bottom:
                    5px;

                text-align:
                    center;

                font-size:
                    11px;

                opacity:
                    .6;

            }


            /* ================================= */
            /* CALENDAR GRID */
            /* ================================= */

            .learning-calendar-grid {

                display:
                    grid;

                grid-template-columns:
                    repeat(
                        7,
                        minmax(0, 1fr)
                    );

                gap:
                    5px;

                width:
                    100%;

            }


            /* ================================= */
            /* CALENDAR CELL */
            /* ================================= */

            .learning-calendar-cell {

                position:
                    relative;

                width:
                    100%;

                height:
                    48px;

                box-sizing:
                    border-box;

                border:
                    1px solid #e1e4e8;

                border-radius:
                    9px;

                display:
                    flex;

                flex-direction:
                    column;

                align-items:
                    center;

                justify-content:
                    center;

                cursor:
                    pointer;

                user-select:
                    none;

                transition:
                    transform .12s ease,
                    box-shadow .12s ease;

                background:
                    #ffffff;

            }


            .learning-calendar-cell:not(
                .empty-cell
            ):hover {

                transform:
                    translateY(-1px);

                box-shadow:
                    0 3px 8px
                    rgba(
                        0,
                        0,
                        0,
                        .10
                    );

            }


            .empty-cell {

                border:
                    0;

                background:
                    transparent;

                cursor:
                    default;

            }


            .calendar-day-number {

                font-size:
                    14px;

                font-weight:
                    600;

                line-height:
                    16px;

            }


            .calendar-day-icon {

                height:
                    17px;

                line-height:
                    17px;

                font-size:
                    14px;

            }


            .calendar-day-count {

                position:
                    absolute;

                top:
                    3px;

                left:
                    4px;

                min-width:
                    13px;

                height:
                    13px;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                font-size:
                    8px;

                border-radius:
                    50%;

                background:
                    #eeeeee;

            }


            /* ================================= */
            /* STATES */
            /* ================================= */

            .calendar-completed {

                background:
                    #fff8df;

                border-color:
                    #e7c75c;

            }


            .calendar-partial {

                background:
                    #eef7ff;

                border-color:
                    #9dccf5;

            }


            .calendar-freeze {

                background:
                    #f4f7f9;

                border-color:
                    #d8dfe5;

            }


            .calendar-empty {

                background:
                    #ffffff;

            }


            .calendar-today {

                box-shadow:
                    inset 0 0 0 2px
                    #7c4dff;

            }


            /* ================================= */
            /* LEGEND */
            /* ================================= */

            .learning-calendar-legend {

                display:
                    flex;

                justify-content:
                    center;

                align-items:
                    center;

                gap:
                    12px;

                flex-wrap:
                    wrap;

                width:
                    100%;

                margin-top:
                    10px;

                font-size:
                    10px;

                opacity:
                    .75;

            }


            /* ================================= */
            /* CALENDAR ERROR */
            /* ================================= */

            .learning-calendar-error {

                text-align:
                    center;

                padding:
                    20px;

                color:
                    #b00020;

            }


            /* ================================= */
            /* NEXT LEARNING */
            /* ================================= */

            .dashboard-next-learning {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    10px;

                margin:
                    10px 0;

            }


            .dashboard-next-learning > span {

                font-size:
                    24px;

            }


            .dashboard-next-learning strong {

                display:
                    block;

            }


            .dashboard-next-learning small {

                display:
                    block;

                margin-top:
                    3px;

                opacity:
                    .65;

            }


            /* ================================= */
            /* SMALL ACTION */
            /* ================================= */

            .dashboard-small-action {

                display:
                    inline-flex;

                width:
                    auto;

                max-width:
                    max-content;

                padding:
                    7px 12px;

                margin-top:
                    8px;

                border-radius:
                    8px;

                background:
                    #f1f3f5;

                cursor:
                    pointer;

                font-size:
                    13px;

                user-select:
                    none;

            }


            .dashboard-small-action:hover {

                background:
                    #e5e7ea;

            }


            /* ================================= */
            /* MESSAGE */
            /* ================================= */

            .dashboard-message {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    10px;

            }


            .dashboard-message span {

                font-size:
                    25px;

            }


            .dashboard-message p {

                margin:
                    0;

            }


            /* ================================= */
            /* DASHBOARD ACTIONS */
            /* ================================= */

            .dashboard-actions {

                display:
                    flex;

                justify-content:
                    center;

                align-items:
                    center;

                gap:
                    8px;

                flex-wrap:
                    wrap;

            }


            .dashboard-action-item {

                display:
                    inline-flex;

                align-items:
                    center;

                gap:
                    5px;

                padding:
                    7px 10px;

                border:
                    1px solid #e1e4e8;

                border-radius:
                    8px;

                background:
                    #ffffff;

                cursor:
                    pointer;

                font-size:
                    12px;

                user-select:
                    none;

            }


            .dashboard-action-item:hover {

                background:
                    #f5f6f7;

            }


            /* ================================= */
            /* DAILY REPORT */
            /* ================================= */

            .daily-report-screen {

                max-width:
                    850px;

                margin:
                    0 auto;

                padding:
                    20px;

            }


            .daily-report-top {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    15px;

                margin-bottom:
                    18px;

            }


            .daily-report-back {

                display:
                    inline-flex;

                align-items:
                    center;

                gap:
                    5px;

                padding:
                    7px 10px;

                border-radius:
                    8px;

                background:
                    #f1f3f5;

                cursor:
                    pointer;

                font-size:
                    12px;

                white-space:
                    nowrap;

                user-select:
                    none;

            }


            .daily-report-back:hover {

                background:
                    #e5e7ea;

            }


            .daily-report-title h1 {

                margin:
                    0;

                font-size:
                    23px;

            }


            .daily-report-title p {

                margin:
                    5px 0 0;

                opacity:
                    .7;

                font-size:
                    13px;

            }


            /* ================================= */
            /* REPORT CARD */
            /* ================================= */

            .daily-report-card {

                background:
                    #ffffff;

                border-radius:
                    15px;

                padding:
                    18px;

                box-shadow:
                    0 4px 15px
                    rgba(
                        0,
                        0,
                        0,
                        .06
                    );

            }


            .daily-report-card h2 {

                margin:
                    0 0 10px;

                font-size:
                    18px;

            }


            /* ================================= */
            /* REPORT ACTIVITY */
            /* ================================= */

            .daily-report-activity {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    10px;

                padding:
                    11px 0;

                border-bottom:
                    1px solid #eeeeee;

            }


            .daily-report-activity:last-child {

                border-bottom:
                    0;

            }


            .daily-report-check {

                width:
                    25px;

                height:
                    25px;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                border-radius:
                    50%;

                background:
                    #eef7ee;

                font-weight:
                    bold;

            }


            .daily-report-activity-info {

                flex:
                    1;

                min-width:
                    0;

            }


            .daily-report-activity-info strong {

                display:
                    block;

                font-size:
                    14px;

            }


            .daily-report-activity-info span {

                display:
                    block;

                margin-top:
                    3px;

                opacity:
                    .65;

                font-size:
                    12px;

            }


            .daily-report-activity-score {

                font-size:
                    12px;

                white-space:
                    nowrap;

            }


            .daily-report-empty {

                text-align:
                    center;

                padding:
                    25px 10px;

                opacity:
                    .6;

            }


            /* ================================= */
            /* REPORT SUMMARY */
            /* ================================= */

            .daily-report-summary {

                display:
                    grid;

                grid-template-columns:
                    repeat(
                        3,
                        1fr
                    );

                gap:
                    10px;

                margin-top:
                    12px;

            }


            .daily-report-summary-item {

                padding:
                    14px;

                border-radius:
                    12px;

                background:
                    #ffffff;

                box-shadow:
                    0 3px 12px
                    rgba(
                        0,
                        0,
                        0,
                        .05
                    );

            }


            .daily-report-summary-item span {

                display:
                    block;

                font-size:
                    20px;

            }


            .daily-report-summary-item small {

                display:
                    block;

                margin-top:
                    5px;

                opacity:
                    .6;

                font-size:
                    11px;

            }


            .daily-report-summary-item strong {

                display:
                    block;

                margin-top:
                    3px;

                font-size:
                    14px;

            }


            /* ================================= */
            /* REPORT STREAK */
            /* ================================= */

            .daily-report-streak {

                text-align:
                    center;

                margin-top:
                    12px;

                padding:
                    12px;

                border-radius:
                    12px;

                background:
                    #fff3e0;

                font-size:
                    13px;

            }


            .daily-report-streak strong {

                font-size:
                    17px;

            }


            /* ================================= */
            /* MOBILE */
            /* ================================= */

            @media (
                max-width: 700px
            ) {

                .learning-calendar-heading {

                    align-items:
                        flex-start;

                    flex-direction:
                        column;

                }


                #learningCalendarContainer {

                    max-width:
                        100%;

                }


                .learning-calendar-cell {

                    height:
                        43px;

                    border-radius:
                        7px;

                }


                .calendar-day-number {

                    font-size:
                        12px;

                }


                .calendar-day-icon {

                    font-size:
                        12px;

                }


                .learning-calendar-weekdays {

                    font-size:
                        9px;

                }


                .learning-calendar-legend {

                    font-size:
                        9px;

                }


                .daily-report-top {

                    align-items:
                        flex-start;

                    flex-direction:
                        column;

                }


                .daily-report-summary {

                    grid-template-columns:
                        1fr;

                }


                .daily-report-screen {

                    padding:
                        12px;

                }

            }

        `;


        document.head.appendChild(style);

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.DashboardScreen =
    DashboardScreen;


// =====================================
// READY
// =====================================

console.log(
    "Dashboard Screen v10.1 Ready"
);