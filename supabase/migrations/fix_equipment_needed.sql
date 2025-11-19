-- ============================================================================
-- HOTFIX: Restore equipment_needed column as TEXT
-- ============================================================================
-- This fixes the issue where equipment_needed was incorrectly changed from 
-- TEXT to TEXT[] in migration 20250623_exercise_database.sql, then dropped
-- in cleanup_unused_schema.sql, leaving the workouts table without this
-- required column.
-- ============================================================================

-- Check current state and fix equipment_needed column
DO $$ 
BEGIN
  -- Check if equipment_needed exists and is TEXT[] type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'workouts' 
      AND column_name = 'equipment_needed' 
      AND data_type = 'ARRAY'
  ) THEN
    -- Drop the TEXT[] version and recreate as TEXT
    ALTER TABLE public.workouts DROP COLUMN equipment_needed;
    ALTER TABLE public.workouts ADD COLUMN equipment_needed TEXT NOT NULL DEFAULT '';
    
    RAISE NOTICE 'Restored workouts.equipment_needed from TEXT[] to TEXT';
  ELSIF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'workouts' 
      AND column_name = 'equipment_needed'
  ) THEN
    -- Column doesn't exist at all, create it as TEXT
    ALTER TABLE public.workouts ADD COLUMN equipment_needed TEXT NOT NULL DEFAULT '';
    
    RAISE NOTICE 'Created workouts.equipment_needed as TEXT';
  ELSE
    RAISE NOTICE 'workouts.equipment_needed is already TEXT - no changes needed';
  END IF;
END $$;
