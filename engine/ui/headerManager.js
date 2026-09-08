// Header Manager v1.9
// Handles the fixed application header and contextual back navigation.

const HeaderManager = {
    init() {
        console.log('Header Manager v1.9 Starting');
        this.observeApp();
        this.render();
        console.log('Header Manager v1.9 Ready');
    },

    observeApp() {
        const app = document.getElementById('app');
        if (!app) return;

        const observer = new MutationObserver(() => this.render());
        observer.observe(app, { childList: true, subtree: true });
    },

    isActivityScreen(screen) {
        return !!screen?.querySelector?.('.quiz-screen, .puzzle-screen, .memory-screen, .divisibility-screen');
    },

    isNotificationCenter(screen) {
        return !!screen?.querySelector?.('.notification-center');
    },

    isProfileScreen(screen) {
        return !!screen?.querySelector?.('.profile-screen');
    },

    isProfileEditScreen(screen) {
        return !!screen?.querySelector?.('.profile-edit-screen');
    },

    getSectionTitle(screen) {
        if (this.isProfileEditScreen(screen)) return 'ویرایش پروفایل';
        if (this.isProfileScreen(screen)) return 'پروفایل من';
        if (screen?.querySelector?.('.reports-screen')) return 'گزارش عملکرد';
        if (screen?.querySelector?.('.activities-screen')) return 'انتخاب فعالیت';
        if (screen?.querySelector?.('.chapters-screen')) return 'انتخاب فصل';
        if (screen?.querySelector?.('.subjects-screen')) return 'انتخاب درس';
        if (screen?.querySelector?.('.grades-screen')) return 'انتخاب پایه';
        if (screen?.querySelector?.('.home-screen')) return 'طهوری';
        return 'طهوری';
    },

    getBackConfig(screen) {
        if (this.isProfileEditScreen(screen)) {
            return {
                visible: true,
                label: 'بازگشت به پروفایل من',
                action: () => {
                    if (typeof ProfileScreen !== 'undefined' && typeof ProfileScreen.show === 'function') {
                        ProfileScreen.show();
                    } else {
                        Screen.showHome();
                    }
                }
            };
        }

        if (this.isProfileScreen(screen)) {
            return { visible: false };
        }

        if (screen?.querySelector?.('.grades-screen')) {
            return { visible: true, label: 'بازگشت', action: () => Screen.showHome() };
        }
        if (screen?.querySelector?.('.subjects-screen')) {
            return { visible: true, label: 'بازگشت', action: () => App.showGrades() };
        }
        if (screen?.querySelector?.('.chapters-screen')) {
            return { visible: true, label: 'بازگشت', action: () => App.showSubjects() };
        }
        if (screen?.querySelector?.('.activities-screen')) {
            return { visible: true, label: 'بازگشت', action: () => App.showChapters() };
        }

        return { visible: true, label: 'بازگشت', action: () => Screen.showHome() };
    },

    render() {
        const header = document.getElementById('appHeader');
        const app = document.getElementById('app');
        if (!header || !app) return;

        const screen = app.firstElementChild;
        if (!screen || this.isActivityScreen(screen) || this.isNotificationCenter(screen)) return;

        const titleEl = header.querySelector('.header-title');
        const backBtn = header.querySelector('.header-back');
        const menuBtn = header.querySelector('.header-menu');

        if (titleEl) titleEl.textContent = this.getSectionTitle(screen);

        const back = this.getBackConfig(screen);
        if (backBtn) {
            backBtn.style.display = back.visible ? 'flex' : 'none';
            backBtn.textContent = back.visible ? `‹ ${back.label}` : '';
            backBtn.onclick = back.visible ? back.action : null;
        }

        if (menuBtn) {
            menuBtn.onclick = () => {
                if (typeof Toast !== 'undefined' && typeof Toast.show === 'function') {
                    Toast.show('این بخش به‌زودی فعال می‌شود');
                }
            };
        }
    }
};

window.HeaderManager = HeaderManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HeaderManager.init());
} else {
    HeaderManager.init();
}
