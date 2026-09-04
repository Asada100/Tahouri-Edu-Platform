// =====================================
// Tahouri Edu Platform
// Content Lock Manager
// Version 1.6
// Profile Scoped Persistent Lock System
// Legacy Lock Migration
// Unknown Activities Locked By Default
// =====================================

const ContentLockManager = {

    lockedContents: {},
    defaultLocks: {},

    BASE_STORAGE_KEY: "Tahouri_ContentLocks",
    MIGRATION_KEY: "Tahouri_ContentLocks_ProfileMigration_v1",

    currentStorageKey: null,

    getStorageKey: function () {

        if (
            typeof ProfileContext === "undefined" ||
            typeof ProfileContext.key !== "function"
        ) {
            return null;
        }

        return ProfileContext.key(this.BASE_STORAGE_KEY);

    },

    init: function () {

        console.log("Content Lock Manager Loading...");

        this.loadLocks();

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
                ContentLockManager.applyProfileLocks();
            }
        );

    },

    loadLocks: function () {

        fetch("data/contentLocks.json")
        .then(function (response) {

            if (!response.ok) {
                throw new Error(
                    "Content Locks File Load Failed: " + response.status
                );
            }

            return response.json();

        })
        .then(function (data) {

            ContentLockManager.defaultLocks = {};

            if (Array.isArray(data)) {

                data.forEach(function (item) {

                    if (item && item.id) {
                        ContentLockManager.defaultLocks[item.id] =
                            item.locked === true;
                    }

                });

            }

            ContentLockManager.applyProfileLocks();
            ContentLockManager.bindProfileContext();

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

            ContentLockManager.applyProfileLocks();
            ContentLockManager.bindProfileContext();

        });

    },

    migrateLegacyLocks: function (profileKey) {

        if (!profileKey) return;

        if (
            localStorage.getItem(this.MIGRATION_KEY) === "true"
        ) return;

        const legacy =
            localStorage.getItem(this.BASE_STORAGE_KEY);

        if (!legacy) return;

        if (
            localStorage.getItem(profileKey) !== null
        ) {
            localStorage.setItem(this.MIGRATION_KEY, "true");
            return;
        }

        try {

            JSON.parse(legacy);

            localStorage.setItem(profileKey, legacy);
            localStorage.setItem(this.MIGRATION_KEY, "true");

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

    applyProfileLocks: function () {

        const key =
            this.getStorageKey();

        this.lockedContents = {
            ...this.defaultLocks
        };

        this.currentStorageKey = key;

        if (!key) {
            return;
        }

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

    ensureCurrentProfile: function () {

        const key =
            this.getStorageKey();

        if (key !== this.currentStorageKey) {
            this.applyProfileLocks();
        }

        return !!key;

    },

    isLocked: function (contentId) {

        if (!contentId) {
            return true;
        }

        this.ensureCurrentProfile();

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

        if (
            !contentId ||
            !this.ensureCurrentProfile()
        ) {
            return false;
        }

        this.lockedContents[contentId] = true;
        return this.saveLocks();

    },

    unlock: function (contentId) {

        if (
            !contentId ||
            !this.ensureCurrentProfile()
        ) {
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

        this.ensureCurrentProfile();

        return Object.prototype.hasOwnProperty.call(
            this.lockedContents,
            contentId
        );

    },

    ensureLocked: function (contentId) {

        if (!contentId || !this.ensureCurrentProfile()) {
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

        if (!contentId || !this.ensureCurrentProfile()) {
            return false;
        }

        this.lockedContents[contentId] = true;
        return this.saveLocks();

    },

    resetAll: function () {

        if (!this.ensureCurrentProfile()) {
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