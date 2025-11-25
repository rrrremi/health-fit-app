'use client'
import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Dumbbell, Sparkles, Play, Target, BarChart3, Clock, Calendar, Trash2, ArrowLeft, RefreshCw, Info, Zap, Activity, Pencil, Plus, Copy, Check, X, GripVertical } from 'lucide-react'
import FocusTrap from 'focus-trap-react'
import InlineEdit from '@/components/ui/InlineEdit'
import ExerciseVideoButton from '@/components/workout/ExerciseVideoButton'
import MuscleMap from '@/components/workout/MuscleMap'
import { SkeletonWorkoutDetail } from '@/components/ui/Skeleton'
import { Workout, Exercise, WorkoutData, WorkoutSetDetail } from '@/types/workout'
import { toast } from '@/lib/toast'
import DeleteWorkoutModal from '@/components/workout/DeleteWorkoutModal'
import DeleteExerciseModal from '@/components/workout/DeleteExerciseModal'
import WorkoutRating from '@/components/workout/WorkoutRating'
import ExercisePicker from '@/components/workout/ExercisePicker'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const WORKOUT_FOCUS_OPTIONS = [
  { id: 'hypertrophy', label: 'Hypertrophy' },
  { id: 'strength', label: 'Strength' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'isolation', label: 'Isolation' },
  { id: 'stability', label: 'Stability' },
  { id: 'plyometric', label: 'Plyometric' },
  { id: 'isometric', label: 'Isometric' },
  { id: 'mobility', label: 'Mobility' }
]

const normalizeWorkoutFocus = (value: unknown): string[] => {
  const normalized = new Set<string>()

  const pushValue = (raw: unknown) => {
    if (raw === null || raw === undefined) return
    const cleaned = String(raw).replace(/["]/g, '').trim().toLowerCase()
    if (cleaned) {
      normalized.add(cleaned)
    }
  }

  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    value.forEach(pushValue)
  } else if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          parsed.forEach(pushValue)
        } else {
          pushValue(parsed)
        }
      } catch {
        trimmed.split(',').forEach(pushValue)
      }
    } else {
      trimmed.split(',').forEach(pushValue)
    }
  }

  return Array.from(normalized)
}

type EditingSetState = {
  set_number: number
  reps: number | null
  weight_kg: number | null
  rest_seconds: number | null
  notes: string | null
}

// Props interface for SortableExerciseItem
interface SortableExerciseItemProps {
  exercise: Exercise
  index: number
  isCompleted: boolean
  selectedExerciseIndex: number | null
  totalExercises: number
  onExerciseClick: (index: number, e: React.MouseEvent) => void
  onExerciseKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, index: number) => void
  onDeleteClick: (index: number) => void
  onEditSets: (index: number) => void
  onPrefetchSets?: (index: number) => void
  isEditing: boolean
}

// Sortable Exercise Item Component - memoized to prevent unnecessary re-renders
const SortableExerciseItem = memo(function SortableExerciseItem({
  exercise,
  index,
  isCompleted,
  selectedExerciseIndex,
  totalExercises,
  onExerciseClick,
  onExerciseKeyDown,
  onDeleteClick,
  onEditSets,
  onPrefetchSets,
  isEditing,
}: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `exercise-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      aria-pressed={isCompleted}
      onClick={(e) => onExerciseClick(index, e)}
      onKeyDown={(event) => onExerciseKeyDown(event, index)}
      initial={{ opacity: 0, x: -5 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        x: 0,
        scale: isCompleted ? 1.01 : 1
      }}
      transition={{ delay: 0.05 + index * 0.03 }}
      className={`relative rounded-md border p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 cursor-pointer ${
        isCompleted
          ? 'border-emerald-400/40 bg-emerald-400/10'
          : 'border-transparent bg-white/5 hover:bg-white/10'
      } ${selectedExerciseIndex === index ? 'ring-2 ring-white/20' : ''} ${isEditing ? 'border-cyan-400/60 bg-cyan-500/10 shadow-lg' : ''} ${isDragging ? 'z-50 shadow-2xl' : ''}`}
    >
      <div className="flex items-center">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mr-2 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-white/40 hover:text-white/60 transition-colors" />
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[10px] font-light text-white/70">
            {index + 1}
          </div>
          <h4 className={`text-xs font-light ${isCompleted ? 'text-emerald-100' : 'text-white/90'}`}>
            {exercise.name}
          </h4>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] ml-3 ${isCompleted ? 'text-emerald-100/80' : 'text-white/70'}`}>
          <span className="text-white/60">Sets:</span>
          <span className="font-medium text-white/90">{exercise.sets}</span>
          <span className="ml-1 text-white/60">Reps:</span>
          <span className="font-medium text-white/90">{exercise.reps}</span>
          <span className="ml-1 text-white/60">Rest:</span>
          <span className="font-medium text-white/90">{exercise.rest_time_seconds}s</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={(event) => {
              event.stopPropagation()
              onEditSets(index)
            }}
            onMouseEnter={() => onPrefetchSets?.(index)}
            onTouchStart={() => onPrefetchSets?.(index)}
            className="p-1 rounded-md hover:bg-white/10 text-white hover:text-white transition-colors"
            title="Edit sets"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <ExerciseVideoButton exerciseName={exercise.name} size="small" variant="subtle" />
          </div>
          
          {/* Delete button - appears on click (hidden if last exercise) */}
          {totalExercises > 1 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ 
                opacity: selectedExerciseIndex === index ? 1 : 0,
                scale: selectedExerciseIndex === index ? 1 : 0.8,
                x: selectedExerciseIndex === index ? 0 : 10
              }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteClick(index)
              }}
              className={`p-1 rounded-md hover:bg-destructive/20 text-destructive transition-colors ${
                selectedExerciseIndex === index ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>
      </div>

      {exercise.rationale && (
        <div
          className={`mt-2 rounded-md border p-1.5 ${
            isCompleted
              ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-100'
              : 'border-transparent bg-white/5 text-white/80'
          }`}
        >
          <div className="flex items-center gap-1 text-[9px] mb-0.5 uppercase tracking-wider">
            <Info className="h-2.5 w-2.5" />
            Tips
          </div>
          <p className="text-[10px] leading-snug line-clamp-2">{exercise.rationale}</p>
        </div>
      )}
    </motion.div>
  )
})

export default function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isSavingTargetDate, setIsSavingTargetDate] = useState(false)
  const [targetDateError, setTargetDateError] = useState<string | null>(null)
  const [isEditingFocus, setIsEditingFocus] = useState(false)
  const [selectedFocusIds, setSelectedFocusIds] = useState<string[]>([])
  const [isSavingFocus, setIsSavingFocus] = useState(false)
  const [focusError, setFocusError] = useState<string | null>(null)
  const [completedExercises, setCompletedExercises] = useState<Record<number, { id: string; completed: boolean }>>({})
  const [completionLoaded, setCompletionLoaded] = useState(false)
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<{ index: number; workoutExerciseId: string; name: string } | null>(null)
  const [showDeleteExerciseModal, setShowDeleteExerciseModal] = useState(false)
  const [isDeletingExercise, setIsDeletingExercise] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const exercisePrefetchRef = useRef<boolean>(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyWorkoutName, setCopyWorkoutName] = useState('')
  const [isCopying, setIsCopying] = useState(false)
  const [clickTimestamps, setClickTimestamps] = useState<Record<number, number>>({})
  const [isReordering, setIsReordering] = useState(false)
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null)
  const [editingWorkoutExerciseId, setEditingWorkoutExerciseId] = useState<string | null>(null)
  const [editingSetDetails, setEditingSetDetails] = useState<EditingSetState[]>([])
  const [isLoadingSetDetails, setIsLoadingSetDetails] = useState(false)
  const [isSavingSetDetails, setIsSavingSetDetails] = useState(false)
  const [setDetailsError, setSetDetailsError] = useState<string | null>(null)
  const [pendingSetCount, setPendingSetCount] = useState<number>(0)
  const [previousWorkoutData, setPreviousWorkoutData] = useState<Workout | null>(null)
  const prefetchCacheRef = useRef<Map<number, { workoutExerciseId: string; data: { entries: WorkoutSetDetail[] } }>>(new Map())
  const saveAbortControllerRef = useRef<AbortController | null>(null)
  const workoutCacheRef = useRef<Map<string, { workout: Workout; timestamp: number }>>(new Map())
  const WORKOUT_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const goBack = () => {
    router.push('/protected/workouts')
  }

  // Memoize expensive computations
  const exerciseItems = useMemo(() => {
    if (!workout) return []
    return workout.workout_data.exercises.map((_, i) => `exercise-${i}`)
  }, [workout?.workout_data.exercises.length])

  const exerciseCount = useMemo(() => {
    return workout?.workout_data.exercises.length ?? 0
  }, [workout?.workout_data.exercises.length])

  const refreshCompletionState = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('id, order_index, completed')
        .eq('workout_id', params.id)
        .order('order_index')

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to load exercise completion state:', error)
        }
        return
      }

      if (!data || data.length === 0) {
        setCompletedExercises({})
        return
      }

      const hasZeroIndex = data.some(row => typeof row.order_index === 'number' && row.order_index === 0)
      const stateMap: Record<number, { id: string; completed: boolean }> = {}

      data.forEach(row => {
        if (typeof row.order_index !== 'number') {
          return
        }

        const normalizedIndex = hasZeroIndex ? row.order_index : row.order_index - 1

        if (normalizedIndex < 0) {
          return
        }

        stateMap[normalizedIndex] = {
          id: row.id,
          completed: row.completed ?? false
        }
      })

      setCompletedExercises(stateMap)
      setCompletionLoaded(true)
    } catch (stateError) {
      console.error('Unexpected error loading completion state:', stateError)
      setCompletionLoaded(true)
    }
  }, [params.id, supabase])

  const recomputeWorkoutStatus = useCallback(async () => {
    try {
      // Fetch both in parallel to reduce latency
      const [exerciseResult, workoutResult] = await Promise.all([
        supabase
          .from('workout_exercises')
          .select('completed')
          .eq('workout_id', params.id),
        supabase
          .from('workouts')
          .select('status, target_date')
          .eq('id', params.id)
          .single()
      ])

      const { data: exerciseRows, error: exerciseError } = exerciseResult
      const { data: workoutRow, error: workoutError } = workoutResult

      if (exerciseError || !exerciseRows) {
        return
      }

      if (workoutError || !workoutRow) {
        return
      }

      const allCompleted = exerciseRows.length > 0 && exerciseRows.every(row => row.completed)

      let desiredStatus: Workout['status'] = workoutRow.status as Workout['status']
      let completedAt: string | null | undefined = undefined

      if (allCompleted) {
        desiredStatus = 'completed'
        completedAt = new Date().toISOString()
      } else {
        if (!workoutRow.target_date) {
          desiredStatus = 'new'
        } else {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const targetDate = new Date(workoutRow.target_date)
          targetDate.setHours(0, 0, 0, 0)
          desiredStatus = targetDate.getTime() >= today.getTime() ? 'target' : 'missed'
        }
        completedAt = null
      }

      if (desiredStatus === workoutRow.status) {
        return
      }

      const { data: updatedWorkout, error: updateError } = await supabase
        .from('workouts')
        .update({
          status: desiredStatus,
          completed_at: completedAt
        })
        .eq('id', params.id)
        .select('*')
        .single()

      if (updateError) {
        throw updateError
      }

      if (updatedWorkout) {
        setWorkout(updatedWorkout as Workout)
      }
    } catch (statusError: unknown) {
      const err = statusError as Error
      setError(err.message || 'Failed to update workout status')
      setTimeout(() => setError(null), 3000)
    }
  }, [params.id, supabase])

  const handleUpdateName = async (newName: string) => {
    try {
      setIsSavingName(true);
      setNameError(null);
      
      const response = await fetch(`/api/workouts/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: params.id,
          name: newName,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update workout name');
      }
      
      // Update local state with the new workout data
      setWorkout(data.workout);
      setIsEditingName(false);
      toast.success('Workout name updated');
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update workout name';
      setNameError(message);
      toast.error(message);
    } finally {
      setIsSavingName(false);
    }
  }

  const handleUpdateTargetDate = useCallback(async (newDate: string | null) => {
    try {
      setIsSavingTargetDate(true)
      setTargetDateError(null)

      const response = await fetch(`/api/workouts/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: params.id,
          target_date: newDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update target date')
      }

      setWorkout(data.workout)
      toast.success('Target date updated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update target date'
      setTargetDateError(message)
      toast.error(message)
    } finally {
      setIsSavingTargetDate(false)
    }
  }, [params.id])

  const handleDelete = async () => {
    try {
      setIsDeleting(true)

      // Use the API endpoint instead of direct Supabase access
      const response = await fetch(`/api/workouts/delete?id=${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workout');
      }

      toast.success('Workout deleted')
      
      // Navigate to the workouts list page
      router.push('/protected/workouts')

      // Add a small delay before refreshing to ensure navigation completes
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting workout'
      setError(message)
      toast.error(message)
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    refreshCompletionState()
  }, [refreshCompletionState])

  useEffect(() => {
    if (workout) {
      setSelectedFocusIds(normalizeWorkoutFocus(workout.workout_focus))
    }
  }, [workout])

  const focusOptions = useMemo(() => WORKOUT_FOCUS_OPTIONS, [])

  const handleFocusToggle = useCallback((id: string) => {
    setSelectedFocusIds((prev) => {
      const alreadySelected = prev.includes(id)
      if (alreadySelected) {
        const next = prev.filter((focusId) => focusId !== id)
        setFocusError(null)
        return next
      }

      if (prev.length >= 3) {
        setFocusError('You can select up to 3 focus types')
        return prev
      }

      setFocusError(null)
      return [...prev, id]
    })
  }, [])

  const handleUpdateFocus = useCallback(async () => {
    if (!workout) return

    if (selectedFocusIds.length === 0) {
      setFocusError('Select at least one focus type')
      return
    }

    try {
      setIsSavingFocus(true)
      setFocusError(null)

      const response = await fetch('/api/workouts/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: workout.id,
          workout_focus: selectedFocusIds
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update focus')
      }

      setWorkout(data.workout)
      setIsEditingFocus(false)
      toast.success('Workout focus updated')
    } catch (updateError: unknown) {
      const message = (updateError as Error).message || 'Failed to update focus'
      setFocusError(message)
      toast.error(message)
    } finally {
      setIsSavingFocus(false)
    }
  }, [selectedFocusIds, workout])

  // Handle exercise click - detect single click vs double-tap
  const handleExerciseClick = useCallback((index: number, event: React.MouseEvent) => {
    event.stopPropagation()
    
    const now = Date.now()
    const lastClick = clickTimestamps[index] || 0
    const timeDiff = now - lastClick
    
    // Double-tap detection (within 710ms)
    if (timeDiff <= 710 && timeDiff > 0) {
      // Double-tap detected - toggle completion
      toggleExerciseCompletion(index)
      // Clear timestamp
      setClickTimestamps(prev => ({ ...prev, [index]: 0 }))
    } else {
      // Single click - show/hide delete button
      if (selectedExerciseIndex === index) {
        // Clicking same exercise - hide delete button
        setSelectedExerciseIndex(null)
      } else {
        // Clicking different exercise - show delete button
        setSelectedExerciseIndex(index)
      }
      // Store timestamp for double-tap detection
      setClickTimestamps(prev => ({ ...prev, [index]: now }))
    }
  }, [clickTimestamps, selectedExerciseIndex])

  const toggleExerciseCompletion = useCallback(async (index: number) => {
    if (!completionLoaded) {
      return
    }

    const currentEntry = completedExercises[index]

    if (!currentEntry) {
      console.warn(`No workout_exercises row found for order_index ${index}`)
      return
    }

    const nextCompleted = !currentEntry.completed

    setCompletedExercises(prev => ({
      ...prev,
      [index]: { ...prev[index], completed: nextCompleted }
    }))

    const { error: updateError } = await supabase
      .from('workout_exercises')
      .update({
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null
      })
      .eq('id', currentEntry.id)
      .eq('workout_id', params.id)

    if (updateError) {
      setCompletedExercises(prev => ({
        ...prev,
        [index]: { ...prev[index], completed: !nextCompleted }
      }))
      toast.error('Failed to update exercise status')
      return
    }

    // Show subtle feedback for completion toggle
    toast.success(nextCompleted ? 'Exercise completed' : 'Exercise marked incomplete')
    await refreshCompletionState()
    await recomputeWorkoutStatus()
  }, [completedExercises, completionLoaded, params.id, recomputeWorkoutStatus, refreshCompletionState, supabase])

  const handleExerciseKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleExerciseCompletion(index)
    }
  }, [toggleExerciseCompletion])

  // Click outside to hide delete button
  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedExerciseIndex(null)
    }
    
    if (selectedExerciseIndex !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [selectedExerciseIndex])

  const handleDeleteExerciseClick = useCallback(async (index: number) => {
    // Prevent deleting the last exercise
    if (workout?.workout_data.exercises.length === 1) {
      toast.warning('Cannot delete the last exercise')
      return
    }
    
    let workoutExerciseId = completedExercises[index]?.id
    const exerciseName = workout?.workout_data.exercises[index]?.name
    
    // If workoutExerciseId is not in completedExercises, fetch it from the database
    if (!workoutExerciseId) {
      try {
        // Fetch all workout_exercises for this workout and find by order_index
        const { data, error } = await supabase
          .from('workout_exercises')
          .select('id, order_index')
          .eq('workout_id', params.id)
          .order('order_index')
        
        if (error || !data) {
          toast.error('Unable to delete exercise. Please refresh.')
          return
        }
        
        // Find the exercise with matching order_index
        const exerciseRow = data.find(row => row.order_index === index)
        
        if (!exerciseRow) {
          toast.error('Unable to delete exercise. Please refresh.')
          return
        }
        
        workoutExerciseId = exerciseRow.id
      } catch (err) {
        toast.error('Unable to delete exercise. Please refresh.')
        return
      }
    }
    
    if (!workoutExerciseId || !exerciseName) {
      toast.error('Unable to delete exercise. Please refresh.')
      return
    }
    
    setDeleteExerciseTarget({ index, workoutExerciseId, name: exerciseName })
    setShowDeleteExerciseModal(true)
  }, [completedExercises, workout, params.id, supabase])

  const handleDeleteExerciseConfirm = useCallback(async () => {
    if (!deleteExerciseTarget || !workout) return
    
    setIsDeletingExercise(true)
    
    // Optimistic update
    const updatedExercises = workout.workout_data.exercises.filter((_, i) => i !== deleteExerciseTarget.index)
    const optimisticWorkout = {
      ...workout,
      workout_data: {
        ...workout.workout_data,
        exercises: updatedExercises
      }
    }
    setWorkout(optimisticWorkout)
    
    try {
      const response = await fetch('/api/workouts/exercises/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: workout.id,
          workoutExerciseId: deleteExerciseTarget.workoutExerciseId,
          exerciseIndex: deleteExerciseTarget.index
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete exercise')
      }
      
      // Replace with server response
      setWorkout(data.workout)
      toast.success('Exercise deleted')
      
      // Refresh completion state
      await refreshCompletionState()
      await recomputeWorkoutStatus()
      
    } catch (err) {
      // Rollback on error
      setWorkout(workout)
      toast.error(err instanceof Error ? err.message : 'Failed to delete exercise')
    } finally {
      setIsDeletingExercise(false)
      setShowDeleteExerciseModal(false)
      setDeleteExerciseTarget(null)
    }
  }, [deleteExerciseTarget, workout, refreshCompletionState, recomputeWorkoutStatus])

  // Prefetch exercises on hover
  const prefetchExercises = useCallback(() => {
    if (exercisePrefetchRef.current) return
    exercisePrefetchRef.current = true
    
    fetch('/api/exercises/search?muscle=all&movement=all&limit=20')
      .catch(() => {}) // Silently fail
  }, [])

  const handleExerciseAdded = useCallback(async (exercise?: any) => {
    if (!workout) return
    
    // Optimistic update with incremental data
    if (exercise) {
      const newExercise = {
        name: exercise.name,
        sets: 3,
        reps: 10,
        rest_time_seconds: 60,
        set_details: [],
        rationale: ''
      }
      
      setWorkout(prev => ({
        ...prev!,
        workout_data: {
          ...prev!.workout_data,
          exercises: [...prev!.workout_data.exercises, newExercise]
        }
      }))
      
      toast.success('Exercise added')
      refreshCompletionState().catch(() => {})
      recomputeWorkoutStatus().catch(() => {})
    } else {
      // Fallback: Full refresh
      try {
        const { data, error } = await supabase
          .from('workouts')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error

        setWorkout(data)
        toast.success('Exercise added')
        refreshCompletionState().catch(() => {})
        recomputeWorkoutStatus().catch(() => {})
      } catch (error) {
        toast.error('Failed to refresh workout')
      }
    }
  }, [params.id, workout, supabase])

  // Edit Sets functions
  const resolveWorkoutExerciseId = useCallback(async (index: number) => {
    const existingId = completedExercises[index]?.id
    if (existingId) return existingId

    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('id, order_index')
        .eq('workout_id', params.id)
        .order('order_index')

      if (error || !data) return null
      const target = data.find((row) => row.order_index === index)
      return target?.id ?? null
    } catch {
      return null
    }
  }, [completedExercises, params.id, supabase])

  const prefetchSetDetails = useCallback(async (index: number) => {
    if (!workout || prefetchCacheRef.current.has(index)) return

    const workoutExerciseId = await resolveWorkoutExerciseId(index)
    if (!workoutExerciseId) return

    try {
      const response = await fetch(`/api/workouts/exercises/${workoutExerciseId}/sets?workoutId=${workout.id}`)
      const data = await response.json()
      if (response.ok) {
        prefetchCacheRef.current.set(index, { workoutExerciseId, data })
      }
    } catch {
      // Silently fail prefetch
    }
  }, [resolveWorkoutExerciseId, workout])

  const openSetEditor = useCallback(async (index: number) => {
    if (!workout) return
    if (editingSetIndex !== null) return

    const workoutExerciseId = await resolveWorkoutExerciseId(index)
    if (!workoutExerciseId) {
      setSetDetailsError('Unable to load set information.')
      setTimeout(() => setSetDetailsError(null), 3000)
      return
    }

    setEditingSetIndex(index)
    setEditingWorkoutExerciseId(workoutExerciseId)
    setSetDetailsError(null)

    const cachedSetDetails = workout.workout_data.exercises[index]?.set_details
    if (cachedSetDetails && Array.isArray(cachedSetDetails) && cachedSetDetails.length > 0) {
      const normalized = cachedSetDetails.map((entry: any) => ({
        set_number: entry.set_number,
        reps: entry.reps ?? null,
        weight_kg: entry.weight_kg ?? null,
        rest_seconds: entry.rest_seconds ?? null,
        notes: entry.notes ?? null,
      }))
      setEditingSetDetails(normalized)
      setPendingSetCount(normalized.length)
      setIsLoadingSetDetails(false)
    } else {
      setIsLoadingSetDetails(true)
      const defaultSetCount = workout.workout_data.exercises[index]?.sets ?? 1
      const defaultReps = typeof workout.workout_data.exercises[index]?.reps === 'number'
        ? Number(workout.workout_data.exercises[index]?.reps)
        : null
      const defaultRest = workout.workout_data.exercises[index]?.rest_time_seconds ?? null

      setEditingSetDetails(Array.from({ length: defaultSetCount }, (_, idx) => ({
        set_number: idx + 1,
        reps: defaultReps,
        weight_kg: null,
        rest_seconds: defaultRest,
        notes: null,
      })))
      setPendingSetCount(defaultSetCount)
    }

    try {
      const prefetched = prefetchCacheRef.current.get(index)
      let data

      if (prefetched && prefetched.workoutExerciseId === workoutExerciseId) {
        data = prefetched.data
        prefetchCacheRef.current.delete(index)
      } else {
        const response = await fetch(`/api/workouts/exercises/${workoutExerciseId}/sets?workoutId=${workout.id}`)
        data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load')
      }

      const entries = Array.isArray(data.entries) ? data.entries : []

      if (entries.length > 0) {
        const normalized = entries.map((entry: any) => ({
          set_number: entry.set_number,
          reps: entry.reps ?? null,
          weight_kg: entry.weight_kg ?? null,
          rest_seconds: entry.rest_seconds ?? null,
          notes: entry.notes ?? null,
        }))
        setEditingSetDetails(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(normalized)) {
            return normalized
          }
          return prev
        })
        setPendingSetCount(normalized.length)
      }
    } catch (error: any) {
      if (!cachedSetDetails || cachedSetDetails.length === 0) {
        setSetDetailsError(error?.message || 'Failed to load')
        setTimeout(() => setSetDetailsError(null), 3000)
        setEditingSetIndex(null)
        setEditingWorkoutExerciseId(null)
        setEditingSetDetails([])
      }
    } finally {
      setIsLoadingSetDetails(false)
    }
  }, [resolveWorkoutExerciseId, workout, editingSetIndex])

  const closeSetEditor = useCallback(() => {
    setEditingWorkoutExerciseId(null)
    setEditingSetIndex(null)
    setEditingSetDetails([])
    setPendingSetCount(0)
    setIsSavingSetDetails(false)
    setIsLoadingSetDetails(false)
    setSetDetailsError(null)
  }, [])

  const updateSetDetailField = useCallback((index: number, field: keyof EditingSetState, value: string) => {
    setEditingSetDetails(prev => {
      const next = [...prev]
      const existing = next[index]
      if (!existing) return prev

      if (field === 'reps' || field === 'rest_seconds') {
        const numValue = value.trim().length > 0 ? Number(value) : null
        next[index] = { ...existing, [field]: numValue }
      } else if (field === 'weight_kg') {
        const numValue = value.trim().length > 0 ? parseFloat(value) : null
        next[index] = { ...existing, weight_kg: numValue }
      } else if (field === 'notes') {
        const stringValue = typeof value === 'string' ? value : ''
        next[index] = { ...existing, notes: stringValue.trim().length > 0 ? stringValue.trim() : null }
      }
      return next
    })
  }, [])

  const persistSetDetails = useCallback(async () => {
    if (!workout || editingWorkoutExerciseId === null || editingSetIndex === null) return
    
    if (editingSetDetails.length === 0) {
      setSetDetailsError('Add at least one set to track your workout.')
      setTimeout(() => setSetDetailsError(null), 3000)
      return
    }

    if (saveAbortControllerRef.current) {
      saveAbortControllerRef.current.abort()
    }

    saveAbortControllerRef.current = new AbortController()
    setPreviousWorkoutData(workout)

    const optimisticWorkout = {
      ...workout,
      workout_data: {
        ...workout.workout_data,
        exercises: workout.workout_data.exercises.map((ex: any, idx: number) => {
          if (idx === editingSetIndex) {
            return {
              ...ex,
              set_details: editingSetDetails,
              sets: editingSetDetails.length
            }
          }
          return ex
        })
      }
    }
    setWorkout(optimisticWorkout)
    closeSetEditor()

    try {
      const response = await fetch(`/api/workouts/exercises/${editingWorkoutExerciseId}/sets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: workout.id, setDetails: editingSetDetails }),
        signal: saveAbortControllerRef.current.signal,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save')

      setWorkout(data.workout)
      // Update cache
      workoutCacheRef.current.set(params.id, {
        workout: data.workout,
        timestamp: Date.now()
      })
      setPreviousWorkoutData(null)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return
      }
      
      if (previousWorkoutData) {
        setWorkout(previousWorkoutData)
        setPreviousWorkoutData(null)
      }
      
      setSetDetailsError(error?.message || 'Failed to save. Changes reverted.')
      setTimeout(() => setSetDetailsError(null), 5000)
    } finally {
      saveAbortControllerRef.current = null
    }
  }, [closeSetEditor, editingSetDetails, editingSetIndex, editingWorkoutExerciseId, workout, previousWorkoutData])

  const handleRegenerate = useCallback(() => {
    if (!workout) return
    
    // Extract exercise names to exclude
    const excludeExercises = workout.workout_data.exercises.map(ex => ex.name)
    
    // Extract workout parameters
    const muscleFocus = workout.muscle_focus || []
    const workoutFocus = workout.workout_focus || ['hypertrophy']
    const exerciseCount = workout.workout_data.exercises.length
    
    // Build query params for generate page
    const params = new URLSearchParams({
      muscleFocus: JSON.stringify(muscleFocus),
      workoutFocus: JSON.stringify(workoutFocus),
      exerciseCount: exerciseCount.toString(),
      excludeExercises: JSON.stringify(excludeExercises),
      regenerate: 'true'
    })
    
    // Navigate to generate page with params
    router.push(`/protected/workouts/generate?${params.toString()}`)
  }, [workout, router])

  const handleCopyClick = useCallback(() => {
    if (!workout) return
    setCopyWorkoutName(`${workout.name} (Copy)`)
    setShowCopyModal(true)
  }, [workout])

  const handleCopyConfirm = useCallback(async () => {
    if (!workout || !copyWorkoutName.trim()) return
    
    setIsCopying(true)
    
    try {
      const response = await fetch('/api/workouts/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: workout.id,
          newName: copyWorkoutName.trim()
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy workout')
      }
      
      toast.success('Workout copied successfully')
      
      // Navigate to the new workout
      router.push(`/protected/workouts/${data.workout.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to copy workout')
    } finally {
      setIsCopying(false)
      setShowCopyModal(false)
    }
  }, [workout, copyWorkoutName, router])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id || !workout) return
    
    const oldIndex = workout.workout_data.exercises.findIndex((_, i) => `exercise-${i}` === active.id)
    const newIndex = workout.workout_data.exercises.findIndex((_, i) => `exercise-${i}` === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    // Close set editor if open (prevents stale data)
    if (editingSetIndex !== null) {
      closeSetEditor()
    }
    
    // Optimistic update
    const newExercises = arrayMove(workout.workout_data.exercises, oldIndex, newIndex)
    const optimisticWorkout = {
      ...workout,
      workout_data: {
        ...workout.workout_data,
        exercises: newExercises
      }
    }
    setWorkout(optimisticWorkout)
    setIsReordering(true)
    
    try {
      // Get the reordered exercise IDs
      const reorderedExerciseIds = newExercises.map((_, index) => {
        const originalIndex = workout.workout_data.exercises.findIndex(ex => ex.name === newExercises[index].name)
        return completedExercises[originalIndex]?.id
      }).filter(Boolean)
      
      const response = await fetch('/api/workouts/exercises/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: workout.id,
          exerciseIds: reorderedExerciseIds
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reorder exercises')
      }
      
      // Refresh completion state with new order
      await refreshCompletionState()
      toast.success('Exercises reordered')
    } catch (err) {
      // Rollback on error
      setWorkout(workout)
      toast.error(err instanceof Error ? err.message : 'Failed to reorder exercises')
    } finally {
      setIsReordering(false)
    }
  }, [workout, completedExercises, refreshCompletionState])

  useEffect(() => {
    async function fetchWorkout() {
      try {
        // Prevent fetching if ID is a route keyword (create, generate, etc.)
        if (params.id === 'create' || params.id === 'generate') {
          setLoading(false)
          return
        }

        // Check cache first
        const cached = workoutCacheRef.current.get(params.id)
        const now = Date.now()
        
        if (cached && (now - cached.timestamp) < WORKOUT_CACHE_DURATION) {
          // Use cached workout (instant load)
          setWorkout(cached.workout)
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('workouts')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) {
          throw error
        }

        if (data) {
          const workoutData = data as unknown as Workout
          setWorkout(workoutData)
          // Cache the workout
          workoutCacheRef.current.set(params.id, {
            workout: workoutData,
            timestamp: now
          })
        } else {
          setError('Workout not found')
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred while fetching the workout')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkout()
  }, [params.id, supabase, WORKOUT_CACHE_DURATION])

  if (loading) {
    return (
      <>
        {/* Main Content with Back Button */}
        <section className="mx-auto w-full max-w-3xl px-2 pb-10">
          {/* Back button positioned like in Profile view */}
          <div className="mb-2 relative z-10">
            <Link href="/protected/workouts">
              <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </Link>
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <svg className="animate-spin h-5 w-5 text-white mx-auto mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xs text-white/70">Loading...</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* Main Content with Back Button */}
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        {/* Back button and actions */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 relative z-10">
          <Link href="/protected/workouts">
            <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyClick}
              className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              Copy
            </button>
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Regenerate
            </button>
            <Link href="/protected/workouts/generate">
              <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
                <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                New
              </button>
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 transition-colors"
              aria-label="Delete workout"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >

          {/* Header Section - more compact */}
          <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
            <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-2xl opacity-50" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-2">
                  {isEditingName ? (
                    <div className="mb-1">
                      <InlineEdit
                        value={workout?.name || `Workout ${new Date(workout?.created_at || '').toLocaleDateString()}`}
                        onChange={handleUpdateName}
                        onCancel={() => setIsEditingName(false)}
                        placeholder="Enter workout name..."
                        maxLength={50}
                      />
                      {nameError && (
                        <div className="text-[10px] text-destructive mt-0.5">{nameError}</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <h1 className="text-xl font-semibold tracking-tight">
                        {workout?.name || `Workout ${new Date(workout?.created_at || '').toLocaleDateString()}`}
                      </h1>
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className="ml-2 p-1 rounded-md hover:bg-white/10 text-white/60 transition-colors"
                        title="Edit workout name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="mt-0.5 text-xs text-white/70">Review your personalized workout</p>
                </div>
                
              </div>

              {error && (
                <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive backdrop-blur-xl">
                  {error}
                </div>
              )}
            </div>
          </div>

          {workout && (
            <>
              {/* Workout Overview with Muscle Map */}
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <div className="flex flex-col md:flex-row gap-2">
                  {/* Overview Card */}
                  <div className="flex-1 rounded-lg border border-transparent bg-white/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between p-2 border-b border-transparent">
                      <h3 className="text-xs text-white/90 flex items-center">
                        <Target className="h-3.5 w-3.5 mr-1" />
                        Overview
                      </h3>
                      <WorkoutRating
                        workoutId={workout.id}
                        initialRating={workout.rating}
                        onRatingChange={(rating) => {
                          setWorkout({ ...workout, rating })
                        }}
                      />
                    </div>
                    <div className="p-2">
                      <div className="grid gap-2 grid-cols-2">
                        <div className="flex items-center justify-between rounded-md border border-transparent bg-white/5 p-2">
                          <div className="flex items-center gap-1 text-xs text-white/70">
                            <Clock className="h-3 w-3" />
                            Duration
                          </div>
                          <span className="text-xs font-medium text-white/90">{workout.total_duration_minutes}m</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-transparent bg-white/5 p-2">
                          <div className="flex items-center gap-1 text-xs text-white/70">
                            <BarChart3 className="h-3 w-3" />
                            Exercises
                          </div>
                          <span className="text-xs font-medium text-white/90">{workout.workout_data.exercises.length}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1 rounded-md border border-transparent bg-white/5 p-2">
                          <div className="flex items-center gap-1 text-xs text-white/70">
                            <Calendar className="h-3 w-3" />
                            Target Date
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              className="w-full rounded-md bg-black/20 border border-transparent px-2 py-1 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                              value={workout.target_date ?? ''}
                              onChange={(e) => handleUpdateTargetDate(e.target.value ? e.target.value : null)}
                              disabled={isSavingTargetDate}
                            />
                            {isSavingTargetDate && <RefreshCw className="h-3 w-3 animate-spin text-white/70" />}
                          </div>
                          <div className="text-[10px] text-white/60">
                            {workout.target_date
                              ? `Planned for ${new Date(workout.target_date).toLocaleDateString()}`
                              : 'No target date set'}
                          </div>
                          {targetDateError && (
                            <div className="text-[10px] text-destructive">{targetDateError}</div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1 rounded-md border border-transparent bg-white/5 p-2">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 text-xs text-white/70">
                              <Target className="h-3 w-3" />
                              Focus
                            </div>
                            {!isEditingFocus && (
                              <button
                                onClick={() => {
                                  setSelectedFocusIds(normalizeWorkoutFocus(workout.workout_focus))
                                  setIsEditingFocus(true)
                                }}
                                className="p-1 rounded-md text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors"
                                title="Edit focus"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {isEditingFocus ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1.5">
                                {focusOptions.map((option) => {
                                  const active = selectedFocusIds.includes(option.id)
                                  return (
                                    <button
                                      key={option.id}
                                      onClick={() => handleFocusToggle(option.id)}
                                      className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] transition-colors border ${
                                        active
                                          ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-100'
                                          : 'border-transparent bg-white/10 text-white/60 hover:bg-white/15'
                                      }`}
                                    >
                                      {option.label}
                                      {active && <Check className="h-2.5 w-2.5" />}
                                    </button>
                                  )
                                })}
                              </div>
                              {focusError && (
                                <div className="text-[10px] text-destructive">{focusError}</div>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleUpdateFocus}
                                  disabled={isSavingFocus}
                                  className="flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                                >
                                  {isSavingFocus ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedFocusIds(normalizeWorkoutFocus(workout.workout_focus))
                                    setFocusError(null)
                                    setIsEditingFocus(false)
                                  }}
                                  disabled={isSavingFocus}
                                  className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/15 transition-colors disabled:opacity-50"
                                >
                                  <X className="h-3 w-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {normalizeWorkoutFocus(workout.workout_focus).slice(0, 3).map((focus, index) => (
                                <span
                                  key={`${focus}-${index}`}
                                  className="text-[9px] px-1.5 py-0 rounded-full bg-cyan-500/20 text-cyan-300 capitalize"
                                >
                                  {focus}
                                </span>
                              ))}
                              {normalizeWorkoutFocus(workout.workout_focus).length === 0 && (
                                <span className="text-[9px] text-white/50">No focus set</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-transparent bg-white/5 p-2">
                          <div className="flex items-center gap-1 text-[10px] text-white/70 mb-1">
                            <Activity className="h-3 w-3" />
                            Muscle Groups
                          </div>
                          <p className="text-xs text-white/90 line-clamp-1">{workout.muscle_groups_targeted}</p>
                        </div>

                        <div className="rounded-md border border-transparent bg-white/5 p-2">
                          <div className="flex items-center gap-1 text-[10px] text-white/70 mb-1">
                            <Zap className="h-3 w-3" />
                            Equipment
                          </div>
                          <p className="text-xs text-white/90 line-clamp-1">{workout.equipment_needed}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Muscle Map - Desktop: side, Mobile: below */}
                  <div className="w-full md:w-44 rounded-lg border border-transparent bg-white/5 backdrop-blur-xl p-2">
                    <MuscleMap 
                      exercises={workout.workout_data.exercises} 
                      className="h-48 md:h-full"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Exercises - more compact */}
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl">
                  <div className="p-2 border-b border-transparent">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs text-white/90 flex items-center">
                        <Dumbbell className="h-3.5 w-3.5 mr-1" />
                        Exercises ({workout.workout_data.exercises.length})
                      </h3>
                      <button
                        onClick={() => setShowExercisePicker(true)}
                        onMouseEnter={prefetchExercises}
                        onTouchStart={prefetchExercises}
                        className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-light text-white/90 hover:bg-white/20 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" strokeWidth={1.5} />
                        Add
                      </button>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 font-light">
                      Drag to reorder • Double-tap to complete • Click once to delete
                    </p>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={exerciseItems}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="p-2 space-y-2">
                        {workout.workout_data.exercises.map((exercise, index) => {
                          const status = completedExercises[index]
                          const isCompleted = status?.completed ?? false

                          return (
                            <SortableExerciseItem
                              key={`exercise-${index}`}
                              exercise={exercise}
                              index={index}
                              isCompleted={isCompleted}
                              selectedExerciseIndex={selectedExerciseIndex}
                              totalExercises={workout.workout_data.exercises.length}
                              onExerciseClick={handleExerciseClick}
                              onExerciseKeyDown={handleExerciseKeyDown}
                              onDeleteClick={handleDeleteExerciseClick}
                              onEditSets={openSetEditor}
                              onPrefetchSets={prefetchSetDetails}
                              isEditing={editingSetIndex === index}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </section>
      <DeleteWorkoutModal
        open={showDeleteConfirm}
        isDeleting={isDeleting}
        onCancel={() => {
          if (isDeleting) return
          setShowDeleteConfirm(false)
        }}
        onConfirm={handleDelete}
      />
      <DeleteExerciseModal
        open={showDeleteExerciseModal}
        isDeleting={isDeletingExercise}
        exerciseName={deleteExerciseTarget?.name || ''}
        isLastExercise={workout?.workout_data.exercises.length === 1}
        onCancel={() => {
          if (isDeletingExercise) return
          setShowDeleteExerciseModal(false)
          setDeleteExerciseTarget(null)
        }}
        onConfirm={handleDeleteExerciseConfirm}
      />
      <ExercisePicker
        isOpen={showExercisePicker}
        workoutId={params.id}
        onClose={() => setShowExercisePicker(false)}
        onExerciseAdded={handleExerciseAdded}
      />
      
      {/* Edit Sets Modal */}
      {editingSetIndex !== null && workout && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => !isSavingSetDetails && closeSetEditor()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="set-editor-title"
          aria-describedby="set-editor-description"
        >
          <FocusTrap>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl rounded-2xl bg-white/5 backdrop-blur-2xl shadow-2xl max-h-[90vh] overflow-hidden"
            >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-3xl opacity-40" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl opacity-30" />
            
            <div className="relative">
              <div className="flex items-center justify-between p-5 pb-4">
                <div>
                  <h3 id="set-editor-title" className="text-lg font-semibold text-white">Edit Sets</h3>
                  <p id="set-editor-description" className="text-sm text-white/60 mt-0.5">{workout.workout_data.exercises[editingSetIndex]?.name}</p>
                </div>
                <button
                  onClick={closeSetEditor}
                  disabled={isSavingSetDetails}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isLoadingSetDetails ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-white/60" />
                </div>
              ) : (
              <>
                {/* Header Row */}
                <div className="px-4 pt-3 pb-2">
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-2 items-center px-2.5">
                    <div className="w-6"></div>
                    <div className="text-[9px] font-medium text-white/50 text-center uppercase tracking-wider">Reps</div>
                    <div className="text-[9px] font-medium text-white/50 text-center uppercase tracking-wider">Weight</div>
                    <div className="text-[9px] font-medium text-white/50 text-center uppercase tracking-wider">Rest</div>
                    <div className="text-[9px] font-medium text-white/50 text-center uppercase tracking-wider">Notes</div>
                    <div className="w-6"></div>
                  </div>
                </div>
                
                <div className="space-y-1.5 mb-4 px-4 pb-3">
                  {editingSetDetails.map((detail, idx) => (
                    <div key={idx} data-set-index={idx} className="rounded-lg bg-white/5 backdrop-blur-xl p-2.5">
                      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                        {/* Set Number */}
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-white/10 text-[10px] font-medium text-white/90">
                          {detail.set_number}
                        </div>
                        
                        {/* Reps */}
                        <div>
                          <input
                            type="number"
                            min="0"
                            value={detail.reps ?? ''}
                            onChange={(e) => updateSetDetailField(idx, 'reps', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input')
                                nextInput?.focus()
                              }
                            }}
                            placeholder="Reps"
                            className="w-full rounded bg-white/10 backdrop-blur-xl px-2 py-1 text-xs text-center text-white placeholder-white/30 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                          />
                        </div>
                        
                        {/* Weight */}
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={detail.weight_kg ?? ''}
                            onChange={(e) => updateSetDetailField(idx, 'weight_kg', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input')
                                nextInput?.focus()
                              }
                            }}
                            placeholder="kg"
                            className="w-full rounded bg-white/10 backdrop-blur-xl px-2 py-1 text-xs text-center text-white placeholder-white/30 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                          />
                        </div>
                        
                        {/* Rest */}
                        <div>
                          <input
                            type="number"
                            min="0"
                            value={detail.rest_seconds ?? ''}
                            onChange={(e) => updateSetDetailField(idx, 'rest_seconds', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input')
                                nextInput?.focus()
                              }
                            }}
                            placeholder="Rest"
                            className="w-full rounded bg-white/10 backdrop-blur-xl px-2 py-1 text-xs text-center text-white placeholder-white/30 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                          />
                        </div>
                        
                        {/* Notes */}
                        <div>
                          <input
                            type="text"
                            value={detail.notes ?? ''}
                            onChange={(e) => updateSetDetailField(idx, 'notes', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                // Move to next set's first input
                                const nextSet = e.currentTarget.closest('[key]')?.nextElementSibling
                                const nextInput = nextSet?.querySelector('input')
                                if (nextInput) {
                                  nextInput.focus()
                                } else {
                                  // Last set, focus Done button
                                  document.querySelector<HTMLButtonElement>('[data-action="save-sets"]')?.focus()
                                }
                              }
                            }}
                            placeholder="Notes"
                            className="w-full rounded bg-white/10 backdrop-blur-xl px-2 py-1 text-xs text-white placeholder-white/30 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                          />
                        </div>
                        
                        {/* Remove Button */}
                        {editingSetDetails.length > 1 && (
                          <button
                            onClick={() => {
                              setEditingSetDetails(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, set_number: i + 1 })))
                              setPendingSetCount(prev => prev - 1)
                            }}
                            className="p-1 rounded hover:bg-destructive/20 text-destructive/60 hover:text-destructive transition-colors"
                            title="Remove set"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      const newSet = {
                        set_number: editingSetDetails.length + 1,
                        reps: null,
                        weight_kg: null,
                        rest_seconds: null,
                        notes: null
                      }
                      setEditingSetDetails(prev => [...prev, newSet])
                      setPendingSetCount(prev => prev + 1)
                      // Focus first input of new set
                      setTimeout(() => {
                        const lastSet = document.querySelector('[data-set-index="' + editingSetDetails.length + '"]')
                        lastSet?.querySelector<HTMLInputElement>('input')?.focus()
                      }, 50)
                    }}
                    disabled={editingSetDetails.length >= 12}
                    className="w-full rounded-lg bg-white/5 backdrop-blur-xl px-3 py-2 text-[11px] font-light text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-3 w-3" />
                    {editingSetDetails.length < 12 ? `Add Set (${editingSetDetails.length}/12)` : 'Max reached'}
                  </button>
                </div>

                {setDetailsError && (
                  <div role="alert" aria-live="assertive" className="mx-5 mb-4 rounded-xl bg-destructive/10 backdrop-blur-xl p-3 text-xs text-destructive">
                    {setDetailsError}
                  </div>
                )}

                <div className="flex gap-2 px-4 pb-4 pt-3 border-t border-white/5">
                  <button
                    onClick={closeSetEditor}
                    disabled={isSavingSetDetails}
                    className="rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2 text-[11px] font-light text-white/80 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                  <button
                    onClick={persistSetDetails}
                    disabled={isSavingSetDetails}
                    data-action="save-sets"
                    className="flex-1 rounded-lg bg-emerald-500/20 backdrop-blur-xl px-3 py-2 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {isSavingSetDetails ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" />
                        Done
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
            </div>
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
      
      {/* Copy Workout Modal - Glassmorphism */}
      {showCopyModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => !isCopying && setShowCopyModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="copy-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-3xl opacity-40" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl opacity-30" />
            
            <div className="relative p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Copy className="h-5 w-5 text-white/90" />
                  <h3 id="copy-modal-title" className="text-lg font-semibold text-white">Copy Workout</h3>
                </div>
                <button
                  onClick={() => setShowCopyModal(false)}
                  disabled={isCopying}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-white/60 mb-5">
                Create a duplicate with a new name
              </p>
              
              {/* Input */}
              <div className="mb-5">
                <label className="block text-xs font-light text-white/70 mb-2">Workout Name</label>
                <input
                  type="text"
                  value={copyWorkoutName}
                  onChange={(e) => setCopyWorkoutName(e.target.value)}
                  className="w-full rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                  placeholder="Enter workout name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && copyWorkoutName.trim()) {
                      handleCopyConfirm()
                    } else if (e.key === 'Escape') {
                      setShowCopyModal(false)
                    }
                  }}
                />
              </div>
              
              {/* Buttons */}
              <div className="flex gap-2 border-t border-white/5 pt-4">
                <button
                  onClick={() => setShowCopyModal(false)}
                  disabled={isCopying}
                  className="rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2 text-[11px] font-light text-white/80 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
                <button
                  onClick={handleCopyConfirm}
                  disabled={isCopying || !copyWorkoutName.trim()}
                  className="flex-1 rounded-lg bg-emerald-500/20 backdrop-blur-xl px-3 py-2 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {isCopying ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      Create Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
