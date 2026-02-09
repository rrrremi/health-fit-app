'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ClipboardList, Plus, Trash2, Link as LinkIcon, Clock, Dumbbell, X, Check, RefreshCw } from 'lucide-react'
import { WorkoutPlanListItem } from '@/types/workout-plan'
import { toast } from '@/lib/toast'

export default function WorkoutPlansPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<WorkoutPlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanDescription, setNewPlanDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`/api/workout-plans?t=${Date.now()}`)
      const data = await res.json()
      if (res.ok) {
        setPlans(data.plans)
      }
    } catch (err) {
      console.error('Error fetching plans:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleCreate = async () => {
    if (!newPlanName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/workout-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlanName.trim(), description: newPlanDescription.trim() || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Plan created')
      setShowCreateModal(false)
      setNewPlanName('')
      setNewPlanDescription('')
      router.push(`/protected/workout-plans/${data.plan.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create plan')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/workout-plans/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setPlans(prev => prev.filter(p => p.id !== id))
      toast.success('Plan deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete plan')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  const copyShareLink = (token: string) => {
    const url = `${origin}/plan/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Share link copied')
  }

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

  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        {/* Action Buttons */}
        <div className="mb-1.5 flex items-center justify-between relative z-10">
          <div></div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Plan
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {/* Title */}
          <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="h-5 w-5 text-white/90" />
                <h1 className="text-xl font-semibold tracking-tight">Workout Plans</h1>
              </div>
              <p className="text-xs text-white/70">Create and share workout plans with others</p>
            </div>
          </div>

          {/* Empty State */}
          {plans.length === 0 && (
            <div className="rounded-md border border-transparent bg-white/5 p-6 text-center backdrop-blur-2xl">
              <ClipboardList className="h-10 w-10 mx-auto text-white/30 mb-2" />
              <h3 className="text-base font-medium text-white mb-1.5">No plans yet</h3>
              <p className="text-xs text-white/60 mb-3">
                Create a workout plan to organize and share your workouts
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 mx-auto rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Plan
              </button>
            </div>
          )}

          {/* Plans List */}
          {plans.length > 0 && (
            <div className="grid gap-2">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => router.push(`/protected/workout-plans/${plan.id}`)}
                  className="rounded-md border border-transparent bg-white/5 p-2.5 sm:p-2 backdrop-blur-2xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-[13px] text-white/90 font-normal leading-tight truncate">
                        {plan.name}
                      </p>
                      {plan.description && (
                        <p className="text-[10px] text-white/50 truncate mt-0.5">{plan.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          {plan.workout_count} {plan.workout_count === 1 ? 'workout' : 'workouts'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-white/40">
                          {new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyShareLink(plan.share_token)
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                        aria-label="Copy share link"
                      >
                        <LinkIcon className="h-3 w-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(plan.id)
                        }}
                        className="p-1 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                        aria-label="Delete plan"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => !isCreating && setShowCreateModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-3xl opacity-40" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl opacity-30" />

            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-white/90" />
                  <h3 className="text-lg font-semibold text-white">New Workout Plan</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-light text-white/70 mb-2">Plan Name</label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors"
                  placeholder="e.g. Push Pull Legs"
                  autoFocus
                  maxLength={100}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPlanName.trim()) handleCreate()
                    if (e.key === 'Escape') setShowCreateModal(false)
                  }}
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-light text-white/70 mb-2">Description (optional)</label>
                <textarea
                  value={newPlanDescription}
                  onChange={(e) => setNewPlanDescription(e.target.value)}
                  className="w-full rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors resize-none min-h-[60px]"
                  placeholder="Optional description..."
                  maxLength={500}
                />
              </div>

              <div className="flex gap-2 border-t border-white/5 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2 text-[11px] font-light text-white/80 hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  <X className="h-3 w-3 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !newPlanName.trim()}
                  className="flex-1 rounded-lg bg-emerald-500/20 backdrop-blur-xl px-3 py-2 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      Create Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => !isDeleting && setDeleteTarget(null)}
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
                This will permanently delete the plan and its share link. Workouts themselves will not be deleted.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="rounded-lg bg-white/10 px-3 py-2 text-[11px] font-light text-white/80 hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-[11px] font-medium text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3" />
                      Delete
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
