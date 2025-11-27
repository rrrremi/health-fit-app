import OpenAI from 'openai';
import { WorkoutData } from '@/types/workout';
import { BASE_WORKOUT_PROMPT, RETRY_PROMPT_SUFFIX, focusInstructions } from './prompts/workout';
import { EXERCISE_DATABASE_PROMPT, EXERCISE_DATABASE_RETRY_PROMPT } from './prompts/exercise_database';
import { WorkoutSchema, WorkoutResponse } from './validations/workout';
import { getOpenAIClient } from './openai-client';

export const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

/**
 * Result of workout generation
 */
export interface GenerateWorkoutResult {
  success: boolean;
  data?: WorkoutData;
  error?: string;
  rawResponse?: string;
  parseAttempts?: number;
  generationTimeMs?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate a workout prompt based on user inputs
 * 
 * @param muscleFocus Array of muscle groups to focus on
 * @param workoutFocus Type of workout (hypertrophy, strength, etc)
 * @param exerciseCount Number of exercises to generate
 * @param specialInstructions Any special instructions
 * @param retry Whether this is a retry attempt
 * @param useExerciseDatabase Whether to use the enhanced exercise database prompt
 * @returns The generated prompt
 */
/**
 * Build the full prompt string that is sent to the OpenAI model.
 *
 * Design goals:
 * - Keep a stable, instruction-heavy "base" prompt (or the exercise-database variant) that encodes
 *   structure, safety and quality rules.
 * - Inject user inputs (muscle focus, workout focus, exercise count, special instructions) in a
 *   clearly labeled section so the model can condition on them.
 * - Optionally append a retry suffix that reinforces JSON constraints if the first attempt failed.
 * - Optionally use the enhanced exercise database prompt to request richer fields per exercise.
 */
export function generateWorkoutPrompt(
  muscleFocus: string[] = [], 
  workoutFocus: string[] = ['hypertrophy'], 
  exerciseCount: number = 4,
  specialInstructions: string = '',
  retry = false,
  useExerciseDatabase = true
): string {
  // 1) Start with the appropriate base prompt
  // - Standard base (BASE_WORKOUT_PROMPT) gives a simple schema and rules
  // - Exercise DB base (EXERCISE_DATABASE_PROMPT) requests additional fields
  let prompt = useExerciseDatabase ? EXERCISE_DATABASE_PROMPT : BASE_WORKOUT_PROMPT;
  
  // 2) If this is a retry attempt, append a stricter retry suffix that reiterates JSON-only output
  if (retry) {
    prompt += useExerciseDatabase ? EXERCISE_DATABASE_RETRY_PROMPT : RETRY_PROMPT_SUFFIX;
  }
  
  // 3) If no muscle focus was provided, return the base prompt as-is (model may choose muscles)
  if (muscleFocus.length === 0) {
    return prompt;
  }
  
  // 4) Pull focus-specific "coaching" rules (e.g., hypertrophy vs. strength)
  // Get the primary focus type (first in the array)
  const primaryFocusType = workoutFocus[0].toLowerCase();
  const specificInstructions = focusInstructions[primaryFocusType as keyof typeof focusInstructions] || 
    "Use balanced approach with moderate intensity, focus on proper form and technique";
  
  // Select the appropriate base prompt template
  let basePrompt = useExerciseDatabase ? EXERCISE_DATABASE_PROMPT : BASE_WORKOUT_PROMPT;
  
  // If this is a retry attempt, append a stricter retry suffix
  if (retry) {
    basePrompt += useExerciseDatabase ? EXERCISE_DATABASE_RETRY_PROMPT : RETRY_PROMPT_SUFFIX;
  }
  
  // Replace template variables with actual values
  let customPrompt = basePrompt
    .replace(/\{\{muscleFocus\}\}/g, muscleFocus.join(', '))
    .replace(/\{\{workoutFocus\}\}/g, workoutFocus.join(', '))
    .replace(/\{\{exerciseCount\}\}/g, exerciseCount.toString())
    .replace(/\{\{minExercisesForMuscle\}\}/g, Math.max(1, Math.ceil(exerciseCount * 0.6)).toString())
    .replace(/\{\{focusSpecificInstructions\}\}/g, specificInstructions);
    
  // Handle special instructions if provided
  if (specialInstructions && specialInstructions.trim()) {
    // Use a function to handle multiline matching instead of 's' flag
    customPrompt = customPrompt.replace(/\{\{#specialInstructions\}\}([\s\S]+?)\{\{\/specialInstructions\}\}/g, 
      (match, p1) => p1.replace(/\{\{specialInstructions\}\}/g, specialInstructions.trim()));
  } else {
    // Remove the special instructions placeholder if none provided
    customPrompt = customPrompt.replace(/\{\{#specialInstructions\}\}([\s\S]+?)\{\{\/specialInstructions\}\}/g, '');
  }

  return customPrompt;
}

/**
 * Generate a workout using OpenAI
 *
 * @param requestData The workout generation request data
 * @param retry Whether this is a retry attempt
 * @param useExerciseDatabase Whether to use the enhanced exercise database prompt
 * @returns The generated workout data
 */
export async function generateWorkout(
  requestData: {
    muscleFocus: string[];
    workoutFocus: string[];
    exerciseCount: number;
    specialInstructions?: string;
    difficulty?: string;
    formattedMuscleFocus?: string;  // Pre-formatted string like "back (lower back), chest"
  },
  retry = false,
  useExerciseDatabase = true
): Promise<GenerateWorkoutResult> {
  const startTime = Date.now();
  let parseAttempts = 1;
  
  try {
    // Diagnostics: the following log helps trace runtime parameters for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting workout generation with parameters:', {
        muscleFocus: requestData.muscleFocus,
        workoutFocus: requestData.workoutFocus,
        exerciseCount: requestData.exerciseCount,
        specialInstructionsLength: requestData.specialInstructions?.length || 0,
        retry,
        useExerciseDatabase
      });
    }

    // Build the final prompt string using the helper above
    // Use formattedMuscleFocus if available (includes sub-muscle details)
    const muscleFocusForPrompt = requestData.formattedMuscleFocus 
      ? [requestData.formattedMuscleFocus]  // Already formatted as descriptive string
      : requestData.muscleFocus;
    
    const prompt = generateWorkoutPrompt(
      muscleFocusForPrompt, 
      requestData.workoutFocus, 
      requestData.exerciseCount, 
      requestData.specialInstructions || '',
      retry,
      useExerciseDatabase
    );
    
    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log('Sending prompt to OpenAI (content hidden for security)');
    }
    
    // Heuristic: increase max_tokens proportionally to requested exercise count
    const baseTokens = 1000;
    const tokensPerExercise = 200;
    const maxTokens = Math.min(4000, baseTokens + (requestData.exerciseCount * tokensPerExercise));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Using max_tokens=${maxTokens} for ${requestData.exerciseCount} exercises`);
    }
    
    // Sanity-check: the singleton client should have been created above
    const openaiClient = getOpenAIClient();

    if (process.env.NODE_ENV === 'development') {
      console.log('Attempting to call OpenAI API...');
    }
    
    // Make the OpenAI call with a timeout to avoid hanging the request on network issues
    type ChatCompletion = Awaited<ReturnType<typeof openaiClient.chat.completions.create>>;
    let response: ChatCompletion;
    try {
      response = await Promise.race([
        openaiClient.chat.completions.create({
          model: DEFAULT_OPENAI_MODEL,
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.7,
          max_tokens: maxTokens,
          // @ts-ignore - response_format is supported in newer versions
          response_format: { type: "json_object" }, // Ensure response is valid JSON
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API timeout')), 30000)
        )
      ]);
      if (process.env.NODE_ENV === 'development') {
        console.log('Successfully received response from OpenAI');
      }
    } catch (apiError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error calling OpenAI API:', apiError);
        if (apiError instanceof Error) {
          console.error('Error details:', apiError.message);
          const apiErr = apiError as Error & { status?: number };
          if (apiErr.status) {
            console.error('API status code:', apiErr.status);
          }
        }
      }
      throw apiError;
    }
    
    // Parse the JSON response (model is asked to return JSON only; we still guard with fallbacks)
    const responseText = response.choices?.[0]?.message?.content || '';
    
    try {
      // Parse the JSON response
      let jsonResponse: WorkoutResponse;
      try {
        jsonResponse = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Failed to parse OpenAI response as JSON');
      }

      // Validate with Zod
      const validationResult = WorkoutSchema.safeParse(jsonResponse);

      if (!validationResult.success) {
        console.error('Workout schema validation failed:', validationResult.error);

        // If validation fails and we haven't tried without enhanced fields, try again
        if (useExerciseDatabase && process.env.NODE_ENV === 'development') {
          console.log('Validation failed with exercise database fields, trying basic validation...');
          // For now, we'll throw - but we could implement fallback logic here
        }

        throw new Error('AI response did not match expected workout schema');
      }

      // Check exercise count expectations (keep this as it's a business rule)
      const exerciseCount = validationResult.data.workout.exercises.length;
      if (exerciseCount < 1) {
        throw new Error('Generated workout must have at least one exercise');
      }

      if (requestData.exerciseCount) {
        const expected = requestData.exerciseCount;
        if (exerciseCount < expected - 2 || exerciseCount > expected + 2) {
          console.warn(`Workout exercise count differs from request: expected ~${expected}, got ${exerciseCount}`);
        }
      }

      // Return success result with actual token usage
      return {
        success: true,
        data: {
          exercises: validationResult.data.workout.exercises,
          total_duration_minutes: 0, // Will be calculated by the UI
          muscle_groups_targeted: '', // Will be populated by UI
          joint_groups_affected: '', // Will be populated by UI
          equipment_needed: '', // Will be populated by UI
          name: '', // Will be set by user
          description: '', // Will be set by user
          equipment_required: [] // Can be array
        },
        rawResponse: responseText,
        parseAttempts,
        generationTimeMs: Date.now() - startTime,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response:', responseText);
      
      // If this is already a retry, give up
      if (retry) {
        return {
          success: false,
          error: `Failed to parse response after retry: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          rawResponse: responseText,
          parseAttempts,
          generationTimeMs: Date.now() - startTime,
        };
      }
      
      // Retry once with stricter prompt advice if parsing/validation failed the first time
      if (process.env.NODE_ENV === 'development') {
        console.log('Retrying with more explicit prompt...');
      }
      parseAttempts++;
      return generateWorkout(requestData, true, useExerciseDatabase);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      success: false,
      error: `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      parseAttempts,
      generationTimeMs: Date.now() - startTime,
    };
  }
}
