'use client'

import { useRouter } from 'next/navigation'
import { Target, Clock, Trash2, Calendar } from 'lucide-react'
import { WorkoutListItem } from '@/types/workout'
import WorkoutRatingDisplay from '@/components/workout/WorkoutRatingDisplay'
import { WorkoutStatusBadge } from './WorkoutStatusBadge'
import { parseFocusValues, parseMuscleValues } from '@/lib/workout-utils'

interface WorkoutMetricCardProps {
  workout: WorkoutListItem
  onDelete: (id: string) => void
}

export function WorkoutMetricCard({ workout, onDelete }: WorkoutMetricCardProps) {
  const router = useRouter()
  
  const focusValues = parseFocusValues(workout.workout_focus)
  const muscleValues = parseMuscleValues(workout.muscle_focus)
  const exerciseCount = workout.workout_data?.exercises?.length || 0
  
  // Format date
  const formattedDate = new Date(workout.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  return (
    <div
      onClick={() => router.push(`/protected/workouts/${workout.id}`)}
      className="relative overflow-hidden rounded-md border border-transparent bg-white/5 p-3 sm:p-2 backdrop-blur-2xl hover:bg-white/10 transition-colors cursor-pointer min-h-[80px] sm:min-h-0"
    >
      {/* Status indicator - top right (like health dot) */}
      <div className="absolute top-2 right-2">
        <WorkoutStatusBadge status={workout.status} targetDate={workout.target_date} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
        {/* Left: Workout Name and Tags */}
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <p className="text-[11px] sm:text-[14px] text-white/97 uppercase tracking-wide font-normal leading-tight truncate">
              {workout.name || `Workout ${formattedDate}`}
            </p>
            <WorkoutRatingDisplay rating={workout.rating} />
          </div>
          
          {/* Tags row */}
          <div className="flex flex-wrap gap-1 mt-1">
            {focusValues.slice(0, 2).map((focus, index) => (
              <span
                key={`focus-${index}`}
                className="text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 capitalize"
              >
                {focus}
              </span>
            ))}
            {muscleValues.slice(0, 2).map((muscle, index) => (
              <span
                key={`muscle-${index}`}
                className="text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 capitalize"
              >
                {muscle}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {/* Exercise count and duration */}
            <div className="text-left sm:text-right">
              <p className="text-base sm:text-lg font-normal text-white leading-none">
                {exerciseCount} <span className="text-[10px] sm:text-xs font-light text-white/60">exercises</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-white/40 mt-0.5 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {workout.total_duration_minutes}min
              </p>
            </div>
            
            {/* Date */}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-white/40 flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                {formattedDate}
              </p>
            </div>
            
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(workout.id)
              }}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
              aria-label="Delete workout"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
