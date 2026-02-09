export interface WorkoutPlan {
  id: string
  user_id: string
  name: string
  description: string | null
  share_token: string
  created_at: string
  updated_at: string
}

export interface WorkoutPlanWorkout {
  id: string
  plan_id: string
  workout_id: string
  order_index: number
  added_at: string
}

export interface WorkoutPlanAccessLog {
  id: string
  plan_id: string
  accessed_at: string
  ip_address: string | null
  user_agent: string | null
}

export interface WorkoutPlanWithWorkouts extends WorkoutPlan {
  workout_plan_workouts: (WorkoutPlanWorkout & {
    workouts: {
      id: string
      name: string | null
      created_at: string
      total_duration_minutes: number
      muscle_focus: string[] | string | null
      workout_focus: string[] | string | null
      workout_data: { exercises: unknown[] }
      status: string | null
      rating: number | null
    }
  })[]
}

export interface WorkoutPlanListItem {
  id: string
  name: string
  description: string | null
  share_token: string
  created_at: string
  updated_at: string
  workout_count: number
}
