// =====================================
// Tahouri Edu Platform
// Dashboard Screen v10.2
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
// - Single Continue Activity card
// =====================================

const DashboardScreen = {

    calendarState: null,

    dateKey: function (date) {
        return (
            date.getFullYear() +
            "-" +
            String(date.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(date.getDate()).padStart(2, "0")
        );
    },

    pparts: function (date) {
        try {
            const parts = new Intl.DateTimeFormat(
                "en-US-u-ca-persian",
                {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric"
                }
            ).formatToParts(date);

            const result = {};

            parts.forEach(function (part) {
                if (
                    part.type === "year" ||
                    part.type === "month" ||
                    part.type === "day"
                ) {
                    result[part.type] = Number(part.value);
                }
            });

            return result;
        }
        catch (error) {
            console.error("Persian Date Error:", error);
            return null;
        }
    },

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

    pmonth: function (month) {
        const months = [
            "فروردین", "اردیبهشت", "خرداد", "تیر",
            "مرداد", "شهریور", "مهر", "آبان",
            "آذر", "دی", "بهمن", "اسفند"
        ];

        return months[month - 1] || "";
    },

    pweekday: function (date) {
        const days = [
            "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه",
            "پنجشنبه", "جمعه", "شنبه"
        ];

        return days[date.getDay()] || "";
    },

    findMonthStart: function (year, month) {
        const now = new Date();
        const current = this.pparts(now);

        if (!current) return null;

        let approximate = new Date(now);
        const yearDifference = year - current.year;
        const monthDifference = month - current.month;

        approximate.setDate(
            approximate.getDate() +
            (yearDifference * 365) +
            (monthDifference * 30) -
            (current.day - 1)
        );

        for (let offset = -45; offset <= 45; offset++) {
            const candidate = new Date(approximate);
            candidate.setDate(candidate.getDate() + offset);

            const parts = this.pparts(candidate);

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

    monthDays: function (year, month) {
        const start = this.findMonthStart(year, month);

        if (!start) {
            return month <= 6 ? 31 : 30;
        }

        const nextYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const next = this.findMonthStart(nextYear, nextMonth);

        if (!next) {
            if (month <= 6) return 31;
            if (month <= 11) return 30;
            return 29;
        }

        return Math.round((next - start) / 86400000);
    },

    getState: function () {
        const parts = this.pparts(new Date());

        if (!parts) {
            return { year: 1405, month: 6 };
        }

        return {
            year: parts.year,
            month: parts.month
        };
    },

    getDayData: function (key) {
        try {
            if (
                window.DailyLearningStreak &&
                typeof window.DailyLearningStreak.getDay === "function"
            ) {
                return window.DailyLearningStreak.getDay(key) || null;
            }
        }
        catch (error) {
            console.error("Daily Learning Streak getDay Error:", error);
        }

        return null;
    },

    calendar: function () {
        const state = this.calendarState || this.getState();
        this.calendarState = state;

        const first = this.findMonthStart(state.year, state.month);
        const total = this.monthDays(state.year, state.month);

        if (!first) {
            return `
                <div class="learning-calendar-error">
                    خطا در نمایش تقویم
                </div>
            `;
        }

        let cells = "";
        const lead = (first.getDay() + 1) % 7;

        for (let i = 0; i < lead; i++) {
            cells += `
                <div class="learning-calendar-cell empty-cell"></div>
            `;
        }

        for (let dayNumber = 1; dayNumber <= total; dayNumber++) {
            const date = new Date(first);
            date.setDate(first.getDate() + dayNumber - 1);

            const key = this.dateKey(date);
            const day = this.getDayData(key);
            const status = day && day.status ? day.status : "empty";
            const today = key === this.dateKey(new Date());

            let icon = "";
            if (status === "completed") icon = "🔥";
            else if (status === "partial") icon = "📚";
            else if (status === "freeze") icon = "❄️";

            let classes = "learning-calendar-cell";

            if (status === "completed") classes += " calendar-completed";
            else if (status === "partial") classes += " calendar-partial";
            else if (status === "freeze") classes += " calendar-freeze";
            else classes += " calendar-empty";

            if (today) classes += " calendar-today";

            const activityCount = Number(day?.activityCount || 0);

            cells += `
                <div
                    class="${classes}"
                    data-learning-date="${key}"
                    role="button"
                    tabindex="0"
                    title="گزارش ${dayNumber} ${this.pmonth(state.month)}"
                >
                    <span class="calendar-day-number">${dayNumber}</span>
                    <span class="calendar-day-icon">${icon}</span>
                    ${
                        activityCount > 0
                            ? `<span class="calendar-day-count">${activityCount}</span>`
                            : ""
                    }
                </div>
            `;
        }

        return `
            <div class="learning-calendar-header">
                <div id="learningCalendarPrev" class="calendar-month-arrow" role="button" tabindex="0">‹</div>
                <div class="calendar-month-title">
                    ${this.pmonth(state.month)}
                    <span>${state.year}</span>
                </div>
                <div id="learningCalendarNext" class="calendar-month-arrow" role="button" tabindex="0">›</div>
            </div>

            <div class="learning-calendar-weekdays">
                <span>ش</span>
                <span>ی</span>
                <span>د</span>
                <span>س</span>
                <span>چ</span>
                <span>پ</span>
                <span>ج</span>
            </div>

            <div class="learning-calendar-grid">
                ${cells}
            </div>

            <div class="learning-calendar-legend">
                <span>🔥 فعالیت کامل</span>
                <span>📚 فعالیت ناقص</span>
                <span>❄️ بدون فعالیت</span>
            </div>
        `;
    },

    show: function (data) {
        const app = document.getElementById("app");

        if (!app) {
            console.error("App Container Not Found");
            return;
        }

        data = data || {};

        const overall = data.overall || {};
        const continueLearning = data.continueLearning || {};

        const profile =
            window.ProfileManager &&
            typeof window.ProfileManager.get === "function"
                ? window.ProfileManager.get()
                : {};

        const studentName = profile.name || "دانش‌آموز";

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

        const totalActivities = Number(overall.totalActivities || 0);

        let streak = 0;

        try {
            if (
                window.DailyLearningStreak &&
                typeof window.DailyLearningStreak.getCurrentStreak === "function"
            ) {
                streak = Number(
                    window.DailyLearningStreak.getCurrentStreak() || 0
                );
            }
        }
        catch (error) {
            console.error("Streak Error:", error);
        }

        this.calendarState = null;

        const hasContinueActivity =
            !!(
                continueLearning &&
                continueLearning.activityId
            );

        const isResume =
            continueLearning.mode === "resume";

        app.innerHTML = `
            <div class="screen dashboard-screen">

                <div class="dashboard-welcome">
                    <h1>👋 سلام ${studentName}</h1>
                    ${
                        gradeTitle
                            ? `<p>🎓 ${gradeTitle}</p>`
                            : ""
                    }
                </div>

                <hr>

                <div class="dashboard-card learning-calendar-card">
                    <div class="learning-calendar-heading">
                        <div>
                            <h2>📅 تقویم مسیر یادگیری</h2>
                            <p>
                                برای دیدن گزارش هر روز،
                                روی خانه همان روز کلیک کن.
                            </p>
                        </div>

                        <div class="streak-badge">
                            🔥
                            <strong>${streak}</strong>
                            <span>روز</span>
                        </div>
                    </div>

                    <div id="learningCalendarContainer">
                        ${this.calendar()}
                    </div>
                </div>

                <!-- ========================= -->
                <!-- SINGLE CONTINUE ACTIVITY -->
                <!-- ========================= -->

                <div class="dashboard-card dashboard-continue-card">
                    <h2>🧭 ادامه مسیر من</h2>

                    ${
                        hasContinueActivity
                            ? `
                                <div class="dashboard-next-learning">
                                    <span>${isResume ? "▶" : "🎯"}</span>
                                    <div>
                                        <strong>
                                            ${
                                                continueLearning.activityTitle ||
                                                "فعالیت بعدی"
                                            }
                                        </strong>

                                        ${
                                            continueLearning.subject
                                                ? `
                                                    <small>
                                                        ${this.subjectTitle(
                                                            continueLearning.subject
                                                        )}
                                                    </small>
                                                `
                                                : ""
                                        }
                                    </div>
                                </div>

                                <div
                                    id="dashboardContinueBtn"
                                    class="dashboard-small-action"
                                    role="button"
                                    tabindex="0"
                                >
                                    ${
                                        isResume
                                            ? "▶️ ادامه فعالیت"
                                            : "▶️ شروع فعالیت بعدی"
                                    }
                                </div>
                            `
                            : `
                                <div class="dashboard-empty">
                                    🎉 مسیر فعلی را کامل کردی!
                                </div>
                            `
                    }
                </div>

                <div class="dashboard-card">
                    <h2>💬 یک جمله برای تو</h2>
                    <div class="dashboard-message">
                        <span>🚀</span>
                        <p>
                            قدم‌به‌قدم داری جلو می‌ری.
                            با همین تمرکز ادامه بده!
                        </p>
                    </div>
                </div>

                <div class="dashboard-card">
                    <h2>🏅 وضعیت من</h2>
                    <p>
                        تا اینجا
                        <strong>${totalActivities}</strong>
                        بار در فعالیت‌هایت تلاش کرده‌ای.
                    </p>
                </div>

                <hr>

                <div class="dashboard-actions">
                    <div id="dashboardReportsBtn" class="dashboard-action-item" role="button" tabindex="0">
                        📈 <span>گزارش عملکرد</span>
                    </div>

                    <div id="dashboardGradesBtn" class="dashboard-action-item" role="button" tabindex="0">
                        🎓 <span>انتخاب پایه</span>
                    </div>

                    <div id="dashboardHomeBtn" class="dashboard-action-item" role="button" tabindex="0">
                        🏠 <span>صفحه اصلی</span>
                    </div>
                </div>
            </div>
        `;

        this.styles();
        this.bind(continueLearning);

        console.log("Dashboard Screen v10.2 Ready");
    },

    subjectTitle: function (subject) {
        const titles = {
            math: "ریاضی",
            science: "علوم",
            computer: "رایانه",
            persian: "فارسی",
            social: "مطالعات اجتماعی",
            arabic: "عربی",
            english: "زبان انگلیسی"
        };

        return titles[subject] || subject || "";
    },

    bind: function (continueLearning) {
        const calendar = document.getElementById("learningCalendarContainer");

        if (calendar) {
            calendar.onclick = function (event) {
                const day = event.target.closest("[data-learning-date]");

                if (day) {
                    DashboardScreen.showDailyReport(day.dataset.learningDate);
                    return;
                }

                const previous = event.target.closest("#learningCalendarPrev");
                if (previous) {
                    DashboardScreen.changeMonth(-1);
                    return;
                }

                const next = event.target.closest("#learningCalendarNext");
                if (next) {
                    DashboardScreen.changeMonth(1);
                }
            };

            calendar.onkeydown = function (event) {
                if (event.key !== "Enter" && event.key !== " ") return;

                const target = event.target.closest(
                    "[data-learning-date], #learningCalendarPrev, #learningCalendarNext"
                );

                if (!target) return;
                event.preventDefault();

                if (target.dataset && target.dataset.learningDate) {
                    DashboardScreen.showDailyReport(target.dataset.learningDate);
                    return;
                }

                if (target.id === "learningCalendarPrev") {
                    DashboardScreen.changeMonth(-1);
                    return;
                }

                if (target.id === "learningCalendarNext") {
                    DashboardScreen.changeMonth(1);
                }
            };
        }

        const continueButton = document.getElementById("dashboardContinueBtn");

        if (continueButton) {
            continueButton.onclick = function () {
                if (
                    window.DashboardController &&
                    typeof window.DashboardController.continueLearning === "function"
                ) {
                    window.DashboardController.continueLearning(continueLearning);
                }
            };
        }

        const reports = document.getElementById("dashboardReportsBtn");

        if (reports) {
            reports.onclick = function () {
                if (
                    window.ReportsController &&
                    typeof window.ReportsController.open === "function"
                ) {
                    window.ReportsController.open();
                }
            };
        }

        const grades = document.getElementById("dashboardGradesBtn");

        if (grades) {
            grades.onclick = function () {
                if (
                    window.Screen &&
                    typeof window.Screen.showGrades === "function"
                ) {
                    window.Screen.showGrades();
                }
            };
        }

        const home = document.getElementById("dashboardHomeBtn");

        if (home) {
            home.onclick = function () {
                if (
                    window.Screen &&
                    typeof window.Screen.showHome === "function"
                ) {
                    window.Screen.showHome();
                }
            };
        }
    },

    changeMonth: function (step) {
        const state = this.calendarState || this.getState();

        state.month += step;

        if (state.month < 1) {
            state.month = 12;
            state.year--;
        }

        if (state.month > 12) {
            state.month = 1;
            state.year++;
        }

        this.calendarState = state;

        const container = document.getElementById("learningCalendarContainer");

        if (container) {
            container.innerHTML = this.calendar();
        }

        this.bind(this.currentContinueLearning || {});
    },

    showDailyReport: function (dateKey) {
        if (
            window.DailyLearningStreak &&
            typeof window.DailyLearningStreak.getDay === "function"
        ) {
            const day = window.DailyLearningStreak.getDay(dateKey) || {};

            const report = document.createElement("div");
            report.className = "daily-report-overlay";
            report.dir = "rtl";

            report.innerHTML = `
                <div class="daily-report-card">
                    <button type="button" class="daily-report-close">×</button>
                    <h2>گزارش روزانه</h2>
                    <p>${dateKey}</p>
                    <p>فعالیت‌ها: ${Number(day.activityCount || 0)}</p>
                </div>
            `;

            report.querySelector(".daily-report-close").onclick = function () {
                report.remove();
            };

            document.body.appendChild(report);
        }
    },

    styles: function () {
        if (document.getElementById("dashboardScreenStyles")) return;

        const style = document.createElement("style");
        style.id = "dashboardScreenStyles";
        style.textContent = `
            .dashboard-continue-card {
                position: relative;
            }

            .dashboard-continue-card .dashboard-small-action {
                cursor: pointer;
                user-select: none;
            }

            .dashboard-continue-card .dashboard-small-action:focus {
                outline: 2px solid currentColor;
                outline-offset: 3px;
            }
        `;

        document.head.appendChild(style);
    }
};

window.DashboardScreen = DashboardScreen;
console.log("Dashboard Screen v10.2 Ready");
