'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Dumbbell, Clock, X, Check, Plus } from 'lucide-react'

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

interface LocalSetEntry {
  set_number: number
  reps: number | null
  weight_kg: number | null
  rest_seconds: number | null
  notes: string | null
}

function parseFocus(val: string[] | string | null): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [val] }
}

// localStorage helpers for exercise logs
function getLogStorageKey(token: string, workoutId: string, exerciseIdx: number) {
  return `plan_log_${token}_${workoutId}_${exerciseIdx}`
}

function loadLocalLog(token: string, workoutId: string, exerciseIdx: number): LocalSetEntry[] | null {
  try {
    const raw = localStorage.getItem(getLogStorageKey(token, workoutId, exerciseIdx))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveLocalLog(token: string, workoutId: string, exerciseIdx: number, entries: LocalSetEntry[]) {
  try {
    localStorage.setItem(getLogStorageKey(token, workoutId, exerciseIdx), JSON.stringify(entries))
  } catch { /* quota exceeded, ignore */ }
}

export default function SharedPlanPage() {
  const params = useParams()
  const token = params.token as string

  const [plan, setPlan] = useState<SharedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)

  // Exercise log modal state
  const [logModal, setLogModal] = useState<{ workoutId: string; exerciseIdx: number; exercise: SharedExercise } | null>(null)
  const [logEntries, setLogEntries] = useState<LocalSetEntry[]>([])
  const [savedIndicator, setSavedIndicator] = useState(false)

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

  // Re-fetch when tab becomes visible (user switches back)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPlan(false)
      }
    }
    const handleFocus = () => fetchPlan(false)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchPlan])

  const openLogModal = (workoutId: string, exerciseIdx: number, exercise: SharedExercise) => {
    const saved = loadLocalLog(token, workoutId, exerciseIdx)
    const entries = saved || Array.from({ length: exercise.sets || 3 }, (_, i) => ({
      set_number: i + 1,
      reps: typeof exercise.reps === 'number' ? exercise.reps : null,
      weight_kg: null,
      rest_seconds: exercise.rest_time_seconds || null,
      notes: null,
    }))
    setLogEntries(entries)
    setLogModal({ workoutId, exerciseIdx, exercise })
    setSavedIndicator(false)
  }

  const closeLogModal = () => {
    setLogModal(null)
    setLogEntries([])
    setSavedIndicator(false)
  }

  const updateLogField = (idx: number, field: keyof LocalSetEntry, value: string) => {
    setLogEntries(prev => {
      const next = [...prev]
      const entry = { ...next[idx] }
      if (field === 'notes') {
        entry.notes = value || null
      } else {
        const num = value === '' ? null : Number(value)
        ;(entry as any)[field] = num !== null && isNaN(num) ? null : num
      }
      next[idx] = entry
      return next
    })
  }

  const addLogSet = () => {
    setLogEntries(prev => [...prev, {
      set_number: prev.length + 1,
      reps: null, weight_kg: null, rest_seconds: null, notes: null
    }])
  }

  const removeLogSet = (idx: number) => {
    setLogEntries(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, set_number: i + 1 })))
  }

  const saveLog = () => {
    if (!logModal) return
    saveLocalLog(token, logModal.workoutId, logModal.exerciseIdx, logEntries)
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 1500)
  }

  const hasLocalLog = (workoutId: string, exerciseIdx: number): boolean => {
    try {
      return localStorage.getItem(getLogStorageKey(token, workoutId, exerciseIdx)) !== null
    } catch { return false }
  }

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
                          <div
                            key={idx}
                            className="rounded-md bg-white/5 p-2 cursor-pointer hover:bg-white/10 transition-colors active:bg-white/15"
                            onClick={() => openLogModal(w.id, idx, ex)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <p className="text-[11px] text-white/90 font-medium truncate">{ex.name}</p>
                                {hasLocalLog(w.id, idx) && (
                                  <span className="text-[7px] px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 flex-shrink-0">logged</span>
                                )}
                              </div>
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

                            {/* Show saved log summary */}
                            {(() => {
                              const saved = loadLocalLog(token, w.id, idx)
                              if (!saved || saved.length === 0) return null
                              return (
                                <div className="mt-1.5 space-y-0.5">
                                  {saved.map((sd, si) => (
                                    <div key={si} className="flex items-center gap-2 text-[9px] text-white/50">
                                      <span className="w-4 text-white/30">#{sd.set_number}</span>
                                      {sd.reps != null && <span>{sd.reps} reps</span>}
                                      {sd.weight_kg != null && <span>{sd.weight_kg}kg</span>}
                                      {sd.rest_seconds != null && <span>{sd.rest_seconds}s</span>}
                                      {sd.notes && <span className="text-white/40 truncate max-w-[120px]">{sd.notes}</span>}
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}

                            {/* Set details from server if no local log */}
                            {!loadLocalLog(token, w.id, idx) && ex.set_details && ex.set_details.length > 0 && (
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
            Shared workout plan · Tap exercise to log sets
          </p>
        </div>
      </motion.div>

      {/* Exercise Log Modal */}
      <AnimatePresence>
        {logModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={closeLogModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-2xl shadow-2xl max-h-[85vh] overflow-hidden"
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-3xl opacity-40" />
              <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl opacity-30" />

              <div className="relative">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 pb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{logModal.exercise.name}</h3>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      {logModal.exercise.sets} sets · {logModal.exercise.reps} reps · {logModal.exercise.rest_time_seconds}s rest
                    </p>
                  </div>
                  <button onClick={closeLogModal} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Column Headers */}
                <div className="px-4 pb-2">
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-1.5 items-center px-2">
                    <div className="w-5"></div>
                    <div className="text-[8px] font-medium text-white/40 text-center uppercase tracking-wider">Reps</div>
                    <div className="text-[8px] font-medium text-white/40 text-center uppercase tracking-wider">Kg</div>
                    <div className="text-[8px] font-medium text-white/40 text-center uppercase tracking-wider">Rest</div>
                    <div className="text-[8px] font-medium text-white/40 text-center uppercase tracking-wider">Notes</div>
                    <div className="w-5"></div>
                  </div>
                </div>

                {/* Set Rows */}
                <div className="space-y-1 px-4 pb-3 max-h-[50vh] overflow-y-auto">
                  {logEntries.map((entry, idx) => (
                    <div key={idx} className="rounded-lg bg-white/5 p-2">
                      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-1.5 items-center">
                        <div className="flex items-center justify-center w-5 h-5 rounded bg-white/10 text-[9px] font-medium text-white/80">
                          {entry.set_number}
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={entry.reps ?? ''}
                          onChange={(e) => updateLogField(idx, 'reps', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement)?.focus() } }}
                          placeholder="—"
                          className="w-full rounded bg-white/10 px-1.5 py-1 text-[10px] text-center text-white placeholder-white/25 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={entry.weight_kg ?? ''}
                          onChange={(e) => updateLogField(idx, 'weight_kg', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement)?.focus() } }}
                          placeholder="—"
                          className="w-full rounded bg-white/10 px-1.5 py-1 text-[10px] text-center text-white placeholder-white/25 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                        />
                        <input
                          type="number"
                          min="0"
                          value={entry.rest_seconds ?? ''}
                          onChange={(e) => updateLogField(idx, 'rest_seconds', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement)?.focus() } }}
                          placeholder="—"
                          className="w-full rounded bg-white/10 px-1.5 py-1 text-[10px] text-center text-white placeholder-white/25 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                        />
                        <input
                          type="text"
                          value={entry.notes ?? ''}
                          onChange={(e) => updateLogField(idx, 'notes', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveLog() } }}
                          placeholder="—"
                          className="w-full rounded bg-white/10 px-1.5 py-1 text-[10px] text-white placeholder-white/25 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                        />
                        {logEntries.length > 1 && (
                          <button onClick={() => removeLogSet(idx)} className="p-0.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addLogSet}
                    disabled={logEntries.length >= 12}
                    className="w-full rounded-lg bg-white/5 px-3 py-1.5 text-[10px] text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Set ({logEntries.length}/12)
                  </button>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-white/5">
                  <button
                    onClick={closeLogModal}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-[10px] text-white/70 hover:bg-white/15 transition-colors flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Close
                  </button>
                  <button
                    onClick={saveLog}
                    className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1"
                  >
                    {savedIndicator ? (
                      <>
                        <Check className="h-3 w-3" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" />
                        Save
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[8px] text-white/25 text-center pb-3">Saved locally on this device</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
