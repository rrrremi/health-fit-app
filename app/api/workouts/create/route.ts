import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Exercise {
  name: string
  sets: number
  reps: number
  rest_time_seconds: number
}

interface CreateWorkoutRequest {
  name: string
  exercises: Exercise[]
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: CreateWorkoutRequest = await request.json()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating workout for user:', user.id)
      console.log('Request body:', JSON.stringify(body, null, 2))
    }
    
    // Validation
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Workout name is required' }, { status: 400 })
    }

    if (!body.exercises || !Array.isArray(body.exercises) || body.exercises.length === 0) {
      return NextResponse.json({ error: 'At least one exercise is required' }, { status: 400 })
    }

    if (body.exercises.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 exercises allowed' }, { status: 400 })
    }

    // Validate each exercise
    for (const exercise of body.exercises) {
      if (!exercise.name || typeof exercise.name !== 'string') {
        return NextResponse.json({ error: 'Invalid exercise name' }, { status: 400 })
      }
      if (!exercise.sets || exercise.sets < 1 || exercise.sets > 10) {
        return NextResponse.json({ error: 'Sets must be between 1 and 10' }, { status: 400 })
      }
      if (!exercise.reps || exercise.reps < 1 || exercise.reps > 100) {
        return NextResponse.json({ error: 'Reps must be between 1 and 100' }, { status: 400 })
      }
      if (exercise.rest_time_seconds < 0 || exercise.rest_time_seconds > 300) {
        return NextResponse.json({ error: 'Rest time must be between 0 and 300 seconds' }, { status: 400 })
      }
    }

    // Calculate total duration (rough estimate)
    const totalDuration = body.exercises.reduce((total, ex) => {
      // Estimate: 3 seconds per rep + rest time per set
      const exerciseTime = (ex.sets * ex.reps * 3) + (ex.sets * ex.rest_time_seconds)
      return total + exerciseTime
    }, 0)
    const totalDurationMinutes = Math.ceil(totalDuration / 60)

    // Use provided workout name
    const workoutName = body.name.trim()

    // Extract muscle groups from exercise names (simple heuristic)
    const muscleKeywords = ['chest', 'back', 'legs', 'shoulders', 'arms', 'biceps', 'triceps', 'abs', 'core', 'glutes', 'quads', 'hamstrings', 'calves']
    const detectedMuscles = new Set<string>()
    
    body.exercises.forEach(ex => {
      const nameLower = ex.name.toLowerCase()
      muscleKeywords.forEach(muscle => {
        if (nameLower.includes(muscle)) {
          detectedMuscles.add(muscle)
        }
      })
    })

    const muscleFocus = detectedMuscles.size > 0 
      ? Array.from(detectedMuscles).slice(0, 3)
      : ['full body']

    // Create workout data structure
    const workoutData = {
      exercises: body.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rest_time_seconds: ex.rest_time_seconds,
        rationale: null // User-created workouts don't have AI rationale
      }))
    }

    // Derive joint groups from muscle groups (simple mapping)
    const jointGroups = muscleFocus.map(muscle => {
      const jointMap: Record<string, string> = {
        'chest': 'shoulder',
        'back': 'shoulder',
        'shoulders': 'shoulder',
        'biceps': 'elbow',
        'triceps': 'elbow',
        'legs': 'knee',
        'quads': 'knee',
        'hamstrings': 'knee',
        'glutes': 'hip',
        'calves': 'ankle',
        'abs': 'spine',
        'core': 'spine'
      }
      return jointMap[muscle] || 'full body'
    })
    const uniqueJointGroups = Array.from(new Set(jointGroups))

    // Insert workout into database
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: workoutName,
        total_duration_minutes: totalDurationMinutes,
        muscle_focus: muscleFocus,
        muscle_groups_targeted: muscleFocus.join(', '), // Convert array to string
        joint_groups_affected: uniqueJointGroups.join(', '), // Convert array to string
        equipment_needed: 'User-defined', // Manual workouts don't specify equipment
        raw_ai_response: JSON.stringify({ source: 'manual', exercises: body.exercises }), // Store manual creation info
        workout_focus: ['custom'],
        workout_data: workoutData,
        status: 'new'
      })
      .select()
      .single()

    if (workoutError) {
      console.error('Error creating workout:', workoutError)
      console.error('Workout data:', { user_id: user.id, name: workoutName, total_duration_minutes: totalDurationMinutes, muscle_focus: muscleFocus, workout_focus: ['custom'], workout_data: workoutData, status: 'new' })
      return NextResponse.json({ error: `Failed to create workout: ${workoutError.message}` }, { status: 500 })
    }

    // Create workout_exercises entries
    // Batch lookup exercise IDs to avoid N+1 queries
    const exerciseNames = body.exercises.map(e => e.name)
    const { data: exercisesData, error: exercisesLookupError } = await supabase
      .from('exercises')
      .select('id, name')
      .in('name', exerciseNames)
    
    if (exercisesLookupError) {
      console.error('Error looking up exercises:', exercisesLookupError)
    }
    
    // Create a map for quick lookup
    const exerciseNameToId = new Map<string, string>()
    if (exercisesData) {
      exercisesData.forEach(ex => exerciseNameToId.set(ex.name, ex.id))
    }
    
    const exerciseIds = body.exercises.map(exercise => {
      const id = exerciseNameToId.get(exercise.name)
      if (!id && process.env.NODE_ENV === 'development') {
        console.log(`Exercise not found: ${exercise.name}`)
      }
      return id || null
    })
    
    // Filter out any null values (exercises not found)
    const workoutExercises = body.exercises
      .map((exercise, index) => ({
        workout_id: workout.id,
        exercise_id: exerciseIds[index],
        sets: exercise.sets,
        reps: exercise.reps,
        rest_seconds: exercise.rest_time_seconds,
        order_index: index,
        rationale: null
      }))
      .filter(ex => ex.exercise_id !== null)

    if (workoutExercises.length === 0) {
      // Rollback: delete the workout
      await supabase.from('workouts').delete().eq('id', workout.id)
      return NextResponse.json({ error: 'No valid exercises found in database' }, { status: 400 })
    }

    const { error: exercisesError } = await supabase
      .from('workout_exercises')
      .insert(workoutExercises)

    if (exercisesError) {
      console.error('Error creating workout exercises:', exercisesError)
      console.error('Exercise data:', workoutExercises)
      // Rollback: delete the workout
      await supabase.from('workouts').delete().eq('id', workout.id)
      return NextResponse.json({ error: `Failed to create workout exercises: ${exercisesError.message}` }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      workout 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in create workout API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
