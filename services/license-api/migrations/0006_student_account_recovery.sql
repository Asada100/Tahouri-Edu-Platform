-- One-time student account recovery codes.
-- Only the SHA-256 digest is stored; the raw code is shown once at registration.
ALTER TABLE student_accounts ADD COLUMN recovery_code_hash TEXT;
ALTER TABLE student_accounts ADD COLUMN recovery_code_created_at TEXT;

CREATE INDEX IF NOT EXISTS idx_student_accounts_recovery
ON student_accounts(student_id, recovery_code_hash);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
