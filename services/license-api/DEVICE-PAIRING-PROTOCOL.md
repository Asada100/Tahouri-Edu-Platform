# Secure device pairing protocol (implementation gate)

Status: initial activation proof-of-possession, requester identity persistence, signed pairing challenge issuance, signed approval/rejection, requester polling/cancellation, bound-slot listing, and signed device-slot replacement/revocation are implemented on this PR branch. Migration 0009 adds one-time pairing challenge state; migration 0012 adds one-time device-revocation challenge state. The bound device proves possession of its registered private key before a pairing or revocation challenge is issued and again when deciding or executing the operation. Pairing and revocation challenges are short-lived, single-use, and store nonce hashes rather than raw nonce values. Pairing approval re-checks the license, active student, approver slot, and vacant requester slot before binding; it returns a server-signed entitlement bound to the new installation. The requester polls with a high-entropy bearer token stored only as a hash. The browser UI exposes requester creation/polling and approver pending-request listing/approve/reject. The UI also lists the bound phone/computer slots and provides a two-step confirmation for revoking the opposite device slot. Revocation is performed only by the currently bound complementary device, targets the exact installation and key fingerprint, consumes a one-use challenge, cancels pending pairings for that device class, preserves the complementary slot, and writes audit evidence. An authenticated administrator recovery endpoint is available only as an emergency fallback when the complementary device is unavailable; it requires a valid admin session, trusted Origin, password re-entry, exact slot identifiers/fingerprint, a reason, rate limiting, and audit logging. Physical phone-plus-Windows E2E and broader adversarial/concurrency coverage remain outstanding.
## Limits
- Exactly one phone slot and one computer slot per license, independent of OS.
- A second device cannot claim a slot by presenting an activation code alone.
- Approval must be cryptographically attributable to the already bound installation, not merely a user-agent string or shared code.
- Revoking/replacing a slot only releases that device class; preserve the other slot and all student/license data.

## Required installation identity
Each installation creates a signing key pair locally. The private key must be non-exportable where supported and protected by platform secure storage; browser environments must document weaker protection. Register the public key alongside the slot. Initial activation now verifies a signature over purpose, installation ID, device class, student ID, grade ID, and normalized activation-code hash before binding the slot. The server stores the SPKI public key and its DER SHA-256 fingerprint. Pairing approval must additionally challenge the installation and verify a signature before accepting it as an approver. An installation ID alone is not proof.

## Pairing flow
1. Implemented request stage: the requesting installation submits the used activation code, profile context, class, installation ID, public key, and signature. The Worker verifies the requester's signature, license/student/account status, validity, complementary slot, and rate limits. It creates a ten-minute pending request and returns a pairing identifier plus random bearer token; only the token hash is stored. The request cannot bind a slot by itself.
2. Implemented challenge stage: the existing installation submits the pairing ID, its installation ID/class, and a signature over the canonical challenge-request payload. The Worker resolves its registered public key from the occupied slot, verifies the signature, and issues a random challenge with a maximum two-minute lifetime. Only the challenge nonce hash is stored.
3. Implemented decision stage: the existing installation signs the canonical decision payload containing pairing/license IDs, challenge ID and nonce, requester installation/class/fingerprint, approver installation/class/fingerprint, decision, and challenge expiry. The Worker verifies against the currently registered approver key and slot. Approval and rejection consume the challenge; replay, stale, mismatched, and unbound-device attempts are rejected.
4. Implemented approval transaction: a D1 batch re-checks request and challenge state, license validity, active student, approver slot, and vacant target slot; inserts the new class slot; marks the request approved/consumed; and appends an audit event. The Worker returns a signed entitlement bound to the requester installation ID, class, license, validity interval, and key fingerprint. No existing slot is replaced.
5. Implemented requester status: the requester polls with its pairing ID and bearer token. The Worker hashes and compares the token and returns only pending/approved/rejected/expired status.\n6. Implemented requester cancellation: the requester submits its pairing ID and bearer token; a single D1 batch cancels only a still-pending, unexpired, unconsumed request and writes its audit event. Repeated cancellation and invalid tokens fail without changing state. The challenge is also consumed on cancellation.
7. Implemented: requester pairing UI, requester polling and signed entitlement storage, and approver pending-list/approve/reject UI. Signed opposite-slot revocation is also implemented, with an exact target installation/fingerprint and a one-use challenge. The browser UI lists bound slots and requires a two-step confirmation before revocation. An administrator emergency recovery route exists as a separately authenticated fallback. Remaining gates include physical two-device E2E, key-rotation handling, expiry cleanup review, and broader adversarial/concurrency tests. Synthetic/API tests do not replace the physical phone-plus-Windows acceptance test.

## API/DB design requirements
- Explicit endpoints: create request, list pending (authenticated), approve, reject/cancel, poll/status, revoke/rebind class.
- High-entropy challenge/token values, hashed at rest, short expiry, rate limiting and single-use semantics.
- Bind challenges and signatures to exact canonical payloads; define canonical serialization before implementation.
- Unique active slot per license/class and atomic concurrency controls in D1.
- Public status responses must not leak student details or enumerate license IDs.
- Audit records include action, license, class, installation/key fingerprints (not secrets), result and timestamp.

## Acceptance tests before release
- Initial activation binds only its requested class.
- One phone + one computer succeeds; two phones or two computers cannot coexist.
- Activation code cannot acquire a second slot.
- Forged, expired, replayed, wrong-class, wrong-license and wrong-key approval fail.
- Concurrent approval requests for the same slot cannot both win or corrupt state.
- Reject/cancel/expiry do not bind a slot; explicit replacement releases only the selected slot.
- Revocation preserves the complementary slot and student/license records.
- Signed entitlements reject mismatched installation/class and revoked licenses.
- Migration and regression tests preserve existing license and student data.

This document remains a security design gate for the remaining client integration and lifecycle work. The Worker-side signed request, authenticated pending-request listing, challenge, decision, slot binding, entitlement delivery, and requester status APIs plus basic browser controls are implemented on this PR branch. Full end-to-end browser testing of the two-device UI and remaining lifecycle/security coverage are still required. Nothing in this PR is deployed to production.


## Device replacement lifecycle (implemented; physical E2E pending)

Replacement is a separate, explicit, signed revocation action performed by the currently bound complementary device (for example, the bound computer authorizes revoking the phone slot). The replacement device itself cannot free its own occupied slot by presenting an activation code or requesting revocation.

### Implemented sequence
1. The bound complementary installation requests a revocation challenge for the exact target class and target slot fingerprint. The Worker verifies its active slot, license/profile status, and proof-of-possession signature.
2. The Worker issues a short-lived, one-use challenge, storing only its nonce hash and binding the challenge to license ID, approver installation/fingerprint, target device class, target installation/fingerprint, and expiry.
3. The approver confirms revocation locally and signs the exact canonical payload. The Worker rechecks both slots, the target fingerprint, license and profile status, challenge expiry and unused state, then atomically revokes only that target slot, consumes the challenge, cancels pending pairing requests for that target class, and writes audit records.
4. The complementary device slot remains active. The target slot is vacant, allowing the new installation to submit a normal pairing request and be approved through the existing pairing protocol. Revocation does not transfer entitlement or approve a replacement.
5. If the complementary device is unavailable, the separate administrator emergency-recovery endpoint is available. It requires an authenticated admin session, trusted Origin, password re-entry, exact license/class/installation/fingerprint match, a reason, rate limiting, and audit evidence. It revokes only the exact target slot and preserves the complementary slot.

### Required verification before production
- Wrong/forged signatures, mismatched target fingerprint, class, license, approver, challenge, expiry, and replay must fail without mutation.
- Revocation of the phone must preserve the computer slot, and vice versa.
- Concurrent revocation attempts must allow at most one success.
- Pending requests for a revoked target must not subsequently approve; challenge and request tokens must not revive the revoked slot.
- Audit evidence must contain action, target/approver class and fingerprints, license ID, timestamp and outcome, but no secrets.
- After revocation, the class slot can be rebound through ordinary pairing; historical slot rows remain preserved.
- Complete a real physical phone + Windows computer test on the isolated PR141 Preview and D1 before production consideration.

The code path and isolated test coverage are implemented on this PR branch. Physical two-device acceptance testing remains a release gate. No production deployment or production data change is authorized by this document.


## Legacy entitlement migration gate (2026-11-22)

This section clarifies the required behavior for installations created before device-bound leases. It supersedes any earlier wording above that could be read as allowing a legacy installation ID, by itself, to establish device identity.

- A legacy installation ID is a compatibility identifier only. It is not proof of possession, cannot identify the original browser when a profile has been copied, and cannot authorize pairing, approval, slot replacement, or key registration.
- A legacy entitlement may remain usable offline only while it contains a valid, unexpired signed device lease with a valid device-slot ID and revocation epoch. When the lease is absent, malformed, or expired, offline access must fail closed and the profile status must be `renewal_required`.
- A legacy slot without a registered public key and key fingerprint must not receive a device lease from the device-status endpoint, even if a caller supplies a legacy installation ID, a claimed fingerprint, or an invalid signature. It must not be silently bound to the first browser that reconnects.
- Migration of an unbound legacy installation requires an online, independently authenticated migration flow that can establish the rightful account/device owner without trusting the legacy installation ID alone. Until that flow is implemented and tested, the installation must remain renewal-required; do not bypass the gate or auto-claim the slot.
- Do not ask users to disclose activation codes or private keys in support conversations. Use the approved authenticated activation/recovery process.
- Production rollout remains blocked until the online migration path for existing no-lease installations is implemented and tested, including cloned-profile/conflicting-claim cases and preservation of existing license/student records.

## Current verification status (2026-11-22)

- The isolated PR Preview physical phone + Windows acceptance test has passed. There is no third physical device; third-device contention is covered only by synthetic fixtures against mock D1 and must not be described as a third-device physical test.
- Automated coverage now includes concurrent pairing requests, concurrent approval/revocation conflict handling, pending-pairing behavior after revocation, legacy offline lease enforcement, and rejection of fake proof for an unbound legacy slot. The latest reviewed CI commit for the legacy lease test clarification passed all five PR workflows.
- These results apply only to the isolated PR branch/Preview and mock test environment. They do not authorize or imply a production Worker deployment, production D1 mutation, or production release.
- Remaining release gates include implementing and testing the independently authenticated online migration flow for legacy no-lease installations, plus any outstanding lifecycle/adversarial checks. Do not mark the production release gate complete until those are satisfied.
