# SMS-first device transfer and account activation

Status: Architecture approved for implementation planning; not production-ready.
Repository: `Asada100/Tahouri-Edu-Platform`
Working PR: #141 (`implementation/one-phone-one-pc`, Draft)
Safety boundary: isolated preview/test Worker and synthetic data only. No production Pages, Worker, D1, licenses, or student records may be changed without separate explicit approval.

## Product objective

A student or parent must be able to move Tahouri to a replacement device without administrator help, JSON copying, challenge construction, reinstalling the old device, or losing learning records.

The user-facing flow should resemble password recovery:

1. Open Tahouri on the new device.
2. Tap **Transfer device** (or **Recover access**).
3. Tahouri identifies the existing account and shows the already-verified phone in masked form.
4. Tap **Send code**. The server requests a six-digit OTP from an Iranian SMS provider.
5. Enter the code, preferably using OS SMS autofill where supported.
6. The server verifies the OTP and account/device eligibility, binds the new device's public key, and issues a signed entitlement.
7. Only after the new device is fully verified and usable may the old device slot be retired according to the one-phone/one-PC policy.

Target: the SMS should normally arrive within about 5–10 seconds, but delivery time depends on the provider and mobile network and must not be promised as a hard guarantee. The user should see a resend/help state if it is delayed.

## Architectural decisions

### 1. Separate user experience from security machinery

- The user sees one clear action, one OTP screen, and a success/failure result.
- Admin session, step-up, identity attestation, challenge IDs, nonces, JSON payloads, device proof-of-possession, signing, and audit work remain server-side.
- Never ask a student or parent to visit the admin panel or copy technical challenge data.
- Do not remove device cryptography. OTP proves control of the previously verified account phone; the new device still creates and retains its own non-extractable private key and proves possession before binding.

### 2. Account identity, registration, and contact methods

- Keep the login/guardian account separate from student profiles. One guardian account may own or manage multiple student profiles.
- Email address and mobile number are account-level contact methods, not student-profile fields. Do not add duplicate contact fields to every student row.
- Registration requires at least one of email or mobile number. The user may enter email only, mobile only, or both. Entering both is allowed but neither is individually mandatory.
- The registration form must state this rule explicitly: **"ایمیل یا شماره تلفن (حداقل یکی الزامی است؛ وارد کردن هر دو نیز امکان‌پذیر است)."**
- On submit, if both contact fields are empty, block registration and show: **"لطفاً حداقل یکی از دو روش ایمیل یا شماره تلفن را وارد کنید."** Enforce the same validation on the server; client-side validation alone is insufficient.
- Full name and educational grade are also required registration fields and must be visibly marked with an asterisk (*). Missing values must block registration with clear Persian validation messages.
- Other profile details are optional. They must not be marked required and must not block account creation; the user may add them later in a separate profile-completion step.
- Verify ownership of the selected contact method with a one-time code before treating it as verified. If both email and mobile are supplied, record both, but clearly track verification independently for each. The initial registration can proceed with one verified method; the second method remains optional until verified.
- Provide a shared OTP service with separate replaceable email and SMS delivery adapters. Email OTP must work without a phone number, and SMS OTP must work without an email address.
- Store normalized contact values and verification metadata at account level. Do not store OTP plaintext. A phone number may be shared by a guardian across multiple student profiles; do not impose uniqueness per student.
- Define account-level uniqueness/lookup rules carefully: one verified email must not ambiguously identify multiple guardian accounts. A shared guardian phone may resolve to one guardian account with multiple linked students, followed by student selection. Avoid account enumeration in all public responses.
- A contact method must not be silently changed during device transfer. Adding or changing email/phone requires ownership verification; loss of access to the old method uses a controlled recovery path.
- Existing accounts with no verified email or phone must have a secure enrollment/recovery path. Do not assume every legacy user already has a mobile number.
- Keep account identity independent from student ID, license ID, grade, and academic year. Resolve student/license context from server-side records after authentication or activation-code redemption.

### 3. OTP lifecycle

Initial policy for implementation and tests:
- Exactly six decimal digits, generated with a cryptographically secure random generator.
- Two-minute validity, one successful use only.
- Store only a keyed hash/HMAC of the OTP; never log the code.
- Maximum five verification attempts per challenge.
- Resend cooldown and rate limits by account, phone, installation, and IP/risk bucket.
- A new OTP invalidates the previous outstanding OTP for the same transfer operation.
- Responses must not reveal whether an arbitrary phone number or student account exists.
- Use constant-time comparison where applicable and consume the OTP atomically with the device-transfer authorization.
- Do not put OTPs in URLs, analytics, crash logs, audit payloads, or client persistent storage.

### 4. Transfer transaction and device limits

- The transfer request is bound to the exact license, student, grade, academic year, device class, and new installation.
- The new installation generates its device key locally and submits proof-of-possession after OTP verification.
- The server must enforce one active phone and one active computer slot per license.
- A phone transfer must not alter the computer slot; a computer transfer must not alter the phone slot.
- Do not revoke/replace the old active slot when the OTP is merely sent or verified. First complete proof-of-possession, entitlement signing, and a successful client acceptance.
- Make the final bind/retire operation atomic and idempotent. Replays, expired OTPs, wrong account context, and concurrent transfers must fail safely.
- Preserve student identity, license, learning progress, profiles, scores, and streaks.

### 5. SMS provider boundary

- Introduce a provider-neutral SMS interface in the server, e.g. `sendOtp(destination, template, correlationId)`.
- Provider credentials belong only in Worker/server secrets, never in Pages variables, source code, or the client.
- Implement a mock provider for CI and isolated tests first.
- Select an Iranian provider only after confirming API access, delivery reports, OTP/verification template support, sender-line requirements, pricing, and delivery to users whose phones filter promotional messages.
- Do not select a vendor or buy a line by assumption. The provider adapter must be replaceable without changing client flows or OTP business logic.


### Registration form contract — approved 2026-11-24

The registration screen has one clear required-information section and a separate optional profile-completion section. The minimum required fields are:

| Field | Required | Rule |
|---|---:|---|
| Email | One of the two contact methods | Valid format; ownership verified by email OTP |
| Mobile number | One of the two contact methods | Valid normalized number; ownership verified by SMS OTP |
| Full name | Yes (*) | Non-empty |
| Educational grade | Yes (*) | Must be one of the supported grades |
| Any other profile details | No | Optional; may be completed later |

Contact-method validation is an **OR rule**, not an AND rule:
- Email only: accepted.
- Mobile only: accepted.
- Both email and mobile: accepted.
- Neither: registration is rejected with the exact message **"لطفاً حداقل یکی از دو روش ایمیل یا شماره تلفن را وارد کنید."**

The form must explain the rule next to the two fields, rather than relying on the asterisk alone. Mark Full name and Grade with (*). If either is missing, prevent submission and show a field-specific Persian message. Repeat all validation on the Worker/API before creating the account.

Do not make optional details mandatory, do not add extra mandatory fields, and do not force the user to complete optional details before using the account. The optional profile-completion step can be skipped and revisited later.

### Parent account and student-profile relationship

- Create or authenticate one stable guardian/user account using its verified contact method(s).
- Link one or more student profiles to that account; each student keeps an independent student ID, name, grade, academic year, learning history, and license relationship.
- A guardian's shared phone number belongs to the guardian account and can serve multiple linked children. It is not a unique student identifier.
- During first activation, redeem the activation code once; the server resolves the associated student/license/grade/year. Do not ask the user to type internal IDs.
- After account authentication, show the linked student profiles for selection where more than one exists. Do not merge student learning records merely because they share a guardian contact.

## User-facing states

1. **Ready:** "برای انتقال دستگاه، کد تأیید به شماره ثبت‌شده ارسال می‌شود." Show masked phone.
2. **Sending:** disable duplicate requests and show progress.
3. **Code entry:** six-digit input, remaining validity, resend countdown.
4. **Success:** "دستگاه با موفقیت منتقل شد." Refresh entitlement/profile automatically.
5. **Expired/incorrect/limited:** clear Persian explanation and safe retry path.
6. **No verified phone:** explain that account recovery/phone registration is required; never fall back to manual JSON challenge for ordinary users.
7. **Network/provider failure:** keep old device authorization intact and offer retry/help.

Where supported, Android SMS autofill/retrieval may populate the OTP. Manual entry must remain available, especially on Windows. Do not request broad SMS-reading permissions.

## Implementation roadmap

### Phase 0 — Baseline and containment
- [ ] Keep PR #141 Draft and unmerged.
- [ ] Inventory the current legacy migration UI, API routes, client methods, D1 schema, and entitlement/slot rules.
- [ ] Mark the admin/JSON migration flow as internal supervised recovery only; it is not the normal customer flow.
- [ ] Confirm no production resources or real student/license data are touched.
- Acceptance: written mapping from current components to the new OTP flow; existing production remains unchanged.

### Phase 1 — Account phone model and policy
- [ ] Inspect existing profile/license data for any already-supported phone field; do not assume one exists.
- [ ] Define normalized Iranian phone representation and verified-at/source metadata.
- [ ] Define student-vs-parent/guardian phone enrollment, phone change, shared-family-number, and lost-number recovery rules.
- [ ] Define migration behavior for legacy accounts with no verified phone.
- Acceptance: schema and policy review passes; no account can be transferred using an unverified arbitrary number.

### Phase 2 — Server-side OTP foundation
- [ ] Add provider-neutral SMS adapter and deterministic mock provider for tests.
- [ ] Add OTP challenge storage with expiry, attempt count, consumption state, and keyed OTP hash.
- [ ] Add request/verify endpoints with generic responses, rate limits, resend cooldown, audit redaction, and atomic single-use semantics.
- [ ] Keep provider secrets server-side.
- Acceptance: automated tests cover valid, invalid, expired, replayed, brute-force-limited, resend, provider-failure, and concurrent-request cases. Logs contain no OTP.

### Phase 3 — Secure device-transfer transaction
- [ ] Connect verified OTP to the exact license/student/device context.
- [ ] Require new-device proof-of-possession.
- [ ] Atomically bind the new key, issue signed entitlement, and retire only the matching old device slot after successful acceptance.
- [ ] Preserve the complementary device class and all student learning data.
- Acceptance: end-to-end synthetic tests prove one-phone/one-PC invariants, no early revocation, replay resistance, and rollback-safe failure behavior.

### Phase 4 — Client UX
- [ ] Replace the customer-facing JSON/challenge workflow with a single **Transfer device** action.
- [ ] Show only the masked verified number and six-digit OTP entry.
- [ ] Add resend countdown, accessible Persian error states, and automatic profile/entitlement refresh.
- [ ] Add Android OTP autofill only where supported; keep manual entry for Android and Windows.
- Acceptance: a first-time user test completes transfer without admin access, copied JSON, command-line steps, or reinstalling the app.

### Phase 5 — Isolated acceptance and provider selection
- [ ] Run CI against mock SMS; run the full HTTP flow against the dedicated PR test Worker and synthetic D1 only.
- [ ] Independently query D1 to verify the exact post-transfer state and audit trail.
- [ ] Test on a physical Android phone and Windows PC with synthetic test accounts.
- [ ] Compare Iranian SMS providers against documented delivery and sender-line requirements; choose only after evidence and owner approval.
- Acceptance: all automated gates pass, isolated D1 transition is independently verified, physical acceptance passes, and provider choice is documented.

### Phase 6 — Controlled production readiness (approval required)
- [ ] Configure the chosen provider's production secrets only after explicit approval.
- [ ] Plan phone enrollment for existing accounts without verified numbers.
- [ ] Prepare monitoring, cost limits, abuse controls, support/recovery procedure, and rollback plan.
- [ ] Roll out to a small opt-in cohort before general activation.
- Acceptance: separate production authorization, security review, delivery test, support readiness, and successful limited rollout. No automatic deployment or production data migration is authorized by this roadmap.

## Definition of done

A normal user can tap **Transfer device**, receive a six-digit SMS OTP, enter/autofill it, and complete a secure transfer in the app without admin assistance or reinstalling. Student data remains intact; only the intended device slot changes; the old device is not disabled before the new device is successfully bound. All security and abuse controls are tested, and no production rollout occurs without explicit approval.

## Current blockers / open decisions

- Whether the existing Tahouri account/profile model already has a verified phone field.
- How to enroll parent/guardian phone numbers for current accounts.
- Which Iranian SMS provider meets service-message delivery requirements and what sender line/template approval is needed.
- Whether legacy device transfer and first-time license activation should share one OTP service while retaining separate authorization policies.


## Phase 0 findings — 2026-11-24

Reviewed the current PR #141 head after the roadmap commit (`3c53ad24cf591a456fa9f90bd833c69c1f16196d`):

- `engine/ui/profileScreen.js` currently exposes the legacy migration panel with instructions to give an installation ID to a school administrator, receive a one-time JSON challenge, paste it into a textarea, and press a button. This is the exact customer-facing complexity that must be removed from the normal transfer experience.
- `engine/core/tahouriLicenseClient.js` exposes `claimLegacyMigration(challenge)`, which requires a challenge object and submits it to `/licenses/legacy-migration/claim`. No SMS/OTP request or verification client method was found in this file.
- `services/license-api/worker.js` routes the legacy claim endpoint and admin functions. The reviewed student-account read/write paths use student ID, full name, grade, status, and activation status; no phone/SMS/OTP handling was found in the reviewed Worker paths.
- `engine/activity/profileManager.js` stores/imports local profile identity (student ID, name, grade); no phone-number ownership or verification flow was found in the reviewed profile manager.
- The current PR is still open, Draft, and unmerged. The roadmap commit is the current PR head. No production environment was changed.

Phase 0 is **partially complete**. This is not yet proof that no phone column exists anywhere in every historical database migration or admin import path. The next required inspection is the complete `student_accounts` schema and all profile-import/enrollment paths before designing the phone-enrollment migration.

Immediate next task: finish the schema/data-model audit, then write the phone ownership and guardian-number policy before changing application code.


## Phase 0 findings — data model and application flow audit (2026-11-24)

### Existing database structure

Reviewed every current SQL migration from `0001_initial_schema.sql` through `0013_legacy_device_migration_challenges.sql`.

- `student_accounts` is the current identity-like table, keyed by `student_id`, with `full_name`, `grade_id`, status, activation status, and timestamps. It is a student record, not a guardian/user account.
- No account/guardian table, account-to-student relationship table, email contact table, phone contact table, contact verification metadata, or OTP challenge table is defined in these 13 migrations.
- `activation_codes` are hashed and tied to a student, grade, academic year, status, and eventual license. The code is single-use and cannot be reused after redemption.
- `licenses` are tied to student, grade, academic year, and validity period.
- Device slots are keyed by `license_id` and device class. The current schema enforces one active phone and one active computer slot **per license**, not per guardian account. This preserves the complementary device class during a class-specific replacement.
- Device key material, pairing challenges, slot history, revocation challenges, and legacy migration challenges already exist through migration 0013.
- The legacy migration challenge table records admin identity attestation and exact license/student/grade/year/device context; it is an administrative recovery mechanism, not an end-user login method.

### Existing application and API flow

- Local `ProfileManager` already supports multiple student profiles on one installation and persists them in local storage. Each profile has its own student ID, name, grade, and settings. This is a local profile collection, not a centrally authenticated guardian account.
- The Worker profile import path creates `student_accounts` records from imported local profiles. The reviewed import route is admin-protected.
- Public `POST /api/students/register` currently returns HTTP 410 with `enrollment_requires_admin`; public self-registration is disabled.
- License activation currently expects the client to submit activation code, student ID, grade ID, installation ID, device class, and cryptographic device proof. The server checks the supplied student and grade against the activation-code record. Therefore the desired end-user flow that resolves student/license/grade/year automatically is not implemented yet.
- The current license client exposes activation, device pairing, revocation, status, and legacy migration methods. No email OTP, SMS OTP, contact verification, account login, or account recovery methods were found in the reviewed client.
- The current profile UI includes the legacy JSON challenge textarea and paste flow. It must not remain the normal customer-facing transfer process.
- The admin panel currently manages student records, activation codes, licenses, payments, and audit logs. No guardian accounts, verified contact methods, or account-to-student management UI is present in the reviewed admin client.

### Current-state matrix

| Capability | Current state | Consequence |
|---|---|---|
| Multiple local student profiles | Present | Can be retained and linked; not a substitute for an account |
| Central student records | Present | Keep student IDs stable |
| Guardian/user account | Missing | Add a separate account identity |
| One guardian to multiple students | Missing centrally | Add an account-student relationship without duplicating contact data |
| Email/mobile contact methods | Not present in reviewed migrations | Add account-level contact records |
| At-least-one contact validation | Missing | Enforce OR validation in both form and Worker |
| Required full name and grade | Present in student import schema; public self-registration is disabled | Apply the approved registration contract at the new account/student enrollment boundary |
| Email/SMS OTP | Missing | Add provider-neutral OTP service and channel adapters |
| Public registration | Disabled (410) | Must be deliberately replaced by authenticated/verified enrollment, not simply reopened |
| Activation code single-use | Present | Preserve and resolve the student/license context server-side |
| Automatic activation context resolution | Missing in current client request contract | Redesign redemption so the user pastes only the activation code after account verification and the server resolves its binding |
| One phone + one computer | Present per license | Retain license-scoped slot enforcement unless a separately reviewed policy changes it |
| Cryptographic device identity | Present | Preserve proof-of-possession; OTP does not replace it |
| Legacy admin-assisted migration | Present | Keep only as controlled fallback, not ordinary user UX |
| Admin account/contact management | Missing | Extend admin workflows after account schema and security policy are reviewed |

### Account and device scope clarification

- Guardian account identity and student/license identity remain separate.
- Email and phone belong to the guardian account. One guardian may have multiple linked students; a shared family phone must not be copied into each student record or treated as a unique student key.
- Existing device-slot enforcement is per license. The intended one-phone/one-computer rule therefore applies independently to each student license, not as a single global device pair shared by all children in a guardian account. A transfer for one child's license must not affect another child's slots.
- After OTP authentication, the server resolves the guardian account and its linked student profiles. Where multiple students exist, the user selects the relevant student profile. Activation-code redemption then resolves the license, grade, and academic year from the code record; the client must not be trusted to choose or override these values.
- A contact method is verified independently. At least one must be verified before the account can be used for authenticated recovery or device transfer. If both are supplied, both can be verified; the second is optional.

### Remaining audit work before schema design is frozen

- Trace all local profile backup/export/import and learning-progress storage keys to define a lossless account-linking migration.
- Inspect every license creation, renewal, grade/year transition, and device slot route for transaction boundaries and idempotency.
- Inspect the full admin Worker routes and HTML to map permissions, audit events, and account-management extension points.
- Confirm whether any non-migration runtime schema or local SQLite schema differs from the 13 versioned D1 migrations.
- Design the account/contact/OTP schema only after these paths are mapped. Do not alter the existing student table by adding duplicate email/phone fields.


## Phase 0 findings — learning-data portability and license/admin flow audit (2026-11-24)

### Local learning data and profile portability

Reviewed the profile manager, profile context, progress tracker, statistics manager, content-lock manager, daily streak manager, activity history, save manager, and admin profile-import client.

- ProfileManager stores the local profile collection and active profile separately. Its reviewed importProfiles() method imports only student identity fields (student ID, name, grade); it does not import learning progress, statistics, locks, streaks, or activity history.
- ProfileContext provides the student-scoped storage-key convention. ProgressTracker, StatisticsManager, and ContentLockManager use that convention, so their principal records are isolated by student ID.
- DailyLearningStreak uses its own student-specific key (tahouri_daily_learning_streak:<studentId>), preserving daily activity, current streak, best streak, and last completed date separately per profile.
- ActivityHistory is an important exception: it reads and writes the single unscoped key Tahouri_ActivityHistory. The reviewed implementation does not bind this record to a student ID. Switching profiles can therefore expose or overwrite the last-activity/continue-learning record across profiles unless another caller scopes it externally; no such scope was established in this audit.
- SaveManager.clear() is deliberately disabled to avoid wiping independent local stores. This protective behavior must remain intact during account migration.
- The admin UI accepts a tahouri-student-profiles JSON export and imports the identity list into central student records. The reviewed profile import method is identity-only. A complete, lossless export/import path for all learning data was not established; the source and exact schema of the profile export file remain to be traced.
- No conclusion about a dedicated badges/achievements store is recorded yet; that requires a targeted repository-wide trace before the migration inventory can be considered complete.

### License activation, renewal, and device transition

- The current activation endpoint still requires client-supplied studentId and gradeId, in addition to the activation code, installation ID, device class, and cryptographic device proof. This confirms that the planned code-only redemption and server-side context resolution remain unimplemented.
- Activation checks the code's student and grade against the student record, rejects used/inactive codes, and checks future-year reservation rules. Promotion requires the next grade; repeat-year reservation requires the same grade and an active current license.
- The activation operation groups code consumption, license creation, device-slot insertion, audit insertion, and student activation-status update in one D1 batch, then checks that each expected statement changed exactly one row. This is a useful atomicity boundary, but concurrency/idempotency and failure behavior still need dedicated tests against isolated D1.
- Future-year activation creates a future license reservation; it does not itself replace the currently active license. The reviewed route rejects a duplicate future reservation for the same product/student/grade/year.
- Pairing checks that the requested device class has no active slot and that an active complementary device exists. The legacy migration claim also uses a D1 batch and conditional checks. These paths preserve the per-license phone/computer distinction, but the full revocation, pairing recovery, and slot replacement transaction paths still need separate review and tests.
- Admin UI includes student import, code creation/revocation, license revocation/extension, search, audit viewing, device-slot recovery, and supervised legacy migration challenge issuance. It does not yet expose guardian accounts, contact verification, or OTP management.
- Admin login uses a server-side password, hashed session identifier, expiry, failed-login throttling/lockout, and audit events. The full route-by-route authorization and audit matrix is still outstanding; the presence of a UI action alone is not proof of its server-side permission boundary.

### Required consequences for the implementation design

1. Account linking must not overwrite or regenerate existing student IDs.
2. The migration plan must enumerate and transfer each student-scoped store independently, including progress, statistics, content locks, streaks, and any verified badge/achievement data.
3. Tahouri_ActivityHistory needs an explicit compatibility decision: migrate it to a student-scoped key while preserving the existing legacy value, or retain it as a clearly defined device-level navigation hint. It must not silently become shared account learning history.
4. Profile identity import must not be described as a full learning-data backup/restore.
5. Before any data migration is implemented, create synthetic multi-profile fixtures and prove that each student's records remain isolated and unchanged across export, import, account linking, and device replacement.

Phase 0 remains **in progress**. The next audit items are the full license slot/revocation transaction paths, the complete admin authorization matrix, all export/backup call sites, badges/achievements discovery, and comparison of runtime/local SQLite schema against the versioned D1 migrations. No application code, SQL migration, production resource, or real student/license data was changed by this audit.


## Phase 0 findings — device lifecycle, admin authorization, and runtime schema audit (2026-11-24)

### Device pairing, revocation, and recovery

Reviewed the Worker handlers for pairing request/list/challenge/decision/cancel/recovery, device revocation challenge/execute, admin device recovery, and the route dispatcher.

- Pairing requests are bound to a license, student, grade, requester device class, installation ID, public key, and key fingerprint. The complementary active device must sign the challenge/decision. Approval conditionally inserts the new slot, consumes the challenge/request, stores the signed entitlement, and records an audit event in one D1 batch.
- Approved-pairing entitlement recovery is read-only with respect to device slots. It requires the exact installation and key fingerprint and a signature from the already-bound private key; it returns the stored entitlement rather than creating a second slot.
- Device revocation requires a signed challenge from the complementary device. The execution batch targets the exact license/device class/installation/fingerprint, consumes the challenge, cancels pending pairings for that same device class, and records an audit event. The complementary device class is not targeted by these statements.
- Emergency admin device recovery also targets the exact license, device class, installation, and fingerprint; it requires a fresh admin-password check and a reason, and records an audit event. Its SQL does not target the complementary device class.
- These code paths are structurally scoped to preserve the other device class. However, no isolated D1 concurrency/replay/failure-injection test was run during this documentation audit; code inspection is not a substitute for those tests.

### Admin authorization and operational visibility

- The Worker route dispatcher sends `/api/admin/*`, `/api/metrics`, and `/api/metrics/alerts` through the admin route handler. Except login/logout/session-check, the handler requires a valid unexpired admin session before returning data or performing an operation. POST mutations require a trusted Origin and JSON content type.
- Admin login uses a random session token whose hash is stored, a time-limited session, failed-login throttling/lockout, and audit events. Global session revocation deletes all sessions and records the operation in one D1 batch.
- Sensitive legacy migration and emergency device recovery additionally require re-entering the admin password and a reason/identity attestation.
- The admin UI's license-extension action is disabled, and its Worker endpoint explicitly returns 501. Do not treat license extension as an available admin capability.
- Admin license revocation currently updates only licenses with status `active`; it does not revoke a `future` reservation through that endpoint. The student archive route does revoke both active and future licenses.
- Admin license revocation performs the license update and audit insertion as separate operations, not one atomic batch. A failure between them can leave a revoked license without its corresponding audit event. This should be corrected and tested before production use.
- `/api/metrics/alerts` currently returns an empty alert list rather than evaluating persisted D1 operational signals. The dashboard therefore must not be interpreted as a complete security/operations alerting system.

### Local SQLite versus Cloudflare D1 schema

- The local Node service (`services/license-api/server.js`) uses `node:sqlite`, a separate SQLite database file, and its own `DB_SCHEMA_VERSION = 1` / `DATABASE_MIGRATIONS` list containing only version 1.
- Cloudflare Worker/D1 uses the versioned SQL migration directory `services/license-api/migrations`, currently through migration 0013, and its health check reads `schema_migrations` and expects the D1 schema at least version 5 plus required tables/indexes.
- These are distinct migration mechanisms and version numbers; local SQLite schema version 1 is not evidence that local SQLite matches D1 migration 0013. No automatic parity or schema equivalence was established.
- The repository's local migration test validates the local service's version-1 startup migration/restart behavior; it does not compare its tables/columns/indexes against the D1 migration chain.

### Required implementation safeguards

1. Add a schema-diff/parity test that compares the intended shared tables, columns, constraints, and indexes between local SQLite and D1, or explicitly document and enforce that the schemas are intentionally different.
2. Make license revocation and its audit record atomic; define a separate explicit policy for revoking future reservations.
3. Add isolated D1 tests for simultaneous pairing approvals, duplicate/replayed revocation execution, admin recovery, audit-write failure, and preservation of the complementary device class.
4. Replace the placeholder empty metrics-alert response with real alert evaluation before relying on the admin dashboard for operational monitoring.

Phase 0 remains **in progress**. Remaining audit work includes targeted badges/achievements and full export/backup call-site discovery, plus a verified local-SQLite/D1 schema diff and execution of isolated device lifecycle tests. No application code, SQL migration, production resource, or real student/license data was changed by this audit.


## Phase 0 findings — local profile export and backup coverage audit (2026-11-24)

### Existing profile export formats

Reviewed `tools/profile-export.html`, `mobile-profile-export.html`, the admin profile-import flow, and the profile manager import implementation.

- The desktop export tool reads `Tahouri_Profiles` and `Tahouri_Active_Profile`, validates the profile identities, and emits only `{studentId, fullName, gradeId}` plus export metadata. Its on-page warning explicitly says progress, scores, and settings are not exported.
- The mobile export tool also reads only `Tahouri_Profiles` and emits identity rows only. It previews missing fields and duplicate IDs, but it does not export the active profile marker or any learning-data stores.
- The central admin import and `ProfileManager.importProfiles()` are also identity-only. Importing this JSON cannot restore progress, statistics, content locks, streaks, activity history, notifications, or profile settings.
- Profile settings are stored inside each profile object (the profile serializer merges defaults with `profile.settings`), so the current identity-only export omits them too.

### Local learning-data inventory relevant to transfer

- Progress: `Tahouri_Progress:<studentId>`; a legacy unscoped `Tahouri_Progress` may be copied once to whichever profile is active when migration first runs.
- Statistics: `Tahouri_Statistics:<studentId>`; legacy unscoped statistics are deliberately migrated at most once to the active profile, to avoid duplicating one learner's history into later profiles.
- Content locks: `Tahouri_ContentLocks:<studentId>`; legacy unscoped locks are migrated to the active profile when its scoped record is absent.
- Daily streak: `tahouri_daily_learning_streak:<studentId>`.
- Notifications: `tahouri_notifications:<studentId>`.
- Profile identity, creation time, and settings: inside `Tahouri_Profiles`; active profile selection is separately stored in `Tahouri_Active_Profile`.
- Activity history: the single unscoped `Tahouri_ActivityHistory` key remains a device/browser-level exception and must not silently be treated as a per-student learning record.
- Navigation history is an in-memory stack in the reviewed manager, not a persistent student record.
- No dedicated badge/achievement storage manager or clearly named badge/achievement file was found in the repository tree reviewed. This is not proof that no achievement-like data is embedded in another record; the exact badge/award representation remains unverified and must be traced before migration scope is frozen.

### License database backup scope

- The documented production backup pipeline backs up the local license API SQLite database using `VACUUM INTO`, validates SQLite integrity and a small set of required license-service tables, encrypts the file, signs it, and can replicate it off-site.
- Its backup/recovery test checks encryption, signature enforcement, off-site copy, restore rehearsal, tamper rejection, and that the source license database remains unchanged during the test.
- This backup is for the license-service database. It does not read browser `localStorage` and therefore does not back up student profiles or the learning-data stores listed above.
- The backup test fixture contains only license-service tables (activation codes, licenses, audit log, payments); it does not exercise browser profile/progress data. A successful license DB restore test must not be represented as a successful student learning-data restore test.

### Data migration requirements confirmed by this audit

1. Design a separate, versioned student-data export/import envelope that includes each student's identity, profile settings, progress, statistics, content locks, streaks, notifications, and any verified achievement data.
2. Include explicit active-profile selection only as device preference metadata; do not let it determine ownership of a student's records during import.
3. Validate all student IDs and payload schemas before writing. Import must be idempotent, preserve existing IDs and records, and never overwrite a non-empty destination silently.
4. Preserve the old identity-only JSON format as a compatibility path, but label it accurately as profile identity transfer—not a complete backup.
5. Define a separate treatment for unscoped legacy progress/statistics/locks and `Tahouri_ActivityHistory`; do not assign ambiguous legacy data to multiple students.
6. Add synthetic multi-profile round-trip tests proving every student's data and settings survive export/import and remain isolated. Test browser local data separately from the license database backup/restore pipeline.

Phase 0 remains **in progress**. Remaining work is to verify achievement-like data at call sites, inspect any additional persistent settings stores, compare the complete local SQLite schema against D1 migrations, and execute the isolated device lifecycle tests. No application code, SQL migration, production resource, or real student/license data was changed by this audit.


## Phase 0 findings — achievement-like records, secondary stores, and local/D1 schema comparison (2026-11-24)

### Stars, scores, and achievement-like records

- `ResultManager.create()` calculates a 1–5 star value for each activity result. The reviewed result object is transient; the persistent `StatisticsManager.addResult()` path stores score, correct/wrong counts, percentage, and aggregate best/average values, but does not persist the calculated `stars` field in its activity record.
- The reviewed statistics schema contains overall, subject, chapter, and activity aggregates. It does not define a separate badge, achievement, award, or certificate collection.
- Content progression is stored separately under the profile-scoped parity progression key generated from `ProfileContext.key(...)`. It records unlocked activity IDs, not a badge ledger.
- `SpellingPerformanceStore` persists answer-level spelling records under `Tahouri_Spelling_Performance:<studentId>` (bounded to the most recent 2,000 records in each array). This is learning evidence and must be included in a complete learning-data export.
- No dedicated badge/achievement manager or durable badge/award table was found in the complete `engine/` and `services/license-api/` source-file inventory reviewed. This narrows the current scope but does not rule out achievement-like UI computed from scores or other records; do not promise badge preservation until the UI/report call sites are traced.

### Additional persistent browser stores

- `tahouri_reminder_state` is unscoped and stores only the current date's reminder/activity-done flags. It is device-level reminder state, not student learning history.
- `tahouri_push_subscription:<studentId>` stores a push subscription and timestamp. This is profile-associated device/service metadata; it should not be copied blindly to another device because the subscription may be tied to the original browser push endpoint.
- `Tahouri_Activation_Licenses` and `Tahouri_License_History` are unscoped browser-side license caches/history. They are not substitutes for authoritative server-side licenses and should be re-fetched/reconciled during account/device migration rather than treated as transferable student learning data.
- `Tahouri_ActivityHistory` remains unscoped and contains the continue-learning activity pointer. It needs an explicit device-hint versus student-owned-history decision.
- `NavigationHistory` is an in-memory stack, not a durable export target.
- Combined with the earlier inventory, the browser-data export scope must distinguish: student-owned learning records (progress, statistics, content locks, progression unlocks, streak, spelling performance, profile settings, notifications); device-bound state (push subscription, active profile selection, navigation/continue-learning hint unless ownership is resolved); and server-authoritative license state (reconcile from API, never trust/import as authority).

### Local Node SQLite versus Cloudflare D1 migrations

- Local `server.js` creates `activation_codes`, `licenses`, `audit_log`, `admin_sessions`, and `payments`, with indexes, and applies a single `DB_SCHEMA_VERSION = 1` migration marker. Its migration test verifies initial startup, restart idempotency, and rejection of a database with a newer `user_version`.
- The Cloudflare D1 chain is materially broader: migrations 0001–0013 add `schema_migrations`, `admin_login_attempts`, `student_accounts`, `license_device_slots`, `device_pairing_requests`, `device_revocation_challenges`, `legacy_device_migration_challenges`, and additional columns/indexes for activation, pairing, and device-key lifecycle.
- The local Node schema is therefore not schema-equivalent to the D1 Worker schema. Local SQLite v1 is not an implementation of D1 migration 0013 and must not be described as a local mirror of production D1.
- The current local migration test tests only the local schema version lifecycle; it does not diff table definitions, columns, constraints, foreign keys, or indexes against the D1 migration chain.

### Required next safeguards

1. Add a machine-readable schema inventory/diff test for local SQLite and D1, or formally declare them separate products with explicit feature parity boundaries. Do not run the local migration chain against D1 or assume parity from version numbers.
2. Decide whether the local Node service is still an intentionally limited development/test harness. If it is expected to support the same device/account workflows, implement and test its missing D1-era schema and behavior before relying on it.
3. Trace reports/dashboard/learning-card UI for derived stars, awards, badges, and certificates; distinguish computed presentation from persisted records.
4. Include spelling performance and progression unlock state in the future student-data export; exclude or explicitly classify device-bound push subscriptions, reminder flags, license caches, and active-device preferences.
5. Keep account/device migration tests separate from license DB backup tests and browser local-data round-trip tests.

Phase 0 remains **in progress**. No application code, SQL migration, production resource, or real student/license data was changed by this documentation audit.


## Phase 0 findings — report/dashboard call-site trace and correction to star persistence finding (2026-11-24)

### Important correction: stars are persisted per student

The previous section correctly noted that `ResultManager` calculates a transient result `stars` value and `StatisticsManager` does not persist that field, but it was incomplete to infer from this that stars are not persisted. The call-site trace confirms a separate persistent path:

- `ProgressTracker.update(activityId, result)` calculates `stars` and stores both current `stars` and historical `bestStars`, alongside `bestScore`, `percentage`, `bestPercentage`, completion state, and `lastPlayed`.
- This progress object is saved under the profile-scoped `Tahouri_Progress:<studentId>` key via `ProfileContext`. Therefore per-activity stars and best stars are part of student learning data and must be exported/imported with progress.
- `ContentLockManager.recordProgressionResult()` is called after successful statistics save; progression/unlock state is a separate store and must also be preserved.
- `ResultManager` and `ActivityResult` create result/view objects, but the durable star history is the `ProgressTracker` record, not a separate badge/achievement ledger.

### How reports and dashboard consume the records

- The reports UI reads `StatisticsManager` for overall, subject, chapter, and activity aggregates. Activity detail and activity lists render star icons from `bestPercentage` (rounded to a 0–5 display), plus best score, average, attempts, total score, correct and wrong answers. The overall report also derives a star display from the overall best score. It does not read a separate badge/award collection.
- `ReportsController` filters report entries to the active grade where grade metadata is available, then adapts the statistics into the reports view model.
- Dashboard progress counts completed activities using `ProgressTracker.isCompleted()` against the activity catalogue for the active grade. It displays current streak from `DailyLearningStreak`, continue/resume activity information, and completed/total activity count with a percentage.
- Dashboard calendar reads daily records from `DailyLearningStreak.getDay()`. The reviewed dashboard has no separate award/badge inventory.
- `resultModal.js` displays stars for the just-completed attempt from its result percentage. This is immediate result presentation; the long-term per-activity star record is held by `ProgressTracker`.

### Current achievement-data conclusion

- Persisted star progress exists and is confirmed; it was missed by looking only at `StatisticsManager`. Correct export scope includes the full `Tahouri_Progress:<studentId>` payload, not merely score aggregates.
- No independent persisted badges, awards, or certificates collection was identified in the traced result, reports, dashboard, progress, and statistics call sites. Existing trophy/medal icons in the reports are labels for aggregate best score, not evidence of a separate award ledger.
- This conclusion is limited to the call sites and source inventory traced; before implementation, run a repository-wide exact search for all award/badge identifiers and verify no feature-specific storage namespace exists.

### Export/import implications

The complete student-owned learning payload now confirmed includes: profile settings and identity, `Tahouri_Progress` (including stars/bestStars and completion), `Tahouri_Statistics`, content locks/progression unlocks, daily streak/calendar records, notifications, and spelling performance. Device-bound push subscriptions, active-profile selection, reminder flags, continue-learning/activity-history pointer, and license caches require separate classification/recreation rather than blind cross-device copying.

No application behavior, database schema, production resource, or student/license record was changed. This was a documentation-only audit and Phase 0 remains **in progress**.


## Phase 0 findings — profile-switch isolation and secondary storage audit (2026-11-24)

### Profile context and switching

- `ProfileContext.key(baseKey)` appends the active `studentId` and returns `null` without an active profile. Progress, statistics, content locks, parity progression, daily streak, notifications, spelling performance and the push-subscription metadata use profile-aware keys or resolve the active student.
- `ProfileManager.switchProfile(studentId)` validates the target exists, updates the active ID in memory and persists `Tahouri_Active_Profile`. `ProfileScreen.selectProfile()` then refreshes the selected profile's remote entitlement and checks that the selection sequence and active student still match before returning to the profile screen.
- The switch method itself does not emit a dedicated profile-changed event or explicitly rebind every manager. Most student-owned managers re-resolve their active profile context on their read/write methods; this behavior needs integration tests to prove no stale in-memory state survives a rapid switch.

### Confirmed unscoped stores and classification

- `Tahouri_ActivityHistory` is a single unscoped localStorage key. `ActivityManager` writes the current activity there, and `resultModal` can read it as a fallback when the live ActivityManager has no current activity. This is a device/browser-level continue-learning pointer, not a safe student-owned history store. It can outlive a profile switch and must not be exported as a particular student's learning history without resolving ownership. Recommended implementation decision: migrate to a student-scoped key with a one-time compatibility rule, or explicitly retain it as a device-level navigation hint and never use it as a student's authoritative record.
- `Tahouri_Activation_Licenses` and `Tahouri_License_History` are unscoped browser caches. The license-history manager filters returned history by `studentId`; the cache must remain non-authoritative and be reconciled with the server. Do not treat it as a transferable license entitlement or student-data backup.
- `Tahouri_Signed_Entitlement_v1` is an unscoped collection of signed entitlement envelopes. This is intentionally device-level cache storage: `LicenseManager` selects envelopes only after matching signed claims to the active `studentId`, grade scope, and installation binding, and verifies the signature. Preserve the verification and binding checks; never import an envelope as trusted authority or select it by array position alone.
- `tahouri_reminder_state` is unscoped and contains device-level reminder/day flags; it should not be copied as student learning progress.
- `tahouri_push_subscription:<studentId>` is keyed by student, but the subscription endpoint is browser/device-bound. Do not copy it to a replacement device as if it were portable; recreate/reconcile the subscription on the destination device.
- `Tahouri_Installation_Id_v1` and offline clock high-water state are device identity/security state, not student-owned data. Never include them in a student profile export or clone them onto another device.

### Profile deletion and active selection

- Deleting the active profile selects the first remaining profile and then calls `save()`, which persists both the profile collection and active profile ID. The reviewed path does not delete the student's profile-scoped learning keys; deletion is therefore not equivalent to a data-erasure workflow. Any future delete/archive feature must define retention and explicit erasure semantics separately.
- The profile import routine remains identity-only and checks collisions for a matching `studentId` with differing name/grade; it does not merge learning data. This remains insufficient as a full student-data restore.

### Test requirements before account linking/device transfer

1. Create two synthetic students with deliberately distinct progress, stars, statistics, locks, progression, streak, notifications, spelling records and settings; alternate profile switches and assert every manager reads/writes only the active student's namespace.
2. Verify `ActivityHistory` behavior on switch, restart, and continue/resume; ensure no student's activity is presented as another student's history.
3. Verify remote entitlement selection with multiple signed envelopes for two students, two grades, and different installation bindings; reject mismatched student, grade, installation, tampered signature, and replayed stale envelope.
4. Verify profile deletion does not silently imply erasure and that device-bound push/reminder/installation state is not copied by student export.
5. Run export/import round-trip and profile-switch integration tests with synthetic data before claiming lossless migration.

No application code, SQL migration, production resource, or real student/license data was changed. Phase 0 remains **in progress**.


## Phase 0 findings — existing test coverage and missing multi-profile learning-data tests (2026-11-24)

### Existing tests that should be reused

- `services/license-api/license-manager-mode-test.js` already exercises two synthetic students and multiple stored entitlement envelopes. It checks matching by student and grade, skips unrelated envelopes regardless of array order, repeated profile switches, ignores stale asynchronous entitlement selection, ignores delayed status responses from the previous profile, rejects missing/wrong grade or student/installation bindings, and checks profile-specific status for different academic years.
- `services/license-api/client-profile-activation-test.js` verifies the active profile ID and grade are included in the activation request, and checks the device proof binds student, grade, installation, device class and code hash.
- `services/license-api/client-license-safety-test.js` statically checks the production entitlement selection and profile-switch sequence guards.
- `tests/progress-tracker-best-results.test.js` verifies latest and best score/percentage/star values and a legacy progress migration case.
- `services/license-api/worker-activation-test.js` covers server-side student registry and bound activation; existing device pairing/revocation and legacy migration tests cover parts of the device lifecycle.

### Coverage gap — do not mistake license isolation for full student-data portability

The existing two-student tests are focused on signed license entitlement selection. They do not instantiate the real `ProfileManager` together with `ProfileContext`, `ProgressTracker`, `StatisticsManager`, `ContentLockManager`, `DailyLearningStreak`, notification store, spelling performance store, and export/import path in one round-trip scenario. The progress tracker test validates a single profile context stub and does not prove two real profiles remain isolated through switch, reload, export and import.

No dedicated synthetic multi-profile learning-data export/import round-trip test was identified in the existing test inventory. No test currently demonstrates that all student-owned stores are exported, restored idempotently without overwriting conflicting destination data, and remain isolated after alternating profile switches. The known unscoped `Tahouri_ActivityHistory` behavior also lacks a profile-switch regression test.

### Test implementation plan (not yet implemented)

1. Build a Node VM/browser-storage harness loading the real profile manager and learning-data managers with a deterministic localStorage implementation; use two synthetic student IDs and distinct sentinel values for every student-owned store.
2. Exercise A → B → A switches, reload the harness, and assert no store returns or writes the other student's sentinel values.
3. Export both profiles using the proposed versioned student-data envelope, import into a clean destination, repeat import to verify idempotency, and test conflict behavior without silent overwrite.
4. Assert progress stars/bestStars, statistics, content locks, progression, streak, notifications, spelling records and profile settings survive the round trip.
5. Explicitly test legacy unscoped progress/statistics/locks migration: one-time migration must not duplicate a legacy record into both profiles.
6. Add a separate regression for ActivityHistory's chosen policy (student-scoped migration or device-only hint) and verify no cross-profile continue-learning leak.
7. Verify push subscriptions, installation identity, offline clock state, reminder flags and cached entitlements are not copied as student-owned data; server entitlements must be re-fetched/re-verified on the destination device.

### Execution status and scope

This review inspected the existing test sources and CI workflow definitions on the development branch; it did not execute the tests in a local runtime. CI workflow presence is not a test pass. No application code, SQL migration, production resource, or real student/license data was changed. Phase 0 remains **in progress**; the multi-profile learning-data harness and full export/import implementation remain future work.


## Phase 0 findings — legacy content-lock migration can cross profile boundaries (2026-11-24)

### Confirmed code-path risk

`engine/core/contentLockManager.js` keeps the legacy source at the unscoped key `Tahouri_ContentLocks`, but its migration marker is generated as `Tahouri_ContentLocks_ProfileMigration_v1:<profile-scoped-key>`. `migrateLegacyLocks(profileKey)` therefore uses a different completion marker for each student. If the legacy unscoped key exists, profile A can receive a copy and set A's marker; after switching to profile B, B has no marker and can receive the same legacy dataset as well. This conflicts with the function's stated intent that the legacy dataset be migrated to the active profile, and can attribute one student's historical lock/progression state to multiple students.

By comparison, `ProgressTracker` and `StatisticsManager` use a single global legacy-migration marker, preventing the same unscoped legacy dataset from being copied into every subsequently activated profile. Content-lock migration currently differs from those safer patterns.

### Required regression test

- Seed a synthetic unscoped `Tahouri_ContentLocks` value and two empty profile-scoped lock keys.
- Initialize/apply locks with student A active; assert the legacy data is migrated only to A.
- Switch to student B and apply locks; assert B does not receive A's legacy data and the legacy source is not re-consumed.
- Repeat after a simulated reload to verify the one-time decision persists.
- Include a conflict case where A already has scoped data; the legacy source must not overwrite it, and must not then leak into B.

### Scope and status

This is a source-level finding from the migration key and call flow; the regression test has not yet been implemented or executed. Do not patch production behavior until the intended ownership rule for ambiguous legacy data is confirmed and the test is ready. No application code, local data, SQL, or deployed service was changed.


## Phase 0 follow-up — executable content-lock legacy migration reproducer (2026-11-24)

### Test added

- Added `services/license-api/content-lock-legacy-migration-reproduction-test.js`. It loads the real `engine/core/contentLockManager.js` in a Node VM with synthetic localStorage and a switchable active student context; no production browser storage or student data is accessed.
- Scenario 1 seeds one unscoped legacy lock dataset, migrates it while student A is active, switches to student B, and asserts that the current implementation copies the same dataset to B. It then reloads the harness and confirms the duplicate attribution persists.
- Scenario 2 gives student A an existing scoped lock record, verifies it is not overwritten, then switches to B and reproduces B consuming the still-unscoped legacy dataset.
- The test is deliberately a **bug reproducer**: PASS means the unsafe current behavior was observed. It is not a no-leak regression guard and must be converted after the ownership-safe production fix is agreed and implemented.

### CI wiring and execution boundary

- Added the reproducer to `.github/workflows/license-api-ci.yml`; the existing pull-request path filter already includes `services/license-api/**`, so this change should cause the License API CI workflow to include the new test on the PR.
- The test has not been executed in this authoring environment. A GitHub Actions run is required before reporting an execution PASS. Workflow configuration presence is not evidence that the test passed.
- No production application code, SQL migration, D1/Worker/Pages resource, local storage, license, or real student record was changed. PR #141 remains a Draft and must not be merged as part of this work.

### Next implementation gate

Before changing the migration behavior, decide and document how to handle an ambiguous unscoped legacy dataset when no reliable student owner can be established. The safe fix must prevent a second profile from consuming the same source, preserve existing scoped data, avoid silent attribution to the wrong student, and provide a controlled recovery path for ambiguous data. Then convert this reproducer into assertions that prove no cross-profile copy occurs and add migration/conflict/reload coverage.

## Phase 0 follow-up — ownership-safe legacy content-lock migration policy (2026-11-24)

### Verified reproducer result

GitHub Actions run [45470898784](https://github.com/Asada100/Tahouri-Edu-Platform/actions/runs/45470898784) completed successfully on commit `9ab7d44d54fc3c148f9ab65de2efc556195419b7`. The step `Content-lock legacy migration cross-profile bug reproduction` passed and its log explicitly confirms that the current cross-profile leak was reproduced. This is a **successful bug-reproduction test**, not evidence that the production behavior is fixed. The other steps in the License API CI job also completed successfully.

### Safety rule for ambiguous legacy data

Adopt the following conservative rule for implementation:

1. Never automatically assign an unscoped legacy content-lock dataset to whichever student happens to be active when the application first opens. The currently active profile does not prove historical ownership.
2. Never copy the same unscoped legacy dataset into more than one student profile.
3. Preserve the original unscoped value unchanged until a migration decision is completed. Do not silently delete, overwrite, or reinterpret it.
4. Automatic migration is permitted only when reliable persisted evidence identifies the original student owner. A single profile existing today is not, by itself, sufficient evidence of historical ownership.
5. If ownership is ambiguous, quarantine the legacy dataset as recoverable legacy data and require an explicit, authenticated ownership decision through a controlled recovery flow before attaching it to a student. Do not make ordinary students handle JSON or internal IDs.
6. Existing profile-scoped records are authoritative and must never be overwritten by legacy data. A conflict must be recorded as unresolved, not used as a reason to let another profile consume the legacy source.
7. The migration decision must be global and one-time for the legacy source, not separately repeatable per profile. It must be idempotent across reloads and safe against partial writes; retain enough source/decision metadata to recover after interruption.
8. If no owner can be established, keep the data quarantined and continue with the profile's normal defaults. Do not sacrifice student isolation to make the old data appear automatically.

### Required implementation and regression coverage

- Replace the current per-profile migration marker behavior with a single source-level migration state/decision.
- Test verified-owner migration to A, then A → B → A switching and reload; B must never receive A's legacy values.
- Test ambiguous ownership: no profile receives the data automatically; the original legacy payload remains recoverable.
- Test explicit recovery assignment to the confirmed owner, idempotent retries, and interruption between persistence steps.
- Test an existing scoped record: it remains byte-for-byte unchanged, and the legacy payload is not offered to another profile.
- Test malformed legacy JSON and empty legacy values without data loss or repeated error loops.
- Convert the current reproducer into a no-leak regression guard; do not keep a test whose expected result is the unsafe behavior.
- Add a two-profile integration test that verifies content-lock state alongside progress, statistics, streak and other student-owned stores.

### Status and boundary

The reproducer has executed successfully in CI. The production content-lock migration is **not fixed yet**. This policy is the implementation safety contract for the next change; the code change and no-leak regression tests remain pending. No production Pages, Worker, D1, browser storage, licenses, or real student records were changed. PR #141 remains Draft and unmerged.

## Phase 0 implementation update — content-lock legacy quarantine fix (2026-11-24)

### Code change

- `engine/core/contentLockManager.js` now treats an unscoped legacy content-lock payload as owner-unknown. It writes a recoverable archive at `Tahouri_ContentLocks_LegacyArchive_v1` and a single global decision at `Tahouri_ContentLocks_LegacyMigrationState_v1`.
- It does not copy the payload into the active profile, does not delete or rewrite the original `Tahouri_ContentLocks` source, and does not overwrite an existing profile-scoped record.
- The global state makes subsequent profile switches and reloads idempotent. An archive conflict is recorded without overwriting either payload.
- Removed the obsolete per-profile migration-marker helper from the active implementation.

### Regression result

The former bug-reproducer test was converted into an ownership-safety regression test. In CI run [45476371906](https://github.com/Asada100/Tahouri-Edu-Platform/actions/runs/45476371906), the step completed with **PASS** and verified quarantine, global one-time decision, reload, conflict preservation, malformed-source preservation, and zero cross-profile copies. The full License API CI workflow and Required PR Gate also completed successfully on commit `df88245df9158c47840ec30ea85267d923902a0f`.

### Remaining migration limits

- This change deliberately quarantines ambiguous legacy data; it does not yet implement the authenticated recovery operation that attaches archived data to a confirmed owner.
- A previously copied profile-scoped record from an older application version cannot be safely identified as the rightful owner's data from the old per-profile marker alone. The new code does not delete or rewrite such existing scoped records. A separate recovery/audit policy is required before attempting to reconcile historical copies.
- The current regression test covers the quarantine boundary and isolation. Verified-owner recovery, interrupted-write simulation, empty-source behavior, and a full two-profile learning-data integration test remain outstanding.
- The CI workflow step is now named as an ownership-safety regression rather than a bug reproducer.

No production Pages, Worker, D1, browser storage, licenses, or real student records were changed. PR #141 remains Draft and unmerged.

## Legacy migration handoff UX — single-use transfer code (2026-11-24)

The student-facing legacy migration handoff no longer requires pasting administrator JSON. The authenticated administrator UI displays/copies a single opaque 256-bit transfer code; the student enters that code in one ordinary text field. The Worker resolves it to the server-held challenge only when the code hash matches an unused, unexpired challenge and the request comes from an allowed application Origin. The client then performs the existing installation/device-class checks, signs the canonical proof with the device private key, verifies the Worker-signed entitlement, and stores it.

- The database continues to store only the SHA-256 hash in the existing `nonce_hash` column; no schema migration is required.
- The code is valid for the existing two-minute challenge lifetime and is consumed by the existing atomic claim operation.
- The challenge response remains API-compatible for existing trusted callers, while the admin UI displays only the transfer code.
- The profile UI no longer parses or asks the student to handle JSON.
- The transfer code is a bearer secret: administrators must deliver it only to the exact intended device through the school's controlled channel. Do not put it in public chat, support tickets, screenshots, or logs.
- The public prepare endpoint is Origin-checked and returns only the challenge bound to the presented high-entropy code. Unknown, expired, or consumed codes are rejected.

### Verification still required

- Run the full License API CI against the final PR head, including Worker activation/admin UI, client-to-Worker migration E2E, and profile handoff tests.
- Verify malformed/incorrect, expired, consumed, and replayed transfer codes fail without changing slots or licenses.
- Complete the dedicated physical phone + Windows acceptance test on the isolated PR Preview and isolated D1.
- Production remains untouched; PR #141 remains Draft and unmerged.

### Single-code handoff CI verification

At commit `40cf96e3f0597f9b76d6114cf4e143d1626c5c63`, License API CI run [45481341108](https://github.com/Asada100/Tahouri-Edu-Platform/actions/runs/45481341108) completed successfully (28/28 steps). This includes:
- Worker admin migration challenge and transfer-code resolution checks.
- Rejection of malformed, unknown, expired, cross-Origin and consumed/replayed transfer codes.
- Client-to-Worker migration E2E with RSA proof, signed entitlement verification/storage, and preservation of the complementary device slot.
- Profile UI handoff test confirming one text input, no JSON parsing, profile-state gating, and clearing the code only after verified entitlement storage.
- Content-lock ownership-safety regression and the existing license/profile safety suites.

The physical phone + Windows acceptance test against the isolated Preview/D1 is still outstanding. CI success is not a substitute for that real-device test. PR #141 remains Draft and unmerged.
