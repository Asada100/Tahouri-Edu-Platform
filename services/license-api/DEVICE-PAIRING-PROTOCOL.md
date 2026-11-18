# Secure device pairing protocol (implementation gate)

Status: activation proof-of-possession is implemented on this PR branch: the browser identity utility is loaded before the license client, activation signs a canonical payload, the Worker verifies the RSA-2048+ signature, and migration 0007 stores the public key and SHA-256 fingerprint with the device slot. Pairing endpoints and approval flow remain design-only and are not enabled in production. The License API CI, device identity browser test, PR preview package, Word Puzzle checks, and required PR gate all pass on commit `721d62e814cf0d36b57cc4f4307f060f2d63547b`.

## Limits
- Exactly one phone slot and one computer slot per license, independent of OS.
- A second device cannot claim a slot by presenting an activation code alone.
- Approval must be cryptographically attributable to the already bound installation, not merely a user-agent string or shared code.
- Revoking/replacing a slot only releases that device class; preserve the other slot and all student/license data.

## Required installation identity
Each installation creates a signing key pair locally. The private key must be non-exportable where supported and protected by platform secure storage; browser environments must document weaker protection. Register the public key alongside the slot. Initial activation now verifies a signature over purpose, installation ID, device class, student ID, grade ID, and normalized activation-code hash before binding the slot. The server stores the SPKI public key and its DER SHA-256 fingerprint. Pairing approval must additionally challenge the installation and verify a signature before accepting it as an approver. An installation ID alone is not proof.

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

This document remains a security design gate for the unimplemented pairing workflow. Activation proof-of-possession is implemented and the full required CI gate passes on this PR branch. It is not deployed to production.
