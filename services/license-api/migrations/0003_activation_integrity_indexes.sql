-- Indexes required by the Cloudflare activation endpoint.
-- Unique code binding prevents a redeemed code from backing multiple licenses.
CREATE INDEX IF NOT EXISTS idx_audit_actor_event_created
  ON audit_log(actor, event_type, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_code_hash_unique
  ON licenses(code_hash)
  WHERE code_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activation_grade_year_status
  ON activation_codes(grade_id, academic_year, status);

INSERT INTO schema_migrations(version, applied_at)
VALUES (3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(version) DO NOTHING;
