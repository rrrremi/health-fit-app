'use client'

import { useRouter } from 'next/navigation'
import { Clock, Trash2, FolderPlus } from 'lucide-react'
import { WorkoutListItem } from '@/types/workout'
import WorkoutRatingDisplay from '@/components/workout/WorkoutRatingDisplay'
import { WorkoutStatusBadge } from './WorkoutStatusBadge'
import { parseFocusValues, parseMuscleValues } from '@/lib/workout-utils'

interface WorkoutMetricCardProps {
  workout: WorkoutListItem
  onDelete: (id: string) => void
  onAddToPlan?: (id: string) => void
}

export function WorkoutMetricCard({ workout, onDelete, onAddToPlan }: WorkoutMetricCardProps) {
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
      className="rounded-md border border-transparent bg-white/5 p-2.5 sm:p-2 backdrop-blur-2xl hover:bg-white/10 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Workout Name and Tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] sm:text-[13px] text-white/90 font-normal leading-tight truncate">
              {workout.name || `Workout ${formattedDate}`}
            </p>
            <WorkoutRatingDisplay rating={workout.rating} />
            <WorkoutStatusBadge status={workout.status} targetDate={workout.target_date} />
          </div>
          
          {/* Tags row */}
          <div className="flex flex-wrap gap-1 mt-1">
            {focusValues.slice(0, 2).map((focus, index) => (
              <span
                key={`focus-${index}`}
                className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 capitalize"
              >
                {focus}
              </span>
            ))}
            {muscleValues.slice(0, 2).map((muscle, index) => (
              <span
                key={`muscle-${index}`}
                className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 capitalize"
              >
                {muscle}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Stats - compact row */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Exercise count */}
          <div className="text-right">
            <p className="text-xs text-white/80 leading-none">
              {exerciseCount} <span className="text-[9px] text-white/50">ex</span>
            </p>
          </div>
          
          {/* Duration */}
          <div className="text-right">
            <p className="text-xs text-white/80 leading-none flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5 text-white/40" />
              {workout.total_duration_minutes}m
            </p>
          </div>
          
          {/* Date - hidden on mobile */}
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-white/40">
              {formattedDate}
            </p>
          </div>
          
          {/* Add to Plan button */}
          {onAddToPlan && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToPlan(workout.id)
              }}
              className="p-1 rounded-md hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-colors flex-shrink-0"
              aria-label="Add to plan"
              title="Add to plan"
            >
              <FolderPlus className="h-3 w-3" />
            </button>
          )}
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(workout.id)
            }}
            className="p-1 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
            aria-label="Delete workout"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
