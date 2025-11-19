// Fix equipment_needed column in workouts table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixEquipmentNeeded() {
  try {
    console.log('Checking equipment_needed column status...');
    
    // Check if column exists and its type
    const { data: columnInfo, error: checkError } = await supabase.rpc('check_column_type', {
      p_table_name: 'workouts',
      p_column_name: 'equipment_needed'
    }).single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      // If function doesn't exist, create it first
      console.log('Creating helper function...');
      const { error: funcError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION check_column_type(p_table_name text, p_column_name text)
          RETURNS TABLE(data_type text, exists boolean) AS $$
          BEGIN
            RETURN QUERY
            SELECT 
              c.data_type::text,
              true
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = p_table_name
              AND c.column_name = p_column_name;
            
            IF NOT FOUND THEN
              RETURN QUERY SELECT null::text, false;
            END IF;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });
      
      if (funcError) {
        console.log('Helper function creation failed, using direct SQL approach...');
      }
    }
    
    // Apply the fix using direct SQL
    console.log('Applying fix for equipment_needed column...');
    
    const fixSql = `
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
    `;
    
    // Execute via RPC if available, otherwise provide instructions
    try {
      const { error: execError } = await supabase.rpc('exec_sql', { sql: fixSql });
      
      if (execError) {
        throw execError;
      }
      
      console.log('✅ Fix applied successfully!');
      console.log('The equipment_needed column has been restored as TEXT type.');
    } catch (rpcError) {
      console.log('\n⚠️  Could not execute SQL directly via RPC.');
      console.log('Please run the following SQL manually in your Supabase SQL Editor:\n');
      console.log('----------------------------------------');
      console.log(fixSql);
      console.log('----------------------------------------\n');
    }
    
  } catch (error) {
    console.error('Error fixing equipment_needed:', error);
    console.log('\n📋 Manual fix required. Run this SQL in Supabase SQL Editor:\n');
    console.log('----------------------------------------');
    console.log(`
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workouts' 
    AND column_name = 'equipment_needed' AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.workouts DROP COLUMN equipment_needed;
    ALTER TABLE public.workouts ADD COLUMN equipment_needed TEXT NOT NULL DEFAULT '';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workouts' 
    AND column_name = 'equipment_needed'
  ) THEN
    ALTER TABLE public.workouts ADD COLUMN equipment_needed TEXT NOT NULL DEFAULT '';
  END IF;
END $$;
    `);
    console.log('----------------------------------------\n');
  }
}

fixEquipmentNeeded();
