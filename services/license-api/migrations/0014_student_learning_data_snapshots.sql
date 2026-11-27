-- Server-side, profile-scoped learning-data snapshot for paired devices.
-- Device identity and entitlement material are deliberately not stored here.
CREATE TABLE student_learning_data_snapshots (
  student_id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  checksum_sha256 TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by_device_type TEXT NOT NULL CHECK (updated_by_device_type IN ('phone', 'computer')),
  updated_by_installation_id TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES student_accounts(student_id),
  FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);
CREATE INDEX idx_student_learning_data_license
  ON student_learning_data_snapshots(license_id, updated_at);
INSERT INTO schema_migrations(version, applied_at)
VALUES (14, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
