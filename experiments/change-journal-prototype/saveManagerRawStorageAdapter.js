"use strict";

// Bridges SaveManager's explicit {ok, exists, value} contract to the
// transaction coordinator's exact-string contract (null means key absent).
function createSaveManagerRawStorageAdapter(saveManager) {
  if (!saveManager || typeof saveManager.readRaw !== "function" ||
      typeof saveManager.writeRaw !== "function" ||
      typeof saveManager.restoreRaw !== "function") {
    throw new TypeError("A SaveManager with raw storage methods is required.");
  }
  return Object.freeze({
    readRaw(key) {
      const snapshot = saveManager.readRaw(key);
      if (!snapshot || snapshot.ok !== true ||
          typeof snapshot.exists !== "boolean" ||
          (snapshot.exists && typeof snapshot.value !== "string")) {
        throw new Error("raw-storage-read-failed");
      }
      return snapshot.exists ? snapshot.value : null;
    },
    writeRaw(key, value) {
      return saveManager.writeRaw(key, value) === true;
    },
    restoreRaw(key, previousRaw) {
      if (previousRaw !== null && typeof previousRaw !== "string") return false;
      return saveManager.restoreRaw(key, {
        ok: true,
        exists: previousRaw !== null,
        value: previousRaw
      }) === true;
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createSaveManagerRawStorageAdapter };
}
