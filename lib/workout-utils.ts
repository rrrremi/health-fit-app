import { WorkoutListItem, ParsedWorkoutData } from '@/types/workout';

/**
 * Parses muscle focus values from various formats into a consistent array
 */
export function parseMuscleValues(value: WorkoutListItem['muscle_focus']): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : String(item)))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === 'string' ? item : String(item)))
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch (error) {
        // swallow and fall back to comma split handling below
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.replace(/["']/g, '').trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * Parses workout focus values from various formats into a consistent array
 */
export function parseFocusValues(value: WorkoutListItem['workout_focus']): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : String(item)))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === 'string' ? item : String(item)))
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch (error) {
        // swallow and fall back to comma split handling below
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.replace(/["']/g, '').trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * Parses workout data for filtering and display
 */
export function parseWorkoutData(workouts: WorkoutListItem[]): ParsedWorkoutData[] {
  return workouts.map(workout => ({
    id: workout.id,
    muscles: parseMuscleValues(workout.muscle_focus).map(m => m.toLowerCase()),
    focus: parseFocusValues(workout.workout_focus).map(f => f.toLowerCase())
  }));
}
