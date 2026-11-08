-- Student self-service authentication.
-- Existing student registry rows remain intact; NULL credentials require a
-- password setup flow before those accounts can sign in.
ALTER TABLE student_accounts ADD COLUMN password_salt TEXT;
ALTER TABLE student_accounts ADD COLUMN password_hash TEXT;
ALTER TABLE student_accounts ADD COLUMN password_iterations INTEGER;
ALTER TABLE student_accounts ADD COLUMN password_updated_at TEXT;

CREATE TABLE IF NOT EXISTS student_sessions (
  session_hash TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_student
ON student_sessions(student_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_student_sessions_expires
ON student_sessions(expires_at);

CREATE TABLE IF NOT EXISTS student_login_attempts (
  attempt_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
