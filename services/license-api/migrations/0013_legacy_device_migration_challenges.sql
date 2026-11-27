-- One-time, administrator-supervised binding of a fresh device key to an existing legacy license.
-- Only nonce hashes are stored. The administrator attestation records that school records were checked;
-- no identity documents or activation codes are stored in this table.
CREATE TABLE legacy_device_migration_challenges (
  challenge_id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  grade_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('phone','computer')),
  installation_id TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_by_admin TEXT NOT NULL,
  verification_reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (license_id) REFERENCES licenses(license_id),
  FOREIGN KEY (student_id) REFERENCES student_accounts(student_id)
);
CREATE INDEX idx_legacy_device_migration_expiry
  ON legacy_device_migration_challenges(expires_at, consumed_at);
CREATE INDEX idx_legacy_device_migration_license
  ON legacy_device_migration_challenges(license_id, device_type, created_at);
INSERT INTO schema_migrations(version, applied_at)
VALUES (13, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
