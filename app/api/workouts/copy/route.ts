import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateWorkoutSummary } from '@/lib/exercises/operations';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { workoutId, newName } = await request.json();
    
    if (!workoutId) {
      return NextResponse.json({ error: 'Workout ID is required' }, { status: 400 });
    }
    
    // Fetch the original workout
    const { data: originalWorkout, error: fetchError } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .eq('user_id', user.id) // Ensure user owns the workout
      .single();
    
    if (fetchError || !originalWorkout) {
      console.error('Error fetching workout:', fetchError);
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }
    
    // Generate new name if not provided
    const copiedName = newName || `${originalWorkout.name} (Copy)`;
    
    // Create the new workout (copy)
    const { data: newWorkout, error: createError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: copiedName,
        total_duration_minutes: originalWorkout.total_duration_minutes,
        muscle_groups_targeted: originalWorkout.muscle_groups_targeted,
        joint_groups_affected: originalWorkout.joint_groups_affected,
        equipment_needed: originalWorkout.equipment_needed,
        workout_data: originalWorkout.workout_data,
        raw_ai_response: JSON.stringify({
          source: 'copy',
          original_workout_id: workoutId,
          copied_at: new Date().toISOString()
        }),
        ai_model: originalWorkout.ai_model,
        muscle_focus: originalWorkout.muscle_focus,
        workout_focus: originalWorkout.workout_focus,
        exercise_count: originalWorkout.exercise_count,
        special_instructions: originalWorkout.special_instructions,
        status: 'new' // Reset status to 'new'
      })
      .select()
      .single();
    
    if (createError || !newWorkout) {
      console.error('Error creating workout copy:', createError);
      return NextResponse.json({ error: 'Failed to copy workout' }, { status: 500 });
    }
    
    // Fetch all workout_exercises from the original workout
    const { data: originalExercises, error: exercisesError } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index');
    
    if (exercisesError) {
      console.error('Error fetching workout exercises:', exercisesError);
      // Rollback: delete the newly created workout
      await supabase.from('workouts').delete().eq('id', newWorkout.id);
      return NextResponse.json({ error: 'Failed to copy workout exercises' }, { status: 500 });
    }
    
    // Copy all workout_exercises to the new workout
    if (originalExercises && originalExercises.length > 0) {
      console.log('Copying exercises:', originalExercises.length);
      console.log('Original exercises:', JSON.stringify(originalExercises, null, 2));
      
      // Only copy essential fields that exist in the schema
      const newExercises = originalExercises.map(ex => {
        const exerciseData: any = {
          workout_id: newWorkout.id,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
        };
        
        // Only add optional fields if they exist and are not null
        if (ex.duration_seconds !== null && ex.duration_seconds !== undefined) {
          exerciseData.duration_seconds = ex.duration_seconds;
        }
        if (ex.weight) exerciseData.weight = ex.weight;
        if (ex.notes) exerciseData.notes = ex.notes;
        if (ex.weight_unit) exerciseData.weight_unit = ex.weight_unit;
        if (ex.weight_recommendation_type) exerciseData.weight_recommendation_type = ex.weight_recommendation_type;
        if (ex.weight_recommendation_value) exerciseData.weight_recommendation_value = ex.weight_recommendation_value;
        if (ex.rationale) exerciseData.rationale = ex.rationale;
        
        return exerciseData;
      });
      
      console.log('Inserting exercises:', JSON.stringify(newExercises, null, 2));
      
      const { error: insertExercisesError } = await supabase
        .from('workout_exercises')
        .insert(newExercises);
      
      if (insertExercisesError) {
        console.error('Error inserting workout exercises:', insertExercisesError);
        console.error('Error code:', insertExercisesError.code);
        console.error('Error message:', insertExercisesError.message);
        console.error('Error details:', insertExercisesError.details);
        console.error('Error hint:', insertExercisesError.hint);
        // Rollback: delete the newly created workout
        await supabase.from('workouts').delete().eq('id', newWorkout.id);
        return NextResponse.json({ 
          error: 'Failed to copy workout exercises', 
          details: insertExercisesError.message,
          code: insertExercisesError.code
        }, { status: 500 });
      }
      
      console.log('Exercises copied successfully');
    }
    
    // Recalculate workout summary (duration, sets, etc.)
    await calculateWorkoutSummary(newWorkout.id);
    
    // Fetch updated workout with recalculated fields
    const { data: updatedWorkout } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', newWorkout.id)
      .single();
    
    console.log(`Workout copied successfully: ${originalWorkout.name} -> ${copiedName}`);
    
    return NextResponse.json({
      workout: updatedWorkout || newWorkout,
      message: 'Workout copied successfully'
    });
    
  } catch (error) {
    console.error('Error copying workout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to copy workout' },
      { status: 500 }
    );
  }
}
