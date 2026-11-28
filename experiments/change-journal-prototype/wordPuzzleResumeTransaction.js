"use strict";

// Experiment-only transaction coordinator. It is deliberately not wired into runtime.
// storage.readRaw/writeRaw/restoreRaw must preserve exact strings (null means absent).
async function executeWordPuzzleResumeTransaction(options) {
  const o = options || {};
  const fail = (reason, rollbackOk, extra) => ({ ok: false, reason, rollbackOk, ...(extra || {}) });
  if (!o.storage || !o.storage.readRaw || !o.storage.writeRaw || !o.storage.restoreRaw ||
      !o.publication || !o.publication.capture || !o.publication.publish || !o.publication.restore ||
      !o.prepareHost || !o.validate || typeof o.emitResumed !== "function" ||
      typeof o.storageKey !== "string" || !o.storageKey) {
    return fail("invalid-contract", true);
  }

  let previousRaw, previousRuntime, candidateHost = null;
  let storageChanged = false, hostCommitted = false, published = false;
  try {
    previousRaw = o.storage.readRaw(o.storageKey);
    previousRuntime = o.publication.capture();
    if (!o.validate(o.candidateSession)) return fail("invalid-session", true);
    candidateHost = await o.prepareHost(o.candidateSession.engineState);
    if (!candidateHost || typeof candidateHost.commit !== "function" ||
        typeof candidateHost.dispose !== "function") return fail("prepare-failed", true);

    const committedSession = { ...o.candidateSession, status: "active" };
    const serialized = JSON.stringify(committedSession);
    if (o.storage.writeRaw(o.storageKey, serialized) !== true) throw new Error("storage-write-failed");
    storageChanged = true;
    const readBack = o.storage.readRaw(o.storageKey);
    if (readBack !== serialized) throw new Error("storage-readback-mismatch");
    let parsed;
    try { parsed = JSON.parse(readBack); } catch (_) { throw new Error("storage-readback-malformed"); }
    if (!o.validate(parsed) || parsed.status !== "active" ||
        parsed.id !== committedSession.id || parsed.profileId !== committedSession.profileId) {
      throw new Error("storage-readback-invalid");
    }

    if (await candidateHost.commit() !== true) throw new Error("host-commit-failed");
    hostCommitted = true;
    if (await o.publication.publish(committedSession, candidateHost) !== true) {
      throw new Error("publication-failed");
    }
    published = true;
    o.emitResumed(committedSession);
    return { ok: true, session: committedSession, eventCount: 1 };
  } catch (error) {
    let rollbackOk = true;
    if (published) {
      try { if (await o.publication.restore(previousRuntime) !== true) rollbackOk = false; }
      catch (_) { rollbackOk = false; }
    }
    if (candidateHost) {
      try { if (await candidateHost.dispose() !== true) rollbackOk = false; }
      catch (_) { rollbackOk = false; }
    }
    if (storageChanged) {
      try {
        if (o.storage.restoreRaw(o.storageKey, previousRaw) !== true ||
            o.storage.readRaw(o.storageKey) !== previousRaw) rollbackOk = false;
      } catch (_) { rollbackOk = false; }
    }
    return fail(error && error.message ? error.message : "transaction-failed", rollbackOk,
      { hostCommitted, published });
  }
}

if (typeof module !== "undefined" && module.exports) module.exports = { executeWordPuzzleResumeTransaction };
