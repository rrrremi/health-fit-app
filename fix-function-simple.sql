-- Simple fix: Just recreate the function with correct return columns
CREATE OR REPLACE FUNCTION get_measurements_summary(p_user_id UUID)
RETURNS TABLE (
  metric TEXT,
  display_name TEXT,
  category TEXT,
  latest_value FLOAT,
  unit TEXT,
  latest_date TIMESTAMPTZ,
  source TEXT,
  confidence FLOAT,
  sparkline_points JSONB,
  point_count INT,
  change_pct FLOAT,
  trend_direction TEXT,
  min_value FLOAT,
  max_value FLOAT,
  healthy_min_male FLOAT,
  healthy_max_male FLOAT,
  healthy_min_female FLOAT,
  healthy_max_female FLOAT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH latest_per_metric AS (
    SELECT DISTINCT ON (m.metric)
      m.metric,
      m.value AS latest_value,
      m.unit,
      m.measured_at AS latest_date,
      m.source,
      m.confidence
    FROM measurements m
    WHERE m.user_id = p_user_id
    ORDER BY m.metric, m.measured_at DESC
  ),
  historical_data AS (
    SELECT
      m.metric,
      JSONB_AGG(
        JSONB_BUILD_OBJECT('value', m.value, 'date', m.measured_at)
        ORDER BY m.measured_at ASC
      ) AS points,
      COUNT(*) AS count
    FROM measurements m
    WHERE m.user_id = p_user_id
    GROUP BY m.metric
  )
  SELECT
    l.metric,
    COALESCE(mc.display_name, l.metric) AS display_name,
    COALESCE(mc.category, 'other') AS category,
    l.latest_value,
    l.unit,
    l.latest_date,
    l.source,
    l.confidence,
    COALESCE(h.points, '[]'::JSONB) AS sparkline_points,
    COALESCE(h.count, 0) AS point_count,
    mt.delta_pct AS change_pct,
    COALESCE(mt.direction, 'insufficient') AS trend_direction,
    mc.min_value,
    mc.max_value,
    mc.healthy_min_male,
    mc.healthy_max_male,
    mc.healthy_min_female,
    mc.healthy_max_female
  FROM latest_per_metric l
  LEFT JOIN historical_data h ON l.metric = h.metric
  LEFT JOIN metrics_catalog mc ON l.metric = mc.key
  LEFT JOIN measurement_trends mt
    ON mt.user_id = p_user_id
   AND mt.metric = l.metric
  ORDER BY l.latest_date DESC;
END;
$$;
