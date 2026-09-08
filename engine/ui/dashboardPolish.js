// =====================================
// Tahouri Edu Platform
// Dashboard UI Polish
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

            /* Continue Learning: a clear primary action. */
            .dashboard-screen .dashboard-small-action {
                display: flex !important;
                align-items: center;
                justify-content: center;
                width: min(360px, 100%);
                max-width: 100%;
                min-height: 46px;
                margin: 14px auto 4px;
                padding: 10px 18px;
                border: 1px solid #d9e2ec;
                border-radius: 13px;
                background: #f7f9fc;
                color: #25324a;
                font-family: inherit;
                font-size: 15px;
                font-weight: 700;
                box-shadow: 0 3px 10px rgba(31, 41, 55, .05);
                transition: transform .16s ease, background .16s ease, box-shadow .16s ease;
            }

            .dashboard-screen .dashboard-small-action:hover {
                transform: translateY(-1px);
                background: #eef3f8;
                box-shadow: 0 5px 14px rgba(31, 41, 55, .08);
            }

            .dashboard-screen .dashboard-actions {
                display: none !important;
            }

            .dashboard-screen .dashboard-message {
                justify-content: center !important;
            }

            .dashboard-screen .dashboard-message p {
                display: block !important;
                width: 100% !important;
                max-width: 620px !important;
                margin: 0 auto !important;
                text-align: center !important;
                line-height: 1.9;
            }

            .dashboard-screen .dashboard-message span {
                flex: 0 0 auto;
            }

            .dashboard-screen .dashboard-next-learning {
                justify-content: center !important;
            }

            .dashboard-screen .dashboard-next-learning > div {
                text-align: center !important;
            }

            .dashboard-screen .dashboard-card > h2,
            .dashboard-screen .dashboard-card > p {
                text-align: center !important;
            }
        `;

        document.head.appendChild(style);
    }
};

window.DashboardPolish = DashboardPolish;
DashboardPolish.init();

console.log("Dashboard UI Polish Ready");
