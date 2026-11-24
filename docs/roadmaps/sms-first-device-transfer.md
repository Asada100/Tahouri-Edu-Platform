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

### 2. Phone number ownership

- Each student/license account must have a verified Iranian mobile number, either the student's number or a parent/guardian's number.
- Store a normalized phone number and verification metadata, not a plaintext OTP.
- A phone number must not be silently changed during device transfer.
- If an existing account has no verified phone number, it needs a separate supervised phone-enrollment/recovery process. Do not pretend SMS transfer can work before this prerequisite exists.
- Account/guardian relationship and phone-number change policy must be decided before enabling production activation for all accounts.

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
