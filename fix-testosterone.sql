-- Add testosterone ranges if missing
INSERT INTO metrics_catalog (key, display_name, unit, category, min_value, max_value, sort_order)
VALUES ('testosterone', 'Testosterone', 'ng/dL', 'other', 200, 1200, 231)
ON CONFLICT (key) DO UPDATE SET
  min_value = 200,
  max_value = 1200,
  display_name = 'Testosterone',
  unit = 'ng/dL';
