// =====================================
// Tahouri Edu Platform
// Version 5.2
// Profile Screen
// Multi Profile + Personal Settings
// =====================================

const ProfileScreen = {
    profileSwitchSequence: 0,
    licenseStatusSequence: 0,

    // =====================================
    // Show Profile
    // =====================================

    show: function () {

        const app = document.getElementById("app");

        if (!app) {
            console.error("App Container Missing");
            return;
        }

        const profile = ProfileManager.get();

        if (!profile) {
            app.innerHTML = `
<div class="screen profile-screen">
    <h1>👤 پروفایل</h1>
    <p>هنوز پروفایلی ایجاد نشده است.</p>
    <button id="createFirstProfileBtn" type="button">
        ➕ ایجاد پروفایل
    </button>
    <hr>
    <h2>انتقال پروفایل از دستگاه دیگر</h2>
    <p>فایل خروجی پروفایل را انتخاب کنید؛ شناسهٔ دانش‌آموز حفظ می‌شود. نمره‌ها و تنظیمات منتقل نمی‌شوند.</p>
    <input id="profileImportFile" type="file" accept=".json,application/json">
    <button id="profileImportBtn" type="button">واردکردن فایل پروفایل</button>
    <p id="profileImportMessage" aria-live="polite"></p>
</div>
            `;

            document.getElementById("createFirstProfileBtn").onclick = function () {
                ProfileScreen.showCreate();
            };
            document.getElementById("profileImportBtn").onclick = function () {
                ProfileScreen.importProfilesFromFile();
            };
            return;
        }

        const settings = ProfileManager.getSettings();

        app.innerHTML = `
<div class="screen profile-screen">
    <h1>👤 پروفایل من</h1>
    <p>محیط شخصی دانش‌آموز</p>
    <hr>

    <div class="profile-card">
        <div class="profile-item">
            <h3>👤 نام دانش‌آموز</h3>
            <p id="profileName">${profile.name || "هنوز ثبت نشده"}</p>
        </div>
        <div class="profile-item">
            <h3>🎓 پایه</h3>
            <p id="profileGrade">${this.getGradeTitle(profile.grade)}</p>
        </div>
        <div class="profile-item">
            <h3>📅 تاریخ ایجاد پروفایل</h3>
            <p>${this.formatDate(profile.createdAt)}</p>
        </div>
    </div>

    <section class="profile-license-panel" aria-labelledby="profileLicenseHeading">
        <h2 id="profileLicenseHeading">🔐 وضعیت مجوز یادگیری</h2>
        <p>مجوز هر دانش‌آموز برای پایه و سال تحصیلی خودش جداگانه بررسی می‌شود.</p>
        <p id="profileLicenseStatus" class="profile-license-status" aria-live="polite">در حال بررسی مجوز این پروفایل...</p>
        <button id="activateCurrentProfileBtn" type="button" hidden>🔐 فعال‌سازی این پروفایل</button>
    </section>

    <section id="legacyDeviceMigrationPanel" class="profile-license-panel" hidden aria-labelledby="legacyMigrationHeading">
        <h2 id="legacyMigrationHeading">🔄 تکمیل اتصال امن مجوز قدیمی</h2>
        <p>شناسه نصب زیر را به مدیر مدرسه بدهید. مدیر پس از تطبیق پرونده رسمی، یک چالش یک‌بارمصرف صادر می‌کند. متن JSON چالش را فقط از مدیر مورد اعتماد دریافت و در کادر وارد کنید.</p>
        <p>شناسه نصب این دستگاه: <strong id="legacyMigrationInstallationId">در حال آماده‌سازی...</strong></p>
        <label for="legacyMigrationChallengeInput">متن چالش یک‌بارمصرف مدیر</label>
        <textarea id="legacyMigrationChallengeInput" rows="5" placeholder="متن کامل JSON چالش را اینجا وارد کنید"></textarea>
        <button id="claimLegacyMigrationBtn" type="button">تکمیل اتصال امن این دستگاه</button>
        <p id="legacyMigrationMessage" aria-live="polite"></p>
    </section>

    <hr>

    <button id="editProfileBtn" type="button">✏ ویرایش پروفایل</button>
    <button id="switchProfileBtn" type="button">👥 تغییر پروفایل</button>
    <button id="createProfileBtn" type="button">➕ افزودن دانش‌آموز</button>

    <hr>

    <div class="profile-settings">
        <h2>⚙ تنظیمات شخصی</h2>
        <p>این تنظیمات فقط برای این پروفایل ذخیره می‌شوند.</p>

        <div class="profile-setting-item">
            <label for="profileThemeSelect">🌓 محیط برنامه</label>
            <select id="profileThemeSelect">
                <option value="light" ${settings.theme === "light" ? "selected" : ""}>☀ روشن</option>
                <option value="dark" ${settings.theme === "dark" ? "selected" : ""}>🌙 تاریک</option>
            </select>
        </div>

        <div class="profile-setting-item">
            <label for="profileMusicSelect">🎵 موسیقی</label>
            <select id="profileMusicSelect">
                <option value="true" ${settings.music ? "selected" : ""}>🔊 روشن</option>
                <option value="false" ${!settings.music ? "selected" : ""}>🔇 خاموش</option>
            </select>
        </div>

        <div class="profile-setting-item">
            <label for="profileProgramSoundSelect">🔊 صدای برنامه</label>
            <select id="profileProgramSoundSelect">
                <option value="true" ${settings.programSound ? "selected" : ""}>🔊 روشن</option>
                <option value="false" ${!settings.programSound ? "selected" : ""}>🔇 خاموش</option>
            </select>
        </div>

        <div class="profile-setting-item">
            <label for="profileNotificationsSelect">🔔 اعلان‌ها</label>
            <select id="profileNotificationsSelect">
                <option value="true" ${settings.notifications ? "selected" : ""}>🔔 روشن</option>
                <option value="false" ${!settings.notifications ? "selected" : ""}>🔕 خاموش</option>
            </select>
        </div>

        <div class="profile-setting-item">
            <label for="profileSoundFeedbackSelect">🎯 بازخورد صوتی</label>
            <select id="profileSoundFeedbackSelect">
                <option value="true" ${settings.soundFeedback ? "selected" : ""}>🔊 روشن</option>
                <option value="false" ${!settings.soundFeedback ? "selected" : ""}>🔇 خاموش</option>
            </select>
        </div>

        <div id="settingsMessage"></div>
    </div>
</div>
        `;

        document.getElementById("editProfileBtn").onclick = function () {
            ProfileScreen.showEdit();
        };

        document.getElementById("switchProfileBtn").onclick = function () {
            ProfileScreen.showProfiles();
        };

        document.getElementById("createProfileBtn").onclick = function () {
            ProfileScreen.showCreate();
        };

        const activateButton = document.getElementById("activateCurrentProfileBtn");
        if (activateButton) {
            activateButton.onclick = function () {
                ProfileScreen.activateProfile(profile.studentId, profile.grade, activateButton);
            };
        }
        const migrationButton = document.getElementById("claimLegacyMigrationBtn");
        if (migrationButton) {
            migrationButton.onclick = function () {
                ProfileScreen.claimLegacyMigrationFromProfile(profile.studentId, profile.grade, migrationButton);
            };
        }

        this.bindSettings();
        this.refreshProfileLicenseStatus(profile);

        console.log("Profile Screen v5.2 Displayed:", profile);
    },

    // =====================================
    // Bind Settings
    // =====================================

    bindSettings: function () {

        const theme = document.getElementById("profileThemeSelect");
        const music = document.getElementById("profileMusicSelect");
        const programSound = document.getElementById("profileProgramSoundSelect");
        const notifications = document.getElementById("profileNotificationsSelect");
        const soundFeedback = document.getElementById("profileSoundFeedbackSelect");

        if (theme) {
            theme.onchange = function () {
                ProfileManager.updateSettings({ theme: theme.value });
                ProfileScreen.showSettingsMessage("تنظیمات محیط ذخیره شد.");
            };
        }

        if (music) {
            music.onchange = function () {
                ProfileManager.updateSettings({ music: music.value === "true" });
                ProfileScreen.showSettingsMessage("تنظیمات موسیقی ذخیره شد.");
            };
        }

        if (programSound) {
            programSound.onchange = function () {
                ProfileManager.updateSettings({ programSound: programSound.value === "true" });
                ProfileScreen.showSettingsMessage("تنظیمات صدای برنامه ذخیره شد.");
            };
        }

        if (notifications) {
            notifications.onchange = function () {
                ProfileManager.updateSettings({ notifications: notifications.value === "true" });
                ProfileScreen.showSettingsMessage("تنظیمات اعلان‌ها ذخیره شد.");
            };
        }

        if (soundFeedback) {
            soundFeedback.onchange = function () {
                ProfileManager.updateSettings({ soundFeedback: soundFeedback.value === "true" });
                ProfileScreen.showSettingsMessage("تنظیمات بازخورد صوتی ذخیره شد.");
            };
        }
    },

    // =====================================
    // Settings Message
    // =====================================

    showSettingsMessage: function (message) {
        const box = document.getElementById("settingsMessage");

        if (!box) {
            return;
        }

        box.innerHTML = message;

        setTimeout(function () {
            if (box) {
                box.innerHTML = "";
            }
        }, 1500);
    },

    // =====================================
    // Show Profiles
    // =====================================

    showProfiles: function () {
        const app = document.getElementById("app");
        if (!app) return;

        const profiles = ProfileManager.getAll();
        const activeProfile = ProfileManager.get();

        app.innerHTML = `
<div class="screen profiles-screen">
    <h1>👥 پروفایل‌های دانش‌آموزان</h1>
    <p>با انتخاب هر پروفایل، وارد صفحه همان دانش‌آموز می‌شوید. وضعیت مجوز و دکمه فعال‌سازی هم در همان صفحه مشخص است.</p>
    <button id="exportProfilesForAdminBtn" type="button">دانلود فهرست پروفایل‌ها برای پنل مدیریت</button>
    <p id="exportProfilesMessage" aria-live="polite"></p>
    <section class="profile-import-panel">
        <h2>انتقال پروفایل از دستگاه دیگر</h2>
        <p>فایل خروجی پروفایل را انتخاب کنید؛ شناسهٔ دانش‌آموز حفظ می‌شود. نمره‌ها و تنظیمات منتقل نمی‌شوند.</p>
        <input id="profileImportFile" type="file" accept=".json,application/json">
        <button id="profileImportBtn" type="button">واردکردن فایل پروفایل</button>
        <p id="profileImportMessage" aria-live="polite"></p>
    </section>
    <hr>
    <div class="profiles-list">
        ${profiles.map(function (profile) {
            const active = activeProfile && activeProfile.studentId === profile.studentId;
            const studentId = ProfileScreen.escapeHtml(profile.studentId);
            const name = ProfileScreen.escapeHtml(profile.name || "دانش‌آموز");
            const grade = ProfileScreen.escapeHtml(ProfileScreen.getGradeTitle(profile.grade));
            return `
<div class="profile-select-card">
    <h2>${active ? "⭐ " : ""}${name}</h2>
    <p>🎓 ${grade}</p>
    <p>📅 ${ProfileScreen.escapeHtml(ProfileScreen.formatDate(profile.createdAt))}</p>
    <p class="profile-license-status" data-profile-license-status="${studentId}" aria-live="polite">در حال بررسی وضعیت مجوز...</p>
    ${active
        ? `<button type="button" disabled>✓ پروفایل انتخاب‌شده</button>`
        : `<button type="button" data-profile-id="${studentId}">ورود به این پروفایل</button>`}
    <button type="button" data-profile-activate-id="${studentId}" hidden>🔐 فعال‌سازی این پروفایل</button>
</div>`;
        }).join("")}
    </div>
</div>`;

        const exportButton = document.getElementById("exportProfilesForAdminBtn");
        if (exportButton) {
            exportButton.onclick = function () {
                ProfileScreen.exportProfilesForAdmin();
            };
        }
        const importButton = document.getElementById("profileImportBtn");
        if (importButton) {
            importButton.onclick = function () {
                ProfileScreen.importProfilesFromFile();
            };
        }

        document.querySelectorAll("[data-profile-id]").forEach(function (button) {
            button.onclick = function () {
                ProfileScreen.selectProfile(button.getAttribute("data-profile-id"), button);
            };
        });

        document.querySelectorAll("[data-profile-activate-id]").forEach(function (button) {
            button.onclick = function () {
                const studentId = button.getAttribute("data-profile-activate-id");
                const profile = profiles.find(item => String(item.studentId) === String(studentId));
                if (profile) {
                    ProfileScreen.activateProfile(profile.studentId, profile.grade, button);
                }
            };
        });

        profiles.forEach(function (profile) {
            ProfileScreen.refreshProfileCardLicenseStatus(profile);
        });

        console.log("Profile List Displayed:", profiles);
    },

    // =====================================
    // Profile License Status and Actions
    // =====================================

    escapeHtml: function (value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    },

    getLicenseStatusText: function (result) {
        if (!result) return "وضعیت مجوز مشخص نشد.";
        if (result.active) {
            return "✓ مجوز فعال است · سال تحصیلی " +
                (result.academicYearText || result.academicYear || "");
        }
        if (result.status === "pending") {
            return "🕒 " + (result.reason || "مجوز در انتظار شروع اعتبار است.");
        }
        if (result.status === "expired") {
            return "⛔ " + (result.reason || "مجوز منقضی شده است.");
        }
        if (result.status === "renewal_required") {
            return "⚠ " + (result.reason || "مجوز سال تحصیلی جاری فعال نیست.");
        }
        if (result.status === "inactive") {
            return "⚠ مجوز یادگیری این پروفایل فعال نیست.";
        }
        if (result.status === "invalid") {
            return "⚠ وضعیت مجوز نیاز به بررسی دارد. " + (result.reason || "");
        }
        if (result.status === "unavailable") {
            return "ℹ " + (result.reason || "وضعیت مجوز فعلاً قابل بررسی نیست.");
        }
        return "⚠ فعال‌سازی برای این پروفایل انجام نشده است. " + (result.reason || "");
    },

    refreshSelectedProfileEntitlement: async function () {
        if (window.ActivationGate &&
            typeof ActivationGate.refreshActiveProfileEntitlement === "function") {
            return ActivationGate.refreshActiveProfileEntitlement();
        }

        const manager = window.LicenseManager;
        if (manager && typeof manager.initializeRemoteEntitlement === "function") {
            return manager.initializeRemoteEntitlement();
        }
        return false;
    },

    refreshProfileLicenseStatus: async function (profile) {
        const statusElement = document.getElementById("profileLicenseStatus");
        const activateButton = document.getElementById("activateCurrentProfileBtn");
        if (!statusElement || !profile) return;

        const sequence = ++this.licenseStatusSequence;
        const manager = window.LicenseManager;
        if (!manager || typeof manager.getProfileEntitlementStatus !== "function") {
            statusElement.textContent = "وضعیت مجوز در این نسخه قابل بررسی نیست.";
            if (activateButton) activateButton.hidden = false;
            return;
        }

        try {
            const result = await manager.getProfileEntitlementStatus(profile.studentId, profile.grade);
            const activeProfile = ProfileManager.get();
            if (sequence !== this.licenseStatusSequence ||
                !activeProfile || activeProfile.studentId !== profile.studentId) return;

            statusElement.textContent = this.getLicenseStatusText(result);
            statusElement.className = "profile-license-status " +
                (result && result.active ? "is-active" : "is-inactive");

            const migrationPanel = document.getElementById("legacyDeviceMigrationPanel");
            const canMigrateLegacy = !!(result && result.status === "renewal_required" &&
                /تکمیل مهاجرت مجوز قدیمی/.test(result.reason || "") &&
                window.TahouriDeviceIdentity && window.TahouriLicenseClient &&
                typeof window.TahouriLicenseClient.claimLegacyMigration === "function");
            if (migrationPanel) {
                migrationPanel.hidden = !canMigrateLegacy;
                if (canMigrateLegacy) {
                    try {
                        const identity = await window.TahouriDeviceIdentity.getOrCreate();
                        const current = ProfileManager.get();
                        if (sequence !== this.licenseStatusSequence || !current ||
                            current.studentId !== profile.studentId) return;
                        const identityElement = document.getElementById("legacyMigrationInstallationId");
                        if (identityElement) identityElement.textContent = identity.installationId;
                    } catch (identityError) {
                        const message = document.getElementById("legacyMigrationMessage");
                        if (message) message.textContent = identityError.message || "آماده‌سازی هویت دستگاه انجام نشد.";
                    }
                }
            }

            if (activateButton) {
                const canActivate = !result || ["inactive", "invalid", "expired", "renewal_required"].includes(result.status);
                activateButton.hidden = !canActivate;
                activateButton.textContent = result && ["expired", "renewal_required"].includes(result.status)
                    ? "🔄 تمدید مجوز این پروفایل"
                    : "🔐 فعال‌سازی این پروفایل";
            }
        } catch (error) {
            console.warn("Profile Screen: License status lookup failed.", error);
            if (sequence === this.licenseStatusSequence) {
                statusElement.textContent = "وضعیت مجوز فعلاً قابل بررسی نیست.";
                if (activateButton) activateButton.hidden = true;
            }
        }
    },

    refreshProfileCardLicenseStatus: async function (profile) {
        const manager = window.LicenseManager;
        if (!manager || typeof manager.getProfileEntitlementStatus !== "function") return;

        const statusElement = Array.from(document.querySelectorAll("[data-profile-license-status]"))
            .find(element => element.getAttribute("data-profile-license-status") === String(profile.studentId));
        const activateButton = Array.from(document.querySelectorAll("[data-profile-activate-id]"))
            .find(element => element.getAttribute("data-profile-activate-id") === String(profile.studentId));
        if (!statusElement) return;

        try {
            const result = await manager.getProfileEntitlementStatus(profile.studentId, profile.grade);
            if (!statusElement.isConnected) return;
            statusElement.textContent = this.getLicenseStatusText(result);
            statusElement.className = "profile-license-status " +
                (result && result.active ? "is-active" : "is-inactive");

            if (activateButton) {
                const canActivate = !result || ["inactive", "invalid", "expired", "renewal_required"].includes(result.status);
                activateButton.hidden = !canActivate;
                activateButton.textContent = result && ["expired", "renewal_required"].includes(result.status)
                    ? "🔄 تمدید مجوز این پروفایل"
                    : "🔐 فعال‌سازی این پروفایل";
            }
        } catch (error) {
            console.warn("Profile Screen: Profile card license status failed.", error);
            statusElement.textContent = "وضعیت مجوز فعلاً قابل بررسی نیست.";
        }
    },

    selectProfile: async function (studentId, button) {
        const sequence = ++this.profileSwitchSequence;
        if (button) {
            button.disabled = true;
            button.textContent = "در حال آماده‌سازی پروفایل...";
        }

        if (!ProfileManager.switchProfile(studentId)) {
            if (button) {
                button.disabled = false;
                button.textContent = "ورود به این پروفایل";
            }
            return false;
        }

        try {
            await this.refreshSelectedProfileEntitlement();
        } catch (error) {
            console.warn("Profile Screen: Selected profile entitlement could not be initialized.", error);
        }

        if (sequence !== this.profileSwitchSequence) return false;
        const current = ProfileManager.get();
        if (!current || current.studentId !== studentId) return false;

        this.show();
        return true;
    },

    claimLegacyMigrationFromProfile: async function (studentId, gradeId, button) {
        const message = document.getElementById("legacyMigrationMessage");
        const input = document.getElementById("legacyMigrationChallengeInput");
        const current = ProfileManager.get();
        if (!current || current.studentId !== studentId || current.grade !== gradeId) {
            if (message) message.textContent = "پروفایل فعال تغییر کرده است؛ دوباره وضعیت را بررسی کنید.";
            return false;
        }
        if (!window.TahouriLicenseClient ||
            typeof window.TahouriLicenseClient.claimLegacyMigration !== "function") {
            if (message) message.textContent = "قابلیت تکمیل مهاجرت در این نسخه در دسترس نیست.";
            return false;
        }
        if (button) {
            button.disabled = true;
            button.textContent = "در حال تأیید هویت دستگاه...";
        }
        try {
            const challenge = JSON.parse(String(input && input.value || ""));
            if (challenge.studentId !== String(studentId) || challenge.gradeId !== String(gradeId)) {
                throw new Error("چالش برای این دانش‌آموز یا پایه صادر نشده است.");
            }
            const result = await window.TahouriLicenseClient.claimLegacyMigration(challenge);
            if (!result || !result.entitlementStored) {
                throw new Error("اتصال دستگاه انجام شد، اما ذخیره مجوز تأیید نشد.");
            }
            if (input) input.value = "";
            if (message) message.textContent = "اتصال امن انجام شد و مجوز امضاشده روی همین دستگاه ذخیره شد.";
            await this.refreshSelectedProfileEntitlement();
            await this.refreshProfileLicenseStatus(ProfileManager.get());
            return true;
        } catch (error) {
            if (message) message.textContent = error.message || "تکمیل مهاجرت انجام نشد.";
            return false;
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "تکمیل اتصال امن این دستگاه";
            }
        }
    },

    activateProfile: async function (studentId, gradeId, button) {
        const sequence = ++this.profileSwitchSequence;
        if (button) {
            button.disabled = true;
            button.textContent = "در حال آماده‌سازی...";
        }

        const current = ProfileManager.get();
        if (!current || current.studentId !== studentId) {
            if (!ProfileManager.switchProfile(studentId)) {
                if (button) button.disabled = false;
                return false;
            }
        }

        try {
            await this.refreshSelectedProfileEntitlement();
        } catch (error) {
            console.warn("Profile Screen: Entitlement selection before activation failed.", error);
        }

        if (sequence !== this.profileSwitchSequence) return false;
        const selected = ProfileManager.get();
        if (!selected || selected.studentId !== studentId) return false;

        this.show();
        if (window.ActivationGate && typeof ActivationGate.openGrade === "function") {
            return ActivationGate.openGrade(gradeId);
        }
        if (window.ActivationGate && typeof ActivationGate.open === "function") {
            ActivationGate.open();
        }
        return false;
    },

    // Import existing profiles from another device.
    // The exported identity fields are preserved; progress/settings are not transferred.
    importProfilesFromFile: async function () {
        const input = document.getElementById("profileImportFile");
        const message = document.getElementById("profileImportMessage");
        try {
            const file = input && input.files && input.files[0];
            if (!file) throw new Error("ابتدا فایل خروجی پروفایل‌ها را انتخاب کنید.");
            const payload = JSON.parse(await file.text());
            if (payload.format !== "tahouri-student-profiles" || payload.version !== 1 || !Array.isArray(payload.profiles)) {
                throw new Error("ساختار فایل پروفایل‌های طهوری معتبر نیست.");
            }
            const result = ProfileManager.importProfiles(payload.profiles);
            input.value = "";
            ProfileScreen.showProfiles();
            const status = document.getElementById("profileImportMessage");
            if (status) {
                status.textContent = "ورود انجام شد؛ پروفایل جدید: " + result.imported +
                    "، از قبل موجود: " + result.alreadyPresent + "، مجموع: " + result.total + ".";
            }
        } catch (error) {
            if (message) message.textContent = error.message || "واردکردن پروفایل انجام نشد.";
        }
    },

    // Export Existing Profiles for License Admin
    // =====================================

    exportProfilesForAdmin: function () {
        const message = document.getElementById("exportProfilesMessage");
        try {
            const profiles = ProfileManager.getAll().map(function (profile) {
                return {
                    studentId: String(profile.studentId || "").trim(),
                    fullName: String(profile.name || "").trim(),
                    gradeId: String(profile.grade || "").trim()
                };
            });
            if (!profiles.length || profiles.length > 100 || profiles.some(function (profile) {
                return !profile.studentId || !profile.fullName || !/^grade[1-6]$/.test(profile.gradeId);
            })) {
                throw new Error("برای خروجی گرفتن، شناسه، نام و پایهٔ همهٔ پروفایل‌ها باید معتبر باشد (حداکثر ۱۰۰ پروفایل).");
            }
            const payload = {
                format: "tahouri-student-profiles",
                version: 1,
                exportedAt: new Date().toISOString(),
                profiles: profiles
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "tahouri-student-profiles.json";
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            if (message) message.textContent = "فهرست " + profiles.length + " پروفایل آماده شد؛ فایل فقط شناسه، نام و پایه را دارد.";
        } catch (error) {
            if (message) message.textContent = error.message || "خروجی پروفایل‌ها ایجاد نشد.";
        }
    },

    // =====================================
    // Create Profile
    // =====================================

    showCreate: function () {

        const app = document.getElementById("app");

        if (!app) {
            return;
        }

        app.innerHTML = `
<div class="screen profile-create-screen">
    <h1>➕ ایجاد پروفایل دانش‌آموز</h1>
    <p>برای هر دانش‌آموز یک پروفایل جداگانه بسازید.</p>
    <p class="profile-license-help">ساخت پروفایل به معنی فعال شدن مجوز یادگیری نیست. پس از ایجاد، وضعیت مجوز در صفحه پروفایل نمایش داده می‌شود و می‌توانید همان‌جا آن را فعال کنید.</p>
    <hr>

    <label for="newProfileName">نام دانش‌آموز</label>
    <br>
    <input id="newProfileName" type="text" placeholder="مثلاً محمد">
    <br><br>

    <label for="newProfileGrade">پایه</label>
    <br>
    <select id="newProfileGrade">
        <option value="">انتخاب پایه</option>
        ${this.buildGradeOptions(null)}
    </select>
    <br><br>

    <button id="saveNewProfileBtn" type="button">💾 ایجاد پروفایل</button>
    <button id="cancelNewProfileBtn" type="button">✖ انصراف</button>

    <div id="createProfileMessage"></div>
</div>
        `;

        document.getElementById("saveNewProfileBtn").onclick = function () {
            const nameInput = document.getElementById("newProfileName");
            const gradeInput = document.getElementById("newProfileGrade");
            const message = document.getElementById("createProfileMessage");

            const name = nameInput.value.trim();
            const grade = gradeInput.value;

            if (!name) {
                message.innerHTML = "⚠ لطفاً نام دانش‌آموز را وارد کنید.";
                nameInput.focus();
                return;
            }

            if (!grade) {
                message.innerHTML = "⚠ لطفاً پایه را انتخاب کنید.";
                gradeInput.focus();
                return;
            }

            try {
                const profile = ProfileManager.createProfile({ name: name, grade: grade });

                if (!profile) {
                    message.innerHTML = "⚠ ایجاد پروفایل انجام نشد.";
                    return;
                }

                message.innerHTML = "✓ پروفایل ساخته شد؛ وضعیت مجوز را در صفحه بعد ببینید.";

                setTimeout(async function () {
                    try {
                        await ProfileScreen.refreshSelectedProfileEntitlement();
                    } catch (error) {
                        console.warn("Profile Screen: New profile entitlement initialization failed.", error);
                    }
                    ProfileScreen.show();
                }, 350);
            } catch (error) {
                console.error("Profile Create Error:", error);
                message.innerHTML = "⚠ خطا در ایجاد پروفایل.";
            }
        };

        document.getElementById("cancelNewProfileBtn").onclick = function () {
            ProfileScreen.show();
        };
    },

    // =====================================
    // Edit Profile
    // =====================================

    showEdit: function () {

        const app = document.getElementById("app");

        if (!app) {
            return;
        }

        const profile = ProfileManager.get();

        if (!profile) {
            ProfileScreen.show();
            return;
        }

        app.innerHTML = `
<div class="screen profile-edit-screen">
    <h1>✏ ویرایش پروفایل</h1>
    <p>اطلاعات این پروفایل را ویرایش کنید.</p>
    <hr>

    <label for="editProfileName">نام دانش‌آموز</label>
    <br>
    <input id="editProfileName" type="text" value="${profile.name || ""}">
    <br><br>

    <label for="editProfileGrade">پایه</label>
    <br>
    <select id="editProfileGrade">
        ${this.buildGradeOptions(profile.grade)}
    </select>
    <br><br>

    <p class="profile-grade-warning">
        ⚠ تغییر پایه، پایه آموزشی همین پروفایل را تغییر می‌دهد. پس از ذخیره، مجوز پایه جدید بررسی خواهد شد.
    </p>

    <button id="saveProfileBtn" type="button">💾 ذخیره تغییرات</button>
    <button id="cancelProfileBtn" type="button">✖ انصراف</button>

    <div id="editProfileMessage"></div>
</div>
        `;

        document.getElementById("saveProfileBtn").onclick = function () {
            const nameInput = document.getElementById("editProfileName");
            const gradeInput = document.getElementById("editProfileGrade");
            const message = document.getElementById("editProfileMessage");

            const name = nameInput.value.trim();
            const grade = gradeInput.value;

            if (!name) {
                message.innerHTML = "⚠ لطفاً نام دانش‌آموز را وارد کنید.";
                nameInput.focus();
                return;
            }

            if (!grade) {
                message.innerHTML = "⚠ لطفاً پایه را انتخاب کنید.";
                gradeInput.focus();
                return;
            }

            const oldGrade = profile.grade;

            ProfileManager.update({ name: name, grade: grade });

            if (oldGrade !== grade) {
                message.innerHTML = "✓ تغییرات ذخیره شد؛ وضعیت مجوز پایه جدید بررسی می‌شود.";

                setTimeout(async function () {
                    await ProfileScreen.refreshSelectedProfileEntitlement();
                    ProfileScreen.show();
                }, 350);
            } else {
                message.innerHTML = "✓ تغییرات ذخیره شد.";

                setTimeout(function () {
                    ProfileScreen.show();
                }, 500);
            }
        };

        document.getElementById("cancelProfileBtn").onclick = function () {
            ProfileScreen.show();
        };
    },

    // =====================================
    // Helpers
    // =====================================

    getGradeTitle: function (grade) {
        const titles = {
            grade1: "پایه اول",
            grade2: "پایه دوم",
            grade3: "پایه سوم",
            grade4: "پایه چهارم",
            grade5: "پایه پنجم",
            grade6: "پایه ششم"
        };

        return titles[grade] || grade || "نامشخص";
    },

    buildGradeOptions: function (selectedGrade) {
        const grades = [
            ["grade1", "پایه اول"],
            ["grade2", "پایه دوم"],
            ["grade3", "پایه سوم"],
            ["grade4", "پایه چهارم"],
            ["grade5", "پایه پنجم"],
            ["grade6", "پایه ششم"]
        ];

        return grades.map(function (item) {
            return `<option value="${item[0]}" ${selectedGrade === item[0] ? "selected" : ""}>${item[1]}</option>`;
        }).join("");
    },

    formatDate: function (date) {
        if (!date) {
            return "ثبت نشده";
        }

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return date;
        }

        return new Intl.DateTimeFormat("fa-IR", {
            year: "numeric",
            month: "numeric",
            day: "numeric"
        }).format(d);
    }
};

console.log("Profile Screen v5.1 Ready");
