ALTER TABLE device_pairing_requests ADD COLUMN approved_entitlement_json TEXT;
INSERT INTO schema_migrations(version, applied_at)
VALUES (10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
