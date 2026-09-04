// =====================================
// Tahouri Edu Platform
// Version 5.0
// Profile Screen
// Multi Profile + Personal Settings
// =====================================

const ProfileScreen = {

    // =====================================
    // Show Profile
    // =====================================

    show: function () {

        const app =
            document.getElementById("app");

        if (!app) {

            console.error(
                "App Container Missing"
            );

            return;

        }

        const profile =
            ProfileManager.get();

        if (!profile) {

            app.innerHTML = `

<div class="screen profile-screen">

    <h1>👤 پروفایل</h1>

    <p>
        هنوز پروفایلی ایجاد نشده است.
    </p>

    <button
        id="createFirstProfileBtn"
        type="button">

        ➕ ایجاد پروفایل

    </button>

</div>

            `;

            document
                .getElementById(
                    "createFirstProfileBtn"
                )
                .onclick = function () {

                    ProfileScreen.showCreate();

                };

            return;

        }


        const settings =
            ProfileManager.getSettings();


        app.innerHTML = `

<div class="screen profile-screen">

    <h1>
        👤 پروفایل من
    </h1>

    <p>
        محیط شخصی دانش‌آموز
    </p>

    <hr>


    <!-- ================================= -->
    <!-- Active Profile -->
    <!-- ================================= -->

    <div class="profile-card">

        <div class="profile-item">

            <h3>
                👤 نام دانش‌آموز
            </h3>

            <p id="profileName">

                ${
                    profile.name ||
                    "هنوز ثبت نشده"
                }

            </p>

        </div>


        <div class="profile-item">

            <h3>
                🎓 پایه
            </h3>

            <p id="profileGrade">

                ${
                    this.getGradeTitle(
                        profile.grade
                    )
                }

            </p>

        </div>


        <div class="profile-item">

            <h3>
                📅 تاریخ ایجاد پروفایل
            </h3>

            <p>

                ${
                    this.formatDate(
                        profile.createdAt
                    )
                }

            </p>

        </div>

    </div>


    <hr>


    <!-- ================================= -->
    <!-- Profile Actions -->
    <!-- ================================= -->

    <button
        id="editProfileBtn"
        type="button">

        ✏ ویرایش پروفایل

    </button>


    <button
        id="switchProfileBtn"
        type="button">

        👥 تغییر پروفایل

    </button>


    <button
        id="createProfileBtn"
        type="button">

        ➕ افزودن دانش‌آموز

    </button>


    <hr>


    <!-- ================================= -->
    <!-- Personal Settings -->
    <!-- ================================= -->

    <div class="profile-settings">

        <h2>
            ⚙ تنظیمات شخصی
        </h2>

        <p>
            این تنظیمات فقط برای این پروفایل ذخیره می‌شوند.
        </p>


        <!-- Theme -->

        <div class="profile-setting-item">

            <label>
                🌓 محیط برنامه
            </label>

            <select
                id="profileThemeSelect">

                <option
                    value="light"
                    ${
                        settings.theme === "light"
                        ? "selected"
                        : ""
                    }>

                    ☀ روشن

                </option>

                <option
                    value="dark"
                    ${
                        settings.theme === "dark"
                        ? "selected"
                        : ""
                    }>

                    🌙 تاریک

                </option>

            </select>

        </div>


        <!-- Music -->

        <div class="profile-setting-item">

            <label>

                🎵 موسیقی

            </label>

            <select
                id="profileMusicSelect">

                <option
                    value="true"
                    ${
                        settings.music
                        ? "selected"
                        : ""
                    }>

                    🔊 روشن

                </option>

                <option
                    value="false"
                    ${
                        !settings.music
                        ? "selected"
                        : ""
                    }>

                    🔇 خاموش

                </option>

            </select>

        </div>


        <!-- Program Sound -->

        <div class="profile-setting-item">

            <label>

                🔊 صدای برنامه

            </label>

            <select
                id="profileProgramSoundSelect">

                <option
                    value="true"
                    ${
                        settings.programSound
                        ? "selected"
                        : ""
                    }>

                    🔊 روشن

                </option>

                <option
                    value="false"
                    ${
                        !settings.programSound
                        ? "selected"
                        : ""
                    }>

                    🔇 خاموش

                </option>

            </select>

        </div>


        <!-- Notifications -->

        <div class="profile-setting-item">

            <label>

                🔔 اعلان‌ها

            </label>

            <select
                id="profileNotificationsSelect">

                <option
                    value="true"
                    ${
                        settings.notifications
                        ? "selected"
                        : ""
                    }>

                    🔔 روشن

                </option>

                <option
                    value="false"
                    ${
                        !settings.notifications
                        ? "selected"
                        : ""
                    }>

                    🔕 خاموش

                </option>

            </select>

        </div>


        <!-- Sound Feedback -->

        <div class="profile-setting-item">

            <label>

                🎯 بازخورد صوتی

            </label>

            <select
                id="profileSoundFeedbackSelect">

                <option
                    value="true"
                    ${
                        settings.soundFeedback
                        ? "selected"
                        : ""
                    }>

                    🔊 روشن

                </option>

                <option
                    value="false"
                    ${
                        !settings.soundFeedback
                        ? "selected"
                        : ""
                    }>

                    🔇 خاموش

                </option>

            </select>

        </div>


        <div
            id="settingsMessage">

        </div>

    </div>


    <hr>


    <!-- ================================= -->
    <!-- Navigation -->
    <!-- ================================= -->

    <button
        id="profileDashboardBtn"
        type="button">

        📊 داشبورد

    </button>


    <button
        id="profileHomeBtn"
        type="button">

        🏠 صفحه اصلی

    </button>


</div>

        `;


        // =====================================
        // Edit Profile
        // =====================================

        document
            .getElementById(
                "editProfileBtn"
            )
            .onclick = function () {

                ProfileScreen.showEdit();

            };


        // =====================================
        // Switch Profile
        // =====================================

        document
            .getElementById(
                "switchProfileBtn"
            )
            .onclick = function () {

                ProfileScreen.showProfiles();

            };


        // =====================================
        // Create Profile
        // =====================================

        document
            .getElementById(
                "createProfileBtn"
            )
            .onclick = function () {

                ProfileScreen.showCreate();

            };


        // =====================================
        // Dashboard
        // =====================================

        document
            .getElementById(
                "profileDashboardBtn"
            )
            .onclick = function () {

                Navigation.openDashboard();

            };


        // =====================================
        // Home
        // =====================================

        document
            .getElementById(
                "profileHomeBtn"
            )
            .onclick = function () {

                Screen.showHome();

            };


        // =====================================
        // Settings
        // =====================================

        this.bindSettings();


        console.log(
            "Profile Screen v5.0 Displayed:",
            profile
        );

    },


    // =====================================
    // Bind Settings
    // =====================================

    bindSettings: function () {

        const theme =
            document.getElementById(
                "profileThemeSelect"
            );

        const music =
            document.getElementById(
                "profileMusicSelect"
            );

        const programSound =
            document.getElementById(
                "profileProgramSoundSelect"
            );

        const notifications =
            document.getElementById(
                "profileNotificationsSelect"
            );

        const soundFeedback =
            document.getElementById(
                "profileSoundFeedbackSelect"
            );


        if (theme) {

            theme.onchange = function () {

                ProfileManager.updateSettings({

                    theme:
                        theme.value

                });

                ProfileScreen.showSettingsMessage(
                    "تنظیمات محیط ذخیره شد."
                );

            };

        }


        if (music) {

            music.onchange = function () {

                ProfileManager.updateSettings({

                    music:
                        music.value === "true"

                });

                ProfileScreen.showSettingsMessage(
                    "تنظیمات موسیقی ذخیره شد."
                );

            };

        }


        if (programSound) {

            programSound.onchange = function () {

                ProfileManager.updateSettings({

                    programSound:
                        programSound.value === "true"

                });

                ProfileScreen.showSettingsMessage(
                    "تنظیمات صدای برنامه ذخیره شد."
                );

            };

        }


        if (notifications) {

            notifications.onchange = function () {

                ProfileManager.updateSettings({

                    notifications:
                        notifications.value === "true"

                });

                ProfileScreen.showSettingsMessage(
                    "تنظیمات اعلان‌ها ذخیره شد."
                );

            };

        }


        if (soundFeedback) {

            soundFeedback.onchange = function () {

                ProfileManager.updateSettings({

                    soundFeedback:
                        soundFeedback.value === "true"

                });

                ProfileScreen.showSettingsMessage(
                    "تنظیمات بازخورد صوتی ذخیره شد."
                );

            };

        }

    },


    // =====================================
    // Settings Message
    // =====================================

    showSettingsMessage: function (
        message
    ) {

        const box =
            document.getElementById(
                "settingsMessage"
            );

        if (!box) {

            return;

        }

        box.innerHTML =
            message;

        setTimeout(
            function () {

                if (box) {

                    box.innerHTML = "";

                }

            },
            1500
        );

    },


    // =====================================
    // Show Profiles
    // =====================================

    showProfiles: function () {

        const app =
            document.getElementById("app");

        if (!app) {

            return;

        }

        const profiles =
            ProfileManager.getAll();

        const activeProfile =
            ProfileManager.get();


        app.innerHTML = `

<div class="screen profiles-screen">

    <h1>
        👥 پروفایل‌های دانش‌آموزان
    </h1>

    <p>
        پروفایل دانش‌آموز موردنظر را انتخاب کنید.
    </p>

    <hr>

    <div class="profiles-list">

        ${
            profiles.map(
                function (profile) {

                    const active =
                        activeProfile &&
                        activeProfile.studentId ===
                        profile.studentId;

                    return `

<div class="profile-select-card">

    <h2>

        ${
            active
            ? "⭐ "
            : ""
        }

        ${profile.name}

    </h2>

    <p>

        🎓 ${
            ProfileScreen.getGradeTitle(
                profile.grade
            )
        }

    </p>

    <p>

        📅 ${
            ProfileScreen.formatDate(
                profile.createdAt
            )
        }

    </p>


    ${
        active

        ?

        `

        <button
            type="button"
            disabled>

            ✓ پروفایل فعال

        </button>

        `

        :

        `

        <button
            type="button"
            data-profile-id="${
                profile.studentId
            }">

            ورود به این پروفایل

        </button>

        `

    }

</div>

                    `;

                }
            ).join("")

        }

    </div>


    <hr>


    <button
        id="newProfileFromListBtn"
        type="button">

        ➕ افزودن پروفایل جدید

    </button>


    <button
        id="backToProfileBtn"
        type="button">

        ↩ بازگشت

    </button>

</div>

        `;


        const buttons =
            document.querySelectorAll(
                "[data-profile-id]"
            );


        buttons.forEach(
            function (button) {

                button.onclick =
                    function () {

                        const studentId =
                            button.getAttribute(
                                "data-profile-id"
                            );

                        ProfileManager.switchProfile(
                            studentId
                        );


                        ProfileScreen.show();

                    };

            }
        );


        document
            .getElementById(
                "newProfileFromListBtn"
            )
            .onclick = function () {

                ProfileScreen.showCreate();

            };


        document
            .getElementById(
                "backToProfileBtn"
            )
            .onclick = function () {

                ProfileScreen.show();

            };


        console.log(
            "Profile List Displayed:",
            profiles
        );

    },


    // =====================================
    // Create Profile
    // =====================================

    showCreate: function () {

        const app =
            document.getElementById("app");

        if (!app) {

            return;

        }


        app.innerHTML = `

<div class="screen profile-create-screen">

    <h1>
        ➕ ایجاد پروفایل دانش‌آموز
    </h1>

    <p>
        برای هر دانش‌آموز یک پروفایل جداگانه بسازید.
    </p>

    <hr>


    <label
        for="newProfileName">

        نام دانش‌آموز

    </label>

    <br>

    <input
        id="newProfileName"
        type="text"
        placeholder="مثلاً محمد">

    <br><br>


    <label
        for="newProfileGrade">

        پایه

    </label>

    <br>

    <select
        id="newProfileGrade">

        <option value="">

            انتخاب پایه

        </option>

        ${
            this.buildGradeOptions(null)
        }

    </select>

    <br><br>


    <button
        id="saveNewProfileBtn"
        type="button">

        💾 ایجاد پروفایل

    </button>


    <button
        id="cancelNewProfileBtn"
        type="button">

        ❌ انصراف

    </button>


    <div
        id="profileCreateMessage">

    </div>

</div>

        `;


        document
            .getElementById(
                "saveNewProfileBtn"
            )
            .onclick = function () {

                const name =
                    document
                        .getElementById(
                            "newProfileName"
                        )
                        .value
                        .trim();


                const grade =
                    document
                        .getElementById(
                            "newProfileGrade"
                        )
                        .value;


                if (!name) {

                    ProfileScreen.showCreateMessage(
                        "لطفاً نام دانش‌آموز را وارد کنید.",
                        "error"
                    );

                    return;

                }


                if (!grade) {

                    ProfileScreen.showCreateMessage(
                        "لطفاً پایه دانش‌آموز را انتخاب کنید.",
                        "error"
                    );

                    return;

                }


                const profile =
                    ProfileManager.createProfile({

                        name: name,

                        grade: grade

                    });


                if (!profile) {

                    ProfileScreen.showCreateMessage(
                        "ایجاد پروفایل انجام نشد.",
                        "error"
                    );

                    return;

                }


                ProfileScreen.showCreateMessage(
                    "پروفایل با موفقیت ایجاد شد.",
                    "success"
                );


                setTimeout(
                    function () {

                        /*
                         * بعد از ایجاد پروفایل،
                         * پروفایل جدید فعال می‌شود.
                         *
                         * ورود به بخش آموزشی باید
                         * از مسیر ActivationGate انجام شود.
                         */

                        if (
                            typeof ActivationGate !==
                            "undefined"
                        ) {

                            ActivationGate.open();

                        } else {

                            ProfileScreen.show();

                        }

                    },
                    500
                );

            };


        document
            .getElementById(
                "cancelNewProfileBtn"
            )
            .onclick = function () {

                ProfileScreen.showProfiles();

            };

    },


    // =====================================
    // Edit Profile
    // =====================================

    showEdit: function () {

        const app =
            document.getElementById("app");

        const profile =
            ProfileManager.get();

        if (!app || !profile) {

            return;

        }


        app.innerHTML = `

<div class="screen profile-edit-screen">

    <h1>
        ✏ ویرایش پروفایل
    </h1>

    <hr>


    <label
        for="profileNameInput">

        نام دانش‌آموز

    </label>

    <br>

    <input
        id="profileNameInput"
        type="text"
        value="${
            profile.name || ""
        }"
        placeholder="نام دانش‌آموز">

    <br><br>


    <label
        for="profileGradeSelect">

        پایه

    </label>

    <br>

    <select
        id="profileGradeSelect">

        ${
            this.buildGradeOptions(
                profile.grade
            )
        }

    </select>

    <br><br>


    <div class="profile-edit-warning">

        ⚠ تغییر پایه، پایه آموزشی همین پروفایل را تغییر می‌دهد.
        پس از ذخیره، مجوز پایه جدید بررسی خواهد شد.

    </div>

    <br>


    <button
        id="saveProfileBtn"
        type="button">

        💾 ذخیره تغییرات

    </button>


    <button
        id="cancelProfileBtn"
        type="button">

        ❌ انصراف

    </button>


    <div
        id="profileMessage">

    </div>

</div>

        `;


        document
            .getElementById(
                "saveProfileBtn"
            )
            .onclick = function () {

                const nameInput =
                    document.getElementById(
                        "profileNameInput"
                    );

                const gradeSelect =
                    document.getElementById(
                        "profileGradeSelect"
                    );


                const name =
                    nameInput.value.trim();


                const grade =
                    gradeSelect.value || null;


                if (!name) {

                    ProfileScreen.showMessage(
                        "لطفاً نام دانش‌آموز را وارد کنید.",
                        "error"
                    );

                    return;

                }


                if (!grade) {

                    ProfileScreen.showMessage(
                        "لطفاً پایه دانش‌آموز را انتخاب کنید.",
                        "error"
                    );

                    return;

                }


                const oldGrade =
                    profile.grade;


                ProfileManager.update({

                    name: name,

                    grade: grade

                });


                if (
                    oldGrade !== grade
                ) {

                    ProfileScreen.showMessage(
                        "پروفایل ذخیره شد. مجوز پایه جدید بررسی می‌شود.",
                        "success"
                    );


                    setTimeout(
                        function () {

                            if (
                                typeof ActivationGate !==
                                "undefined"
                            ) {

                                ActivationGate.open();

                            } else {

                                ProfileScreen.show();

                            }

                        },
                        500
                    );

                    return;

                }


                ProfileScreen.showMessage(
                    "پروفایل با موفقیت ذخیره شد.",
                    "success"
                );


                setTimeout(
                    function () {

                        ProfileScreen.show();

                    },
                    500
                );

            };


        document
            .getElementById(
                "cancelProfileBtn"
            )
            .onclick = function () {

                ProfileScreen.show();

            };

    },


    // =====================================
    // Grade Options
    // =====================================

    buildGradeOptions: function (
        selectedGrade
    ) {

        if (
            typeof grades ===
            "undefined"
        ) {

            return "";

        }


        return grades.map(
            function (grade) {

                const selected =
                    grade.id ===
                    selectedGrade
                    ?
                    "selected"
                    :
                    "";


                return `

<option
    value="${grade.id}"
    ${selected}>

    ${grade.title}

</option>

                `;

            }
        ).join("");

    },


    // =====================================
    // Grade Title
    // =====================================

    getGradeTitle: function (
        gradeId
    ) {

        if (!gradeId) {

            return "انتخاب نشده";

        }


        if (
            typeof grades ===
            "undefined"
        ) {

            return gradeId;

        }


        const grade =
            grades.find(
                function (item) {

                    return (
                        item.id ===
                        gradeId
                    );

                }
            );


        if (!grade) {

            return gradeId;

        }


        return grade.title;

    },


    // =====================================
    // Date
    // =====================================

    formatDate: function (
        date
    ) {

        if (!date) {

            return "نامشخص";

        }


        const value =
            new Date(date);


        if (
            isNaN(
                value.getTime()
            )
        ) {

            return "نامشخص";

        }


        return value.toLocaleDateString(
            "fa-IR"
        );

    },


    // =====================================
    // Message
    // =====================================

    showMessage: function (
        message,
        type
    ) {

        const box =
            document.getElementById(
                "profileMessage"
            );


        if (!box) {

            return;

        }


        box.innerHTML =
            message;


        box.className =
            type || "";

    },


    // =====================================
    // Create Message
    // =====================================

    showCreateMessage: function (
        message,
        type
    ) {

        const box =
            document.getElementById(
                "profileCreateMessage"
            );


        if (!box) {

            return;

        }


        box.innerHTML =
            message;


        box.className =
            type || "";

    }

};


// =====================================
// Global Access
// =====================================

window.ProfileScreen =
    ProfileScreen;


// =====================================
// Ready
// =====================================

console.log(
    "Profile Screen v5.0 Ready"
);