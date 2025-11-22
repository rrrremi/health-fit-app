'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, Loader2, CheckCircle, Plus, Trash2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import MetricPicker, { MetricCatalog } from '@/components/measurements/MetricPicker'

interface ManualMeasurement {
  metric: string
  displayName: string
  value: string
  unit: string
}

export default function ManualEntryPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<MetricCatalog[]>([])
  const [measurements, setMeasurements] = useState<ManualMeasurement[]>([])
  const [measurementDate, setMeasurementDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMetricPicker, setShowMetricPicker] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<number, string | null>>({})
  const supabase = createClient()

  // Get array of selected metric keys for MetricPicker
  const selectedMetricKeys = measurements.map(m => m.metric)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('metrics_catalog')
        .select('*')
        .order('sort_order')

      if (error) throw error
      setMetrics(data || [])
    } catch (err: any) {
      console.error('Error fetching metrics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMetricSelected = (metric: MetricCatalog) => {
    // Check if already added (shouldn't happen due to MetricPicker filtering)
    if (measurements.some(m => m.metric === metric.key)) return
    
    // Add to measurements list
    setMeasurements(prev => [...prev, {
      metric: metric.key,
      displayName: metric.display_name,
      value: '',
      unit: metric.unit
    }])
  }

  const removeMeasurement = (index: number) => {
    setMeasurements(measurements.filter((_, i) => i !== index))
  }

  const updateMeasurementValue = (index: number, value: string) => {
    const updated = [...measurements]
    updated[index] = { ...updated[index], value }
    setMeasurements(updated)
    
    // Clear validation error when user starts typing
    if (validationErrors[index]) {
      setValidationErrors(prev => ({ ...prev, [index]: null }))
    }
  }

  const validateField = (index: number): string | null => {
    const measurement = measurements[index]
    const metric = metrics.find(m => m.key === measurement.metric)
    
    if (!measurement.value || measurement.value.trim() === '') {
      return 'Required'
    }
    
    const numValue = parseFloat(measurement.value)
    if (isNaN(numValue)) {
      return 'Must be a number'
    }
    
    if (metric) {
      if (metric.min_value !== null && numValue < metric.min_value) {
        return `Min: ${metric.min_value}`
      }
      if (metric.max_value !== null && numValue > metric.max_value) {
        return `Max: ${metric.max_value}`
      }
    }
    
    return null
  }

  const handleValueBlur = (index: number) => {
    const error = validateField(index)
    setValidationErrors(prev => ({ ...prev, [index]: error }))
  }

  const validateMeasurements = (): string | null => {
    // Validate all fields and collect errors
    const errors: Record<number, string | null> = {}
    let hasErrors = false

    measurements.forEach((measurement, index) => {
      const error = validateField(index)
      if (error) {
        errors[index] = error
        hasErrors = true
      }
    })

    if (hasErrors) {
      setValidationErrors(errors)
      return 'Please fix validation errors before saving'
    }

    return null
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate
      const validationError = validateMeasurements()
      if (validationError) {
        setError(validationError)
        setSaving(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Prepare measurements for insert
      // Convert selected date to ISO timestamp
      const measuredAtTimestamp = new Date(measurementDate).toISOString()
      const measurementsToInsert = measurements.map(m => ({
        user_id: user.id,
        metric: m.metric,
        value: parseFloat(m.value),
        unit: m.unit,
        source: 'manual',
        measured_at: measuredAtTimestamp
      }))

      const { error: insertError } = await supabase
        .from('measurements')
        .insert(measurementsToInsert)

      if (insertError) throw insertError

      setSuccess(true)
      
      // Redirect after 2 seconds with refresh parameter
      setTimeout(() => {
        router.push('/protected/measurements?refresh=true')
      }, 2000)

    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save measurements')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-fuchsia-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (success) {
    return (
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-8 backdrop-blur-2xl text-center"
        >
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Success!</h3>
          <p className="text-sm text-white/60">Measurements saved. Redirecting...</p>
        </motion.div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-2 pb-16">
      {/* Back Button */}
      <div className="mb-2">
        <Link href="/protected/measurements">
          <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </Link>
      </div>

      {/* Title Container */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl mb-3"
      >
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-2xl opacity-30" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Save className="h-5 w-5 text-white/90" />
            <h1 className="text-xl font-semibold tracking-tight">Manual Entry</h1>
          </div>
          <p className="text-xs text-white/70">Enter your body composition measurements manually</p>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </motion.div>
      )}

      {/* Measurement Date */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-2xl"
      >
        <label className="block text-xs font-light text-white/70 mb-2">Measurement Date</label>
        <input
          type="date"
          value={measurementDate}
          onChange={(e) => setMeasurementDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]} // Can't select future dates
          className="w-full rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40"
        />
        <p className="text-xs text-white/50 mt-1">When were these measurements taken?</p>
      </motion.div>

      {/* Selected Metrics List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 backdrop-blur-2xl mb-4"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/90">Selected Metrics ({measurements.length})</h3>
          </div>

          {measurements.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">
              <p className="mb-3">No metrics selected yet</p>
              <button
                onClick={() => setShowMetricPicker(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/15 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Your First Metric
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {measurements.map((measurement, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors"
                >
                  {/* Metric Name (Read-only) */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate">
                      {measurement.displayName}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Unit: {measurement.unit}
                    </div>
                  </div>

                  {/* Value Input with Validation */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={measurement.value}
                        onChange={(e) => updateMeasurementValue(index, e.target.value)}
                        onBlur={() => handleValueBlur(index)}
                        placeholder="0.0"
                        className={`w-24 rounded-md backdrop-blur-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 transition-colors ${
                          validationErrors[index]
                            ? 'bg-red-500/10 border-2 border-red-500 focus:ring-red-500/40'
                            : 'bg-white/10 border border-white/20 focus:bg-white/15 focus:ring-fuchsia-400/40'
                        }`}
                      />
                      {validationErrors[index] && (
                        <div className="absolute top-full left-0 mt-1 text-xs text-red-300 whitespace-nowrap">
                          {validationErrors[index]}
                        </div>
                      )}
                    </div>

                    {/* Unit Display */}
                    <div className="w-16 rounded-md bg-white/5 px-3 py-2 text-sm text-white/60 text-center">
                      {measurement.unit}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => removeMeasurement(index)}
                      className="p-2 rounded-md bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors"
                      title="Remove measurement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Another Metric Button */}
              <button
                onClick={() => setShowMetricPicker(true)}
                className="w-full mt-2 rounded-md border border-white/10 bg-white/5 p-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Metric
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex gap-3 mt-4">
        <Link href="/protected/measurements" className="flex-1">
          <button className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/15 transition-colors">
            Cancel
          </button>
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || measurements.length === 0}
          className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Measurements
            </>
          )}
        </button>
      </div>

      {/* Metric Picker Side Panel */}
      <MetricPicker
        isOpen={showMetricPicker}
        onClose={() => setShowMetricPicker(false)}
        onMetricSelected={handleMetricSelected}
        metrics={metrics}
        selectedMetricKeys={selectedMetricKeys}
      />
    </section>
  )
}
