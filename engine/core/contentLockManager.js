// =====================================
// Tahouri Edu Platform
// Content Lock Manager
// Version 1.3
// Persistent Lock System
// Unknown Activities Locked By Default
// =====================================


const ContentLockManager = {


    // =====================================
    // Current Locks
    // =====================================

    lockedContents: {},


    // =====================================
    // Storage Key
    // =====================================

    storageKey:
        "Tahouri_ContentLocks",


    // =====================================
    // Initialize
    // =====================================

    init: function () {

        console.log(
            "Content Lock Manager Loading..."
        );


        this.loadLocks();

    },


    // =====================================
    // Load Locks
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

            // =============================
            // Reset Default State
            // =============================

            ContentLockManager.lockedContents =
                {};


            // =============================
            // Load Default Locks
            // =============================

            if (Array.isArray(data)) {

                data.forEach(function (item) {

                    if (
                        item &&
                        item.id
                    ) {

                        ContentLockManager.lockedContents[
                            item.id
                        ] =
                            item.locked === true;

                    }

                });

            }


            // =============================
            // Load Saved Locks
            // =============================

            const savedLocks =
                localStorage.getItem(
                    ContentLockManager.storageKey
                );


            if (savedLocks) {

                try {

                    const parsedLocks =
                        JSON.parse(
                            savedLocks
                        );


                    if (
                        parsedLocks &&
                        typeof parsedLocks ===
                        "object"
                    ) {

                        Object.keys(
                            parsedLocks
                        ).forEach(function (id) {

                            ContentLockManager.lockedContents[
                                id
                            ] =
                                parsedLocks[id] === true;

                        });

                    }


                    console.log(
                        "Saved Content Locks Restored",
                        ContentLockManager.lockedContents
                    );

                }

                catch (error) {

                    console.error(
                        "Saved Content Locks Parse Error",
                        error
                    );

                }

            }


            // =============================
            // Final Status
            // =============================

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


        });

    },


    // =====================================
    // Save Locks
    // =====================================

    saveLocks: function () {

        try {

            localStorage.setItem(

                this.storageKey,

                JSON.stringify(
                    this.lockedContents
                )

            );


            console.log(
                "Content Locks Saved",
                this.lockedContents
            );

        }

        catch (error) {

            console.error(
                "Content Lock Save Error",
                error
            );

        }

    },


    // =====================================
    // Check Lock
    // IMPORTANT:
    // Unknown Activity = LOCKED
    // =====================================

    isLocked: function (contentId) {

        if (!contentId) {

            return true;

        }


        // =================================
        // Explicitly Stored Lock
        // =================================

        if (
            Object.prototype.hasOwnProperty.call(
                this.lockedContents,
                contentId
            )
        ) {

            return (
                this.lockedContents[
                    contentId
                ] === true
            );

        }


        // =================================
        // Unknown Activity
        // Locked By Default
        // =================================

        return true;

    },


    // =====================================
    // Lock Content
    // =====================================

    lock: function (contentId) {

        if (!contentId) {

            console.warn(
                "Cannot Lock: Invalid Content ID"
            );

            return false;

        }


        this.lockedContents[
            contentId
        ] = true;


        this.saveLocks();


        console.log(
            "Content Locked:",
            contentId
        );


        return true;

    },


    // =====================================
    // Unlock Content
    // =====================================

    unlock: function (contentId) {

        if (!contentId) {

            console.warn(
                "Cannot Unlock: Invalid Content ID"
            );

            return false;

        }


        this.lockedContents[
            contentId
        ] = false;


        this.saveLocks();


        console.log(
            "Content Unlocked:",
            contentId
        );


        return true;

    },


    // =====================================
    // Can Open
    // =====================================

    canOpen: function (contentId) {

        const locked =
            this.isLocked(
                contentId
            );


        if (locked) {

            console.log(
                "Content Is Locked:",
                contentId
            );


            return false;

        }


        return true;

    },


    // =====================================
    // Check Whether Lock Exists
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
    // Set Default Lock
    // =====================================

    ensureLocked: function (contentId) {

        if (!contentId) {

            return false;

        }


        if (
            !this.hasLockRecord(
                contentId
            )
        ) {

            this.lockedContents[
                contentId
            ] = true;


            this.saveLocks();


            console.log(
                "New Content Locked By Default:",
                contentId
            );


            return true;

        }


        return false;

    },


    // =====================================
    // Reset One Lock
    // =====================================

    reset: function (contentId) {

        if (!contentId) {

            return false;

        }


        this.lockedContents[
            contentId
        ] = true;


        this.saveLocks();


        console.log(
            "Content Lock Reset:",
            contentId
        );


        return true;

    },


    // =====================================
    // Reset All Locks
    // =====================================

    resetAll: function () {

        Object.keys(
            this.lockedContents
        ).forEach(function (id) {

            ContentLockManager.lockedContents[
                id
            ] = true;

        });


        // =================================
        // Keep evenOdd Open
        // =================================

        ContentLockManager.lockedContents[
            "evenOdd"
        ] = false;


        ContentLockManager.saveLocks();


        console.log(
            "All Content Locks Reset"
        );


        console.log(
            "Current Locks:",
            ContentLockManager.lockedContents
        );

    }

};


// =====================================
// Global Access
// =====================================

window.ContentLockManager =
    ContentLockManager;


// =====================================
// Initialize
// =====================================

ContentLockManager.init();


// =====================================
// Ready
// =====================================

console.log(
    "Content Lock Manager Ready"
);