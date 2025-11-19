-- ============================================================================
-- Measurement trends storage and per-measurement deltas
-- ============================================================================

-- Create table to persist aggregated metric trends per user/metric
CREATE TABLE IF NOT EXISTS measurement_trends (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_points INT NOT NULL DEFAULT 0,
  latest_value DOUBLE PRECISION,
  latest_date TIMESTAMPTZ,
  delta_abs DOUBLE PRECISION,
  delta_pct DOUBLE PRECISION,
  slope_per_day DOUBLE PRECISION,
  direction TEXT,
  PRIMARY KEY (user_id, metric)
);

-- Helper function: recompute trend statistics for a given user/metric
CREATE OR REPLACE FUNCTION recompute_metric_trend(p_user_id UUID, p_metric TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  stats RECORD;
BEGIN
  -- Debounce: Skip if computed recently (within 2 minutes)
  IF EXISTS (
    SELECT 1 FROM measurement_trends 
    WHERE user_id = p_user_id 
      AND metric = p_metric 
      AND computed_at > NOW() - INTERVAL '2 minutes'
  ) THEN
    RETURN;
  END IF;

  WITH base AS (
    SELECT
      value,
      measured_at,
      EXTRACT(EPOCH FROM measured_at) / 86400.0 AS day_index
    FROM measurements
    WHERE user_id = p_user_id
      AND metric = p_metric
  )
  SELECT
    COUNT(*)::INT AS data_points,
    (ARRAY_AGG(value ORDER BY measured_at DESC))[1] AS latest_value,
    (ARRAY_AGG(measured_at ORDER BY measured_at DESC))[1] AS latest_date,
    (ARRAY_AGG(value ORDER BY measured_at ASC))[1] AS first_value,
    (ARRAY_AGG(measured_at ORDER BY measured_at ASC))[1] AS first_date,
    regr_slope(value, day_index) AS slope_per_day
  INTO stats
  FROM base;

  -- No measurements: remove any existing trend row
  IF stats.data_points IS NULL OR stats.data_points = 0 THEN
    DELETE FROM measurement_trends WHERE user_id = p_user_id AND metric = p_metric;
    RETURN;
  END IF;

  INSERT INTO measurement_trends (
    user_id,
    metric,
    computed_at,
    data_points,
    latest_value,
    latest_date,
    delta_abs,
    delta_pct,
    slope_per_day,
    direction
  ) VALUES (
    p_user_id,
    p_metric,
    NOW(),
    stats.data_points,
    stats.latest_value,
    stats.latest_date,
    stats.latest_value - stats.first_value,
    CASE 
      WHEN stats.first_value IS NULL OR stats.first_value = 0 THEN NULL
      ELSE ((stats.latest_value - stats.first_value) / stats.first_value) * 100.0
    END,
    stats.slope_per_day,
    CASE 
      WHEN stats.data_points < 2 OR stats.slope_per_day IS NULL THEN 'insufficient'
      WHEN stats.slope_per_day > 0.0001 THEN 'up'
      WHEN stats.slope_per_day < -0.0001 THEN 'down'
      ELSE 'flat'
    END
  )
  ON CONFLICT (user_id, metric) DO UPDATE SET
    computed_at = EXCLUDED.computed_at,
    data_points = EXCLUDED.data_points,
    latest_value = EXCLUDED.latest_value,
    latest_date = EXCLUDED.latest_date,
    delta_abs = EXCLUDED.delta_abs,
    delta_pct = EXCLUDED.delta_pct,
    slope_per_day = EXCLUDED.slope_per_day,
    direction = EXCLUDED.direction;
    
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Trend computation failed for user % metric %: %', 
    p_user_id, p_metric, SQLERRM;
END;
$$;

-- Trigger helper to recompute trends on measurement changes
CREATE OR REPLACE FUNCTION trigger_recompute_metric_trend()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM recompute_metric_trend(OLD.user_id, OLD.metric);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.user_id <> OLD.user_id OR NEW.metric <> OLD.metric THEN
      PERFORM recompute_metric_trend(OLD.user_id, OLD.metric);
    END IF;
    PERFORM recompute_metric_trend(NEW.user_id, NEW.metric);
  ELSE
    PERFORM recompute_metric_trend(NEW.user_id, NEW.metric);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS measurements_trend_after_insert ON measurements;
DROP TRIGGER IF EXISTS measurements_trend_after_update ON measurements;
DROP TRIGGER IF EXISTS measurements_trend_after_delete ON measurements;

CREATE TRIGGER measurements_trend_after_insert
AFTER INSERT ON measurements
FOR EACH ROW EXECUTE FUNCTION trigger_recompute_metric_trend();

CREATE TRIGGER measurements_trend_after_update
AFTER UPDATE OF value, metric, measured_at ON measurements
FOR EACH ROW EXECUTE FUNCTION trigger_recompute_metric_trend();

CREATE TRIGGER measurements_trend_after_delete
AFTER DELETE ON measurements
FOR EACH ROW EXECUTE FUNCTION trigger_recompute_metric_trend();

-- RPC to fetch detailed measurements with deltas and trend indicators
CREATE OR REPLACE FUNCTION get_measurement_detail(p_user_id UUID, p_metric TEXT)
RETURNS TABLE (
  id UUID,
  value DOUBLE PRECISION,
  unit TEXT,
  measured_at TIMESTAMPTZ,
  source TEXT,
  confidence DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  delta_abs DOUBLE PRECISION,
  delta_pct DOUBLE PRECISION,
  trend_direction TEXT
) AS $$
  WITH ordered_asc AS (
    SELECT
      m.id,
      m.value,
      m.unit,
      m.measured_at,
      m.source,
      m.confidence,
      m.notes,
      m.created_at,
      m.updated_at,
      LAG(m.value) OVER (ORDER BY m.measured_at ASC, m.created_at ASC, m.id ASC) AS previous_value
    FROM measurements m
    WHERE m.user_id = p_user_id
      AND m.metric = p_metric
  )
  SELECT
    o.id,
    o.value,
    o.unit,
    o.measured_at,
    o.source,
    o.confidence,
    o.notes,
    o.created_at,
    o.updated_at,
    o.value - o.previous_value AS delta_abs,
    CASE
      WHEN o.previous_value IS NULL THEN NULL
      WHEN o.previous_value = 0 THEN NULL
      ELSE (o.value - o.previous_value) / o.previous_value * 100.0
    END AS delta_pct,
    CASE
      WHEN o.previous_value IS NULL THEN 'flat'
      WHEN o.value > o.previous_value THEN 'up'
      WHEN o.value < o.previous_value THEN 'down'
      ELSE 'flat'
    END AS trend_direction
  FROM ordered_asc o
  ORDER BY o.measured_at DESC, o.created_at DESC, o.id DESC
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_measurement_detail(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION recompute_metric_trend(UUID, TEXT) TO authenticated;
