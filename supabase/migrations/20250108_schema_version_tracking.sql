-- Schema version tracking for migration management
CREATE TABLE IF NOT EXISTS schema_version (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

-- Grant access
GRANT SELECT ON schema_version TO authenticated;

-- Track this migration
INSERT INTO schema_version (version, description) 
VALUES ('20250108_schema_version_tracking', 'Added schema version tracking table')
ON CONFLICT (version) DO NOTHING;
