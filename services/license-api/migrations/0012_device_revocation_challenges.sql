-- Independent, short-lived signed challenges for revoking an exact occupied device slot.
-- The challenge is bound to both approver and target slot identities; nonce is hashed at rest.
CREATE TABLE device_revocation_challenges (
  challenge_id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  target_device_type TEXT NOT NULL CHECK (target_device_type IN ('phone','computer')),
  target_installation_id TEXT NOT NULL,
  target_fingerprint TEXT NOT NULL,
  approver_device_type TEXT NOT NULL CHECK (approver_device_type IN ('phone','computer')),
  approver_installation_id TEXT NOT NULL,
  approver_fingerprint TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (target_device_type <> approver_device_type),
  FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);
CREATE INDEX idx_device_revocation_challenges_license ON device_revocation_challenges(license_id, expires_at);
INSERT INTO schema_migrations(version, applied_at)
VALUES (12, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
