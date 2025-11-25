import { createSearchKey, extractEquipment } from './matcher';
import { createClient } from '@/lib/supabase/server';

export interface ExerciseData {
  name: string;
  primary_muscles: string[];
  secondary_muscles?: string[];
  equipment?: string;
  movement_type?: 'compound' | 'isolation';
}

export interface ExerciseRecord extends ExerciseData {
  id: string;
  search_key: string;
  created_at: string;
  updated_at: string;
}

/**
 * Find an existing exercise or create a new one based on the name
 * This function ensures only unique exercises are saved to the database
 * 
 * @param exerciseData The exercise data to find or create
 * @returns The exercise record and whether it was newly created
 */
export async function findOrCreateExercise(exerciseData: ExerciseData): Promise<{
  exercise: ExerciseRecord;
  created: boolean;
}> {
  const supabase = await createClient();
  
  try {
    // Clean up the exercise name
    const exerciseName = exerciseData.name.trim();
    
    // Create a search key based on the exercise name
    const searchKey = createSearchKey(exerciseName);
    console.log(`Processing exercise: "${exerciseName}" with search key: "${searchKey}"`);
    
    // Try to find an existing exercise with the same search key
    const { data: existingExercise, error: findError } = await supabase
      .from('exercises')
      .select('*')
      .eq('search_key', searchKey)
      .maybeSingle();
    
    // If found, return it
    if (existingExercise) {
      console.log(`Found existing exercise: "${existingExercise.name}" (ID: ${existingExercise.id})`);
      return { exercise: existingExercise as ExerciseRecord, created: false };
    }
    
    // If not found, create a new exercise
    console.log(`No existing exercise found with search key: "${searchKey}", creating new one`);
    
    // Determine equipment if not provided
    const equipment = exerciseData.equipment || extractEquipment(exerciseName);
    
    // Create the exercise data object
    const insertData = {
      name: exerciseName,
      search_key: searchKey,
      primary_muscles: exerciseData.primary_muscles,
      secondary_muscles: exerciseData.secondary_muscles || [],
      equipment: equipment.toLowerCase()
    };
    
    console.log('Inserting exercise with data:', insertData);
    
    // Create the exercise in the database
    const { data: newExercise, error: createError } = await supabase
      .from('exercises')
      .insert(insertData)
      .select()
      .single();
    
    // Handle error - if it's a unique constraint violation, try to find the exercise again
    if (createError) {
      console.log(`Error creating exercise: ${createError.message}`);
      
      if (createError.code === '23505') { // PostgreSQL unique constraint violation
        console.log('Unique constraint violation - another process may have created this exercise');
        
        // Try to find the exercise again
        const { data: retryExercise } = await supabase
          .from('exercises')
          .select('*')
          .eq('search_key', searchKey)
          .single();
          
        if (retryExercise) {
          console.log(`Found exercise on retry: "${retryExercise.name}" (ID: ${retryExercise.id})`);
          return { exercise: retryExercise as ExerciseRecord, created: false };
        }
      }
      
      // If we still have an error or couldn't find the exercise on retry, create a temporary one
      console.log('Creating temporary exercise object as fallback');
      const tempId = `temp_${Date.now()}`;
      
      // Create the temporary exercise object
      const tempExercise = {
        id: tempId,
        name: exerciseName,
        search_key: searchKey,
        primary_muscles: exerciseData.primary_muscles,
        secondary_muscles: exerciseData.secondary_muscles || [],
        equipment: equipment.toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return {
        exercise: tempExercise as ExerciseRecord,
        created: false
      };
    }
    
    console.log(`Successfully created exercise: "${newExercise.name}" (ID: ${newExercise.id})`);
    return { exercise: newExercise as ExerciseRecord, created: true };
  } catch (error) {
    console.error('Exception in findOrCreateExercise:', error);
    
    // Create a temporary exercise object as fallback
    const tempId = `temp_${Date.now()}`;
    const equipment = exerciseData.equipment || extractEquipment(exerciseData.name);
    
    // Create the temporary exercise object
    const tempExercise = {
      id: tempId,
      name: exerciseData.name,
      search_key: createSearchKey(exerciseData.name),
      primary_muscles: exerciseData.primary_muscles,
      secondary_muscles: exerciseData.secondary_muscles || [],
      equipment: equipment.toLowerCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return {
      exercise: tempExercise as ExerciseRecord,
      created: false
    };
  }
}

/**
 * Link an exercise to a workout with specific parameters
 * 
 * @param params The parameters for linking exercise to workout
 * @returns The created workout_exercise record
 */
export async function linkExerciseToWorkout(
  params: {
    workout_id: string;
    exercise_id: string;
    order_index: number;
    sets: number;
    reps: string; // Database column is TEXT to allow ranges/descriptions
    rest_seconds: number;
    duration_seconds?: number;
    weight?: string;
    notes?: string;
    weight_unit?: string;
    weight_recommendation_type?: string;
    weight_recommendation_value?: number;
    rationale?: string;
  }
) {
  const supabase = await createClient();
  
  try {
    console.log(`Linking exercise ${params.exercise_id} to workout ${params.workout_id}`);
    
    // Insert the relationship into the database
    const { data, error } = await supabase
      .from('workout_exercises')
      .insert(params)
      .select()
      .single();
    
    if (error) {
      console.error(`Error linking exercise to workout: ${error.message}`);
      throw new Error(`Failed to link exercise ${params.exercise_id} to workout ${params.workout_id}: ${error.message}`);
    }
    
    console.log(`Successfully linked exercise ${params.exercise_id} to workout ${params.workout_id}`);
    return data;
  } catch (error) {
    console.error('Exception in linkExerciseToWorkout:', error);
    
    // Create a temporary object as fallback
    throw error instanceof Error
      ? error
      : new Error(`linkExerciseToWorkout failed for workout ${params.workout_id}`);
  }
}

/**
 * Calculate workout summary fields based on exercises
 * 
 * @param workoutId The workout ID to calculate summary for
 * @returns Summary fields for the workout
 */
// Define the type for workout exercises returned from the database query
interface WorkoutExerciseWithDetails {
  exercise_id: string;
  sets: number;
  rest_seconds: number;
  exercises: {
    primary_muscles: string[];
    equipment: string;
  };
}

export async function calculateWorkoutSummary(workoutId: string) {
  const supabase = await createClient();
  
  try {
    // Get all exercises for this workout with their details
    const { data: workoutExercises, error: fetchError } = await supabase
      .from('workout_exercises')
      .select(`
        exercise_id,
        sets,
        rest_seconds,
        exercises!inner(primary_muscles, equipment)
      `)
      .eq('workout_id', workoutId) as { data: WorkoutExerciseWithDetails[] | null, error: any };
    
    if (fetchError) {
      console.error(`Error fetching workout exercises: ${fetchError.message}`);
      return;
    }
    
    if (!workoutExercises || workoutExercises.length === 0) {
      console.log(`No exercises found for workout ${workoutId}`);
      return;
    }
    
    // Calculate total sets
    const totalSets = workoutExercises.reduce((sum, ex) => sum + ex.sets, 0);
    
    // Count total exercises
    const totalExercises = workoutExercises.length;
    
    // Collect all primary muscles (with duplicates)
    const allMuscles = workoutExercises.flatMap(ex => {
      // Ensure exercises has primary_muscles and it's an array
      const muscles = ex.exercises?.primary_muscles;
      return Array.isArray(muscles) ? muscles : [];
    });
    
    // Remove duplicates to get unique targeted muscles
    const primaryMusclesTargeted = Array.from(new Set(allMuscles));
    
    // Collect unique equipment needed
    const equipmentNeeded = Array.from(new Set(
      workoutExercises
        .map(ex => ex.exercises?.equipment)
        .filter(Boolean)
    ));
    
    // Estimate duration: sets * (avg exercise time + rest time)
    // Assume average of 30 seconds per set execution
    const avgSetTimeSeconds = 30;
    const totalRestSeconds = workoutExercises.reduce((sum, ex) => sum + (ex.sets * ex.rest_seconds), 0);
    const estimatedDurationMinutes = Math.ceil(
      (totalSets * avgSetTimeSeconds + totalRestSeconds) / 60
    );
    
    // Update the workout with summary fields
    const { error: updateError } = await supabase
      .from('workouts')
      .update({
        total_sets: totalSets,
        total_exercises: totalExercises,
        total_duration_minutes: estimatedDurationMinutes,
        primary_muscles_targeted: primaryMusclesTargeted,
        equipment_needed_array: equipmentNeeded,
        estimated_duration_minutes: estimatedDurationMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', workoutId);
    
    if (updateError) {
      console.error(`Error updating workout summary: ${updateError.message}`);
    } else {
      console.log(`Successfully updated summary for workout ${workoutId}`);
    }
    
    return {
      total_sets: totalSets,
      total_exercises: totalExercises,
      primary_muscles_targeted: primaryMusclesTargeted,
      equipment_needed: equipmentNeeded,
      estimated_duration_minutes: estimatedDurationMinutes
    };
  } catch (error) {
    console.error('Exception in calculateWorkoutSummary:', error);
  }
}

/**
 * Get all exercises from the database
 * 
 * @returns Array of exercise records
 */
export async function getAllExercises() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');
  
  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get exercises filtered by primary muscles
 * 
 * @param muscles Array of muscle groups to filter by
 * @returns Array of matching exercise records
 */
export async function getExercisesByMuscles(muscles: string[]) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .contains('primary_muscles', muscles)
    .order('name');
  
  if (error) {
    throw new Error(`Failed to fetch exercises by muscles: ${error.message}`);
  }
  
  return data || [];
}
