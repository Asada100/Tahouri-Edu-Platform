# Activation Policy Audit

Date: 2026-10-30
Branch: chore/cloudflare-worker-source-baseline

## Scope

Read-only comparison of the development Node API activation path, browser activation client, entitlement verifier, and the isolated Cloudflare D1 activation transaction prototype.

This is an audit artifact only. It does not enable an activation route, connect the transaction helper to the Worker, change any database, or deploy anything.

## Existing Node API policy

The development API in `services/license-api/server.js` currently:

1. Normalizes the supplied activation code and hashes it with SHA-256.
2. Looks up the code and checks its grade, allowed academic year (current or next), active status, and null `used_at`.
3. For next-year reservations, checks renewal mode (`promotion` or `repeat`), finds an active unexpired license for the supplied student ID, and enforces:
   - promotion: target grade is exactly current grade + 1;
   - repeat: target grade equals current grade.
4. Rejects an already-existing future reservation for the same product/student/grade/year.
5. Creates a signed entitlement containing license ID, product ID, academic year, grade scope, student ID, validity interval, installation binding, and entitlement version.
6. Persists license creation, code consumption, and audit event inside a SQLite `BEGIN IMMEDIATE` transaction.

The future-reservation lookup and grade progression checks occur before the transaction. The transaction rechecks that the code remains active, but does not recheck the selected current license or progression policy inside the transaction.

## Isolated D1 transaction prototype

`activation-transaction.js` improves persistence atomicity by using a single D1 batch:

- The code update is conditional on matching hash, product, grade, year, renewal mode, active status, and unused state.
- For future reservations, the update also requires the exact current license ID, student, grade, academic year, active status, and current validity interval.
- License insertion depends on the code having been consumed by that exact license ID and timestamp.
- Audit insertion depends on the matching license row existing.
- The unique partial index from migration 0003 prevents duplicate future reservations for a product/student/year, even when grade IDs differ.

The helper intentionally does **not** implement request validation, academic-year policy, promotion/repeat progression, identity authentication, installation ownership, entitlement construction, or cryptographic signing. Its caller must complete those checks and pass only validated values. It is not connected to the Worker.

## Findings and required decisions

| Area | Current evidence | Required before Worker activation |
|---|---|---|
| Product scope | Node API uses `PRODUCT_ID = tahouri-edu`; D1 helper hardcodes the same value. | Keep the product identifier centrally defined and test mismatches. |
| Code lookup | Node API hashes normalized code; D1 helper conditionally consumes a supplied hash. | Worker must derive the hash itself from the submitted code; never accept a client-supplied hash. |
| Code policy | Node API checks grade, year, renewal mode, status, and unused timestamp. | Repeat every check server-side before persistence; ensure the exact selected code row is the one consumed. |
| Student identity | `studentId` is supplied by the browser and syntax-validated; it is not authenticated by the Node activation route. | Decide and implement a trusted identity/profile binding model. A client-supplied ID alone is not proof of ownership. |
| Installation binding | Browser creates an ID in localStorage and sends it; server signs it into the entitlement. | Treat this as a client-provided identifier, not device attestation. Define recovery/reset and multi-device policy before relying on it. |
| Future renewal | Node checks current active license and promotion/repeat progression before its transaction. D1 helper rechecks exact current-license existence and validity, but not progression itself. | Worker caller must validate progression and current academic-year policy; test boundary conditions and stale/revoked current licenses. |
| Duplicate reservation | Node performs a pre-check; migration 0003 adds a unique partial index. | Ensure migration 0003 is applied to the intended D1 database before enabling the route. Preserve the unique constraint as the final concurrency guard. |
| Atomicity | Node wraps writes in SQLite transaction. D1 helper batches code consumption, license insertion, and audit. | Use the D1 batch helper only after all policy checks; verify all three change counts and map conflicts to safe API errors. |
| Entitlement signing | Node signs `JSON.stringify(claims)` using RSA-SHA256. | Port claim construction and byte-for-byte JSON serialization deliberately; verify WebCrypto interoperability with the pinned SPKI public key. |
| Entitlement contents | Node emits all required claims including `installationBinding` and `gradeScope`. | Enforce an explicit claim schema on the Worker and reject missing/extra or malformed fields according to a documented versioned policy. |
| Client verification | Verifier checks signature, product, version, license ID, dates, academic year, and student ID. | Also require and validate `gradeScope` and `installationBinding`; compare them to the active profile and local installation before accepting. |
| Client persistence order | `activateRemote` writes the envelope to the entitlement store before its later explicit completeness checks. | Validate every claim and binding first; persist only after all checks pass. |
| Immediate binding check | `activateRemote` checks grade scope and student ID when present, but does not immediately compare `installationBinding` with the local installation ID. | Add strict binding comparison before writing or accepting the entitlement. |
| Future response | For a future entitlement, `activateRemote` calls `initializeRemoteEntitlement()` but returns `valid: true` regardless of that call's boolean result. | Do not report success unless the stored future entitlement has passed signature, claim, profile, and installation checks. |
| Status/revocation | The client has a status call; status refresh currently clears the in-memory verified entitlement on an invalid result. | Port status semantics and revocation checks to the Worker before public activation is enabled. |

## Critical client-side acceptance gaps

The browser flow currently has three concrete acceptance-order issues:

1. `installationBinding` is not required by `verifyEnvelope` and is not compared during the immediate `activateRemote` response path.
2. `activateRemote` stores the signed envelope before checking its explicit product/version/required-field block.
3. For future renewals, the return value from `initializeRemoteEntitlement()` is ignored, yet the method returns `valid: true`.

These should be fixed and covered by browser-side tests before a production client can rely on remote activation. Server-side validation remains authoritative regardless of client checks.

## Safe implementation order

1. Define the trusted student/profile identity and installation-binding policy.
2. Define one versioned activation-policy function for current-year activation and next-year promotion/repeat.
3. Add tests for academic-year boundaries, grade progression, stale/revoked current licenses, mismatched identity, and installation binding.
4. Port entitlement claims and RSA signing to Worker WebCrypto and prove signature interoperability with the existing browser verifier.
5. Harden the browser acceptance order and add tests for the three gaps above.
6. Only then connect the validated policy to the D1 batch helper, on an isolated test Worker and test D1.
7. Keep production activation disabled until the isolated end-to-end tests pass and deployment is explicitly authorized.

## Safety status

- No Worker source changed.
- No activation endpoint enabled.
- No production Worker deployment.
- No production D1 writes.
- No PR merge.
