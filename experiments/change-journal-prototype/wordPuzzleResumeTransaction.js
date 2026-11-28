"use strict";

// Experiment-only transaction coordinator. It is deliberately not wired into runtime.
// Raw storage adapters must preserve exact strings (null means absent).
async function executeWordPuzzleResumeTransaction(options) {
  const o = options || {};
  const fail = (reason, rollbackOk, extra) => ({ ok:false, reason, rollbackOk, ...(extra || {}) });
  if (!o.storage || !o.storage.readRaw || !o.storage.writeRaw || !o.storage.restoreRaw ||
      !o.publication || !o.publication.capture || !o.publication.publish || !o.publication.restore ||
      !o.prepareHost || !o.validate || typeof o.emitResumed !== "function" ||
      typeof o.storageKey !== "string" || !o.storageKey) return fail("invalid-contract", true);

  let previousRaw, previousRuntime, candidateHost = null;
  let writeAttempted = false, publicationAttempted = false, eventAttempted = false;
  try {
    previousRaw = o.storage.readRaw(o.storageKey);
    if (previousRaw !== null && typeof previousRaw !== "string") throw new Error("invalid-raw-storage-value");
    previousRuntime = await o.publication.capture();
    if (!o.validate(o.candidateSession)) return fail("invalid-session", true);
    candidateHost = await o.prepareHost(o.candidateSession.engineState);
    if (!candidateHost || typeof candidateHost.commit !== "function" ||
        typeof candidateHost.dispose !== "function") throw new Error("prepare-failed");

    const committedSession = { ...o.candidateSession, status:"active" };
    const serialized = JSON.stringify(committedSession);
    // Mark attempted before invoking: an adapter may mutate then return false or throw.
    writeAttempted = true;
    if (await o.storage.writeRaw(o.storageKey, serialized) !== true) throw new Error("storage-write-failed");
    const readBack = await o.storage.readRaw(o.storageKey);
    if (readBack !== serialized) throw new Error("storage-readback-mismatch");
    let parsed;
    try { parsed = JSON.parse(readBack); } catch (_) { throw new Error("storage-readback-malformed"); }
    if (!o.validate(parsed) || parsed.status !== "active" ||
        parsed.id !== committedSession.id || parsed.profileId !== committedSession.profileId) {
      throw new Error("storage-readback-invalid");
    }

    if (await candidateHost.commit() !== true) throw new Error("host-commit-failed");
    // Mark attempted before invoking: publication may partially mutate then fail.
    publicationAttempted = true;
    if (await o.publication.publish(committedSession, candidateHost) !== true) {
      throw new Error("publication-failed");
    }
    // Event delivery is post-commit and cannot be transactionally retracted.
    // Report delivery errors separately; never claim rollback after fan-out starts.
    eventAttempted = true;
    try {
      o.emitResumed(committedSession);
      return { ok:true, session:committedSession, eventCount:1, eventDeliveryError:null };
    } catch (eventError) {
      return { ok:true, session:committedSession, eventCount:null,
        eventDeliveryError:eventError && eventError.message || "event-delivery-failed" };
    }
  } catch (error) {
    let rollbackOk = true;
    if (publicationAttempted) {
      try { if (await o.publication.restore(previousRuntime) !== true) rollbackOk = false; }
      catch (_) { rollbackOk = false; }
    }
    if (candidateHost) {
      try { if (await candidateHost.dispose() !== true) rollbackOk = false; }
      catch (_) { rollbackOk = false; }
    }
    if (writeAttempted) {
      try {
        if (await o.storage.restoreRaw(o.storageKey, previousRaw) !== true ||
            await o.storage.readRaw(o.storageKey) !== previousRaw) rollbackOk = false;
      } catch (_) { rollbackOk = false; }
    }
    return fail(error && error.message || "transaction-failed", rollbackOk,
      { publicationAttempted, eventAttempted, rollbackFailed:!rollbackOk });
  }
}

if (typeof module !== "undefined" && module.exports) module.exports = { executeWordPuzzleResumeTransaction };
