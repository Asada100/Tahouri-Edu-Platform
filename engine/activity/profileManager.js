// =====================================
// Tahouri Edu Platform
// Version 4.2
// Profile Manager
// User Profile Core System
// =====================================


const ProfileManager = {


// =====================================
// Default Profile
// =====================================

profile: {

    name: "",

    grade: null,

    createdAt: null

},


// =====================================
// Initialize
// =====================================

init: function () {

    const savedProfile =
        localStorage.getItem(
            "Tahouri_Profile"
        );


    if (savedProfile) {

        try {

            this.profile =
                JSON.parse(
                    savedProfile
                );


            console.log(
                "Profile Loaded",
                this.profile
            );

        }

        catch (error) {

            console.error(
                "Profile Load Error",
                error
            );


            this.createDefault();

        }

    }

    else {

        this.createDefault();

    }

},


// =====================================
// Create Default Profile
// =====================================

createDefault: function () {

    this.profile = {

        name: "",

        grade: null,

        createdAt:
            new Date().toISOString()

    };


    this.save();


    console.log(
        "Default Profile Created"
    );

},


// =====================================
// Get Profile
// =====================================

get: function () {

    return {

        name:
            this.profile.name,

        grade:
            this.profile.grade,

        createdAt:
            this.profile.createdAt

    };

},


// =====================================
// Get Name
// =====================================

getName: function () {

    return (
        this.profile.name || ""
    );

},


// =====================================
// Get Grade
// =====================================

getGrade: function () {

    return (
        this.profile.grade || null
    );

},


// =====================================
// Check Profile
// =====================================

hasProfile: function () {

    return (

        typeof this.profile.name ===
        "string"

        &&

        this.profile.name.trim()
            .length > 0

    );

},


// =====================================
// Set Name
// =====================================

setName: function (name) {

    if (
        typeof name !==
        "string"
    ) {

        console.error(
            "Invalid Profile Name"
        );

        return false;

    }


    const cleanName =
        name.trim();


    if (
        cleanName.length === 0
    ) {

        console.error(
            "Profile Name Empty"
        );

        return false;

    }


    this.profile.name =
        cleanName;


    this.save();


    console.log(
        "Profile Name Updated",
        cleanName
    );


    return true;

},


// =====================================
// Set Grade
// =====================================

setGrade: function (gradeId) {

    if (
        gradeId === null ||

        typeof gradeId ===
        "undefined"
    ) {

        this.profile.grade =
            null;

    }

    else {

        this.profile.grade =
            gradeId;

    }


    this.save();


    console.log(
        "Profile Grade Updated",
        gradeId
    );


    return true;

},


// =====================================
// Update Profile
// =====================================

update: function (data) {

    if (
        !data ||

        typeof data !==
        "object"
    ) {

        console.error(
            "Invalid Profile Data"
        );

        return false;

    }


    if (
        typeof data.name ===
        "string"
    ) {

        const cleanName =
            data.name.trim();


        if (
            cleanName.length > 0
        ) {

            this.profile.name =
                cleanName;

        }

    }


    if (
        Object.prototype
            .hasOwnProperty
            .call(
                data,
                "grade"
            )
    ) {

        this.profile.grade =
            data.grade;

    }


    this.save();


    console.log(
        "Profile Updated",
        this.profile
    );


    return true;

},


// =====================================
// Save Profile
// =====================================

save: function () {

    try {

        localStorage.setItem(

            "Tahouri_Profile",

            JSON.stringify(
                this.profile
            )

        );


        console.log(
            "Profile Saved"
        );


        return true;

    }

    catch (error) {

        console.error(
            "Profile Save Error",
            error
        );


        return false;

    }

},


// =====================================
// Clear Profile
// =====================================

clear: function () {

    this.profile = {

        name: "",

        grade: null,

        createdAt:
            new Date().toISOString()

    };


    this.save();


    console.log(
        "Profile Cleared"
    );

}

};


// =====================================
// Initialize Profile Manager
// =====================================

ProfileManager.init();


// =====================================
// Global Access
// =====================================

window.ProfileManager =
    ProfileManager;


// =====================================
// Ready
// =====================================

console.log(
    "Profile Manager Ready"
);