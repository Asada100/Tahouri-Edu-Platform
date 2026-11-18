# Secure device pairing protocol (implementation gate)

Status: activation proof-of-possession, requester identity persistence, signed challenge issuance, signed approval/rejection, and requester polling are implemented on this PR branch. Migration 0009 adds one-time challenge state. The bound device must prove possession of its registered private key before a challenge is issued and again when approving or rejecting. Challenges expire within two minutes (or at the request expiry), store only a SHA-256 nonce hash, and are consumed with the decision. Approval re-checks the license, active student, approver slot, and vacant requester slot before binding; it returns a server-signed entitlement bound to the new installation. The requester can poll with its high-entropy bearer token, which is stored only as a hash. Basic client controls now allow the requester to create a pairing request and poll for its result, and allow the already-bound device to approve or reject a manually supplied pairing ID. Approved signed entitlements are persisted for token-authenticated requester retrieval. Requester cancellation is now implemented with the same hashed bearer token, pending-only conditional update, atomic audit record, and replay protection. Expiry cleanup and broader adversarial/concurrency coverage remain outstanding.
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
7. Implemented: requester pairing UI, requester polling and signed entitlement storage, and approver approve/reject UI using a manually shared pairing ID. Still required: expiry cleanup, explicit slot replacement/revocation flow, key rotation handling, and broader adversarial/concurrency tests. This API implementation is not yet end-to-end product enforcement.

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


## Device replacement lifecycle (next implementation gate)

Replacement must be a separate, explicit, signed revocation action performed by the currently bound complementary device (for example, the bound computer authorizes revoking the phone slot). The replacement device itself must never be able to free its own occupied slot by presenting an activation code or by requesting revocation.

### Planned sequence
1. The bound complementary installation requests a revocation challenge for the exact target class and target slot fingerprint. The Worker verifies its active slot, license/profile status, and proof-of-possession signature.
2. The Worker issues a short-lived one-use challenge, storing only its nonce hash and binding the challenge to license ID, approver installation/fingerprint, target device class, target installation/fingerprint, and expiry.
3. The approver confirms revocation locally and signs the exact canonical payload. The Worker rechecks both slots, the target fingerprint, license and profile status, challenge expiry and unused state, then atomically revokes only that target slot, consumes the challenge, invalidates outstanding pairing requests for that target class, and writes audit records.
4. The complementary device slot remains active. The target slot is vacant, allowing the new installation to submit a normal pairing request and be approved through the existing pairing protocol. Revocation does not transfer entitlement or approve a replacement.
5. If the complementary device is unavailable, no self-service bypass is provided in this protocol; recovery must be an separately authenticated administrative process.

### Required replacement tests
- Wrong/forged signatures, mismatched target fingerprint, class, license, approver, challenge, expiry, and replay must fail without mutation.
- Revocation of the phone must preserve the computer slot, and vice versa.
- Concurrent revocation attempts must allow at most one success.
- Pending requests for a revoked target must not subsequently approve; challenge and request tokens must not revive the revoked slot.
- Audit evidence must contain action, target/approver class and fingerprints, license ID, timestamp and outcome, but no secrets.
- After revocation, the class slot can be rebound through ordinary pairing; historical slot rows remain preserved.

This section is a specification only. No replacement/revocation endpoint is implemented until its tests and transactional behavior are added.