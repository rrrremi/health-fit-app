import { z } from 'zod'

// Base exercise schema - minimum required fields
const BaseExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.number().int().positive('Sets must be a positive integer'),
  reps: z.union([
    z.number().int().positive('Reps must be a positive integer'),
    z.string().min(1, 'Reps string cannot be empty')
  ]),
  rest_time_seconds: z.number().int().min(0, 'Rest time must be non-negative'),
  rationale: z.string().optional().default(''),
});

// Enhanced exercise schema with database fields (preferred)
const EnhancedExerciseSchema = BaseExerciseSchema.extend({
  primary_muscles: z.array(z.string()).optional().default([]),
  secondary_muscles: z.array(z.string()).optional().default([]),
  equipment: z.string().optional().default('bodyweight'),
  movement_type: z.enum(['compound', 'isolation']).optional().default('compound'),
  order_index: z.number().optional(),
});

// Workout schema - accepts enhanced exercises, falls back gracefully
export const WorkoutSchema = z.object({
  workout: z.object({
    exercises: z.array(EnhancedExerciseSchema)
      .min(1, 'At least one exercise is required'),
    total_duration_minutes: z.number().optional(),
    muscle_groups_targeted: z.string().optional(),
    joint_groups_affected: z.string().optional(),
    equipment_needed: z.string().optional(),
  })
});

// Type inference
export type WorkoutResponse = z.infer<typeof WorkoutSchema>;
export type Exercise = z.infer<typeof BaseExerciseSchema>;
export type EnhancedExercise = z.infer<typeof EnhancedExerciseSchema>;
