-- ============================================================================
-- DATABASE CLEANUP - Remove Unused Tables and Columns
-- ============================================================================
-- This migration removes unused tables, columns, and functions identified
-- through codebase analysis. Run this after backing up your database.
-- ============================================================================

-- ============================================================================
-- 1. DROP UNUSED TABLES
-- ============================================================================

-- Drop rate_limits table (not used - app uses in-memory rate limiting)
DROP TABLE IF EXISTS rate_limits CASCADE;

-- Drop schema_version table (not used - Supabase has built-in migration tracking)
DROP TABLE IF EXISTS schema_version CASCADE;

-- ============================================================================
-- 2. DROP UNUSED BACKUP FUNCTION
-- ============================================================================

-- Drop backup function that's never called
DROP FUNCTION IF EXISTS get_measurements_summary_backup(UUID);

-- ============================================================================
-- 3. REMOVE UNUSED COLUMNS FROM workouts TABLE
-- ============================================================================

-- Remove duplicate/unused columns added in 20250623_exercise_database.sql
ALTER TABLE workouts 
  DROP COLUMN IF EXISTS primary_muscles_targeted,
  DROP COLUMN IF EXISTS total_sets,
  DROP COLUMN IF EXISTS total_exercises,
  DROP COLUMN IF EXISTS estimated_duration_minutes; -- Duplicate of total_duration_minutes

-- Fix equipment_needed: The 20250623 migration incorrectly changed it from TEXT to TEXT[]
-- We need to restore it to TEXT as the original schema and app code expect
DO $$ 
BEGIN
  -- Check if equipment_needed exists and is TEXT[] type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'workouts' 
      AND column_name = 'equipment_needed' 
      AND data_type = 'ARRAY'
  ) THEN
    -- Drop the TEXT[] version and recreate as TEXT
    ALTER TABLE workouts DROP COLUMN equipment_needed;
    ALTER TABLE workouts ADD COLUMN equipment_needed TEXT NOT NULL DEFAULT '';
    
    RAISE NOTICE 'Restored workouts.equipment_needed from TEXT[] to TEXT';
  ELSIF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'workouts' 
      AND column_name = 'equipment_needed'
  ) THEN
    -- Column doesn't exist at all, create it as TEXT
    ALTER TABLE workouts ADD COLUMN equipment_needed TEXT NOT NULL DEFAULT '';
    
    RAISE NOTICE 'Created workouts.equipment_needed as TEXT';
  ELSE
    RAISE NOTICE 'workouts.equipment_needed is already TEXT';
  END IF;
END $$;

-- Drop associated constraints
ALTER TABLE workouts 
  DROP CONSTRAINT IF EXISTS check_total_sets,
  DROP CONSTRAINT IF EXISTS check_total_exercises,
  DROP CONSTRAINT IF EXISTS check_duration;

-- ============================================================================
-- 4. REMOVE UNUSED COLUMNS FROM workout_exercises TABLE
-- ============================================================================

-- Remove weight recommendation columns (never populated or used)
ALTER TABLE workout_exercises 
  DROP COLUMN IF EXISTS weight_recommendation_type,
  DROP COLUMN IF EXISTS weight_recommendation_value;

-- ============================================================================
-- 5. FIX DATA TYPE MISMATCH - workout_exercises.reps
-- ============================================================================

-- The schema defines reps as INTEGER, but the app uses TEXT (e.g., "10-12")
-- First, check if column exists and its type
DO $$ 
BEGIN
  -- Check if reps column is INTEGER type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'workout_exercises' 
      AND column_name = 'reps' 
      AND data_type = 'integer'
  ) THEN
    -- Convert INTEGER to TEXT
    ALTER TABLE workout_exercises 
      ALTER COLUMN reps TYPE TEXT USING reps::TEXT;
    
    RAISE NOTICE 'Converted workout_exercises.reps from INTEGER to TEXT';
  ELSE
    RAISE NOTICE 'workout_exercises.reps is already TEXT or does not exist';
  END IF;
END $$;

-- Remove the check constraint if it exists (it expects INTEGER)
ALTER TABLE workout_exercises 
  DROP CONSTRAINT IF EXISTS workout_exercises_reps_check;

-- ============================================================================
-- 6. REMOVE UNUSED COLUMNS FROM exercises TABLE
-- ============================================================================

-- Remove movement_type (never queried or filtered)
ALTER TABLE exercises 
  DROP COLUMN IF EXISTS movement_type;

-- ============================================================================
-- 7. OPTIONAL: REMOVE LOW-USAGE COLUMNS (Uncomment if you want to remove)
-- ============================================================================

-- Uncomment these if you're certain you won't use these features:

-- Remove difficulty from exercises (stored but not displayed/filtered)
-- ALTER TABLE exercises DROP COLUMN IF EXISTS difficulty;

-- Remove instructions from exercises (stored but not prominently displayed)
-- ALTER TABLE exercises DROP COLUMN IF EXISTS instructions;

-- Remove old primary_muscle column if it exists (replaced by primary_muscles array)
-- ALTER TABLE exercises DROP COLUMN IF EXISTS primary_muscle;

-- ============================================================================
-- 8. OPTIONAL: REMOVE UNDERUTILIZED TABLES (Uncomment if features abandoned)
-- ============================================================================

-- Only uncomment if you're certain you won't use AI health analysis features:

-- DROP TABLE IF EXISTS health_analyses CASCADE;
-- DROP TABLE IF EXISTS health_kpis CASCADE;

-- ============================================================================
-- 9. ANALYZE TABLES (Update Statistics)
-- ============================================================================

-- Update statistics after cleanup (ANALYZE works in transactions, VACUUM doesn't)
ANALYZE workouts;
ANALYZE workout_exercises;
ANALYZE exercises;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================
-- Removed:
--   - 2 unused tables (rate_limits, schema_version)
--   - 1 unused backup function
--   - 5 unused columns from workouts table
--   - 2 unused columns from workout_exercises table
--   - 1 unused column from exercises table
--   - Fixed reps column data type mismatch
--
-- NOTE: To reclaim disk space, run VACUUM manually after this migration:
--   VACUUM workouts;
--   VACUUM workout_exercises;
--   VACUUM exercises;
-- ============================================================================
