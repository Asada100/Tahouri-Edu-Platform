// =====================================
// Tahouri Edu Platform
// Content Lock Manager
// Version 1.4
// Profile Scoped Persistent Lock System
// Unknown Activities Locked By Default
// =====================================


const ContentLockManager = {

    lockedContents: {},

    BASE_STORAGE_KEY: "Tahouri_ContentLocks",


    // =====================================
    // PROFILE STORAGE KEY
    // =====================================

    getStorageKey: function () {

        if (
            typeof ProfileContext === "undefined" ||
            typeof ProfileContext.key !== "function"
        ) {

            return null;

        }

        return ProfileContext.key(
            this.BASE_STORAGE_KEY
        );

    },


    // =====================================
    // INITIALIZE
    // =====================================

    init: function () {

        console.log(
            "Content Lock Manager Loading..."
        );

        this.loadLocks();
        this.bindProfileContext();

    },


    // =====================================
    // PROFILE CHANGE
    // =====================================

    bindProfileContext: function () {

        if (
            typeof EventManager === "undefined" ||
            typeof EventManager.on !== "function"
        ) {

            return;

        }

        EventManager.on(
            "profileChanged",
            function () {
                ContentLockManager.loadLocks();
            }
        );

    },


    // =====================================
    // LOAD LOCKS
    // =====================================

    loadLocks: function () {

        fetch(
            "data/contentLocks.json"
        )
        .then(function (response) {

            if (!response.ok) {

                throw new Error(
                    "Content Locks File Load Failed: " +
                    response.status
                );

            }

            return response.json();

        })
        .then(function (data) {

            const defaults = {};

            if (Array.isArray(data)) {

                data.forEach(function (item) {

                    if (item && item.id) {

                        defaults[item.id] =
                            item.locked === true;

                    }

                });

            }

            ContentLockManager.lockedContents =
                defaults;

            ContentLockManager.loadSavedLocks();

            console.log(
                "Content Locks Loaded",
                ContentLockManager.lockedContents
            );

        })
        .catch(function (error) {

            console.error(
                "Content Lock Load Error",
                error
            );

            ContentLockManager.lockedContents = {};

            ContentLockManager.loadSavedLocks();

        });

    },


    // =====================================
    // LOAD PROFILE-SCOPED SAVED LOCKS
    // =====================================

    loadSavedLocks: function () {

        const key =
            this.getStorageKey();

        if (!key) {

            console.warn(
                "Content Locks: No Active Profile"
            );

            return;

        }

        try {

            const savedLocks =
                localStorage.getItem(key);

            if (!savedLocks) {
                return;
            }

            const parsedLocks =
                JSON.parse(savedLocks);

            if (
                parsedLocks &&
                typeof parsedLocks === "object" &&
                !Array.isArray(parsedLocks)
            ) {

                Object.keys(parsedLocks).forEach(function (id) {

                    ContentLockManager.lockedContents[id] =
                        parsedLocks[id] === true;

                });

            }

        }
        catch (error) {

            console.error(
                "Saved Content Locks Parse Error",
                error
            );

        }

    },


    // =====================================
    // SAVE LOCKS
    // =====================================

    saveLocks: function () {

        const key =
            this.getStorageKey();

        if (!key) {

            console.warn(
                "Content Locks: Save skipped, no active profile"
            );

            return false;

        }

        try {

            localStorage.setItem(
                key,
                JSON.stringify(this.lockedContents)
            );

            return true;

        }
        catch (error) {

            console.error(
                "Content Lock Save Error",
                error
            );

            return false;

        }

    },


    // =====================================
    // CHECK LOCK
    // Unknown Activity = LOCKED
    // =====================================

    isLocked: function (contentId) {

        if (!contentId) {
            return true;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                this.lockedContents,
                contentId
            )
        ) {

            return this.lockedContents[contentId] === true;

        }

        return true;

    },


    // =====================================
    // LOCK
    // =====================================

    lock: function (contentId) {

        if (!contentId) {
            return false;
        }

        if (!this.getStorageKey()) {
            return false;
        }

        this.lockedContents[contentId] = true;
        this.saveLocks();

        return true;

    },


    // =====================================
    // UNLOCK
    // =====================================

    unlock: function (contentId) {

        if (!contentId) {
            return false;
        }

        if (!this.getStorageKey()) {
            return false;
        }

        this.lockedContents[contentId] = false;
        this.saveLocks();

        return true;

    },


    // =====================================
    // CAN OPEN
    // =====================================

    canOpen: function (contentId) {

        return !this.isLocked(contentId);

    },


    // =====================================
    // LOCK RECORD
    // =====================================

    hasLockRecord: function (contentId) {

        if (!contentId) {
            return false;
        }

        return Object.prototype.hasOwnProperty.call(
            this.lockedContents,
            contentId
        );

    },


    // =====================================
    // ENSURE LOCKED
    // =====================================

    ensureLocked: function (contentId) {

        if (!contentId) {
            return false;
        }

        if (!this.hasLockRecord(contentId)) {

            this.lockedContents[contentId] = true;
            this.saveLocks();
            return true;

        }

        return false;

    },


    // =====================================
    // RESET ONE
    // =====================================

    reset: function (contentId) {

        if (!contentId) {
            return false;
        }

        if (!this.getStorageKey()) {
            return false;
        }

        this.lockedContents[contentId] = true;
        this.saveLocks();

        return true;

    },


    // =====================================
    // RESET ALL
    // =====================================

    resetAll: function () {

        if (!this.getStorageKey()) {
            return false;
        }

        Object.keys(this.lockedContents).forEach(function (id) {
            ContentLockManager.lockedContents[id] = true;
        });

        ContentLockManager.lockedContents["evenOdd"] = false;

        ContentLockManager.saveLocks();

        return true;

    }

};


window.ContentLockManager =
    ContentLockManager;


ContentLockManager.init();


console.log(
    "Content Lock Manager Ready"
);