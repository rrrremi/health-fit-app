import { z } from 'zod'

// Base exercise schema
const BaseExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.number().int().positive('Sets must be a positive integer'),
  reps: z.union([
    z.number().int().positive('Reps must be a positive integer'),
    z.string().min(1, 'Reps string cannot be empty')
  ]),
  rest_time_seconds: z.number().int().min(0, 'Rest time must be non-negative'),
  rationale: z.string().min(1, 'Rationale is required'),
});

// Enhanced exercise schema with database fields
const EnhancedExerciseSchema = BaseExerciseSchema.extend({
  primary_muscles: z.array(z.string()).min(1, 'At least one primary muscle required'),
  secondary_muscles: z.array(z.string()),
  equipment: z.string().min(1, 'Equipment is required'),
  movement_type: z.enum(['compound', 'isolation'], {
    errorMap: () => ({ message: 'Movement type must be either compound or isolation' })
  }),
});

// Workout schema
export const WorkoutSchema = z.object({
  workout: z.object({
    exercises: z.array(z.union([BaseExerciseSchema, EnhancedExerciseSchema]))
      .min(1, 'At least one exercise is required')
  })
});

// Type inference
export type WorkoutResponse = z.infer<typeof WorkoutSchema>;
export type Exercise = z.infer<typeof BaseExerciseSchema>;
export type EnhancedExercise = z.infer<typeof EnhancedExerciseSchema>;
