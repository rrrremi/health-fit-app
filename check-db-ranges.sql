-- Check if healthy ranges exist in metrics_catalog
SELECT 
  key,
  display_name,
  min_value,
  max_value,
  healthy_min_male,
  healthy_max_male
FROM metrics_catalog
WHERE key IN ('bmi', 'cholesterol_non_hdl', 'weight')
ORDER BY key;
