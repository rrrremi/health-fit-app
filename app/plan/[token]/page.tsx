'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ClipboardList, Dumbbell, Clock, Target, Activity, Zap } from 'lucide-react'
function VideoIconButton({ exerciseName }: { exerciseName: string }) {
  const openYouTube = () => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName)}&sp=EgIYAQ%253D%253D`
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openYouTube() }}
      className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
      title={`Watch ${exerciseName} on YouTube`}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    </button>
  )
}

interface SharedExercise {
  name: string
  sets: number
  reps: number | string
  rest_time_seconds: number
  primary_muscles?: string[]
  secondary_muscles?: string[]
  equipment?: string
  rationale?: string
  set_details?: { set_number: number; reps?: number | null; weight_kg?: number | null; rest_seconds?: number | null; notes?: string | null }[]
}

interface SharedWorkout {
  id: string
  name: string | null
  created_at: string
  total_duration_minutes: number
  muscle_focus: string[] | string | null
  workout_focus: string[] | string | null
  workout_data: { exercises: SharedExercise[] }
  status: string | null
  rating: number | null
}

interface SharedPlan {
  id: string
  name: string
  description: string | null
  share_token: string
  created_at: string
  updated_at: string
  workout_plan_workouts: {
    id: string
    workout_id: string
    order_index: number
    workouts: SharedWorkout
  }[]
}

function parseFocus(val: string[] | string | null): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [val] }
}

export default function SharedPlanPage() {
  const params = useParams()
  const token = params.token as string

  const [plan, setPlan] = useState<SharedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)

  const fetchPlan = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`/api/workout-plans/shared/${token}?t=${Date.now()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Plan not found')
      setPlan(data.plan)
      setError(null)
    } catch (err) {
      if (isInitial) {
        setError(err instanceof Error ? err.message : 'Failed to load plan')
      }
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPlan(true)
  }, [fetchPlan])


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-6 w-6 text-white mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-white/70">Loading workout plan...</p>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-sm mx-auto px-4">
          <ClipboardList className="h-12 w-12 mx-auto text-white/30 mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">Plan Not Found</h2>
          <p className="text-xs text-white/60">
            {error || 'This workout plan link may have expired or been deleted.'}
          </p>
        </div>
      </div>
    )
  }

  const planWorkouts = plan.workout_plan_workouts || []

  return (
    <section className="mx-auto w-full max-w-3xl px-2 py-6 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-5 w-5 text-white/90" />
              <h1 className="text-xl font-semibold tracking-tight">{plan.name}</h1>
            </div>
            {plan.description && (
              <p className="text-xs text-white/60 mt-1">{plan.description}</p>
            )}
            <p className="text-[10px] text-white/40 mt-1">
              {planWorkouts.length} {planWorkouts.length === 1 ? 'workout' : 'workouts'} · Updated {new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Workouts */}
        {planWorkouts.length === 0 ? (
          <div className="rounded-md border border-transparent bg-white/5 p-6 text-center backdrop-blur-2xl">
            <Dumbbell className="h-10 w-10 mx-auto text-white/30 mb-2" />
            <p className="text-xs text-white/60">No workouts in this plan yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {planWorkouts.map((pw) => {
              const w = pw.workouts
              if (!w) return null
              const isExpanded = expandedWorkout === w.id
              const exercises = (w.workout_data?.exercises || []) as SharedExercise[]
              const focusValues = parseFocus(w.workout_focus)
              const muscleValues = parseFocus(w.muscle_focus)

              return (
                <motion.div
                  key={pw.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-transparent bg-white/5 backdrop-blur-2xl overflow-hidden"
                >
                  {/* Workout Header - clickable to expand */}
                  <button
                    onClick={() => setExpandedWorkout(isExpanded ? null : w.id)}
                    className="w-full text-left p-2.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-white/90 font-medium truncate">
                          {w.name || `Workout ${new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {focusValues.slice(0, 2).map((f, i) => (
                            <span key={`f-${i}`} className="text-[7px] px-1 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 capitalize">{f}</span>
                          ))}
                          {muscleValues.slice(0, 2).map((m, i) => (
                            <span key={`m-${i}`} className="text-[7px] px-1 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 capitalize">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-white/50">
                        <span className="text-[10px]">{exercises.length} ex</span>
                        <span className="text-[10px] flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {w.total_duration_minutes}m
                        </span>
                        <svg className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Exercise Details */}
                  {isExpanded && exercises.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-t border-white/5 p-2.5"
                    >
                      <div className="space-y-2">
                        {exercises.map((ex, idx) => (
                          <div key={idx} className="rounded-md bg-white/5 p-2">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] text-white/90 font-medium flex-1 min-w-0 truncate">{ex.name}</p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-2 text-[9px] text-white/50">
                                  <span>{ex.sets}s</span>
                                  <span>{ex.reps}r</span>
                                  <span>{ex.rest_time_seconds}s</span>
                                </div>
                                <VideoIconButton exerciseName={ex.name} />
                              </div>
                            </div>

                            {/* Equipment & muscles */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ex.equipment && ex.equipment !== 'None' && (
                                <span className="text-[7px] px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{ex.equipment}</span>
                              )}
                              {ex.primary_muscles?.slice(0, 3).map((m, i) => (
                                <span key={i} className="text-[7px] px-1 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-200 capitalize">{m}</span>
                              ))}
                            </div>

                            {/* Set details if available */}
                            {ex.set_details && ex.set_details.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {ex.set_details.map((sd, si) => (
                                  <div key={si} className="flex items-center gap-2 text-[9px] text-white/50">
                                    <span className="w-4 text-white/30">#{sd.set_number}</span>
                                    {sd.reps != null && <span>{sd.reps} reps</span>}
                                    {sd.weight_kg != null && <span>{sd.weight_kg}kg</span>}
                                    {sd.rest_seconds != null && <span>{sd.rest_seconds}s</span>}
                                    {sd.notes && <span className="text-white/40 truncate max-w-[120px]">{sd.notes}</span>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Rationale */}
                            {ex.rationale && (
                              <p className="text-[9px] text-white/40 mt-1 line-clamp-2">{ex.rationale}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-white/30">
            Shared workout plan
          </p>
        </div>
      </motion.div>
    </section>
  )
}
