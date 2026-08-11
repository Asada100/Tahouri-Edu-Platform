// =====================================
// Tahouri Edu Platform
// Version 4.1
// Profile Screen
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

        app.innerHTML = `

<div class="screen profile-screen">

    <h1>
        👤 پروفایل من
    </h1>

    <p>
        اطلاعات کاربر
    </p>

    <hr>

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

    <button
        id="editProfileBtn"
        type="button">

        ✏ ویرایش پروفایل

    </button>

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


        console.log(
            "Profile Screen Displayed"
        );

    },


    // =====================================
    // Edit Profile
    // =====================================

    showEdit: function () {

        const app =
            document.getElementById("app");

        const profile =
            ProfileManager.get();

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

        placeholder="نام خود را وارد کنید"

    >

    <br><br>

    <label
        for="profileGradeSelect">

        پایه

    </label>

    <br>

    <select
        id="profileGradeSelect">

        <option value="">

            انتخاب پایه

        </option>

        ${
            this.buildGradeOptions(
                profile.grade
            )
        }

    </select>

    <br><br>

    <button
        id="saveProfileBtn"
        type="button">

        💾 ذخیره

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


        // =====================================
        // Save
        // =====================================

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


                ProfileManager.update({

                    name: name,

                    grade: grade

                });


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


        // =====================================
        // Cancel
        // =====================================

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
    "Profile Screen Ready"
);