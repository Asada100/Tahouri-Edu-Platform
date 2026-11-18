# Secure device pairing protocol (implementation gate)

Status: design only; not yet implemented or enabled in production.

## Limits
- Exactly one phone slot and one computer slot per license, independent of OS.
- A second device cannot claim a slot by presenting an activation code alone.
- Approval must be cryptographically attributable to the already bound installation, not merely a user-agent string or shared code.
- Revoking/replacing a slot only releases that device class; preserve the other slot and all student/license data.

## Required installation identity
Each installation creates a signing key pair locally. The private key must be non-exportable where supported and protected by platform secure storage; browser environments must document weaker protection. Register the public key alongside the slot. The server must challenge the installation and verify a signature before accepting it as an approver. An installation ID alone is not proof.

## Pairing flow
1. Requesting installation submits authenticated license context, class (phone/computer), installation ID, and public key. The server checks license/student/account status, validity, class slot, and rate limits. If that class slot is occupied, do not overwrite it; create an expiring pairing request and return a pairing identifier plus random challenge/token. Store only a hash of bearer tokens.
2. The existing installation retrieves the pending request through a challenge-authenticated session. Display requester class, key fingerprint and expiry, with explicit approve/reject controls.
3. Approval requires the existing installation to sign a server-generated single-use challenge bound to pairing ID, license ID, requester class, requester public-key fingerprint, expiry, and nonce. Verify against the currently registered approver key and slot. Reject replay/stale challenges.
4. A D1 atomic batch re-checks license/account validity, slot state, request expiry/cancellation/consumption, and approver key/slot; then inserts the new class slot, marks request consumed, and appends an audit event. Slot replacement must be a separate explicit action. Any failed precondition must prevent partial writes.
5. Worker returns a signed entitlement bound to the requester installation ID, device class, license ID, validity interval, and entitlement version. Client validates signature and local binding. Never treat the approving installation as the requester.
6. Reject, expiry, cancellation, slot revocation/replacement, key rotation and audit handling must be implemented and tested. Revocation must not silently remove the complementary slot.

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

This document is a security design gate, not evidence that pairing endpoints, cryptographic installation keys, or enforcement are implemented.
