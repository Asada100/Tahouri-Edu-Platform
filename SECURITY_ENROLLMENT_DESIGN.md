# Secure Student Enrollment Design

Date: 2026-11-15
Status: proposal only — no runtime changes authorized by this document

## 1. Objective

Prevent an untrusted browser, APK, EXE, modified client, or scripted caller from creating arbitrary student identities or claiming an existing student's identity merely by supplying a student ID, name, grade, or an HTTP Origin header.

The device is not an identity authority. Origin is a browser boundary, not proof of student identity. A shared secret embedded in a client is extractable and is not an enrollment credential.

## 2. Current behavior observed on master

- `POST /api/students/register` requires an allowed Origin and rate-limits by Cloudflare client IP (30 attempts/minute).
- For an unknown student ID, the endpoint creates an active `student_accounts` row from client-supplied studentId, fullName, and gradeId.
- An Origin header can be supplied by a non-browser client; therefore Origin alone does not prove enrollment authority.
- Existing accounts reject mismatched name/grade and archived accounts cannot be reactivated by this endpoint.
- The admin panel already supports importing the existing profile export and manually creating a student account.
- Activation codes are generated with 12 random bytes (96 bits), stored as SHA-256 hashes, bound to studentId and grade, and consumed once.
- Activation attempts are rate-limited to 10 per minute per Cloudflare client IP using audit events. The activation route rejects a present but untrusted Origin; native clients may have no Origin and rely on the high-entropy one-time code.
- No production Worker, D1 database, secret, or student data was changed during this review.

## 3. Recommended baseline: administrator-provisioned student registry

Use the existing admin import workflow as the authority for student identity.

1. A parent/admin exports the existing Tahouri profile list from the trusted device.
2. The administrator imports that file through the authenticated admin panel.
3. The Worker creates or validates student registry rows only through authenticated admin operations.
4. The public client must not create a new student account. Its startup sync may only confirm that a profile is already provisioned.
5. Activation remains bound to the pre-provisioned studentId, grade, and one-time high-entropy activation code.
6. A missing account returns a generic enrollment-required response; it must not silently create an account.

This is the smallest safe first step because the admin import and student registry already exist. It avoids introducing a new credential delivery channel before one is designed.

## 4. Optional future self-enrollment: one-time enrollment proof

If administrator import is too burdensome, add a separate enrollment-invitation flow. Do not repurpose Origin or the activation code.

Required properties:
- Generate a cryptographically random token with at least 128 bits of entropy.
- Deliver it out-of-band by an administrator/parent workflow; never expose it in a public list endpoint.
- Store only a keyed hash or SHA-256 hash of the token; never store plaintext after issuance.
- Bind it to one studentId, gradeId, and intended enrollment operation.
- Give it a short expiry and a strict attempt limit.
- Consume it atomically with account creation; concurrent replay must allow at most one success.
- Do not permit a token to change an existing account's identity or reactivate an archived account.
- Audit issuance, failed attempts, consumption, expiry, and revocation without logging the token.
- Do not embed a universal enrollment secret in web, APK, or EXE clients.

## 5. API contract proposal

### Existing profile confirmation
- Keep a public confirmation endpoint only if client compatibility requires it.
- It must be read-only: look up an existing active registry row and compare the submitted profile fields.
- It must never INSERT a student account.
- Use a uniform failure response for unknown, archived, or mismatched records where practical, to reduce account enumeration.
- Rate-limit by trusted edge client IP and add per-student throttling where safe.

### Admin provisioning
- Keep imports and manual account creation behind a valid admin session.
- Validate duplicate IDs and conflicting name/grade values before writing.
- Preserve existing accounts and activation state; never overwrite or reactivate conflicts.
- Return counts and non-secret identifiers only.

### Activation
- Keep activation code one-time, high-entropy, hashed at rest, and bound to studentId and grade.
- Retain rate limiting and add monitoring/alerts for repeated failures and distributed attempts.
- Ensure code consumption, license creation, account activation, and audit are atomic on real D1.
- Do not treat a client-supplied installation ID as a strong hardware identity; it is a binding hint, not attestation.

## 6. Migration and rollout sequence

1. Export and verify a complete backup of existing student registry and activation data.
2. Compare every active local profile list against the server registry; resolve missing/conflicting IDs before enforcing admin provisioning.
3. Add tests proving public registration cannot create a row, cannot overwrite identity, and cannot reactivate archived accounts.
4. Update the client startup sync to treat an unprovisioned profile as a clear enrollment-required state, not as a fatal application error.
5. Test old and new clients against an isolated Worker and isolated D1 database.
6. Run concurrent registration and activation tests against real isolated D1.
7. Deploy to a non-production Worker first; verify admin import, existing accounts, activation, renewals, and rollback.
8. Only then consider production rollout, with a documented rollback that does not delete or rewrite student records.

## 7. Acceptance criteria

- A caller with a forged allowed Origin cannot create a student account.
- A caller without an enrollment proof cannot create or claim a new student account.
- Existing student IDs cannot be rebound to another name or grade.
- Archived accounts cannot be revived through public routes.
- Enrollment tokens, if introduced, are single-use under concurrency and are not recoverable from the database.
- Rate limits work across multiple Worker instances and are based on trusted edge metadata.
- Audit records contain no plaintext activation/enrollment secrets.
- Real D1 tests, browser tests, and native-client compatibility tests pass.
- No migration loses profiles, entitlements, activation codes, or student progress.

## 8. Explicit non-goals

- No shared secret embedded in the app.
- No reliance on CORS/Origin as user authentication.
- No automatic merging of student profiles.
- No touching student learning data or local progress during enrollment changes.
- No production deployment as part of this design document.

## 9. Decision required before implementation

The recommended initial mode is administrator-provisioned registry using the existing import workflow. Implementing that mode changes the current behavior for profiles that have not yet been imported. Before enforcement, all active student profiles must be inventoried and imported safely. If that operational requirement is unacceptable, choose the separate one-time enrollment invitation design instead.
