// =====================================
// Tahouri Edu Platform
// Content Lock Manager
// Version 2.0
// Profile Scoped Persistent Lock System
// Async initialization synchronization
// Profile-scoped legacy migration
// Unknown activities locked by default
// Open-by-default records remain authoritative
// Supports wrapped JSON content format
// =====================================

const ContentLockManager = {

    lockedContents: {},
    defaultLocks: {},

    BASE_STORAGE_KEY: "Tahouri_ContentLocks",
    LEGACY_ARCHIVE_KEY: "Tahouri_ContentLocks_LegacyArchive_v1",
    LEGACY_MIGRATION_STATE_KEY: "Tahouri_ContentLocks_LegacyMigrationState_v1",

    currentStorageKey: null,
    ready: false,
    readyPromise: null,

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

        const manager = this;

        this.ready = false;
        this.readyPromise = this.loadLocks().finally(function () {
            manager.ready = true;
        });

        return this.readyPromise;
    },

    bindProfileContext: function () {
        if (
            typeof EventManager === "undefined" ||
            typeof EventManager.on !== "function"
        ) {
            return;
        }

        EventManager.on("profileChanged", function () {
            ContentLockManager.currentStorageKey = null;
            ContentLockManager.ready = false;
            ContentLockManager.applyProfileLocks();
            ContentLockManager.ready = true;
        });
    },

    loadLocks: async function () {
        try {
            const response = await fetch("data/contentLocks.json", {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(
                    "Content Locks File Load Failed: " + response.status
                );
            }

            const data = await response.json();

            // GitHub/file handling may expose the JSON file in the wrapped form:
            // { "content": "[...]", "encoding": "utf-8" }
            // The actual application data is inside `content` in that case.
            let lockData = data;

            if (
                data &&
                !Array.isArray(data) &&
                typeof data.content === "string"
            ) {
                try {
                    lockData = JSON.parse(data.content);
                }
                catch (parseError) {
                    console.error(
                        "Wrapped Content Locks JSON Parse Error",
                        parseError
                    );
                    lockData = [];
                }
            }

            this.defaultLocks = {};

            if (Array.isArray(lockData)) {
                lockData.forEach(function (item) {
                    if (item && item.id) {
                        ContentLockManager.defaultLocks[item.id] =
                            item.locked === true;
                    }
                });
            }

            this.applyProfileLocks();
            this.bindProfileContext();

            console.log(
                "Content Locks Loaded",
                this.lockedContents
            );

            return true;
        }
        catch (error) {
            console.error("Content Lock Load Error", error);
            this.applyProfileLocks();
            this.bindProfileContext();
            return false;
        }
    },

    migrateLegacyLocks: function () {
        // An unscoped legacy payload has no reliable student owner. Never
        // attach it to whichever profile happens to be active at startup.
        // Preserve it for an authenticated recovery decision instead.
        if (localStorage.getItem(this.LEGACY_MIGRATION_STATE_KEY)) return;

        const legacy = localStorage.getItem(this.BASE_STORAGE_KEY);
        if (legacy === null) return;

        try {
            const archived = localStorage.getItem(this.LEGACY_ARCHIVE_KEY);
            if (archived === null) {
                localStorage.setItem(this.LEGACY_ARCHIVE_KEY, legacy);
            } else if (archived !== legacy) {
                localStorage.setItem(
                    this.LEGACY_MIGRATION_STATE_KEY,
                    JSON.stringify({
                        version: 1,
                        status: "archive_conflict",
                        reason: "existing_archive_differs_from_legacy_source"
                    })
                );
                return;
            }

            let status = "quarantined";
            let reason = "legacy_owner_unverified";
            try {
                const legacyLocks = JSON.parse(legacy);
                if (!legacyLocks || typeof legacyLocks !== "object" || Array.isArray(legacyLocks)) {
                    status = "invalid_legacy_data";
                    reason = "legacy_payload_must_be_an_object";
                }
            } catch (_) {
                status = "invalid_legacy_data";
                reason = "legacy_payload_is_not_valid_json";
            }

            // The source and archive remain untouched. A later profile must
            // not consume this payload until ownership is explicitly proven.
            localStorage.setItem(
                this.LEGACY_MIGRATION_STATE_KEY,
                JSON.stringify({ version: 1, status: status, reason: reason })
            );
        } catch (error) {
            // If archival/decision persistence fails, leave the source intact
            // and retry on a later initialization; never guess an owner.
            console.error("Legacy Content Locks Quarantine Error", error);
        }
    },
    applyProfileLocks: function () {
        const key = this.getStorageKey();

        this.lockedContents = {
            ...this.defaultLocks
        };
        this.currentStorageKey = key;

        if (!key) return;

        this.migrateLegacyLocks(key);

        try {
            const savedLocks = localStorage.getItem(key);

            if (!savedLocks) return;

            const parsedLocks = JSON.parse(savedLocks);

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

            // The content-lock definition is the source of truth for activities
            // explicitly declared as open. This prevents stale profile data from
            // keeping an activity locked after its default was changed to unlocked.
            Object.keys(this.defaultLocks).forEach(function (id) {
                if (ContentLockManager.defaultLocks[id] === false) {
                    ContentLockManager.lockedContents[id] = false;
                }
            }, this);
        }
        catch (error) {
            console.error("Saved Content Locks Parse Error", error);
        }
    },

    waitUntilReady: function () {
        return this.readyPromise || Promise.resolve(this.ready);
    },

    saveLocks: function () {
        const key = this.getStorageKey();

        if (!key) return false;

        this.currentStorageKey = key;

        try {
            localStorage.setItem(
                key,
                JSON.stringify(this.lockedContents)
            );
            return true;
        }
        catch (error) {
            console.error("Content Lock Save Error", error);
            return false;
        }
    },

    ensureCurrentProfile: function () {
        const key = this.getStorageKey();

        if (key !== this.currentStorageKey) {
            this.applyProfileLocks();
        }

        return !!key;
    },

    PARITY_PROGRESSION_KEY: "Tahouri_EvenOddProgression_v2",

    getParityProgressionIds: function () {
        return [
            "evenOdd",
            "parityTrain",
            "matchingManyToOne",
            "parityDiscoveryWorkshop",
            "evenOddSum"
        ];
    },

    isProgressionActivity: function (contentId) {
        return this.getParityProgressionIds().indexOf(contentId) !== -1;
    },

    getProgressionStorageKey: function () {
        if (typeof ProfileContext === "undefined" || typeof ProfileContext.key !== "function") {
            return null;
        }
        return ProfileContext.key(this.PARITY_PROGRESSION_KEY);
    },

    getProgressionState: function () {
        const key = this.getProgressionStorageKey();
        if (!key) return { unlocked: [] };
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || "{}");
            const allowed = this.getParityProgressionIds();
            const unlocked = Array.isArray(parsed.unlocked)
                ? parsed.unlocked.filter(function (id) { return allowed.indexOf(id) !== -1; })
                : [];
            if (unlocked.indexOf("evenOdd") === -1) unlocked.unshift("evenOdd");
            return { unlocked: unlocked };
        } catch (error) {
            console.error("Parity Progression State Parse Error", error);
            return { unlocked: ["evenOdd"] };
        }
    },

    recordProgressionResult: function (activityId, percentage) {
        const ids = this.getParityProgressionIds();
        const index = ids.indexOf(activityId);
        const score = Number(percentage);
        if (index < 0 || !Number.isFinite(score) || score < 80) return false;

        const key = this.getProgressionStorageKey();
        if (!key) return false;
        const state = this.getProgressionState();
        if (state.unlocked.indexOf(activityId) === -1) return false;

        const nextId = ids[index + 1];
        if (!nextId || state.unlocked.indexOf(nextId) !== -1) return true;
        state.unlocked.push(nextId);
        try {
            localStorage.setItem(key, JSON.stringify(state));
            console.log("Parity Progression Unlocked:", { completed: activityId, next: nextId, percentage: score });
            return true;
        } catch (error) {
            console.error("Parity Progression Save Error", error);
            return false;
        }
    },

    isLocked: function (contentId) {
        if (this.isProgressionActivity(contentId)) {
            if (contentId === "evenOdd") return false;
            return this.getProgressionState().unlocked.indexOf(contentId) === -1;
        }

        if (!contentId) return true;

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
        if (!contentId || !this.ensureCurrentProfile()) return false;

        this.lockedContents[contentId] = true;
        return this.saveLocks();
    },

    unlock: function (contentId) {
        if (!contentId || !this.ensureCurrentProfile()) return false;

        this.lockedContents[contentId] = false;
        return this.saveLocks();
    },

    canOpen: function (contentId) {
        return !this.isLocked(contentId);
    },

    hasLockRecord: function (contentId) {
        if (!contentId) return false;

        this.ensureCurrentProfile();

        return Object.prototype.hasOwnProperty.call(
            this.lockedContents,
            contentId
        );
    },

    ensureLocked: function (contentId) {
        if (!contentId || !this.ensureCurrentProfile()) return false;

        if (!this.hasLockRecord(contentId)) {
            this.lockedContents[contentId] = true;
            this.saveLocks();
            return true;
        }

        return false;
    },

    reset: function (contentId) {
        if (!contentId || !this.ensureCurrentProfile()) return false;

        this.lockedContents[contentId] = true;
        return this.saveLocks();
    },

    resetAll: function () {
        if (!this.ensureCurrentProfile()) return false;

        Object.keys(this.lockedContents).forEach(function (id) {
            ContentLockManager.lockedContents[id] = true;
        });

        ContentLockManager.lockedContents["evenOdd"] = false;

        return ContentLockManager.saveLocks();
    }
};

window.ContentLockManager = ContentLockManager;

ContentLockManager.init();

console.log("Content Lock Manager Ready");
