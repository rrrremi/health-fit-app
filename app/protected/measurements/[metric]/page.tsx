'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown, Calendar, TrendingUp, Edit2, Trash2, Save, X, Minus, Plus } from 'lucide-react'
import { Sparkline } from '@/components/measurements/Sparkline'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useMeasurementDetail } from '@/hooks/useMeasurementDetail'
import { useMeasurementSort } from '@/hooks/useMeasurementSort'
import { useMeasurementMutations } from '@/hooks/useMeasurementMutations'
import type { MeasurementPublic, SortField } from '@/types/measurements'

function MetricDetailPageContent() {
  const params = useParams()
  const metric = params.metric as string
  
  // UI state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Data hooks
  const { data, isLoading, error } = useMeasurementDetail(metric)
  const { sortedMeasurements, sortField, sortDirection, toggleSort } = useMeasurementSort(data?.measurements || [])
  const { updateMeasurement, deleteMeasurement, createMeasurement, deleting } = useMeasurementMutations(metric)

  // Prepare sparkline data (API returns DESC, reverse to ASC for sparkline: oldest → newest left to right)
  const sparklineData = useMemo(() => {
    if (!data?.measurements) return []
    return [...data.measurements]
      .reverse()
      .map(m => ({ value: m.value, date: m.measured_at }))
  }, [data?.measurements])

  // Get chronologically latest measurement (not affected by user sorting)
  const latestMeasurement = useMemo(() => {
    if (!data?.measurements || data.measurements.length === 0) return null
    return [...data.measurements].sort((a, b) => 
      new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
    )[0]
  }, [data?.measurements])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddModal && !isSubmitting) {
        setShowAddModal(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showAddModal, isSubmitting])

  const startEdit = (measurement: MeasurementPublic) => {
    setEditingId(measurement.id)
    setEditValue(measurement.value.toString())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleUpdate = async (id: string) => {
    const newValue = parseFloat(editValue)
    if (isNaN(newValue)) return
    
    // Clear editing state immediately
    setEditingId(null)
    setEditValue('')
    
    // Call mutation hook
    await updateMeasurement(id, newValue)
  }

  const handleDelete = async (id: string) => {
    await deleteMeasurement(id)
  }

  const handleAddMeasurement = async () => {
    const value = parseFloat(newValue)
    if (isNaN(value) || !newDate || !data?.measurements[0]?.unit) {
      return
    }

    setIsSubmitting(true)
    try {
      await createMeasurement({
        value,
        measured_at: new Date(newDate).toISOString(),
        unit: data.measurements[0].unit,
      })
      
      // Reset and close modal
      setShowAddModal(false)
      setNewValue('')
      setNewDate(new Date().toISOString().split('T')[0])
    } catch (error) {
      // Error already handled in mutation hook
    } finally {
      setIsSubmitting(false)
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-white/30" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-emerald-400" />
      : <ArrowDown className="h-3 w-3 text-emerald-400" />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Error loading measurement details. Please try again.
        </div>
      </section>
    )
  }

  const stats = {
    count: data.measurements.length,
    latest: latestMeasurement?.value,
    min: Math.min(...data.measurements.map(m => m.value)),
    max: Math.max(...data.measurements.map(m => m.value)),
    avg: data.measurements.reduce((sum, m) => sum + m.value, 0) / data.measurements.length
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-2 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-md border border-transparent bg-white/5 p-2.5 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link href="/protected/measurements">
                <button className="flex items-center gap-0.5 rounded-md border border-transparent bg-white/5 px-2 py-1 text-[11px] text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
                  <ChevronLeft className="h-3 w-3" />
                </button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold leading-tight">{data.display_name}</h1>
                <p className="text-[10px] text-white/60 leading-tight">{stats.count} measurements</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sparkline Card */}
        <div className="relative overflow-hidden rounded-md border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-white/60" />
            <h2 className="text-xs font-medium text-white/90">Trend</h2>
          </div>
          
          <div className="h-24 mb-3">
            <Sparkline 
              data={sparklineData} 
              color="#fff" 
              unit={latestMeasurement?.unit || ''}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10">
            <div>
              <p className="text-[10px] text-white/50">Latest</p>
              <p className="text-xs font-semibold text-white">{stats.latest?.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50">Average</p>
              <p className="text-xs font-semibold text-white">{stats.avg.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50">Min</p>
              <p className="text-xs font-semibold text-white">{stats.min.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50">Max</p>
              <p className="text-xs font-semibold text-white">{stats.max.toFixed(1)}</p>
            </div>
          </div>

          {data.trend_summary && (
            <div className="mt-2 rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {(() => {
                  const dir = data.trend_summary?.direction
                  if (dir === 'up') return <ArrowUp className="h-3 w-3 text-emerald-400" />
                  if (dir === 'down') return <ArrowDown className="h-3 w-3 text-destructive" />
                  return <Minus className="h-3 w-3 text-white/50" />
                })()}
                <span className="font-medium text-white/90">{data.trend_summary?.direction === 'up' ? 'Rising' : data.trend_summary?.direction === 'down' ? 'Falling' : 'Stable'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {typeof data.trend_summary?.change_pct === 'number' && (
                  <span className={data.trend_summary.change_pct > 0 ? 'text-emerald-400' : data.trend_summary.change_pct < 0 ? 'text-destructive' : 'text-white/60'}>
                    {data.trend_summary.change_pct > 0 ? '+' : ''}{data.trend_summary.change_pct.toFixed(1)}%
                  </span>
                )}
                {typeof data.trend_summary?.delta_abs === 'number' && (
                  <span className="text-white/60">
                    {data.trend_summary.delta_abs > 0 ? '+' : ''}{data.trend_summary.delta_abs.toFixed(2)} {latestMeasurement?.unit}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Measurement Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 rounded-md border border-transparent bg-white/5 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Measurement
          </button>
        </div>

        {/* Measurements List */}
        <div className="relative overflow-hidden rounded-md border border-transparent bg-white/5 backdrop-blur-2xl">
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/60" />
                <h2 className="text-xs font-medium text-white/90">All Measurements</h2>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-2 py-1.5 text-[10px] font-medium text-white/60">
                    <button
                      onClick={() => toggleSort('date')}
                      className="flex items-center gap-0.5 hover:text-white transition-colors"
                    >
                      Date
                      <SortIcon field="date" />
                    </button>
                  </th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-medium text-white/60">
                    <button
                      onClick={() => toggleSort('value')}
                      className="flex items-center gap-0.5 hover:text-white transition-colors"
                    >
                      Value
                      <SortIcon field="value" />
                    </button>
                  </th>
                  <th className="text-center px-2 py-1.5 text-[10px] font-medium text-white/60">Status</th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-medium text-white/60">Change %</th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-medium text-white/60">Source</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-medium text-white/60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedMeasurements.map((measurement, index) => {
                  // Debug logging
                  if (index < 3) {
                    console.log(`[Frontend] ${measurement.value}:`, measurement.health_status);
                  }
                  return (
                    <tr
                      key={measurement.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-white/90">
                            {new Date(measurement.measured_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {measurement.updated_at && 
                           new Date(measurement.updated_at).getTime() > new Date(measurement.created_at).getTime() + 1000 && (
                            <span className="text-[9px] text-white/30 mt-0.5">
                              Modified: {new Date(measurement.updated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        {editingId === measurement.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                              autoFocus
                            />
                            <span className="text-[10px] text-white/50">{measurement.unit}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-white">
                              {measurement.value.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-white/50">
                              {measurement.unit}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <div 
                          className="w-2 h-2 rounded-full mx-auto"
                          style={{
                            backgroundColor: 
                              measurement.health_status === 'healthy' ? '#34d399' :
                              measurement.health_status === 'near_boundary' ? '#fbbf24' :
                              measurement.health_status === 'moderately_exceeded' ? '#f97316' :
                              measurement.health_status === 'critically_exceeded' ? '#ef4444' :
                              '#9ca3af'
                          }}
                          title={measurement.health_status || 'no status'}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-[10px]">
                        {typeof measurement.delta_pct === 'number' ? (
                          <div className="flex items-center gap-0.5">
                            {measurement.trend_direction === 'up' && <ArrowUp className="h-2.5 w-2.5 text-emerald-400" />}
                            {measurement.trend_direction === 'down' && <ArrowDown className="h-2.5 w-2.5 text-destructive" />}
                            {(measurement.trend_direction === 'flat' || !measurement.trend_direction) && <Minus className="h-2.5 w-2.5 text-white/40" />}
                            <span className={measurement.delta_pct > 0 ? 'text-emerald-400' : measurement.delta_pct < 0 ? 'text-destructive' : 'text-white/60'}>
                              {measurement.delta_pct > 0 ? '+' : ''}{measurement.delta_pct.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-[10px]">
                        {measurement.source === 'ocr' ? (
                          <span className="text-emerald-400">
                            📸 OCR {measurement.confidence && `(${Math.round(measurement.confidence * 100)}%)`}
                          </span>
                        ) : (
                          <span className="text-blue-400">✍️ Manual</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {editingId === measurement.id ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => handleUpdate(measurement.id)}
                              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                              title="Save"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 rounded hover:bg-white/10 text-white/60 transition-colors"
                              title="Cancel"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => startEdit(measurement)}
                              className="p-1 rounded hover:bg-blue-500/20 text-blue-400 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(measurement.id)}
                              disabled={deleting === measurement.id}
                              className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deleting === measurement.id ? (
                                <div className="animate-spin h-3 w-3 border-2 border-destructive border-t-transparent rounded-full"></div>
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Add Measurement Modal - Glassmorphism */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => !isSubmitting && setShowAddModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-measurement-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-xl bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden"
            >
              {/* Decorative blurs */}
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-3xl opacity-40" />
              <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl opacity-30" />
              
              <div className="relative p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-white/90" />
                    <h3 id="add-measurement-title" className="text-base font-semibold text-white">Add Measurement</h3>
                  </div>
                  <button
                    onClick={() => !isSubmitting && setShowAddModal(false)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <p className="text-xs text-white/60 mb-3">
                  Add a new {metric} measurement
                </p>
                
                {/* Inputs */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-light text-white/60 mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-md bg-white/10 backdrop-blur-xl px-2.5 py-2 text-xs text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-light text-white/60 mb-1.5">
                      Value ({data?.measurements[0]?.unit || ''})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter value"
                      className="w-full rounded-md bg-white/10 backdrop-blur-xl px-2.5 py-2 text-xs text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 transition-colors disabled:opacity-50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newValue && newDate) {
                          handleAddMeasurement()
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => !isSubmitting && setShowAddModal(false)}
                    disabled={isSubmitting}
                    className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-light text-white/80 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMeasurement}
                    disabled={isSubmitting || !newValue || !newDate}
                    className="flex-1 rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-light text-white/80 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin h-3 w-3 border-2 border-white/60 border-t-transparent rounded-full"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        Add Measurement
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default function MetricDetailPage() {
  return (
    <ErrorBoundary>
      <MetricDetailPageContent />
    </ErrorBoundary>
  )
}
