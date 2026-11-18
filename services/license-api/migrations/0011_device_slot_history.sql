-- Permit historical device slot rows while enforcing a single active slot per license/device type.
-- Preserve all existing binding and fingerprint history.
ALTER TABLE license_device_slots RENAME TO license_device_slots_v10;
CREATE TABLE license_device_slots (
  slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('phone','computer')),
  installation_id TEXT NOT NULL,
  bound_at TEXT NOT NULL,
  revoked_at TEXT,
  public_key_pem TEXT,
  key_fingerprint TEXT,
  FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);
INSERT INTO license_device_slots (license_id, device_type, installation_id, bound_at, revoked_at, public_key_pem, key_fingerprint)
SELECT license_id, device_type, installation_id, bound_at, revoked_at, public_key_pem, key_fingerprint
FROM license_device_slots_v10;
DROP TABLE license_device_slots_v10;
CREATE INDEX idx_device_slots_installation ON license_device_slots(installation_id);
CREATE UNIQUE INDEX idx_device_slots_active_class ON license_device_slots(license_id, device_type) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX idx_device_slots_active_fingerprint ON license_device_slots(license_id, key_fingerprint) WHERE key_fingerprint IS NOT NULL AND revoked_at IS NULL;
INSERT INTO schema_migrations(version, applied_at)
VALUES (11, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
