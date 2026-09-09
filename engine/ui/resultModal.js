// =====================================
// Tahouri Edu Platform
// Version 3.6
// Result Modal
// Quiz + Memory Compatible
// Navigation Buttons
// Dashboard Button
// CSS owned by activityRuntime.css
// =====================================

const ResultModal = {

    show: function(result){

        const oldModal = document.getElementById("resultModal");
        if(oldModal) oldModal.remove();

        document.body.classList.remove("activity-playing");
        document.body.classList.add("activity-result-open");

        const percentage = result && result.percentage !== undefined
            ? result.percentage
            : 0;

        const stars = Math.round(percentage / 20);
        let starText = "";

        for(let i = 0; i < 5; i++){
            starText += i < stars ? "⭐" : "☆";
        }

        const modal = document.createElement("div");
        modal.id = "resultModal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.dir = "rtl";

        modal.innerHTML = `
            <div class="resultModalWindow">
                <h1>🎉 نتیجه فعالیت</h1>
                <hr>
                <h2>${result.title || "فعالیت آموزشی"}</h2>

                <p>امتیاز: <strong>${result.score || 0}</strong></p>
                <p>درصد موفقیت: <strong>${percentage}%</strong></p>

                <div class="resultModalStars" aria-label="${stars} ستاره از 5">
                    ${starText}
                </div>

                ${result.correctAnswers !== undefined
                    ? `<p>پاسخ صحیح: ${result.correctAnswers}</p>`
                    : ""}

                ${result.wrongAnswers !== undefined
                    ? `<p>پاسخ اشتباه: ${result.wrongAnswers}</p>`
                    : ""}

                ${result.pairs !== undefined
                    ? `<p>جفت پیدا شده: ${result.pairs}</p>`
                    : ""}

                ${result.moves !== undefined
                    ? `<p>تعداد حرکت: ${result.moves}</p>`
                    : ""}

                <p>${result.message || ""}</p>

                <div class="resultModalActions">
                    <button id="retryActivityBtn" type="button">🔄 دوباره بازی کن</button>
                    <button id="backActivitiesBtn" type="button">📚 بازگشت به فعالیت‌ها</button>
                    <button id="dashboardBtn" type="button">📊 گزارش عملکرد من</button>
                    <button id="homeBtn" type="button">🏠 صفحه اصلی</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const retryButton = document.getElementById("retryActivityBtn");
        const backButton = document.getElementById("backActivitiesBtn");
        const dashboardButton = document.getElementById("dashboardBtn");
        const homeButton = document.getElementById("homeBtn");

        if(retryButton){
            retryButton.onclick = async function(){
                ResultModal.close();
                if(typeof ActivityManager !== "undefined" && typeof ActivityManager.restart === "function"){
                    await ActivityManager.restart();
                }
            };
        }

        if(backButton){
            backButton.onclick = function(){
                ResultModal.close();
                if(typeof NavigationController !== "undefined" && typeof NavigationController.back === "function"){
                    NavigationController.back();
                }
            };
        }

        if(dashboardButton){
            dashboardButton.onclick = function(){
                ResultModal.close();
                if(typeof Navigation !== "undefined" && typeof Navigation.openDashboard === "function"){
                    Navigation.openDashboard();
                }
            };
        }

        if(homeButton){
            homeButton.onclick = function(){
                ResultModal.close();
                if(typeof App !== "undefined" && typeof App.goHome === "function"){
                    App.goHome();
                }
            };
        }
    },

    close: function(){
        const modal = document.getElementById("resultModal");
        if(modal) modal.remove();
        document.body.classList.remove("activity-result-open");
    },

    hide: function(){
        this.close();
    }
};

window.ResultModal = ResultModal;
console.log("Result Modal Ready");
