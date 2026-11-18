-- One phone + one computer per license; approval-gated device pairing.
-- Existing license rows and bindings remain untouched by this migration.
CREATE TABLE IF NOT EXISTS license_device_slots (
  license_id TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('phone','computer')),
  installation_id TEXT NOT NULL,
  bound_at TEXT NOT NULL,
  revoked_at TEXT,
  PRIMARY KEY (license_id, device_type),
  FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);
CREATE INDEX IF NOT EXISTS idx_device_slots_installation ON license_device_slots(installation_id);

CREATE TABLE IF NOT EXISTS device_pairing_requests (
  pairing_id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  requester_device_type TEXT NOT NULL CHECK (requester_device_type IN ('phone','computer')),
  requester_installation_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  approved_at TEXT,
  consumed_at TEXT,
  cancelled_at TEXT,
  FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);
CREATE INDEX IF NOT EXISTS idx_pairing_license_expiry ON device_pairing_requests(license_id, expires_at);
INSERT INTO schema_migrations(version, applied_at)
VALUES (6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
