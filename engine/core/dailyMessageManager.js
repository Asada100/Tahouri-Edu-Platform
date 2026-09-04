/* ============================================
   Tahouri Edu Platform
   Daily Message Manager v1.0
   ============================================ */

class DailyMessageManager {

    static STORAGE_KEY = "tahouri_daily_message";

    static messages = [
        {
            id: "msg1",
            text: "هر روز یک قدم کوچک، تو را به موفقیت نزدیک‌تر می‌کند.",
            icon: "🌱"
        },
        {
            id: "msg2",
            text: "امروز فرصت خوبی برای یادگیری یک چیز تازه است.",
            icon: "📚"
        },
        {
            id: "msg3",
            text: "اشتباه کردن بخشی از مسیر یادگیری است؛ دوباره تلاش کن.",
            icon: "💪"
        },
        {
            id: "msg4",
            text: "با تمرکز و آرامش، می‌توانی مسئله‌های سخت را حل کنی.",
            icon: "🧠"
        },
        {
            id: "msg5",
            text: "یادگیری امروز، توانایی فردای تو را می‌سازد.",
            icon: "⭐"
        }
    ];


    /* ============================================
       Get Today Key
       ============================================ */

    static getTodayKey() {

        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    /* ============================================
       Get Stored Data
       ============================================ */

    static getStoredData() {

        try {

            const raw = localStorage.getItem(
                this.STORAGE_KEY
            );

            if (!raw) {
                return null;
            }

            return JSON.parse(raw);

        } catch (error) {

            console.error(
                "DailyMessageManager: Failed to read storage",
                error
            );

            return null;
        }
    }


    /* ============================================
       Save Data
       ============================================ */

    static saveData(data) {

        try {

            localStorage.setItem(
                this.STORAGE_KEY,
                JSON.stringify(data)
            );

            return true;

        } catch (error) {

            console.error(
                "DailyMessageManager: Failed to save data",
                error
            );

            return false;
        }
    }


    /* ============================================
       Select Message
       ============================================ */

    static selectMessage(dateKey) {

        if (!this.messages.length) {
            return null;
        }

        let hash = 0;

        for (let i = 0; i < dateKey.length; i++) {

            hash =
                ((hash << 5) - hash) +
                dateKey.charCodeAt(i);

            hash |= 0;
        }

        const index =
            Math.abs(hash) % this.messages.length;

        return this.messages[index];
    }


    /* ============================================
       Get Today Message
       ============================================ */

    static getTodayMessage() {

        const today = this.getTodayKey();
        const stored = this.getStoredData();

        if (
            stored &&
            stored.date === today &&
            stored.message
        ) {

            return stored.message;
        }

        const message = this.selectMessage(today);

        if (!message) {
            return null;
        }

        const data = {
            date: today,
            message: message,
            viewed: false,
            viewedAt: null
        };

        this.saveData(data);

        console.log(
            "DailyMessageManager: Today's message selected",
            message
        );

        return message;
    }


    /* ============================================
       Mark As Viewed
       ============================================ */

    static markAsViewed() {

        const today = this.getTodayKey();
        const stored = this.getStoredData();

        if (!stored || stored.date !== today) {

            this.getTodayMessage();

            return this.markAsViewed();
        }

        stored.viewed = true;
        stored.viewedAt = new Date().toISOString();

        this.saveData(stored);

        console.log(
            "DailyMessageManager: Message marked as viewed"
        );
    }


    /* ============================================
       Check Viewed
       ============================================ */

    static isViewedToday() {

        const today = this.getTodayKey();
        const stored = this.getStoredData();

        return !!(
            stored &&
            stored.date === today &&
            stored.viewed === true
        );
    }


    /* ============================================
       Test
       ============================================ */

    static test() {

        const today = this.getTodayKey();
        const message = this.getTodayMessage();
        const viewed = this.isViewedToday();

        console.log(
            "DailyMessageManager.test()"
        );

        console.log(
            "Today:",
            today
        );

        console.log(
            "Message:",
            message
        );

        console.log(
            "Viewed Today:",
            viewed
        );

        return {
            date: today,
            message: message,
            viewed: viewed
        };
    }
}


window.DailyMessageManager = DailyMessageManager;

console.log(
    "Daily Message Manager v1.0 Ready"
);