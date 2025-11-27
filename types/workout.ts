import { MUSCLE_TAXONOMY } from '@/lib/muscles/taxonomy';

export interface WorkoutSetDetail {
  set_number: number;
  reps?: number | null;
  weight_kg?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number | string; // Allow string for time-based exercises (e.g., "30 seconds") or special instructions (e.g., "to failure")
  rest_time_seconds: number;
  rationale: string;
  // New fields for exercise database integration
  primary_muscles?: string[];
  secondary_muscles?: string[];
  equipment?: string;
  movement_type?: 'compound' | 'isolation';
  order_index?: number;
  // Additional fields
  weight?: string;
  duration_seconds?: number;
  notes?: string;
  set_details?: WorkoutSetDetail[];
}

export interface WorkoutData {
  exercises: Exercise[];
  total_duration_minutes: number;
  muscle_groups_targeted: string;
  joint_groups_affected: string;
  equipment_needed: string;
  // Additional fields
  name: string;
  description: string;
  equipment_required?: string[];
}

export interface Workout {
  id: string;
  user_id: string;
  name?: string; // Custom workout name
  total_duration_minutes: number;
  muscle_groups_targeted: string;
  joint_groups_affected: string;
  equipment_needed: string;
  workout_data: WorkoutData;
  raw_ai_response: string;
  ai_model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  generation_time_ms?: number;
  parse_attempts: number;
  created_at: string;
  // Customization fields
  muscle_focus: string[];
  workout_focus: string[];
  exercise_count: number;
  special_instructions?: string;
  // New summary fields
  total_sets?: number;
  total_exercises?: number;
  estimated_duration_minutes?: number;
  primary_muscles_targeted?: string[];
  equipment_needed_array?: string[];
  target_date?: string | null;
  status?: 'new' | 'target' | 'missed' | 'completed' | null;
  rating?: number | null;
}

export interface WorkoutListItem {
  id: string;
  name: string | null;
  created_at: string;
  total_duration_minutes: number;
  muscle_focus: string[] | string | null;
  workout_focus: string[] | string | null;
  workout_data: {
    exercises: unknown[];
  };
  target_date: string | null;
  status: 'new' | 'target' | 'missed' | 'completed' | null;
  rating?: number | null;
}

export interface ParsedWorkoutData {
  id: string;
  muscles: string[];
  focus: string[];
}

export type SortField = 'target_date' | 'created_at' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface MuscleOption {
  id: string;
  label: string;
}

export interface FocusOption {
  id: string;
  label: string;
}

export interface StatusOption {
  id: string;
  label: string;
}

// Generate MUSCLE_OPTIONS from centralized taxonomy
export const MUSCLE_OPTIONS: MuscleOption[] = [
  ...MUSCLE_TAXONOMY.map(g => ({ id: g.id, label: g.label })),
  { id: 'full_body', label: 'Full Body' }  // Special option for filtering
];

export const FOCUS_OPTIONS: FocusOption[] = [
  { id: 'cardio', label: 'Cardio' },
  { id: 'hypertrophy', label: 'Hypertrophy' },
  { id: 'isolation', label: 'Isolation' },
  { id: 'isometric', label: 'Isometric' },
  { id: 'plyometric', label: 'Plyometric' },
  { id: 'stability', label: 'Stability' },
  { id: 'strength', label: 'Strength' },
  { id: 'mobility', label: 'Mobility' }
];

export const STATUS_OPTIONS: StatusOption[] = [
  { id: 'new', label: 'New' },
  { id: 'target', label: 'Target' },
  { id: 'missed', label: 'Missed' },
  { id: 'completed', label: 'Completed' }
];

export interface WorkoutGenerationRequest {
  muscleFocus: string[];
  workoutFocus: string[];
  exerciseCount: number;
  specialInstructions?: string;
  difficulty?: string;
}

export interface WorkoutGenerationResponse {
  success: boolean;
  workoutId?: string;
  error?: string;
}
