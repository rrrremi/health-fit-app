-- ============================================================================
-- METRICS EXPORT QUERIES FOR LLM POPULATION
-- ============================================================================
-- Use these queries to export all metrics data for populating min/max values
-- ============================================================================

-- ============================================================================
-- 1. GET ALL METRICS FROM CATALOG (Basic Info)
-- ============================================================================
SELECT 
  key,
  display_name,
  unit,
  category,
  description,
  healthy_min,
  healthy_max,
  created_at
FROM metrics_catalog
ORDER BY category, display_name;

-- ============================================================================
-- 2. GET ALL METRICS WITH CURRENT MIN/MAX VALUES
-- ============================================================================
SELECT 
  key,
  display_name,
  unit,
  category,
  description,
  healthy_min,
  healthy_max,
  CASE 
    WHEN healthy_min IS NULL THEN 'MISSING'
    ELSE 'HAS VALUE'
  END as min_status,
  CASE 
    WHEN healthy_max IS NULL THEN 'MISSING'
    ELSE 'HAS VALUE'
  END as max_status
FROM metrics_catalog
ORDER BY 
  CASE WHEN healthy_min IS NULL THEN 0 ELSE 1 END,
  category, 
  display_name;

-- ============================================================================
-- 3. GET ONLY METRICS MISSING MIN/MAX VALUES
-- ============================================================================
SELECT 
  key,
  display_name,
  unit,
  category,
  description
FROM metrics_catalog
WHERE healthy_min IS NULL 
   OR healthy_max IS NULL
ORDER BY category, display_name;

-- ============================================================================
-- 4. GET METRICS WITH ACTUAL USER DATA STATISTICS
-- ============================================================================
SELECT 
  mc.key,
  mc.display_name,
  mc.unit,
  mc.category,
  mc.healthy_min,
  mc.healthy_max,
  COUNT(m.id) as measurement_count,
  MIN(m.value) as actual_min_value,
  MAX(m.value) as actual_max_value,
  AVG(m.value) as avg_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.value) as median_value
FROM metrics_catalog mc
LEFT JOIN measurements m ON m.metric = mc.key
GROUP BY mc.key, mc.display_name, mc.unit, mc.category, mc.healthy_min, mc.healthy_max
ORDER BY mc.category, mc.display_name;

-- ============================================================================
-- 5. EXPORT FORMAT FOR LLM (CSV-like)
-- ============================================================================
-- This gives you a clean format to feed into an LLM
SELECT 
  key as metric_key,
  display_name,
  unit,
  category,
  COALESCE(description, '') as description,
  COALESCE(healthy_min::text, 'NULL') as current_min,
  COALESCE(healthy_max::text, 'NULL') as current_max
FROM metrics_catalog
ORDER BY category, display_name;

-- ============================================================================
-- 6. GET METRICS BY CATEGORY (for targeted LLM prompts)
-- ============================================================================

-- Blood Lipids
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'blood_lipids'
ORDER BY display_name;

-- Blood Cells
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'blood_cells'
ORDER BY display_name;

-- Vitals
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'vitals'
ORDER BY display_name;

-- Body Composition
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'composition'
ORDER BY display_name;

-- Metabolic
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'metabolic'
ORDER BY display_name;

-- Kidney Function
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'kidney'
ORDER BY display_name;

-- Liver Function
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'liver'
ORDER BY display_name;

-- Hormones
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'hormones'
ORDER BY display_name;

-- Electrolytes
SELECT key, display_name, unit, healthy_min, healthy_max
FROM metrics_catalog
WHERE category = 'electrolytes'
ORDER BY display_name;

-- ============================================================================
-- 7. GENERATE UPDATE STATEMENTS TEMPLATE
-- ============================================================================
-- This creates UPDATE statements you can fill in with LLM-generated values
SELECT 
  'UPDATE metrics_catalog SET healthy_min = [MIN_VALUE], healthy_max = [MAX_VALUE] WHERE key = ''' || key || '''; -- ' || display_name || ' (' || unit || ')' as update_statement
FROM metrics_catalog
WHERE healthy_min IS NULL OR healthy_max IS NULL
ORDER BY category, display_name;

-- ============================================================================
-- 8. EXPORT ALL DATA IN JSON FORMAT (for LLM context)
-- ============================================================================
SELECT json_agg(
  json_build_object(
    'key', key,
    'display_name', display_name,
    'unit', unit,
    'category', category,
    'description', description,
    'current_min', healthy_min,
    'current_max', healthy_max
  )
) as metrics_json
FROM metrics_catalog
ORDER BY category, display_name;

-- ============================================================================
-- 9. COUNT METRICS BY STATUS
-- ============================================================================
SELECT 
  category,
  COUNT(*) as total_metrics,
  COUNT(healthy_min) as has_min,
  COUNT(healthy_max) as has_max,
  COUNT(*) - COUNT(healthy_min) as missing_min,
  COUNT(*) - COUNT(healthy_max) as missing_max
FROM metrics_catalog
GROUP BY category
ORDER BY category;

-- ============================================================================
-- 10. SIMPLE LIST FOR LLM PROMPT
-- ============================================================================
-- Copy this output directly into your LLM prompt
SELECT 
  display_name || ' (' || unit || ')' as metric_with_unit,
  category
FROM metrics_catalog
WHERE healthy_min IS NULL OR healthy_max IS NULL
ORDER BY category, display_name;

-- ============================================================================
-- EXAMPLE LLM PROMPT FORMAT
-- ============================================================================
/*
You can use this format to ask an LLM to populate the values:

"I have the following health metrics that need healthy reference ranges (min/max values).
Please provide scientifically accurate reference ranges for adults (ages 18-65) for each metric.
Consider standard clinical reference ranges.

Format your response as SQL UPDATE statements:

[Paste results from Query #7 here]

For each metric, replace [MIN_VALUE] and [MAX_VALUE] with appropriate values.
Consider:
- Standard clinical reference ranges
- Units of measurement
- Age/sex variations (use general adult ranges)
- Source: Clinical laboratory standards
"
*/

-- ============================================================================
-- BULK UPDATE TEMPLATE (After getting LLM responses)
-- ============================================================================
/*
-- Example format for bulk updates:
BEGIN;

UPDATE metrics_catalog SET healthy_min = 60, healthy_max = 100 WHERE key = 'fasting_glucose';
UPDATE metrics_catalog SET healthy_min = 3.9, healthy_max = 6.1 WHERE key = 'total_cholesterol';
-- ... more updates ...

COMMIT;
*/
