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
