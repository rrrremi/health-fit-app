# URGENT FIX: equipment_needed Column Missing

## Problem
The `equipment_needed` column in the `workouts` table is missing or has the wrong data type, causing the error:
```
Could not find the 'equipment_needed' column of 'workouts' in the schema cache
```

## Root Cause
1. Original migration (`20250605_workout_generator.sql`) created `equipment_needed` as **TEXT**
2. Later migration (`20250623_exercise_database.sql`) added `equipment_needed` as **TEXT[]** (array), overwriting the original
3. Cleanup migration (`cleanup_unused_schema.sql`) dropped the column entirely

## Solution
Run the following SQL in your Supabase SQL Editor to restore the column:

### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query
4. Copy and paste the SQL below
5. Click "Run"

### Option 2: Via Supabase CLI
```bash
# If you have supabase CLI linked
npx supabase db execute --file supabase/migrations/fix_equipment_needed.sql
```

## SQL to Execute

```sql
-- Fix equipment_needed column in workouts table
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
```

## Verification
After running the SQL, verify the fix by running:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'workouts' 
  AND column_name = 'equipment_needed';
```

Expected result:
- `column_name`: equipment_needed
- `data_type`: text
- `is_nullable`: NO

## After Applying the Fix
1. Restart your Next.js development server
2. Try generating a workout again
3. The error should be resolved

## Files Updated
- ✅ `supabase/migrations/cleanup_unused_schema.sql` - Updated to restore column instead of dropping it
- ✅ `supabase/migrations/fix_equipment_needed.sql` - Standalone hotfix migration created
- ✅ `scripts/fix-equipment-needed.js` - Script to apply fix (requires manual SQL execution)
