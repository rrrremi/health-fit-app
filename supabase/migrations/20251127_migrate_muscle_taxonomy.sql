-- Migration: Update exercise muscles to use new sub-muscle taxonomy
-- Date: 2025-11-27
-- 
-- This migration converts generic muscle names to specific sub-muscle IDs:
-- - "chest" -> "mid_chest" (most common chest target)
-- - "shoulders" -> "front_delts", "side_delts", "rear_delts" (context-dependent)
-- - "back" -> "lats" (most common back target)
-- - etc.

-- Create a function to update muscle arrays
CREATE OR REPLACE FUNCTION migrate_muscle_name(muscle_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE lower(trim(muscle_name))
    -- Chest mappings
    WHEN 'chest' THEN 'mid_chest'
    WHEN 'pectorals' THEN 'mid_chest'
    WHEN 'pecs' THEN 'mid_chest'
    WHEN 'upper chest' THEN 'upper_chest'
    WHEN 'lower chest' THEN 'lower_chest'
    
    -- Back mappings
    WHEN 'back' THEN 'lats'
    WHEN 'lats' THEN 'lats'
    WHEN 'latissimus' THEN 'lats'
    WHEN 'latissimus dorsi' THEN 'lats'
    WHEN 'upper back' THEN 'upper_back'
    WHEN 'traps' THEN 'upper_back'
    WHEN 'trapezius' THEN 'upper_back'
    WHEN 'rhomboids' THEN 'mid_back'
    WHEN 'mid back' THEN 'mid_back'
    WHEN 'lower back' THEN 'lower_back'
    WHEN 'erector spinae' THEN 'lower_back'
    WHEN 'erectors' THEN 'lower_back'
    
    -- Shoulder mappings
    WHEN 'shoulders' THEN 'side_delts'
    WHEN 'deltoids' THEN 'side_delts'
    WHEN 'delts' THEN 'side_delts'
    WHEN 'front delts' THEN 'front_delts'
    WHEN 'anterior deltoid' THEN 'front_delts'
    WHEN 'side delts' THEN 'side_delts'
    WHEN 'lateral deltoid' THEN 'side_delts'
    WHEN 'rear delts' THEN 'rear_delts'
    WHEN 'posterior deltoid' THEN 'rear_delts'
    
    -- Arm mappings (already correct IDs)
    WHEN 'biceps' THEN 'biceps'
    WHEN 'bicep' THEN 'biceps'
    WHEN 'triceps' THEN 'triceps'
    WHEN 'tricep' THEN 'triceps'
    WHEN 'forearms' THEN 'forearms'
    WHEN 'forearm' THEN 'forearms'
    WHEN 'brachialis' THEN 'biceps'
    WHEN 'brachioradialis' THEN 'forearms'
    
    -- Core mappings
    WHEN 'core' THEN 'upper_abs'
    WHEN 'abs' THEN 'upper_abs'
    WHEN 'abdominals' THEN 'upper_abs'
    WHEN 'rectus abdominis' THEN 'upper_abs'
    WHEN 'lower abs' THEN 'lower_abs'
    WHEN 'obliques' THEN 'obliques'
    WHEN 'external obliques' THEN 'obliques'
    WHEN 'internal obliques' THEN 'obliques'
    
    -- Leg mappings
    WHEN 'quads' THEN 'quads'
    WHEN 'quadriceps' THEN 'quads'
    WHEN 'legs' THEN 'quads'
    WHEN 'thighs' THEN 'quads'
    WHEN 'hamstrings' THEN 'hamstrings'
    WHEN 'hamstring' THEN 'hamstrings'
    WHEN 'glutes' THEN 'glutes'
    WHEN 'gluteus' THEN 'glutes'
    WHEN 'gluteus maximus' THEN 'glutes'
    WHEN 'hip flexors' THEN 'hip_flexors'
    WHEN 'hip' THEN 'glutes'
    WHEN 'hips' THEN 'glutes'
    WHEN 'adductors' THEN 'adductors'
    WHEN 'inner thigh' THEN 'adductors'
    
    -- Calf mappings
    WHEN 'calves' THEN 'gastrocnemius'
    WHEN 'calf' THEN 'gastrocnemius'
    WHEN 'gastrocnemius' THEN 'gastrocnemius'
    WHEN 'soleus' THEN 'soleus'
    
    -- Neck mappings
    WHEN 'neck' THEN 'neck_flexors'
    WHEN 'sternocleidomastoid' THEN 'neck_flexors'
    
    -- If already a valid ID or unknown, return as-is
    ELSE lower(trim(muscle_name))
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update primary_muscles in exercises table
UPDATE public.exercises
SET primary_muscles = (
  SELECT array_agg(DISTINCT migrate_muscle_name(muscle))
  FROM unnest(primary_muscles) AS muscle
  WHERE muscle IS NOT NULL AND muscle != ''
)
WHERE primary_muscles IS NOT NULL AND array_length(primary_muscles, 1) > 0;

-- Update secondary_muscles in exercises table
UPDATE public.exercises
SET secondary_muscles = (
  SELECT array_agg(DISTINCT migrate_muscle_name(muscle))
  FROM unnest(secondary_muscles) AS muscle
  WHERE muscle IS NOT NULL AND muscle != ''
)
WHERE secondary_muscles IS NOT NULL AND array_length(secondary_muscles, 1) > 0;

-- Update primary_muscles_targeted in workouts table (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts' 
    AND column_name = 'primary_muscles_targeted'
  ) THEN
    UPDATE public.workouts
    SET primary_muscles_targeted = (
      SELECT array_agg(DISTINCT migrate_muscle_name(muscle))
      FROM unnest(primary_muscles_targeted) AS muscle
      WHERE muscle IS NOT NULL AND muscle != ''
    )
    WHERE primary_muscles_targeted IS NOT NULL AND array_length(primary_muscles_targeted, 1) > 0;
  END IF;
END $$;

-- Log the migration
DO $$
DECLARE
  exercise_count INTEGER;
  workout_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exercise_count FROM public.exercises;
  SELECT COUNT(*) INTO workout_count FROM public.workouts;
  RAISE NOTICE 'Muscle taxonomy migration complete: % exercises, % workouts updated', exercise_count, workout_count;
END $$;

-- Optionally drop the function after migration (uncomment if you want to clean up)
-- DROP FUNCTION IF EXISTS migrate_muscle_name(TEXT);

-- ============================================================================
-- VERIFICATION QUERIES (run manually to check results)
-- ============================================================================
-- 
-- Check unique muscle values after migration:
-- SELECT DISTINCT unnest(primary_muscles) as muscle FROM public.exercises ORDER BY muscle;
-- 
-- Check if any old values remain:
-- SELECT DISTINCT unnest(primary_muscles) as muscle 
-- FROM public.exercises 
-- WHERE unnest(primary_muscles) IN ('chest', 'shoulders', 'back', 'core', 'legs');
