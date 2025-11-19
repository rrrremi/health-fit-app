'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Dumbbell, Plus, Trash2, Check, ChevronLeft, ArrowRight } from 'lucide-react'
import ExercisePicker from '@/components/workout/ExercisePicker'

interface Exercise {
  name: string
  sets: number
  reps: number
  rest_time_seconds: number
}

export default function CreateWorkoutPage() {
  const router = useRouter()
  const [workoutName, setWorkoutName] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddExercise = useCallback((exerciseName: string) => {
    setExercises(prev => [...prev, {
      name: exerciseName,
      sets: 3,
      reps: 10,
      rest_time_seconds: 60
    }])
    // Keep picker open to allow adding multiple exercises
  }, [])

  const handleRemoveExercise = useCallback((index: number) => {
    // Don't allow deleting the last exercise
    setExercises(prev => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleUpdateExercise = useCallback((index: number, field: keyof Exercise, value: string | number) => {
    setExercises(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const isValid = useMemo(() => 
    workoutName.trim().length > 0 && exercises.length > 0 && exercises.every(ex => 
      ex.sets > 0 && ex.reps > 0 && ex.rest_time_seconds >= 0
    ),
    [workoutName, exercises]
  )

  const handleCreate = async () => {
    if (!isValid) return

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/workouts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workoutName.trim(),
          exercises
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error:', data)
        throw new Error(data.error || 'Failed to create workout')
      }

      console.log('Workout created successfully:', data)
      router.push(`/protected/workouts/${data.workout.id}`)
    } catch (err) {
      console.error('Create workout error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create workout')
      setIsCreating(false)
    }
  }

  return (
    <>
      <section className="mx-auto mt-6 w-full max-w-3xl px-2 sm:px-3 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          {/* Back Button */}
          <Link href="/protected/workouts">
            <button className="flex items-center gap-1 text-xs text-white/70 hover:text-white/90 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Workouts
            </button>
          </Link>

          {/* Header */}
          <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="h-5 w-5 text-white/90" />
                <h1 className="text-xl font-semibold tracking-tight">Create Workout</h1>
              </div>
              <p className="text-xs text-white/70">Build your custom workout from scratch</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl p-4 space-y-4">
            {/* Workout Name */}
            <div>
              <label className="block text-xs text-white/70 mb-1.5 font-light">
                Workout Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="e.g., Morning Strength Session"
                maxLength={50}
                required
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
              />
              {workoutName.trim().length === 0 && (
                <p className="text-[10px] text-white/50 mt-1">Workout name is required</p>
              )}
            </div>

            {/* Exercises Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/70 font-light">
                  Exercises {exercises.length > 0 && `(${exercises.length})`}
                </label>
                <button
                  onClick={() => setShowExercisePicker(true)}
                  className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-light text-white/90 hover:bg-white/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Exercise
                </button>
              </div>

              {/* Exercise List */}
              {exercises.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-8 text-center">
                  <Dumbbell className="h-8 w-8 text-white/40 mx-auto mb-2" />
                  <p className="text-sm text-white/60 font-light">No exercises added yet</p>
                  <p className="text-xs text-white/40 mt-1">Click "Add Exercise" to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exercises.map((exercise, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-white/20 bg-white/5 p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-[10px] font-light text-white/70">
                            {index + 1}
                          </div>
                          <h4 className="text-sm font-light text-white/90">{exercise.name}</h4>
                        </div>
                        {exercises.length > 1 ? (
                          <button
                            onClick={() => handleRemoveExercise(index)}
                            className="rounded-md p-1 text-destructive hover:bg-destructive/20 transition-colors"
                            title="Remove exercise"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="rounded-md p-1 text-destructive/30 cursor-not-allowed"
                            title="Cannot delete the last exercise"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Sets, Reps, Rest inputs */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">Sets</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={exercise.sets}
                            onChange={(e) => handleUpdateExercise(index, 'sets', parseInt(e.target.value) || 1)}
                            className="w-full rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white/90 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">Reps</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={exercise.reps}
                            onChange={(e) => handleUpdateExercise(index, 'reps', parseInt(e.target.value) || 1)}
                            className="w-full rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white/90 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">Rest (s)</label>
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={exercise.rest_time_seconds}
                            onChange={(e) => handleUpdateExercise(index, 'rest_time_seconds', parseInt(e.target.value) || 0)}
                            className="w-full rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white/90 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCreate}
                disabled={!isValid || isCreating}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-light text-white/90 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Workout
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Exercise Picker Side Panel */}
      <ExercisePicker
        isOpen={showExercisePicker}
        workoutId="temp-create-mode"
        onClose={() => setShowExercisePicker(false)}
        onExerciseAdded={() => {
          // Keep picker open to allow adding multiple exercises
        }}
        createMode={true}
        onSelectExercise={handleAddExercise}
      />
    </>
  )
}
