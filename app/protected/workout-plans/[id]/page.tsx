'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ClipboardList, Link as LinkIcon, Trash2, Plus, X, Check,
  RefreshCw, Pencil, Eye, Clock, Dumbbell, Users
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { WorkoutPlanAccessLog } from '@/types/workout-plan'
import { WorkoutListItem } from '@/types/workout'
import { createClient } from '@/lib/supabase/client'
import { parseFocusValues, parseMuscleValues } from '@/lib/workout-utils'

export default function WorkoutPlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string
  const supabase = createClient()

  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Add workout state
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [userWorkouts, setUserWorkouts] = useState<WorkoutListItem[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [addingWorkoutId, setAddingWorkoutId] = useState<string | null>(null)

  // Access logs
  const [showLogs, setShowLogs] = useState(false)
  const [accessLogs, setAccessLogs] = useState<WorkoutPlanAccessLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Rename workout
  const [renamingWorkoutId, setRenamingWorkoutId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/workout-plans/${planId}?t=${Date.now()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlan(data.plan)
      setEditName(data.plan.name)
      setEditDescription(data.plan.description || '')
    } catch (err) {
      toast.error('Failed to load plan')
      router.push('/protected/workout-plans')
    } finally {
      setLoading(false)
    }
  }, [planId, router])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  const handleSave = async () => {
    if (!editName.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/workout-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlan((prev: any) => ({ ...prev, name: data.plan.name, description: data.plan.description }))
      setIsEditing(false)
      toast.success('Plan updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/workout-plans/${planId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Plan deleted')
      router.push('/protected/workout-plans')
    } catch (err) {
      toast.error('Failed to delete plan')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const copyShareLink = () => {
    if (!plan) return
    const url = `${origin}/plan/${plan.share_token}`
    navigator.clipboard.writeText(url)
    toast.success('Share link copied')
  }

  const fetchUserWorkouts = async () => {
    setLoadingWorkouts(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('workouts')
        .select('id, name, created_at, total_duration_minutes, muscle_focus, workout_focus, workout_data, target_date, status, rating')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setUserWorkouts(data as WorkoutListItem[])
    } catch (err) {
      console.error('Error fetching workouts:', err)
    } finally {
      setLoadingWorkouts(false)
    }
  }

  const handleAddWorkout = async (workoutId: string) => {
    setAddingWorkoutId(workoutId)
    try {
      const res = await fetch(`/api/workout-plans/${planId}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Workout added')
      await fetchPlan()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add workout')
    } finally {
      setAddingWorkoutId(null)
    }
  }

  const handleRemoveWorkout = async (workoutId: string) => {
    try {
      const res = await fetch(`/api/workout-plans/${planId}/workouts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId })
      })
      if (!res.ok) throw new Error('Failed to remove')
      toast.success('Workout removed')
      await fetchPlan()
    } catch (err) {
      toast.error('Failed to remove workout')
    }
  }

  const fetchAccessLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch(`/api/workout-plans/${planId}/access-logs?t=${Date.now()}`)
      const data = await res.json()
      if (res.ok) setAccessLogs(data.logs)
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleRenameWorkout = async (workoutId: string) => {
    if (!renameValue.trim()) return
    setIsRenaming(true)
    try {
      const res = await fetch('/api/workouts/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workoutId, name: renameValue.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Workout renamed')
      setRenamingWorkoutId(null)
      await fetchPlan()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename')
    } finally {
      setIsRenaming(false)
    }
  }

  const planWorkouts = plan?.workout_plan_workouts || []
  const planWorkoutIds = new Set(planWorkouts.map((pw: any) => pw.workout_id))
  const availableWorkouts = userWorkouts.filter(w => !planWorkoutIds.has(w.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <svg className="animate-spin h-5 w-5 text-white mx-auto mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-white/70">Loading...</p>
        </div>
      </div>
    )
  }

  if (!plan) return null

  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {/* Back Button */}
          <Link href="/protected/workout-plans">
            <button className="flex items-center gap-1 text-xs text-white/70 hover:text-white/90 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Plans
            </button>
          </Link>

          {/* Header */}
          <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />

            <div className="relative">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                    placeholder="Plan name"
                    autoFocus
                    maxLength={100}
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 resize-none min-h-[50px]"
                    placeholder="Description (optional)"
                    maxLength={500}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setIsEditing(false); setEditName(plan.name); setEditDescription(plan.description || '') }}
                      disabled={isSaving}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/15 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editName.trim()}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-white/90" />
                      <h1 className="text-xl font-semibold tracking-tight">{plan.name}</h1>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                        aria-label="Edit plan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={copyShareLink}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                        aria-label="Copy share link"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (!showLogs) fetchAccessLogs()
                          setShowLogs(!showLogs)
                        }}
                        className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${showLogs ? 'text-emerald-400' : 'text-white/50 hover:text-white/80'}`}
                        aria-label="View access logs"
                      >
                        <Users className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors"
                        aria-label="Delete plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-white/60 mt-1">{plan.description}</p>
                  )}
                  <p className="text-[10px] text-white/40 mt-1">
                    {planWorkouts.length} {planWorkouts.length === 1 ? 'workout' : 'workouts'} · Updated {new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Access Logs Panel */}
          <AnimatePresence>
            {showLogs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Access Log
                    </h3>
                    <button
                      onClick={() => fetchAccessLogs()}
                      disabled={loadingLogs}
                      className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {loadingLogs ? (
                    <p className="text-[10px] text-white/50">Loading...</p>
                  ) : accessLogs.length === 0 ? (
                    <p className="text-[10px] text-white/50">No one has accessed this plan yet</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {accessLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-[10px] text-white/60 py-0.5">
                          <span>{log.ip_address || 'Unknown'}</span>
                          <span className="text-white/40">
                            {new Date(log.accessed_at).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Workouts in Plan */}
          <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-2xl overflow-hidden">
            <div className="p-2.5 flex items-center justify-between border-b border-white/5">
              <h3 className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5" />
                Workouts
              </h3>
              <button
                onClick={() => {
                  if (!showAddWorkout) fetchUserWorkouts()
                  setShowAddWorkout(!showAddWorkout)
                }}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors ${
                  showAddWorkout
                    ? 'bg-white/10 text-white/80'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {showAddWorkout ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {showAddWorkout ? 'Close' : 'Add'}
              </button>
            </div>

            {/* Add Workout Picker */}
            <AnimatePresence>
              {showAddWorkout && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-white/5"
                >
                  <div className="p-2.5 bg-white/[0.02] max-h-48 overflow-y-auto">
                    {loadingWorkouts ? (
                      <p className="text-[10px] text-white/50 text-center py-2">Loading workouts...</p>
                    ) : availableWorkouts.length === 0 ? (
                      <p className="text-[10px] text-white/50 text-center py-2">
                        {userWorkouts.length === 0 ? 'No workouts found. Create one first.' : 'All workouts already added.'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {availableWorkouts.map((w) => {
                          const isAdding = addingWorkoutId === w.id
                          return (
                            <div
                              key={w.id}
                              className="flex items-center justify-between rounded-md bg-white/5 p-2 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-white/80 truncate">
                                  {w.name || `Workout ${new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                </p>
                                <div className="flex gap-1 mt-0.5">
                                  {parseFocusValues(w.workout_focus).slice(0, 2).map((f, i) => (
                                    <span key={i} className="text-[7px] px-1 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 capitalize">{f}</span>
                                  ))}
                                  <span className="text-[7px] text-white/40">{w.workout_data?.exercises?.length || 0} ex</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddWorkout(w.id)}
                                disabled={isAdding}
                                className="ml-2 p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                              >
                                {isAdding ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Plan Workouts List */}
            <div className="p-2.5">
              {planWorkouts.length === 0 ? (
                <p className="text-[10px] text-white/50 text-center py-4">
                  No workouts added yet. Click "Add" to include workouts.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {planWorkouts.map((pw: any, index: number) => {
                    const w = pw.workouts
                    if (!w) return null
                    const focusValues = parseFocusValues(w.workout_focus)
                    const muscleValues = parseMuscleValues(w.muscle_focus)
                    const exerciseCount = w.workout_data?.exercises?.length || 0

                    return (
                      <div
                        key={pw.id}
                        className="rounded-md bg-white/5 p-2 hover:bg-white/10 transition-colors"
                      >
                        {renamingWorkoutId === w.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="flex-1 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                              autoFocus
                              maxLength={200}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameWorkout(w.id)
                                if (e.key === 'Escape') setRenamingWorkoutId(null)
                              }}
                            />
                            <button
                              onClick={() => handleRenameWorkout(w.id)}
                              disabled={isRenaming || !renameValue.trim()}
                              className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                              {isRenaming ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={() => setRenamingWorkoutId(null)}
                              disabled={isRenaming}
                              className="p-1 rounded-md hover:bg-white/10 text-white/50 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <Link
                              href={`/protected/workouts/${w.id}`}
                              className="flex-1 min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-[11px] text-white/90 truncate">
                                {w.name || `Workout ${new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {focusValues.slice(0, 2).map((f: string, i: number) => (
                                  <span key={`f-${i}`} className="text-[7px] px-1 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 capitalize">{f}</span>
                                ))}
                                {muscleValues.slice(0, 2).map((m: string, i: number) => (
                                  <span key={`m-${i}`} className="text-[7px] px-1 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 capitalize">{m}</span>
                                ))}
                                <span className="text-[7px] text-white/40">{exerciseCount} ex · {w.total_duration_minutes}m</span>
                              </div>
                            </Link>
                            <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                              <button
                                onClick={() => { setRenamingWorkoutId(w.id); setRenameValue(w.name || '') }}
                                className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                                aria-label="Rename workout"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveWorkout(w.id)}
                                className="p-1 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                                aria-label="Remove workout from plan"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Share Link Info */}
          <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/50">Share Link</p>
                <p className="text-[11px] text-white/70 font-mono mt-0.5 truncate max-w-[250px] sm:max-w-none">
                  {origin}/plan/{plan.share_token}
                </p>
              </div>
              <button
                onClick={copyShareLink}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10 transition-colors"
              >
                <LinkIcon className="h-3 w-3" />
                Copy
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Delete Modal */}
      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            <div className="relative p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Delete Plan?</h3>
              <p className="text-sm text-white/60 mb-5">
                This will permanently delete the plan and expire its share link.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white/80 hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-[11px] font-medium text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isDeleting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
