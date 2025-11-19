'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Dumbbell, Check } from 'lucide-react'
import ExercisePicker from './ExercisePicker'

interface Exercise {
  name: string
  sets: number
  reps: number
  rest_time_seconds: number
}

interface CreateWorkoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (workoutId: string) => void
}

export default function CreateWorkoutModal({ isOpen, onClose, onSuccess }: CreateWorkoutModalProps) {
  const [workoutName, setWorkoutName] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setWorkoutName('')
      setExercises([])
      setShowExercisePicker(false)
      setError(null)
    }
  }, [isOpen])

  const handleAddExercise = (exerciseName: string) => {
    setExercises([...exercises, {
      name: exerciseName,
      sets: 3,
      reps: 10,
      rest_time_seconds: 60
    }])
    setShowExercisePicker(false)
  }

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const handleUpdateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    const updated = [...exercises]
    updated[index] = { ...updated[index], [field]: value }
    setExercises(updated)
  }

  const isValid = workoutName.trim().length > 0 && exercises.length > 0 && exercises.every(ex => 
    ex.sets > 0 && ex.reps > 0 && ex.rest_time_seconds >= 0
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
      onSuccess(data.workout.id)
    } catch (err) {
      console.error('Create workout error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create workout')
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-white/90" />
              <h2 className="text-lg font-light text-white/90">Create Workout</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-4 space-y-4">
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
                        <button
                          onClick={() => handleRemoveExercise(index)}
                          className="rounded-md p-1 text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-4 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-light text-white/90 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!isValid || isCreating}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-sm font-light text-emerald-100 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-100/30 border-t-emerald-100" />
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
        </motion.div>

        {/* Exercise Picker Side Panel */}
        <ExercisePicker
          isOpen={showExercisePicker}
          workoutId="temp-create-mode"
          onClose={() => setShowExercisePicker(false)}
          onExerciseAdded={() => {
            // For create mode, we'll handle this via a modified ExercisePicker
            setShowExercisePicker(false)
          }}
          createMode={true}
          onSelectExercise={handleAddExercise}
        />
      </div>
    </AnimatePresence>
  )
}
