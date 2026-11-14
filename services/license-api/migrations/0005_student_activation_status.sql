-- Track whether a registered profile has actually activated a license.
-- Existing active licenses are backfilled as active; all other profiles remain inactive.
ALTER TABLE student_accounts ADD COLUMN activation_status TEXT NOT NULL DEFAULT 'inactive'
  CHECK (activation_status IN ('inactive', 'active'));
UPDATE student_accounts SET activation_status = 'active'
WHERE EXISTS (SELECT 1 FROM licenses WHERE licenses.student_id = student_accounts.student_id
  AND licenses.status = 'active'
  AND licenses.valid_from <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  AND licenses.valid_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO schema_migrations(version, applied_at)
VALUES (5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
