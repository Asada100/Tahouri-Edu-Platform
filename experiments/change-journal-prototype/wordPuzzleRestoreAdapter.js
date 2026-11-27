"use strict";

// Isolated adapter prototype for the active WordPuzzleEngine.restoreSession path.
// It prepares on a shadow instance so the live engine and lifecycle events remain untouched.
function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function prepareWordPuzzleRestore(engine, saved) {
  if (!engine || typeof engine.restoreSession !== "function") return null;
  if (!saved || saved.kind !== "wordPuzzle" || !saved.state || !saved.round) return null;

  const previous = {
    activity: clone(engine.activity),
    state: clone(engine.state),
    round: clone(engine.round)
  };

  const shadow = Object.create(engine);
  shadow.activity = clone(engine.activity);
  shadow.state = clone(engine.state);
  shadow.round = clone(engine.round);
  // The real restoreSession() calls emitReady(). Suppress that irreversible
  // lifecycle event while running the real method on the isolated shadow.
  shadow.emitReady = function () {};

  let restored;
  try {
    restored = shadow.restoreSession(clone(saved));
  } catch (_) {
    return null;
  }
  if (restored !== true || !shadow.activity || !shadow.state || !shadow.round) return null;

  const candidate = {
    activity: clone(shadow.activity),
    state: clone(shadow.state),
    round: clone(shadow.round)
  };
  let committed = false;
  let rolledBack = false;

  return Object.freeze({
    snapshot: clone(candidate),
    commit() {
      if (committed || rolledBack) return false;
      engine.activity = clone(candidate.activity);
      engine.state = clone(candidate.state);
      engine.round = clone(candidate.round);
      committed = true;
      return true;
    },
    rollback() {
      if (rolledBack) return true;
      if (committed) {
        engine.activity = clone(previous.activity);
        engine.state = clone(previous.state);
        engine.round = clone(previous.round);
      }
      rolledBack = true;
      return true;
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { prepareWordPuzzleRestore };
}
