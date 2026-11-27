-- Single-use, short-lived challenges and signed decisions for device pairing.
ALTER TABLE device_pairing_requests ADD COLUMN challenge_id TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN challenge_nonce_hash TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN challenge_expires_at TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN challenge_consumed_at TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN decision TEXT CHECK (decision IS NULL OR decision IN ('approved','rejected'));
ALTER TABLE device_pairing_requests ADD COLUMN decided_at TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN approver_device_type TEXT;
ALTER TABLE device_pairing_requests ADD COLUMN approver_installation_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pairing_challenge_id ON device_pairing_requests(challenge_id) WHERE challenge_id IS NOT NULL;
INSERT INTO schema_migrations(version, applied_at)
VALUES (9, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
