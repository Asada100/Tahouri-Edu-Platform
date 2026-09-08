// =====================================
// Tahouri Edu Platform
// Dashboard UI Polish v2.0
// =====================================

const DashboardPolish = {

    init: function () {
        if (document.getElementById("tahouriDashboardPolishStyles")) return;

        const style = document.createElement("style");
        style.id = "tahouriDashboardPolishStyles";
        style.textContent = `
            .dashboard-screen {
                text-align: center !important;
            }

            .dashboard-screen .dashboard-welcome,
            .dashboard-screen .dashboard-card,
            .dashboard-screen .learning-calendar-heading,
            .dashboard-screen .dashboard-next-learning,
            .dashboard-screen .dashboard-message {
                text-align: center !important;
            }

            .dashboard-screen .learning-calendar-heading {
                justify-content: center !important;
            }

            .dashboard-screen .learning-calendar-heading > div:first-child {
                flex: 1;
                text-align: center !important;
            }

            .dashboard-screen .learning-calendar-heading > div:first-child p {
                display: none !important;
            }

            /* Continue Learning: make the action look like a real app CTA. */
            .dashboard-screen .dashboard-small-action {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: min(340px, calc(100% - 24px)) !important;
                max-width: 340px !important;
                min-height: 50px !important;
                margin: 16px auto 6px !important;
                padding: 11px 22px !important;
                border: 0 !important;
                border-radius: 14px !important;
                background: linear-gradient(135deg, #4f7cff, #6b8cff) !important;
                color: #ffffff !important;
                font-family: inherit !important;
                font-size: 15px !important;
                font-weight: 700 !important;
                line-height: 1.4 !important;
                text-align: center !important;
                box-shadow: 0 6px 18px rgba(79, 124, 255, .20) !important;
                cursor: pointer !important;
                transition: transform .16s ease, box-shadow .16s ease, filter .16s ease !important;
            }

            .dashboard-screen .dashboard-small-action:hover {
                transform: translateY(-1px);
                filter: brightness(.98);
                box-shadow: 0 8px 20px rgba(79, 124, 255, .25) !important;
            }

            .dashboard-screen .dashboard-small-action:active {
                transform: translateY(0);
            }

            .dashboard-screen .dashboard-actions {
                display: none !important;
            }

            .dashboard-screen .dashboard-message {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
                width: 100% !important;
                text-align: center !important;
            }

            .dashboard-screen .dashboard-message p {
                display: block !important;
                width: 100% !important;
                max-width: 620px !important;
                margin: 0 auto !important;
                text-align: center !important;
                line-height: 1.9 !important;
            }

            .dashboard-screen .dashboard-message span {
                flex: 0 0 auto !important;
            }

            .dashboard-screen .dashboard-next-learning {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
                text-align: center !important;
            }

            .dashboard-screen .dashboard-next-learning > div {
                width: 100% !important;
                text-align: center !important;
            }

            .dashboard-screen .dashboard-card > h2,
            .dashboard-screen .dashboard-card > p {
                text-align: center !important;
            }

            /* =====================================
               Historical / cultural daily ticker
               ===================================== */
            .dashboard-screen .tahouri-daily-history {
                width: min(100%, 720px);
                margin: 10px auto 18px;
                padding: 0;
                overflow: hidden;
                border: 1px solid #e7edf5;
                border-radius: 14px;
                background: #fbfcfe;
                box-sizing: border-box;
            }

            .dashboard-screen .tahouri-daily-history-label {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                padding: 9px 12px 4px;
                color: #52637a;
                font-size: 12px;
                font-weight: 700;
            }

            .dashboard-screen .tahouri-daily-history-window {
                position: relative;
                overflow: hidden;
                width: 100%;
                padding: 4px 0 10px;
                direction: rtl;
                white-space: nowrap;
            }

            .dashboard-screen .tahouri-daily-history-track {
                display: inline-flex;
                min-width: max-content;
                gap: 70px;
                padding-right: 100%;
                animation: tahouriDailyTicker 18s linear infinite;
                will-change: transform;
            }

            .dashboard-screen .tahouri-daily-history-item {
                display: inline-block;
                color: #26364d;
                font-size: 14px;
                font-weight: 600;
                line-height: 1.8;
            }

            .dashboard-screen .tahouri-daily-history-item strong {
                color: #365fae;
            }

            @keyframes tahouriDailyTicker {
                from { transform: translateX(0); }
                to { transform: translateX(100%); }
            }

            @media (prefers-reduced-motion: reduce) {
                .dashboard-screen .tahouri-daily-history-track {
                    animation: none;
                    padding-right: 12px;
                    white-space: normal;
                    display: block;
                    text-align: center;
                }
            }

            @media (max-width: 600px) {
                .dashboard-screen .dashboard-small-action {
                    width: calc(100% - 20px) !important;
                    max-width: 340px !important;
                    min-height: 48px !important;
                }

                .dashboard-screen .tahouri-daily-history-item {
                    font-size: 13px;
                }
            }
        `;

        document.head.appendChild(style);

        this.observeDashboard();
    },

    observeDashboard: function () {
        const app = document.getElementById("app");
        if (!app || this._observer) return;

        this._observer = new MutationObserver(function () {
            DashboardPolish.decorateDashboard();
        });

        this._observer.observe(app, {
            childList: true,
            subtree: false
        });

        this.decorateDashboard();
    },

    getTodayParts: function () {
        try {
            const parts = new Intl.DateTimeFormat(
                "en-US-u-ca-persian",
                { year: "numeric", month: "numeric", day: "numeric" }
            ).formatToParts(new Date());

            const result = {};
            parts.forEach(function (part) {
                if (["year", "month", "day"].includes(part.type)) {
                    result[part.type] = Number(part.value);
                }
            });
            return result;
        } catch (error) {
            return null;
        }
    },

    dailyEvents: {
        "1-1": "آغاز سال نو و نوروز؛ آغاز فصل تازه و امیدهای تازه.",
        "1-12": "روز جمهوری اسلامی ایران.",
        "1-13": "روز طبیعت؛ فرصتی برای احترام بیشتر به طبیعت و محیط زیست.",
        "2-25": "روز بزرگداشت فردوسی؛ یادآور میراث ارزشمند زبان و ادب فارسی.",
        "3-14": "روز قلم؛ گرامی‌داشت نویسندگی و اندیشه‌ورزی.",
        "3-20": "روز جهانی پناهندگان؛ یادآور اهمیت همدلی و انسان‌دوستی.",
        "3-31": "روز ملی اهدای عضو؛ یادآور ارزش زندگی و کمک به دیگران.",
        "4-7": "روز قلم‌کار؛ گرامی‌داشت هنرهای سنتی ایران.",
        "5-17": "روز خبرنگار؛ گرامی‌داشت تلاش برای آگاهی و اطلاع‌رسانی.",
        "6-8": "روز مبارزه با تروریسم؛ یادآور اهمیت صلح و امنیت برای همه.",
        "6-17": "امروز فرصتی است برای قدردانی از تلاش‌های روزانه در مسیر یادگیری.",
        "6-31": "آغاز هفته دفاع مقدس؛ یادآور ایستادگی و فداکاری مردم ایران.",
        "7-20": "روز بزرگداشت حافظ؛ گرامی‌داشت شاعر بزرگ و میراث ادبی ایران.",
        "8-13": "روز دانش‌آموز؛ این روز را به شما فراگیران عزیز تبریک می‌گوییم.",
        "9-16": "روز دانشجو؛ گرامی‌داشت دانش، پرسشگری و اندیشه‌ورزی.",
        "10-15": "روز هوای پاک؛ یادآور مسئولیت ما در مراقبت از محیط زیست.",
        "11-22": "سالروز پیروزی انقلاب اسلامی ایران.",
        "12-15": "روز درختکاری؛ فرصتی برای کاشتن و مراقبت از زندگی.",
        "12-22": "روز بزرگداشت پروین اعتصامی؛ گرامی‌داشت شعر و اندیشه فارسی."
    },

    getDailyMessage: function () {
        const parts = this.getTodayParts();
        if (!parts) return "امروز هم یک فرصت تازه برای یادگیری و رشد است.";

        const key = parts.month + "-" + parts.day;
        return this.dailyEvents[key] ||
            "امروز هم یک فرصت تازه برای یادگیری، تجربه و پیشرفت است.";
    },

    decorateDashboard: function () {
        const screen = document.querySelector("#app > .dashboard-screen");
        if (!screen) return;

        const legend = screen.querySelector(".learning-calendar-legend");
        if (!legend) return;

        if (!screen.querySelector(".tahouri-daily-history")) {
            const ticker = document.createElement("section");
            ticker.className = "tahouri-daily-history";
            ticker.setAttribute("aria-label", "امروز در تاریخ");
            ticker.innerHTML = `
                <div class="tahouri-daily-history-label">
                    <span aria-hidden="true">📜</span>
                    <span>امروز در تاریخ</span>
                </div>
                <div class="tahouri-daily-history-window">
                    <div class="tahouri-daily-history-track">
                        <span class="tahouri-daily-history-item">
                            <strong>امروز:</strong> ${this.getDailyMessage()}
                        </span>
                    </div>
                </div>
            `;
            legend.insertAdjacentElement("afterend", ticker);
        }

        // Keep the ticker text synchronized if the dashboard is rendered again.
        const item = screen.querySelector(".tahouri-daily-history-item");
        if (item) {
            item.innerHTML = `<strong>امروز:</strong> ${this.getDailyMessage()}`;
        }
    }
};

window.DashboardPolish = DashboardPolish;
DashboardPolish.init();

console.log("Dashboard UI Polish v2.0 Ready");
