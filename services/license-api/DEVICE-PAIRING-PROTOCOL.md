# Secure device pairing protocol (implementation gate)

Status: activation proof-of-possession, requester identity persistence, signed challenge issuance, signed approval/rejection, and requester polling are implemented on this PR branch. Migration 0009 adds one-time challenge state. The bound device must prove possession of its registered private key before a challenge is issued and again when approving or rejecting. Challenges expire within two minutes (or at the request expiry), store only a SHA-256 nonce hash, and are consumed with the decision. Approval re-checks the license, active student, approver slot, and vacant requester slot before binding; it returns a server-signed entitlement bound to the new installation. The requester can poll with its high-entropy bearer token, which is stored only as a hash. Client UI, pending-request discovery/listing on the existing device, cancellation, expiry cleanup, and broader adversarial/concurrency coverage remain outstanding.
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
5. Implemented requester status: the requester polls with its pairing ID and bearer token. The Worker hashes and compares the token and returns only pending/approved/rejected/expired status.
6. Still required: client-side pairing UI and polling integration, pending-request discovery on the existing device, cancellation, expiry cleanup, explicit slot replacement/revocation flow, key rotation handling, and broader adversarial/concurrency tests. This API implementation is not yet end-to-end product enforcement.

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
