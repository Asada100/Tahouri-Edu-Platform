# Tahouri Admin Access Recovery Runbook

Status: operational documentation only. This runbook does not create an application recovery key, change any secret, modify D1, or deploy the Worker.

## 1. Separate the credentials and keys

These items serve different purposes and must never be substituted for one another:

| Item | Purpose | Recovery / handling |
|---|---|---|
| Cloudflare account login and MFA recovery codes | Control access to the Cloudflare dashboard and Worker settings | Keep MFA enabled; store recovery codes in the password manager and a separate secure offline location |
| Worker secret `ADMIN_PASSWORD` | Signs in to the production Tahouri admin panel | The value cannot be read back from Cloudflare. If lost, set a new value through the authenticated Cloudflare account |
| Node service variable `TAHOURI_ADMIN_PASSWORD` | Admin authentication for the separate Node.js deployment | Separate from the Worker secret; changing one does not change the other |
| `E:\\Tahouri-Secrets\\backup-encryption.key` | Decrypts encrypted database backup files | Preserve securely with a separate backup copy. It is not an admin login or admin recovery key |
| License signing private key | Signs activation entitlements | Keep server-side only; never use it for admin login or recovery |
| Public signing key | Lets the client verify signed entitlements | Public verification material; it cannot recover admin access |

There is currently no application-level “Forgot password” route and no separate admin recovery-key mechanism in the Worker login flow. Do not add a universal bypass or a hard-coded recovery password.

## 2. If the Worker admin password is forgotten

1. Sign in to the Cloudflare account that owns the `tahouri-license-api` Worker. If Cloudflare account access itself is lost, use Cloudflare's account-recovery process; the application cannot recover the Cloudflare account.
2. Open **Workers & Pages** and select **tahouri-license-api**.
3. Open the Worker settings and locate **Variables and Secrets** (the dashboard wording may change).
4. Replace the existing secret named exactly `ADMIN_PASSWORD` with a newly generated random password of at least 32 random bytes (and never fewer than the Worker-enforced 16 characters).
5. Save the secret using Cloudflare's secret-management UI. Do not paste the value into GitHub, source files, chat, tickets, screenshots, or shell command arguments.
6. Store the new value in the designated password manager and, if required by the operator's continuity plan, in a sealed offline recovery copy.
7. Confirm the Worker health endpoint responds successfully, then sign in once with the new password. Avoid repeated incorrect attempts: the Worker rate-limits failed login attempts and temporarily locks an IP after five failures in the configured window.

Do not delete or recreate the Worker, D1 database, or signing keys as part of password recovery.

## 3. Session behavior after password rotation

The current Worker uses admin sessions with an eight-hour TTL. Changing `ADMIN_PASSWORD` does not, by itself, prove that already-issued sessions have been revoked. Treat previously authenticated browser sessions as potentially valid until they expire or are explicitly invalidated through a separately reviewed and tested mechanism.

Do not manually delete D1 rows as an improvised recovery step. A future implementation may add a tested “revoke all admin sessions” operation or a session-version mechanism. That change must be reviewed and tested separately before production use.

## 4. If the local Node.js admin password is forgotten

The local Node service uses `TAHOURI_ADMIN_PASSWORD`, not the Worker's `ADMIN_PASSWORD`. Recover or rotate it only in the local deployment's approved secret store / environment configuration, then restart and verify the local service. Do not assume a Cloudflare Worker secret change affects the local service.

Never commit a real value to `.env`, `.env.production`, or any tracked file. Keep local secret files excluded from Git.

## 5. Protect the encrypted-backup key separately

The backup encryption key at `E:\\Tahouri-Secrets\\backup-encryption.key` is essential for decrypting encrypted backups. Keep at least two protected copies in separate secure locations, with access restricted to the system owner. Do not rename it, regenerate it, or replace it unless a planned key-rotation and backup-re-encryption procedure has been tested. Losing this key can make existing encrypted backups unrecoverable.

A backup restore rehearsal is not an admin-password reset. An admin-password reset is not a backup-key recovery.

## 6. Recovery readiness checklist

- [ ] Cloudflare account owner can sign in and MFA recovery codes are available.
- [ ] The current Worker admin password is stored in the approved password manager.
- [ ] A separate sealed offline copy exists if required by the continuity plan.
- [ ] The local Node admin credential is documented separately, if that service is still used.
- [ ] The backup encryption key has two protected copies and a verified recovery procedure.
- [ ] No password, private key, recovery code, or encryption-key value is committed to Git or shared in chat.
- [ ] Password rotation and post-rotation session invalidation behavior have been tested in a non-production environment before being relied upon.

## 7. Current implementation facts

The production Worker login code:
- reads the secret binding named `ADMIN_PASSWORD`;
- rejects a missing value or one shorter than 16 characters;
- compares the submitted password against the configured secret;
- rate-limits failed login attempts;
- stores a hash of the session token in D1 and uses an eight-hour session TTL.

The admin panel currently provides login and logout only. No password retrieval, password-reset endpoint, recovery-key endpoint, or global session-revocation endpoint is implemented.

This document is an operator runbook, not proof that recovery has been exercised. A real recovery drill must be scheduled and explicitly approved; do not test by changing the production secret without authorization.
