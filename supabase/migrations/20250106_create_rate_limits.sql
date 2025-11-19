-- Create rate_limits table for database-backed rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at BIGINT NOT NULL, -- Unix timestamp in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own rate limit entries
-- We'll use a prefix-based approach where keys include user IDs
CREATE POLICY "Users can manage their own rate limits"
  ON rate_limits FOR ALL
  USING (key LIKE auth.uid()::text || ':%');

-- Create a function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE reset_at < extract(epoch from now()) * 1000;
END;
$$;

-- Create a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limits_updated_at();
