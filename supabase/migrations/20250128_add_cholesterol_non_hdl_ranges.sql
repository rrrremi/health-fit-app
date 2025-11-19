-- Add healthy ranges for cholesterol_non_hdl
UPDATE metrics_catalog SET
  healthy_min_male = 0, healthy_max_male = 130,
  healthy_min_female = 0, healthy_max_female = 130
WHERE key = 'cholesterol_non_hdl';
