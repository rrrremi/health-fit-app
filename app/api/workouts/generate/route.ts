import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWorkout } from '@/lib/openai';
import { WorkoutGenerationRequest } from '@/types/workout';
import { findOrCreateExercise } from '@/lib/exercises/database';
import { linkExerciseToWorkout, calculateWorkoutSummary } from '@/lib/exercises/operations';
import { sanitizeSpecialInstructions, sanitizeWorkoutName } from '@/lib/utils/sanitize';
import { deriveMuscleFocusFromExercises } from '@/lib/workouts/muscleFocus';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (_jsonError) {
    return 'Unknown error';
  }
};

// Rate limit: 100 generations per day per user
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin (admins bypass rate limits)
    let isAdmin = false;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      isAdmin = profile?.is_admin || false;
    } catch (error) {
      // If admin check fails, continue with rate limiting (fail closed)
      console.error('Error checking admin status:', error);
    }
    
    // Apply rate limit only for non-admin users
    if (!isAdmin) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - RATE_LIMIT_WINDOW);
      
      const { count } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', yesterday.toISOString());
      
      if (count && count >= RATE_LIMIT) {
        return NextResponse.json(
          { error: `Rate limit exceeded. You can generate up to ${RATE_LIMIT} workouts per day.` },
          { status: 429 }
        );
      }
    }
    
    // Parse request body
    const requestData: WorkoutGenerationRequest & { excludeExercises?: string[] } = await request.json();
    
    // Sanitize user input immediately
    if (requestData.specialInstructions) {
      requestData.specialInstructions = sanitizeSpecialInstructions(requestData.specialInstructions);
    }
    
    // Final safety check: ensure specialInstructions doesn't exceed 140 chars
    if (requestData.specialInstructions && requestData.specialInstructions.length > 140) {
      requestData.specialInstructions = requestData.specialInstructions.substring(0, 137) + '...';
    }
    
    // Validate request
    if (!requestData.muscleFocus || requestData.muscleFocus.length === 0) {
      return NextResponse.json(
        { error: 'At least one muscle group must be selected' },
        { status: 400 }
      );
    }
    
    if (!requestData.workoutFocus || requestData.workoutFocus.length === 0) {
      return NextResponse.json(
        { error: 'At least one workout focus must be selected' },
        { status: 400 }
      );
    }
    
    // Validate exercise count
    if (requestData.exerciseCount < 1 || requestData.exerciseCount > 10) {
      return NextResponse.json(
        { error: 'Exercise count must be between 1 and 10' },
        { status: 400 }
      );
    }
    
    // Generate workout
    if (process.env.NODE_ENV === 'development') {
      console.log('Generating workout with parameters:', JSON.stringify({
        muscleFocus: requestData.muscleFocus,
        workoutFocus: requestData.workoutFocus,
        exerciseCount: requestData.exerciseCount,
        specialInstructions: requestData.specialInstructions,
        difficulty: requestData.difficulty
      }));
    }
    
    // Remove excludeExercises from the request before passing to generateWorkout
    // (it's already been added to specialInstructions)
    const { excludeExercises, ...workoutRequest } = requestData;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Calling generateWorkout with:', workoutRequest);
    }
    const result = await generateWorkout(workoutRequest);
    if (process.env.NODE_ENV === 'development') {
      console.log('generateWorkout result:', result.success ? 'SUCCESS' : 'FAILED', result.error || '');
    }
    
    if (!result.success || !result.data) {
      console.error('Failed to generate workout:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to generate workout' },
        { status: 500 }
      );
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Workout generated successfully');
    }
    
    try {
      // Sanitize workout name from AI response
      const workoutName = sanitizeWorkoutName(result.data.name);

      // Derive muscle focus from generated exercises, fallback to user selection if empty
      const {
        muscleFocus: derivedMuscleFocus,
        muscleGroupsTargeted: derivedMuscleGroups
      } = deriveMuscleFocusFromExercises(result.data.exercises);

      const normalizedMuscleFocus = (derivedMuscleFocus.length > 0
        ? derivedMuscleFocus
        : requestData.muscleFocus) ?? [];

      const muscleGroupsTargeted = normalizedMuscleFocus.length > 0
        ? normalizedMuscleFocus.join(', ')
        : derivedMuscleGroups;

      // Create workout in database - ONLY include fields that are definitely in the schema
      // Track regeneration metadata in raw_ai_response
      const rawResponseWithMetadata = requestData.excludeExercises && requestData.excludeExercises.length > 0
        ? JSON.stringify({
            source: 'regenerate',
            excluded_exercises: requestData.excludeExercises,
            raw_response: result.rawResponse || ''
          })
        : result.rawResponse || '';
      
      const insertData = {
        user_id: user.id,
        name: workoutName,
        total_duration_minutes: result.data.total_duration_minutes || 30,
        muscle_groups_targeted: muscleGroupsTargeted,
        joint_groups_affected: result.data.joint_groups_affected || 'Multiple joints',
        equipment_needed: result.data.equipment_needed || 'Bodyweight',
        workout_data: result.data,
        raw_ai_response: rawResponseWithMetadata,
        ai_model: 'gpt-4o-mini',
        prompt_tokens: result.usage?.promptTokens,
        completion_tokens: result.usage?.completionTokens,
        generation_time_ms: result.generationTimeMs,
        parse_attempts: result.parseAttempts || 1,
        muscle_focus: normalizedMuscleFocus,
        workout_focus: requestData.workoutFocus?.length ? requestData.workoutFocus : ['hypertrophy'],
        exercise_count: requestData.exerciseCount,
        special_instructions: requestData.specialInstructions
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Attempting to insert workout with fields:', JSON.stringify(insertData, null, 2));
      }
      
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert(insertData)
        .select()
        .single();
      
      if (workoutError) {
        console.error('Error creating workout - DETAILED ERROR:', JSON.stringify(workoutError, null, 2));
        return NextResponse.json(
          { error: `Failed to save workout to database: ${workoutError.message || workoutError.code || 'Unknown error'}` },
          { status: 500 }
        );
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Workout created with ID: ${workout.id}`);
      }
      
      // Process exercises
      const exercisePromises = [];
      
      try {
        // Process each exercise
        for (let index = 0; index < result.data.exercises.length; index++) {
          const exerciseData = result.data.exercises[index];
          // Convert rest_time_seconds to rest_seconds for database consistency
          const rest_seconds = exerciseData.rest_time_seconds;
          
          // Create or find the exercise in the database
          const { exercise, created } = await findOrCreateExercise({
            name: exerciseData.name,
            primary_muscles: exerciseData.primary_muscles || [],
            secondary_muscles: exerciseData.secondary_muscles,
            equipment: exerciseData.equipment
            // movement_type is defined in the type but not used in the database function
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`${created ? 'Created' : 'Found'} exercise: ${exercise.name} (${exercise.id})`);
          }
          
          // Sanitize and limit the rationale field
          let sanitizedRationale: string | undefined = undefined;
          if (process.env.NODE_ENV === 'development') {
            console.log('Original rationale:', exerciseData.rationale);
          }
          
          try {
            if (exerciseData.rationale) {
              // Limit rationale to 1000 characters
              sanitizedRationale = exerciseData.rationale.substring(0, 1000);
            }
          } catch (e) {
            console.error('Error processing rationale:', e);
          }
          
          // Link exercise to workout
          // Standardize reps to text column, keeping original if possible
          let repsText: string;
          if (typeof exerciseData.reps === 'number') {
            // Clamp to sensible bounds then stringify
            const clamped = Math.max(1, Math.min(100, exerciseData.reps));
            repsText = clamped.toString();
          } else if (typeof exerciseData.reps === 'string' && exerciseData.reps.trim()) {
            repsText = exerciseData.reps.trim();
          } else {
            repsText = '10';
          }
          
          const promise = linkExerciseToWorkout({
            workout_id: workout.id,
            exercise_id: exercise.id,
            order_index: index,
            sets: exerciseData.sets,
            reps: repsText,
            rest_seconds: rest_seconds,
            weight_unit: 'lbs',
            rationale: sanitizedRationale
          });
          
          exercisePromises.push(promise);
        }
        
        // Wait for all exercise links to be created
        await Promise.all(exercisePromises);
        if (process.env.NODE_ENV === 'development') {
          console.log('All exercises linked to workout');
        }
        
        // Calculate workout summary
        await calculateWorkoutSummary(workout.id);
        
        // Return the workout with exercises
        return NextResponse.json({
          success: true,
          workoutId: workout.id,
          workout: {
            ...workout,
            exercises: result.data.exercises
          }
        });
      } catch (exerciseError) {
        console.error('Error processing exercises - DETAILED ERROR:', exerciseError);
        
        // Delete the workout if exercise processing failed
        await supabase
          .from('workouts')
          .delete()
          .eq('id', workout.id);
        
        return NextResponse.json(
          { error: `Failed to process exercises: ${getErrorMessage(exerciseError)}` },
          { status: 500 }
        );
      }
    } catch (dbError) {
      console.error('Database error - DETAILED ERROR:', dbError);
      return NextResponse.json(
        { error: `Failed to save workout to database: ${getErrorMessage(dbError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating workout - DETAILED ERROR:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
