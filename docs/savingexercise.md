# Exercise Database Implementation Guide

## Overview
This guide details the implementation of an exercise database system that automatically captures and stores exercises from AI-generated workouts. The system prevents duplicates using a simple word-sorting algorithm and enriches the workout data model.

## 1. Database Schema Changes

### 1.1 Create Exercises Table

Create a new table to store unique exercises:

```sql
-- Create the exercises table
CREATE TABLE public.exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  search_key TEXT UNIQUE NOT NULL,
  primary_muscles TEXT[] NOT NULL,
  secondary_muscles TEXT[],
  equipment TEXT,
  movement_type TEXT CHECK (movement_type IN ('compound', 'isolation', NULL)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for fast lookups
CREATE UNIQUE INDEX exercises_search_key_idx ON public.exercises(search_key);
CREATE INDEX exercises_equipment_idx ON public.exercises(equipment);
CREATE INDEX exercises_primary_muscles_idx ON public.exercises USING GIN(primary_muscles);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read exercises
CREATE POLICY "Exercises are viewable by everyone" 
  ON public.exercises FOR SELECT 
  USING (true);

-- Policy: Only authenticated users can insert
CREATE POLICY "Authenticated users can insert exercises" 
  ON public.exercises FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
```

### 1.2 Create Workout_Exercises Junction Table

This table links workouts to exercises with specific parameters:

```sql
-- Create workout_exercises junction table
CREATE TABLE public.workout_exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER NOT NULL,
  
  -- Exercise parameters for this specific workout
  sets INTEGER NOT NULL CHECK (sets > 0 AND sets <= 10),
  reps INTEGER NOT NULL CHECK (reps > 0 AND reps <= 100),
  rest_seconds INTEGER NOT NULL CHECK (rest_seconds >= 0 AND rest_seconds <= 600),
  
  -- Weight recommendation from AI
  weight_unit TEXT DEFAULT 'lbs' CHECK (weight_unit IN ('lbs', 'kg')),
  weight_recommendation_type TEXT CHECK (weight_recommendation_type IN ('absolute', 'bodyweight_percentage')),
  weight_recommendation_value DECIMAL CHECK (weight_recommendation_value >= 0),
  
  -- AI rationale for including this exercise
  rationale TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure unique exercise order within a workout
  UNIQUE(workout_id, order_index)
);

-- Create indexes
CREATE INDEX workout_exercises_workout_id_idx ON public.workout_exercises(workout_id);
CREATE INDEX workout_exercises_exercise_id_idx ON public.workout_exercises(exercise_id);

-- Enable RLS
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own workout exercises
CREATE POLICY "Users can view their own workout exercises" 
  ON public.workout_exercises FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE workouts.id = workout_exercises.workout_id 
      AND workouts.user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own workout exercises
CREATE POLICY "Users can insert their own workout exercises" 
  ON public.workout_exercises FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE workouts.id = workout_exercises.workout_id 
      AND workouts.user_id = auth.uid()
    )
  );
```

### 1.3 Update Existing Workouts Table

Add summary fields to the workouts table:

```sql
-- Add new columns to workouts table
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS
  total_sets INTEGER,
  total_exercises INTEGER,
  estimated_duration_minutes INTEGER,
  primary_muscles_targeted TEXT[],
  equipment_needed TEXT[];

-- Add check constraints
ALTER TABLE public.workouts 
  ADD CONSTRAINT check_total_sets CHECK (total_sets IS NULL OR total_sets > 0),
  ADD CONSTRAINT check_total_exercises CHECK (total_exercises IS NULL OR total_exercises > 0),
  ADD CONSTRAINT check_duration CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0);
```

## 2. Updated AI Prompt

Replace the existing workout generation prompt with this enhanced version:

```typescript
const WORKOUT_GENERATION_PROMPT = `
You are a professional fitness coach and exercise scientist god. Generate a perfect workout for a user based on the following data inputs. Use logic, safety, goal alignment, and biomechanics understanding, fitness understanding, sport science understanding.

USER REQUIREMENTS:
- MUSCLE_FOCUS: {muscle_focus}
- WORKOUT_FOCUS: {workout_focus}
- EXERCISE_COUNT: {exercise_count}
- SPECIAL_INSTRUCTIONS: {special_instructions}

------------------------------
TASK:
1. Select exercises that:
   ✅ Avoid contraindications based on injuries/conditions if risky
   ✅ Focus on prioritized body parts across the plan, but don't overlook mistakes
   ✅ Respect fatigue, avoid overloading same joints in sequence
   ✅ Include scalable or regression-friendly options if needed
   ✅ Include reps info in a single number
   ✅ Focus on exercises that are most effective, where benefit to reward ratio is high

2. For each workout:
   - Generate exercises in smart order that reflects best practices based on science
   - Include sets and reps
   - Provide rest time in seconds
   - Add short rationale: recommended intensity for particular focus for this exercise; what is alternative/variable/angles advices or comment

------------------------------
REVIEW RULES:
- Verify all selected exercises follow the user's constraints and goals and choices
- Cross-check for excessive fatigue on same joints (e.g. avoid 3 knee-heavy exercises back to back)
- Avoid high technical difficulty unless justified by user experience
- Ensure that reps and sets are matching user goals and settings
- Ensure balance across muscle groups and plane of movement over the plan
- Ensure you are not making mistakes, doubles - run the whole check to ensure quality
- Do not do more than asked for; do not hallucinate

------------------------------
CRITICAL FORMATTING RULES:
1. Exercise names must follow this exact format: [Equipment] [Exercise Name]
   - Correct: "Barbell Bench Press", "Dumbbell Shoulder Press"
   - Wrong: "Bench Press", "Press with Barbell"

2. Equipment terms you MUST use:
   - Barbell
   - Dumbbell  
   - Cable
   - Machine
   - Bodyweight
   - Kettlebell
   - Resistance Band
   - EZ Bar

3. Be consistent with exercise names:
   - Always "Romanian Deadlift" not "RDL"
   - Always "Bench Press" not "Chest Press" (unless it's "Machine Chest Press")
   - Always include the movement pattern

REQUIRED JSON RESPONSE FORMAT - You must return ONLY this JSON structure with no additional text:

{
  "workout": {
    "summary": {
      "total_sets": [sum of all sets across all exercises],
      "estimated_duration_minutes": [realistic estimate including rest],
      "primary_muscles_worked": ["muscle1", "muscle2"],
      "equipment_needed": ["barbell", "dumbbells"]
    },
    "exercises": [
      {
        "name": "[Equipment] [Exercise Name]",
        "primary_muscles": ["chest"],
        "secondary_muscles": ["shoulders", "triceps"],
        "equipment": "barbell",
        "movement_type": "compound",
        "sets": 3,
        "reps": 10,
        "rest_seconds": 90,
        "weight_recommendation": {
          "type": "bodyweight_percentage",
          "value": 0.6,
          "unit": "lbs"
        },
        "rationale": "For hypertrophy focus: 3x10 @ RPE 7-8. Alternative: Dumbbell Bench Press for better ROM. Try incline angle (30°) to target upper chest. Progress by adding 5lbs when all sets completed with good form."
      }
    ]
  }
}

Rules for weight_recommendation:
- For bodyweight exercises: type = "bodyweight_percentage", value = 1.0
- For weighted exercises: type = "absolute" OR "bodyweight_percentage"
- Always include unit as "lbs" or "kg"

Rules for rationale:
- Must include intensity recommendation for the workout focus
- Must suggest at least one alternative exercise
- Include form tips, angle variations, or progression advice
- Keep under 200 characters

Ensure exactly {exercise_count} exercises are returned.`;
```

## 3. API Route Implementation

### 3.1 Exercise Matching Function

Create a utility function for exercise name matching:

```typescript
// File: lib/exercises/matcher.ts

export function createSearchKey(exerciseName: string): string {
  // Convert to lowercase, remove non-letters, split into words, sort, and join
  return exerciseName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')  // Keep only letters and spaces
    .split(/\s+/)              // Split by whitespace
    .filter(word => word.length > 0)  // Remove empty strings
    .sort()                    // Sort alphabetically
    .join('');                 // Join with no separator
}

// Examples:
// "Barbell Bench Press" → "barbellbenchpress"
// "Bench Press Barbell" → "barbellbenchpress"
// "BENCH-PRESS (Barbell)" → "barbellbenchpress"
```

### 3.2 Exercise Database Operations

Create functions to handle exercise operations:

```typescript
// File: lib/exercises/operations.ts

import { createSearchKey } from './matcher';
import { supabase } from '@/lib/supabase';

interface ExerciseData {
  name: string;
  primary_muscles: string[];
  secondary_muscles?: string[];
  equipment: string;
  movement_type?: string;
}

export async function findOrCreateExercise(exerciseData: ExerciseData) {
  const searchKey = createSearchKey(exerciseData.name);
  
  // First, try to find existing exercise
  const { data: existingExercise, error: findError } = await supabase
    .from('exercises')
    .select('*')
    .eq('search_key', searchKey)
    .single();
  
  // If found, return it
  if (existingExercise && !findError) {
    return { exercise: existingExercise, created: false };
  }
  
  // If not found (404 error is expected), create new exercise
  if (findError && findError.code === 'PGRST116') {
    const { data: newExercise, error: createError } = await supabase
      .from('exercises')
      .insert({
        name: exerciseData.name,
        search_key: searchKey,
        primary_muscles: exerciseData.primary_muscles,
        secondary_muscles: exerciseData.secondary_muscles || [],
        equipment: exerciseData.equipment.toLowerCase(),
        movement_type: exerciseData.movement_type
      })
      .select()
      .single();
    
    if (createError) {
      throw new Error(`Failed to create exercise: ${createError.message}`);
    }
    
    return { exercise: newExercise, created: true };
  }
  
  // Any other error
  throw new Error(`Database error: ${findError?.message}`);
}
```

### 3.3 Updated Workout Generation API Route

Update the workout generation endpoint:

```typescript
// File: app/api/workouts/generate/route.ts

import { createClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';
import { findOrCreateExercise } from '@/lib/exercises/operations';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Authentication check
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { muscle_focus, workout_focus, exercise_count, special_instructions } = body;

    // 3. Build prompt with user inputs
    const prompt = WORKOUT_GENERATION_PROMPT
      .replace('{muscle_focus}', muscle_focus.join(', '))
      .replace('{workout_focus}', workout_focus)
      .replace('{exercise_count}', exercise_count.toString())
      .replace('{special_instructions}', special_instructions || 'None');

    // 4. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a fitness expert. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    // 5. Parse AI response
    const aiResponse = completion.choices[0].message.content;
    let workoutData;
    
    try {
      workoutData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    // 6. Validate response structure
    if (!workoutData.workout?.exercises?.length) {
      return NextResponse.json({ error: 'Invalid workout structure' }, { status: 500 });
    }

    // 7. Process exercises and build relationships
    const exerciseRelations = [];
    let totalSets = 0;
    
    for (let i = 0; i < workoutData.workout.exercises.length; i++) {
      const exerciseData = workoutData.workout.exercises[i];
      
      // Find or create exercise in database
      const { exercise } = await findOrCreateExercise({
        name: exerciseData.name,
        primary_muscles: exerciseData.primary_muscles,
        secondary_muscles: exerciseData.secondary_muscles,
        equipment: exerciseData.equipment,
        movement_type: exerciseData.movement_type
      });
      
      // Calculate total sets
      totalSets += exerciseData.sets;
      
      // Prepare relation data
      exerciseRelations.push({
        exercise_id: exercise.id,
        order_index: i,
        sets: exerciseData.sets,
        reps: exerciseData.reps,
        rest_seconds: exerciseData.rest_seconds,
        weight_recommendation_type: exerciseData.weight_recommendation.type,
        weight_recommendation_value: exerciseData.weight_recommendation.value,
        weight_unit: exerciseData.weight_recommendation.unit,
        rationale: exerciseData.rationale
      });
    }

    // 8. Create workout record
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        muscle_focus: muscle_focus,
        workout_focus: workout_focus,
        exercise_count: exercise_count,
        special_instructions: special_instructions,
        workout_data: workoutData,
        
        // Summary fields
        total_sets: totalSets,
        total_exercises: exerciseRelations.length,
        estimated_duration_minutes: workoutData.workout.summary.estimated_duration_minutes,
        primary_muscles_targeted: workoutData.workout.summary.primary_muscles_worked,
        equipment_needed: workoutData.workout.summary.equipment_needed
      })
      .select()
      .single();

    if (workoutError) {
      throw new Error(`Failed to create workout: ${workoutError.message}`);
    }

    // 9. Create workout-exercise relationships
    const workoutExercises = exerciseRelations.map(relation => ({
      ...relation,
      workout_id: workout.id
    }));

    const { error: relationsError } = await supabase
      .from('workout_exercises')
      .insert(workoutExercises);

    if (relationsError) {
      // Rollback workout creation if relations fail
      await supabase.from('workouts').delete().eq('id', workout.id);
      throw new Error(`Failed to create exercise relations: ${relationsError.message}`);
    }

    // 10. Return success response
    return NextResponse.json({
      success: true,
      workout_id: workout.id,
      exercise_count: exerciseRelations.length,
      total_sets: totalSets
    });

  } catch (error) {
    console.error('Workout generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate workout' },
      { status: 500 }
    );
  }
}
```

## 4. Testing Instructions

### 4.1 Test the Database Schema
1. Run all SQL migrations in order
2. Verify tables are created with proper constraints
3. Test RLS policies with different user roles

### 4.2 Test Exercise Matching
```typescript
// Test cases for the search key function:
console.log(createSearchKey("Barbell Bench Press")); // "barbellbenchpress"
console.log(createSearchKey("Bench Press Barbell")); // "barbellbenchpress"
console.log(createSearchKey("BENCH-PRESS (Barbell)")); // "barbellbenchpress"
console.log(createSearchKey("DB Shoulder Press")); // "dbpressshoulder"
```

### 4.3 Test API Endpoint
1. Generate multiple workouts with same muscle groups
2. Verify exercises are not duplicated in database
3. Check that workout_exercises table has correct relations
4. Verify all fields are properly saved

### 4.4 Verify Data Integrity
- Exercises should have unique search_keys
- Workout_exercises should reference valid exercises
- All required fields should be populated
- No orphaned records

## 5. Error Handling

The implementation handles these error cases:
1. **Invalid AI response**: Returns 500 with clear error
2. **Database errors**: Proper rollback of partial data
3. **Authentication failures**: Returns 401
4. **Duplicate exercises**: Handled gracefully by reusing existing
5. **Network timeouts**: Should be handled by your API infrastructure

## 6. Future Considerations

After this implementation is working:
1. Add a background job to clean up any orphaned exercises
2. Implement exercise analytics (most used, by muscle group, etc.)
3. Add exercise aliases table for common abbreviations
4. Create admin interface to manage exercise database
5. Add exercise categories and tags for better organization

## Success Criteria

The implementation is successful when:
- [ ] AI generates workouts with properly formatted exercise names
- [ ] Each unique exercise is saved only once in the database
- [ ] Exercise variations (different word order) map to same exercise
- [ ] Workout-exercise relationships are properly created
- [ ] All exercise metadata from AI is preserved
- [ ] No duplicate exercises are created during multiple workout generations