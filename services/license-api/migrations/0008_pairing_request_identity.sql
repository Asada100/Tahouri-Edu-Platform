-- Persist the new device's verified identity with each approval-gated pairing request.
ALTER TABLE device_pairing_requests ADD COLUMN requester_student_id TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN requester_grade_id TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN requester_public_key_pem TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN requester_key_fingerprint TEXT;
CREATE INDEX IF NOT EXISTS idx_pairing_requester_fingerprint
  ON device_pairing_requests(requester_key_fingerprint);
INSERT INTO schema_migrations(version, applied_at)
VALUES (8, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
