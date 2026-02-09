'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FolderPlus, X, Check, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'

interface Plan {
  id: string
  name: string
  workout_count: number
}

interface AddToPlanModalProps {
  open: boolean
  workoutId: string | null
  workoutName?: string
  onClose: () => void
}

export default function AddToPlanModal({ open, workoutId, workoutName, onClose }: AddToPlanModalProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetch(`/api/workout-plans?t=${Date.now()}`)
        .then(res => res.json())
        .then(data => setPlans(data.plans || []))
        .catch(() => toast.error('Failed to load plans'))
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleAdd = async (planId: string) => {
    if (!workoutId || adding) return
    setAdding(planId)
    try {
      const res = await fetch(`/api/workout-plans/${planId}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Added to plan')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAdding(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="rounded-lg border border-transparent bg-white/5 backdrop-blur-2xl p-3 max-w-xs w-full"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
            <h3 className="text-sm font-medium text-white/90">Add to Plan</h3>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {workoutName && (
          <p className="text-[10px] text-white/50 mb-2 truncate">
            {workoutName}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-white/50 mb-2">No plans yet</p>
            <a
              href="/protected/workout-plans"
              className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Create a plan first
            </a>
          </div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {plans.map(plan => (
              <button
                key={plan.id}
                onClick={() => handleAdd(plan.id)}
                disabled={!!adding}
                className="w-full flex items-center justify-between rounded-md border border-transparent bg-white/5 px-2.5 py-1.5 text-left hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/80 truncate">{plan.name}</p>
                  <p className="text-[9px] text-white/40">{plan.workout_count} workout{plan.workout_count !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {adding === plan.id ? (
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                  ) : (
                    <Check className="h-3 w-3 text-white/20" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
