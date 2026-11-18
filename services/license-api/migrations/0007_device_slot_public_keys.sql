-- Bind each license device slot to a verified cryptographic public key.
-- Existing slots remain intact; legacy slots have NULL key material until safely rebound.
ALTER TABLE license_device_slots ADD COLUMN public_key_pem TEXT;
ALTER TABLE license_device_slots ADD COLUMN key_fingerprint TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_slots_key_fingerprint
  ON license_device_slots(license_id, key_fingerprint)
  WHERE key_fingerprint IS NOT NULL;
INSERT INTO schema_migrations(version, applied_at)
VALUES (7, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
