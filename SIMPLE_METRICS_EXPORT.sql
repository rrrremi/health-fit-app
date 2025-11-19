-- Simple export of all metrics
SELECT 
  key,
  display_name,
  unit,
  category,
  healthy_min,
  healthy_max
FROM metrics_catalog
ORDER BY category, display_name;
