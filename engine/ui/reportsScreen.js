// =====================================
// Tahouri Edu Platform
// Reports Screen
// Version 5.1
// Stable Hierarchical Report
// =====================================

(function () {

    "use strict";

    const REPORTS_KEY = "__TahouriReportsScreen__";

    // =====================================
    // Titles
    // =====================================

    const subjectTitles = {
        math: "ریاضی",
        mathematics: "ریاضی",
        persian: "فارسی",
        farsi: "فارسی",
        science: "علوم",
        computer: "رایانه",
        computerScience: "رایانه"
    };

    const activityTitles = {
        evenOdd: "اعداد زوج و فرد",
        divisibleBy2: "بخش‌پذیری بر ۲",
        divisibleBy3: "بخش‌پذیری بر ۳",
        divisibleBy5: "بخش‌پذیری بر ۵",
        divisibleBy6: "بخش‌پذیری بر ۶",
        divisibleBy9: "بخش‌پذیری بر ۹",
        divisibleBy10: "بخش‌پذیری بر ۱۰",
        divisibleBy100: "بخش‌پذیری بر ۱۰۰",
        memoryDemo: "بازی حافظه"
    };

    const chapterTitles = {
        chapter1: "فصل اول",
        chapter2: "فصل دوم",
        chapter3: "فصل سوم",
        chapter4: "فصل چهارم",
        chapter5: "فصل پنجم",
        chapter6: "فصل ششم",
        chapter7: "فصل هفتم",
        chapter8: "فصل هشتم"
    };

    // =====================================
    // Helpers
    // =====================================

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function text(value, fallback) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return fallback || "";
        }

        return String(value);
    }

    function escapeHTML(value) {
        return text(value, "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function subjectTitle(id, item) {
        if (item && item.title) {
            return item.title;
        }

        return subjectTitles[id] || id || "درس";
    }

    function activityTitle(id, item) {
        if (item && item.title) {
            return item.title;
        }

        return activityTitles[id] || id || "فعالیت";
    }

    function chapterTitle(id, item) {
        if (item && item.title) {
            return item.title;
        }

        return chapterTitles[id] || id || "فصل";
    }

    function makeStars(score) {

        const value = Math.max(
            0,
            Math.min(
                5,
                Math.round(number(score) / 20)
            )
        );

        let result = "";

        for (let i = 1; i <= 5; i++) {
            result += i <= value ? "⭐" : "☆";
        }

        return result;
    }

    function getStatistics(data) {

        if (data && typeof data === "object") {
            return data;
        }

        if (
            typeof window.StatisticsManager !== "undefined" &&
            typeof window.StatisticsManager.get === "function"
        ) {
            return window.StatisticsManager.get() || {};
        }

        return {};
    }

    function asEntries(value) {

        if (!value) {
            return [];
        }

        if (Array.isArray(value)) {

            return value.map(function (item, index) {

                const id =
                    item &&
                    (
                        item.id ||
                        item.subjectId ||
                        item.chapterId ||
                        item.activityId
                    );

                return [
                    id || String(index),
                    item || {}
                ];
            });
        }

        if (typeof value === "object") {

            return Object.keys(value).map(function (key) {

                return [
                    key,
                    value[key] || {}
                ];
            });
        }

        return [];
    }

    function getSubjectEntries(statistics) {

        return asEntries(
            statistics.subjects
        );
    }

    function getChapterEntries(
        statistics,
        subjectId
    ) {

        const chapters =
            statistics.chapters || {};

        const entries =
            asEntries(chapters);

        return entries.filter(function (entry) {

            const id = entry[0];
            const item = entry[1] || {};

            return (
                item.subjectId === subjectId ||
                item.subject === subjectId ||
                id === subjectId
            );
        });
    }

    function getActivityEntries(
        statistics,
        subjectId,
        chapterId
    ) {

        const activities =
            statistics.activities || {};

        const entries =
            asEntries(activities);

        return entries.filter(function (entry) {

            const id = entry[0];
            const item = entry[1] || {};

            const itemSubject =
                item.subjectId ||
                item.subject ||
                null;

            const itemChapter =
                item.chapterId ||
                item.chapter ||
                null;

            if (
                itemSubject &&
                itemSubject !== subjectId
            ) {
                return false;
            }

            if (
                chapterId &&
                itemChapter &&
                itemChapter !== chapterId
            ) {
                return false;
            }

            if (
                chapterId &&
                !itemChapter
            ) {
                return true;
            }

            return !!id;
        });
    }

    function findActivity(
        statistics,
        activityId
    ) {

        const activities =
            statistics.activities || {};

        if (Array.isArray(activities)) {

            return (
                activities.find(function (item) {

                    return (
                        item &&
                        (
                            item.activityId === activityId ||
                            item.id === activityId
                        )
                    );
                }) ||
                {}
            );
        }

        return activities[activityId] || {};
    }

    // =====================================
    // Styles
    // =====================================

    function baseButtonStyle() {

        return [
            "border:0",
            "border-radius:14px",
            "min-height:52px",
            "padding:10px 14px",
            "cursor:pointer",
            "font-family:inherit",
            "font-size:15px",
            "font-weight:700",
            "box-sizing:border-box",
            "transition:transform .15s ease,box-shadow .15s ease",
            "box-shadow:0 2px 7px rgba(15,23,42,.08)"
        ].join(";");
    }

    function createButton(
        label,
        action,
        secondary
    ) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.textContent = label;

        button.style.cssText =
            baseButtonStyle() +
            ";" +
            (
                secondary
                    ? "background:#f1f5f9;color:#334155;"
                    : "background:#2563eb;color:#fff;"
            );

        button.addEventListener(
            "click",
            action
        );

        button.addEventListener(
            "mouseenter",
            function () {
                button.style.transform =
                    "translateY(-1px)";
                button.style.boxShadow =
                    "0 5px 14px rgba(15,23,42,.13)";
            }
        );

        button.addEventListener(
            "mouseleave",
            function () {
                button.style.transform =
                    "translateY(0)";
                button.style.boxShadow =
                    "0 2px 7px rgba(15,23,42,.08)";
            }
        );

        return button;
    }

    function cardStyle() {

        return [
            "border:1px solid #e2e8f0",
            "border-radius:17px",
            "padding:14px",
            "background:#fff",
            "box-sizing:border-box",
            "box-shadow:0 2px 8px rgba(15,23,42,.04)"
        ].join(";");
    }

    function emptyBox(message) {

        const box =
            document.createElement("div");

        box.style.cssText =
            cardStyle() +
            ";text-align:center;color:#64748b;padding:28px 15px;";

        box.textContent = message;

        return box;
    }

    // =====================================
    // Activity Detail
    // =====================================

    function renderActivityDetail(
        container,
        statistics,
        activityId,
        navigateBack
    ) {

        const activity =
            findActivity(
                statistics,
                activityId
            );

        const title =
            activityTitle(
                activityId,
                activity
            );

        const bestScore =
            number(activity.bestScore);

        const averageScore =
            number(activity.averageScore);

        const totalScore =
            number(activity.totalScore);

        const totalCorrect =
            number(activity.totalCorrect);

        const totalWrong =
            number(activity.totalWrong);

        const attempts =
            number(activity.totalActivities);

        const bestPercentage =
            number(activity.bestPercentage);

        container.innerHTML = "";

        const back =
            createButton(
                "← بازگشت",
                navigateBack,
                true
            );

        back.style.marginBottom = "12px";

        container.appendChild(back);

        const card =
            document.createElement("div");

        card.style.cssText =
            cardStyle();

        card.innerHTML = `
            <div style="text-align:center;">

                <div style="font-size:34px;margin-bottom:5px;">
                    🎮
                </div>

                <h3 style="margin:0;font-size:20px;">
                    ${escapeHTML(title)}
                </h3>

                <div style="font-size:25px;margin:10px 0 3px;">
                    ${makeStars(bestScore)}
                </div>

                <strong style="font-size:31px;">
                    ${bestScore}
                </strong>

                <div style="font-size:12px;color:#64748b;margin-top:2px;">
                    بهترین امتیاز
                </div>

            </div>

            <div
                style="
                    display:grid;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:9px;
                    margin-top:15px;
                "
            >

                <div style="
                    padding:11px;
                    border-radius:13px;
                    background:#f8fafc;
                    text-align:center;
                ">
                    <strong style="font-size:20px;">
                        ${averageScore}
                    </strong>
                    <div style="font-size:12px;color:#64748b;">
                        میانگین
                    </div>
                </div>

                <div style="
                    padding:11px;
                    border-radius:13px;
                    background:#f8fafc;
                    text-align:center;
                ">
                    <strong style="font-size:20px;">
                        ${bestPercentage}%
                    </strong>
                    <div style="font-size:12px;color:#64748b;">
                        بهترین درصد
                    </div>
                </div>

                <div style="
                    padding:11px;
                    border-radius:13px;
                    background:#f8fafc;
                    text-align:center;
                ">
                    <strong style="font-size:20px;">
                        ${attempts}
                    </strong>
                    <div style="font-size:12px;color:#64748b;">
                        تعداد دفعات
                    </div>
                </div>

                <div style="
                    padding:11px;
                    border-radius:13px;
                    background:#f8fafc;
                    text-align:center;
                ">
                    <strong style="font-size:20px;">
                        ${totalScore}
                    </strong>
                    <div style="font-size:12px;color:#64748b;">
                        امتیاز کل
                    </div>
                </div>

                <div style="
                    padding:11px;
                    border-radius:13px;
                    background:#f8fafc;
                    text-align:center;
                ">
                    <strong style="font-size:20px;">
                        ${totalCorrect}
                    </strong>
                    <div style="font-size:12px;color:#64748b;">
                        پاسخ صحیح
                    </div>
                </div>

                <div style="
                    padding:11px;
                    border-radius:13px;
                    background:#f8fafc;
                    text-align:center;
                ">
                    <strong style="font-size:20px;">
                        ${totalWrong}
                    </strong>
                    <div style="font-size:12px;color:#64748b;">
                        پاسخ اشتباه
                    </div>
                </div>

            </div>
        `;

        container.appendChild(card);
    }

    // =====================================
    // Main Screen
    // =====================================

    function createScreen(data) {

        const statistics =
            getStatistics(data);

        const old =
            document.getElementById(
                "reportsModal"
            );

        if (old) {
            old.remove();
        }

        const modal =
            document.createElement("div");

        modal.id =
            "reportsModal";

        modal.style.cssText = [
            "position:fixed",
            "inset:0",
            "z-index:99999",
            "background:rgba(15,23,42,.58)",
            "display:flex",
            "align-items:center",
            "justify-content:center",
            "padding:8px",
            "box-sizing:border-box",
            "direction:rtl"
        ].join(";");

        const panel =
            document.createElement("div");

        panel.style.cssText = [
            "width:min(720px,100%)",
            "height:min(680px,calc(100vh - 16px))",
            "background:#fff",
            "border-radius:22px",
            "overflow:hidden",
            "display:flex",
            "flex-direction:column",
            "box-shadow:0 25px 70px rgba(0,0,0,.3)"
        ].join(";");

        // =====================================
        // Header
        // =====================================

        const header =
            document.createElement("header");

        header.style.cssText = [
            "flex-shrink:0",
            "padding:12px 14px",
            "border-bottom:1px solid #e2e8f0",
            "display:flex",
            "align-items:center",
            "justify-content:space-between",
            "gap:10px",
            "background:#fff"
        ].join(";");

        header.innerHTML = `
            <div style="
                display:flex;
                align-items:center;
                gap:10px;
                min-width:0;
            ">

                <div style="
                    width:43px;
                    height:43px;
                    border-radius:13px;
                    background:#eff6ff;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:23px;
                    flex-shrink:0;
                ">
                    📊
                </div>

                <div style="min-width:0;">

                    <h2 style="
                        margin:0;
                        font-size:19px;
                    ">
                        گزارش عملکرد
                    </h2>

                    <div
                        id="reportsBreadcrumb"
                        style="
                            margin-top:2px;
                            color:#64748b;
                            font-size:12px;
                            white-space:nowrap;
                            overflow:hidden;
                            text-overflow:ellipsis;
                        "
                    >
                        خلاصه عملکرد
                    </div>

                </div>
            </div>

            <button
                id="reportsCloseBtn"
                type="button"
                aria-label="بستن"
                style="
                    width:40px;
                    height:40px;
                    border:0;
                    border-radius:12px;
                    background:#f1f5f9;
                    cursor:pointer;
                    font-size:19px;
                    flex-shrink:0;
                "
            >
                ✕
            </button>
        `;

        // =====================================
        // Content
        // =====================================

        const content =
            document.createElement("main");

        content.id =
            "reportsModalContent";

        content.style.cssText = [
            "flex:1",
            "overflow-y:auto",
            "padding:14px",
            "box-sizing:border-box",
            "scrollbar-width:thin"
        ].join(";");

        // =====================================
        // Footer
        // =====================================

        const footer =
            document.createElement("footer");

        footer.style.cssText = [
            "flex-shrink:0",
            "padding:9px 12px",
            "border-top:1px solid #e2e8f0",
            "background:#fafafa",
            "display:flex",
            "justify-content:center"
        ].join(";");

        const footerClose =
            createButton(
                "✕ بستن گزارش",
                close,
                true
            );

        footerClose.style.maxWidth =
            "190px";

        footer.appendChild(
            footerClose
        );

        panel.appendChild(header);
        panel.appendChild(content);
        panel.appendChild(footer);

        modal.appendChild(panel);

        document.body.appendChild(modal);

        const breadcrumb =
            header.querySelector(
                "#reportsBreadcrumb"
            );

        // =====================================
        // State
        // =====================================

        const state = {
            type: "summary",
            subjectId: null,
            chapterId: null,
            activityId: null
        };

        function setBreadcrumb(parts) {
            breadcrumb.textContent =
                parts.join(" ← ");
        }

        function clearContent() {
            content.innerHTML = "";
        }

        // =====================================
        // Close
        // =====================================

        function close() {

            const current =
                document.getElementById(
                    "reportsModal"
                );

            if (current) {
                current.remove();
            }

            if (modal._escapeHandler) {

                document.removeEventListener(
                    "keydown",
                    modal._escapeHandler
                );
            }

            console.log(
                "ReportsScreen: Modal Closed"
            );
        }

        // =====================================
        // Summary
        // =====================================

        function renderSummary() {

            state.type = "summary";
            state.subjectId = null;
            state.chapterId = null;
            state.activityId = null;

            clearContent();

            setBreadcrumb([
                "خلاصه عملکرد"
            ]);

            const overall =
                statistics.overall || {};

            const totalActivities =
                number(overall.totalActivities);

            const totalScore =
                number(overall.totalScore);

            const averageScore =
                number(overall.averageScore);

            const bestScore =
                number(overall.bestScore);

            const totalCorrect =
                number(overall.totalCorrect);

            const totalWrong =
                number(overall.totalWrong);

            // =================================
            // Stats Grid
            // =================================

            const grid =
                document.createElement("div");

            grid.style.cssText = [
                "display:grid",
                "grid-template-columns:repeat(4,minmax(0,1fr))",
                "gap:9px"
            ].join(";");

            [
                ["🎯", totalActivities, "فعالیت"],
                ["⭐", totalScore, "امتیاز کل"],
                ["📈", averageScore, "میانگین"],
                ["🏆", bestScore, "بهترین"]
            ].forEach(function (item) {

                const card =
                    document.createElement("div");

                card.style.cssText =
                    cardStyle() +
                    ";text-align:center;padding:11px 6px;";

                card.innerHTML = `
                    <div style="font-size:21px;">
                        ${item[0]}
                    </div>

                    <strong style="
                        display:block;
                        font-size:21px;
                        margin-top:3px;
                    ">
                        ${item[1]}
                    </strong>

                    <span style="
                        color:#64748b;
                        font-size:11px;
                    ">
                        ${item[2]}
                    </span>
                `;

                grid.appendChild(card);
            });

            content.appendChild(grid);

            // =================================
            // Overall Performance
            // =================================

            const overallBox =
                document.createElement("div");

            overallBox.style.cssText =
                cardStyle() +
                ";margin-top:11px;text-align:center;padding:13px;";

            const answers =
                totalCorrect + totalWrong;

            const accuracy =
                answers > 0
                    ? Math.round(
                        totalCorrect /
                        answers *
                        100
                    )
                    : 0;

            overallBox.innerHTML = `
                <div style="
                    font-size:24px;
                    line-height:1;
                ">
                    ${makeStars(bestScore)}
                </div>

                <h3 style="
                    margin:6px 0 2px;
                    font-size:17px;
                ">
                    عملکرد کلی
                </h3>

                <div style="
                    font-size:12px;
                    color:#64748b;
                ">
                    بهترین امتیاز: ${bestScore}
                </div>

                <div style="
                    display:flex;
                    justify-content:center;
                    gap:16px;
                    flex-wrap:wrap;
                    margin-top:9px;
                    font-size:12px;
                ">
                    <span>
                        ✅ صحیح:
                        <strong>${totalCorrect}</strong>
                    </span>

                    <span>
                        ❌ اشتباه:
                        <strong>${totalWrong}</strong>
                    </span>

                    <span>
                        🎯 دقت:
                        <strong>${accuracy}%</strong>
                    </span>
                </div>
            `;

            content.appendChild(
                overallBox
            );

            // =================================
            // Main Navigation Buttons
            // =================================

            const navBox =
                document.createElement("div");

            navBox.style.cssText = [
                "display:grid",
                "grid-template-columns:repeat(2,minmax(0,1fr))",
                "gap:10px",
                "margin-top:11px"
            ].join(";");

            const subjectsButton =
                createButton(
                    "📚 گزارش درس‌ها",
                    renderSubjects
                );

            const closeButton =
                createButton(
                    "✕ بستن",
                    close,
                    true
                );

            navBox.appendChild(
                subjectsButton
            );

            navBox.appendChild(
                closeButton
            );

            content.appendChild(
                navBox
            );
        }

        // =====================================
        // Subjects
        // =====================================

        function renderSubjects() {

            state.type = "subjects";
            state.subjectId = null;
            state.chapterId = null;
            state.activityId = null;

            clearContent();

            setBreadcrumb([
                "درس‌ها"
            ]);

            const heading =
                document.createElement("h3");

            heading.textContent =
                "📚 انتخاب درس";

            heading.style.cssText =
                "margin:0 0 10px;font-size:18px;";

            content.appendChild(
                heading
            );

            const entries =
                getSubjectEntries(
                    statistics
                );

            if (!entries.length) {

                content.appendChild(
                    emptyBox(
                        "هنوز گزارشی برای درس‌ها ثبت نشده است."
                    )
                );

                const back =
                    createButton(
                        "← بازگشت",
                        renderSummary,
                        true
                    );

                back.style.marginTop = "10px";

                content.appendChild(back);

                return;
            }

            const grid =
                document.createElement("div");

            grid.style.cssText = [
                "display:grid",
                "grid-template-columns:repeat(2,minmax(0,1fr))",
                "gap:10px"
            ].join(";");

            entries.forEach(function (entry) {

                const subjectId =
                    entry[0];

                const subject =
                    entry[1] || {};

                const button =
                    createButton(
                        "📚 " +
                        subjectTitle(
                            subjectId,
                            subject
                        ),
                        function () {

                            renderChapters(
                                subjectId
                            );
                        }
                    );

                grid.appendChild(
                    button
                );
            });

            content.appendChild(
                grid
            );

            const back =
                createButton(
                    "← بازگشت به خلاصه",
                    renderSummary,
                    true
                );

            back.style.marginTop = "10px";

            content.appendChild(
                back
            );
        }

        // =====================================
        // Chapters
        // =====================================

        function renderChapters(
            subjectId
        ) {

            state.type = "chapters";
            state.subjectId = subjectId;
            state.chapterId = null;
            state.activityId = null;

            clearContent();

            const subject =
                (
                    statistics.subjects ||
                    {}
                )[subjectId] || {};

            const subjectName =
                subjectTitle(
                    subjectId,
                    subject
                );

            setBreadcrumb([
                subjectName,
                "فصل‌ها"
            ]);

            const heading =
                document.createElement("h3");

            heading.textContent =
                "📖 انتخاب فصل";

            heading.style.cssText =
                "margin:0 0 10px;font-size:18px;";

            content.appendChild(
                heading
            );

            let chapters =
                getChapterEntries(
                    statistics,
                    subjectId
                );

            if (
                !chapters.length &&
                subject.chapters
            ) {

                chapters =
                    asEntries(
                        subject.chapters
                    );
            }

            if (!chapters.length) {

                const activities =
                    getActivityEntries(
                        statistics,
                        subjectId,
                        null
                    );

                if (activities.length) {

                    renderChapterActivities(
                        subjectId,
                        null,
                        "فعالیت‌ها"
                    );

                    return;
                }

                content.appendChild(
                    emptyBox(
                        "هنوز گزارشی برای فصل‌های این درس ثبت نشده است."
                    )
                );

                const back =
                    createButton(
                        "← بازگشت به درس‌ها",
                        renderSubjects,
                        true
                    );

                back.style.marginTop = "10px";

                content.appendChild(back);

                return;
            }

            const grid =
                document.createElement("div");

            grid.style.cssText = [
                "display:grid",
                "grid-template-columns:repeat(2,minmax(0,1fr))",
                "gap:10px"
            ].join(";");

            chapters.forEach(function (entry) {

                const chapterId =
                    entry[0];

                const chapter =
                    entry[1] || {};

                const name =
                    chapterTitle(
                        chapterId,
                        chapter
                    );

                const button =
                    createButton(
                        "📖 " + name,
                        function () {

                            renderChapterActivities(
                                subjectId,
                                chapterId,
                                name
                            );
                        }
                    );

                grid.appendChild(
                    button
                );
            });

            content.appendChild(
                grid
            );

            const back =
                createButton(
                    "← بازگشت به درس‌ها",
                    renderSubjects,
                    true
                );

            back.style.marginTop = "10px";

            content.appendChild(
                back
            );
        }

        // =====================================
        // Activities
        // =====================================

        function renderChapterActivities(
            subjectId,
            chapterId,
            chapterName
        ) {

            state.type = "activities";
            state.subjectId = subjectId;
            state.chapterId = chapterId;
            state.activityId = null;

            clearContent();

            const subject =
                (
                    statistics.subjects ||
                    {}
                )[subjectId] || {};

            setBreadcrumb([
                subjectTitle(
                    subjectId,
                    subject
                ),
                chapterName
            ]);

            const heading =
                document.createElement("h3");

            heading.textContent =
                "🎮 فعالیت‌های آموزشی";

            heading.style.cssText =
                "margin:0 0 10px;font-size:18px;";

            content.appendChild(
                heading
            );

            const entries =
                getActivityEntries(
                    statistics,
                    subjectId,
                    chapterId
                );

            if (!entries.length) {

                content.appendChild(
                    emptyBox(
                        "هنوز گزارشی برای بازی‌های این فصل ثبت نشده است."
                    )
                );

                const back =
                    createButton(
                        "← بازگشت",
                        function () {
                            renderChapters(
                                subjectId
                            );
                        },
                        true
                    );

                back.style.marginTop = "10px";

                content.appendChild(back);

                return;
            }

            entries.forEach(function (entry) {

                const activityId =
                    entry[0];

                const activity =
                    entry[1] || {};

                const button =
                    document.createElement(
                        "button"
                    );

                button.type = "button";

                button.style.cssText = [
                    cardStyle(),
                    "width:100%",
                    "margin-bottom:9px",
                    "text-align:right",
                    "cursor:pointer",
                    "font-family:inherit",
                    "display:block",
                    "background:#fff"
                ].join(";");

                const title =
                    activityTitle(
                        activityId,
                        activity
                    );

                const bestScore =
                    number(
                        activity.bestScore
                    );

                const attempts =
                    number(
                        activity.totalActivities
                    );

                button.innerHTML = `
                    <div style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        gap:10px;
                    ">

                        <div style="min-width:0;">

                            <strong style="
                                font-size:15px;
                            ">
                                🎮
                                ${escapeHTML(title)}
                            </strong>

                            <div style="
                                margin-top:4px;
                                color:#64748b;
                                font-size:11px;
                            ">
                                بهترین:
                                ${bestScore}
                                ·
                                دفعات:
                                ${attempts}
                            </div>

                        </div>

                        <div style="
                            font-size:18px;
                            white-space:nowrap;
                        ">
                            ${makeStars(bestScore)}
                        </div>

                    </div>

                    <div style="
                        margin-top:8px;
                        padding:7px;
                        border-radius:10px;
                        background:#eff6ff;
                        color:#1d4ed8;
                        text-align:center;
                        font-size:12px;
                        font-weight:700;
                    ">
                        📊 مشاهده جزئیات
                    </div>
                `;

                button.addEventListener(
                    "click",
                    function () {

                        renderActivity(
                            activityId
                        );
                    }
                );

                content.appendChild(
                    button
                );
            });

            const back =
                createButton(
                    "← بازگشت به فصل‌ها",
                    function () {
                        renderChapters(
                            subjectId
                        );
                    },
                    true
                );

            back.style.marginTop = "1px";

            content.appendChild(
                back
            );
        }

        // =====================================
        // Activity
        // =====================================

        function renderActivity(
            activityId
        ) {

            state.type = "activity";
            state.activityId = activityId;

            const activity =
                findActivity(
                    statistics,
                    activityId
                );

            const subject =
                (
                    statistics.subjects ||
                    {}
                )[state.subjectId] || {};

            const subjectName =
                subjectTitle(
                    state.subjectId,
                    subject
                );

            const chapterName =
                state.chapterId
                    ? chapterTitle(
                        state.chapterId,
                        (
                            statistics.chapters ||
                            {}
                        )[state.chapterId] || {}
                    )
                    : "فعالیت‌ها";

            setBreadcrumb([
                subjectName,
                chapterName,
                activityTitle(
                    activityId,
                    activity
                )
            ]);

            renderActivityDetail(
                content,
                statistics,
                activityId,
                function () {

                    renderChapterActivities(
                        state.subjectId,
                        state.chapterId,
                        chapterName
                    );
                }
            );
        }

        // =====================================
        // Events
        // =====================================

        const closeBtn =
            header.querySelector(
                "#reportsCloseBtn"
            );

        closeBtn.addEventListener(
            "click",
            close
        );

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {
                    close();
                }
            }
        );

        modal._escapeHandler =
            function (event) {

                if (
                    event.key === "Escape"
                ) {
                    close();
                }
            };

        document.addEventListener(
            "keydown",
            modal._escapeHandler
        );

        // =====================================
        // Initial
        // =====================================

        renderSummary();

        console.log(
            "Reports Screen Displayed",
            {
                subjects:
                    getSubjectEntries(
                        statistics
                    ).length,

                chapters:
                    Object.keys(
                        statistics.chapters || {}
                    ).length,

                activities:
                    Object.keys(
                        statistics.activities || {}
                    ).length
            }
        );
    }

    // =====================================
    // Global API
    // =====================================

    const api = {

        currentView: {
            type: "summary",
            subjectId: null,
            chapterId: null,
            activityId: null
        },

        show: function (data) {
            createScreen(data);
        }
    };

    window[REPORTS_KEY] = api;
    window.ReportsScreen = api;

    console.log(
        "Reports Screen v5.1 Ready"
    );

})();