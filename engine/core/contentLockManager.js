// =====================================
// Tahouri Edu Platform
// Content Lock Manager
// Version 1.5
// Profile Scoped Persistent Lock System
// Legacy Lock Migration
// Unknown Activities Locked By Default
// =====================================


const ContentLockManager = {

    lockedContents: {},

    BASE_STORAGE_KEY: "Tahouri_ContentLocks",

    MIGRATION_KEY: "Tahouri_ProfileScoped_Migration_v1",

    currentStorageKey: null,


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


    init: function () {

        console.log(
            "Content Lock Manager Loading..."
        );

        this.loadLocks();
        this.bindProfileContext();

    },


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
                ContentLockManager.currentStorageKey = null;
                ContentLockManager.loadLocks();
            }
        );

    },


    loadLocks: function () {

        fetch("data/contentLocks.json")
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

            ContentLockManager.lockedContents = defaults;
            ContentLockManager.currentStorageKey =
                ContentLockManager.getStorageKey();

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
            ContentLockManager.currentStorageKey =
                ContentLockManager.getStorageKey();
            ContentLockManager.loadSavedLocks();

        });

    },


    migrateLegacyLocks: function (profileKey) {

        if (!profileKey) {
            return;
        }

        if (
            localStorage.getItem(this.MIGRATION_KEY) === "true"
        ) {
            return;
        }

        const legacy =
            localStorage.getItem(this.BASE_STORAGE_KEY);

        if (!legacy) {
            return;
        }

        if (
            localStorage.getItem(profileKey) !== null
        ) {
            localStorage.setItem(
                this.MIGRATION_KEY,
                "true"
            );
            return;
        }

        try {

            JSON.parse(legacy);

            localStorage.setItem(
                profileKey,
                legacy
            );

            localStorage.setItem(
                this.MIGRATION_KEY,
                "true"
            );

            console.log(
                "Legacy Content Locks Migrated To Active Profile"
            );

        }
        catch (error) {

            console.error(
                "Legacy Content Locks Migration Error",
                error
            );

        }

    },


    loadSavedLocks: function () {

        const key =
            this.getStorageKey();

        if (!key) {

            console.warn(
                "Content Locks: No Active Profile"
            );

            return;

        }

        this.currentStorageKey = key;
        this.migrateLegacyLocks(key);

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


    saveLocks: function () {

        const key =
            this.getStorageKey();

        if (!key) {

            console.warn(
                "Content Locks: Save skipped, no active profile"
            );

            return false;

        }

        this.currentStorageKey = key;

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


    isLocked: function (contentId) {

        if (!contentId) {
            return true;
        }

        const currentKey =
            this.getStorageKey();

        if (
            currentKey &&
            currentKey !== this.currentStorageKey
        ) {
            this.loadLocks();
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


    lock: function (contentId) {

        if (!contentId || !this.getStorageKey()) {
            return false;
        }

        this.lockedContents[contentId] = true;
        return this.saveLocks();

    },


    unlock: function (contentId) {

        if (!contentId || !this.getStorageKey()) {
            return false;
        }

        this.lockedContents[contentId] = false;
        return this.saveLocks();

    },


    canOpen: function (contentId) {
        return !this.isLocked(contentId);
    },


    hasLockRecord: function (contentId) {

        if (!contentId) {
            return false;
        }

        return Object.prototype.hasOwnProperty.call(
            this.lockedContents,
            contentId
        );

    },


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


    reset: function (contentId) {

        if (!contentId || !this.getStorageKey()) {
            return false;
        }

        this.lockedContents[contentId] = true;
        return this.saveLocks();

    },


    resetAll: function () {

        if (!this.getStorageKey()) {
            return false;
        }

        Object.keys(this.lockedContents).forEach(function (id) {
            ContentLockManager.lockedContents[id] = true;
        });

        ContentLockManager.lockedContents["evenOdd"] = false;

        return ContentLockManager.saveLocks();

    }

};


window.ContentLockManager =
    ContentLockManager;


ContentLockManager.init();


console.log(
    "Content Lock Manager Ready"
);