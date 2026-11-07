-- Register existing Tahouri profiles and bind new activation codes to them.
-- Existing activation-code rows remain NULL and are intentionally ineligible for activation.
ALTER TABLE activation_codes ADD COLUMN student_id TEXT;

CREATE TABLE IF NOT EXISTS student_accounts (
  student_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  grade_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_accounts_grade_status
  ON student_accounts(grade_id, status);

CREATE INDEX IF NOT EXISTS idx_activation_student_status
  ON activation_codes(student_id, status);

INSERT INTO schema_migrations(version, applied_at)
VALUES (4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
