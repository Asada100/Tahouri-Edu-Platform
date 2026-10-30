# Student-bound activation code policy

Date: 2026-10-30

## Decision

Every newly issued activation code is issued for exactly one existing Tahouri student profile. The administrator must supply that profile's exact `studentId`; bulk code creation is intentionally disabled so one code cannot accidentally be distributed across multiple students.

The Worker stores the binding in `activation_codes.student_id`. The full activation code is returned once at creation time; listings show only its preview and the bound student ID.

## Required behavior for a future activation endpoint

The activation endpoint is still disabled. When it is implemented, it MUST:

1. Hash the submitted code on the server and look up the code row.
2. Reject codes whose `student_id` is NULL (legacy, unbound codes).
3. Require exact equality between the stored `student_id` and the submitted profile ID.
4. For renewal/reservation codes, additionally require the exact current active license for that same student and enforce grade progression and validity dates.
5. Consume the code, create the license, and write the audit record atomically.
6. Never accept a client-provided code hash or treat `installationId` as hardware attestation.

## Existing codes

Migration 0003 adds a nullable `student_id` column. Existing codes remain visible to administrators, but they are explicitly unbound. They must not be accepted by a future secure activation route. Administrators must issue new student-bound codes for students who have not yet activated.

## Security boundary

A student ID is an identifier, not a password or proof of a real-world identity. The per-student activation code is a bearer credential: whoever obtains it first may attempt to claim the bound profile. The code must therefore be delivered privately to the intended student's parent/guardian or school contact.

This policy prevents one issued code from being used for a different student ID. It does NOT by itself prevent someone who has both the intended student ID and a stolen activation code from claiming it, nor does it provide hardware-backed device identity. Stronger identity assurance requires a separate parent/school verification channel. Do not describe this feature as full identity authentication.

## Operational constraints

- New codes are issued one at a time and tied to a non-empty student ID.
- Admin code listings and search results expose the bound student ID but never the full code.
- The full code is shown only in the immediate creation response; store/deliver it securely.
- Production activation remains disabled until the activation endpoint enforces this binding and the end-to-end security tests pass.
- Do not apply migration 0003 to Production as part of this change.
